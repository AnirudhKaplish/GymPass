package repository

import (
	"errors"
	"time"

	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm"
)

// MinBilledSeconds is the shortest visit charged against prepaid hours, so an
// accidental double punch does not cost nothing and does not cost a lot either.
const MinBilledSeconds = 60

// ErrAlreadyCheckedIn is returned when a member already has an open session.
var ErrAlreadyCheckedIn = errors.New("member is already checked in")

// ErrAlreadyCheckedOut is returned when a session was closed by someone else first.
var ErrAlreadyCheckedOut = errors.New("this visit is already closed")

func GetActiveSessionForUser(userID uint) (*models.Session, error) {
	var s models.Session
	err := database.DB.Where("user_id = ? AND status = ?", userID, models.SessionActive).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// CheckInSession opens a visit at a gym against a membership.
func CheckInSession(userID, gymID, membershipID uint, entry time.Time) (*models.Session, error) {
	session := &models.Session{
		UserID:       userID,
		GymID:        gymID,
		MembershipID: membershipID,
		EntryTime:    entry,
		Status:       models.SessionActive,
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&models.Session{}).Where("user_id = ? AND status = ?", userID, models.SessionActive).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return ErrAlreadyCheckedIn
		}
		return tx.Create(session).Error
	})
	if err != nil {
		return nil, err
	}
	return session, nil
}

// CheckoutResult describes what a punch-out changed.
type CheckoutResult struct {
	DurationSeconds  int
	DeductedSeconds  int  // prepaid seconds taken off (0 for time-based memberships)
	RemainingSeconds int  // prepaid seconds left afterwards
	Hourly           bool // true when the visit was billed against prepaid hours
	Exhausted        bool // true when the prepaid hours just ran out
	Membership       *models.Membership
}

// CheckOutSession closes a visit and, for prepaid-hours memberships, deducts the
// time actually spent. exitTime and durationSeconds are chosen by the caller so
// the same function serves a normal punch-out and the automatic close of a
// forgotten visit. status is 'completed' or 'auto_closed'.
func CheckOutSession(session *models.Session, exitTime time.Time, durationSeconds int, status string) (*CheckoutResult, error) {
	if durationSeconds < 0 {
		durationSeconds = 0
	}
	result := &CheckoutResult{DurationSeconds: durationSeconds}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Claim the visit first so two simultaneous scans cannot both bill it.
		res := tx.Model(&models.Session{}).
			Where("id = ? AND status = ?", session.ID, models.SessionActive).
			Updates(map[string]interface{}{
				"exit_time":        exitTime,
				"duration_seconds": durationSeconds,
				"status":           status,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrAlreadyCheckedOut
		}

		var membership models.Membership
		if err := tx.First(&membership, session.MembershipID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil // membership vanished; the visit is still recorded
			}
			return err
		}
		result.Membership = &membership
		result.RemainingSeconds = membership.RemainingSeconds

		if !membership.IsHourly() {
			return nil
		}
		result.Hourly = true

		billed := durationSeconds
		if billed < MinBilledSeconds {
			billed = MinBilledSeconds
		}
		if billed > membership.RemainingSeconds {
			billed = membership.RemainingSeconds
		}
		newRemaining := membership.RemainingSeconds - billed

		updates := map[string]interface{}{"remaining_seconds": newRemaining}
		if newRemaining <= 0 {
			updates["status"] = "expired"
			membership.Status = "expired"
			result.Exhausted = true
		}
		if err := tx.Model(&models.Membership{}).Where("id = ?", membership.ID).Updates(updates).Error; err != nil {
			return err
		}

		hoursDeducted := float64(billed) / 3600.0
		if err := tx.Model(&models.Session{}).Where("id = ?", session.ID).Update("hours_deducted", hoursDeducted).Error; err != nil {
			return err
		}

		result.DeductedSeconds = billed
		result.RemainingSeconds = newRemaining
		membership.RemainingSeconds = newRemaining
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// attachSessionInfo fills member, gym and plan details on sessions.
func attachSessionInfo(sessions []models.Session, withUsers bool) {
	if len(sessions) == 0 {
		return
	}

	userIDs := make([]uint, 0, len(sessions))
	gymIDs := make([]uint, 0, len(sessions))
	membershipIDs := make([]uint, 0, len(sessions))
	for _, s := range sessions {
		userIDs = append(userIDs, s.UserID)
		gymIDs = append(gymIDs, s.GymID)
		membershipIDs = append(membershipIDs, s.MembershipID)
	}

	gyms, _ := GetGymsByIDs(gymIDs)

	var users map[uint]models.User
	if withUsers {
		users, _ = GetUsersByIDs(userIDs)
	}

	plans := make(map[uint]models.Membership)
	var memberships []models.Membership
	if err := database.DB.Unscoped().Where("id IN ?", membershipIDs).Find(&memberships).Error; err == nil {
		for _, m := range memberships {
			plans[m.ID] = m
		}
	}

	for i := range sessions {
		if g, ok := gyms[sessions[i].GymID]; ok {
			sessions[i].GymName = g.Name
		}
		if withUsers {
			if u, ok := users[sessions[i].UserID]; ok {
				sessions[i].UserName = DisplayName(u)
				sessions[i].UserPhone = u.Phone
			}
		}
		if m, ok := plans[sessions[i].MembershipID]; ok {
			sessions[i].PlanName = m.PlanName
			sessions[i].PlanType = m.PlanType
		}
	}
}

// ListUserSessions returns a member's visits across all gyms, newest first.
func ListUserSessions(userID int, limit int) ([]models.Session, error) {
	var sessions []models.Session
	db := database.DB.Where("user_id = ?", userID).Order("entry_time desc")
	if limit > 0 {
		db = db.Limit(limit)
	}
	if err := db.Find(&sessions).Error; err != nil {
		return nil, err
	}
	attachSessionInfo(sessions, false)
	return sessions, nil
}

// ListGymSessions returns a gym's visits, newest first.
func ListGymSessions(gymID uint, limit int) ([]models.Session, error) {
	var sessions []models.Session
	db := database.DB.Where("gym_id = ?", gymID).Order("entry_time desc")
	if limit > 0 {
		db = db.Limit(limit)
	}
	if err := db.Find(&sessions).Error; err != nil {
		return nil, err
	}
	attachSessionInfo(sessions, true)
	return sessions, nil
}

// ListGymActiveSessions returns members currently inside a gym, longest-inside first.
func ListGymActiveSessions(gymID uint) ([]models.Session, error) {
	var sessions []models.Session
	err := database.DB.
		Where("gym_id = ? AND status = ?", gymID, models.SessionActive).
		Order("entry_time asc").
		Find(&sessions).Error
	if err != nil {
		return nil, err
	}
	attachSessionInfo(sessions, true)
	return sessions, nil
}

// ListGymSessionsSince returns every visit that started at or after the given time.
func ListGymSessionsSince(gymID uint, since time.Time) ([]models.Session, error) {
	var sessions []models.Session
	err := database.DB.
		Where("gym_id = ? AND entry_time >= ?", gymID, since).
		Order("entry_time asc").
		Find(&sessions).Error
	return sessions, err
}

// ListStaleActiveSessions returns open visits that started before the cutoff.
func ListStaleActiveSessions(cutoff time.Time) ([]models.Session, error) {
	var sessions []models.Session
	err := database.DB.
		Where("status = ? AND entry_time < ?", models.SessionActive, cutoff).
		Find(&sessions).Error
	return sessions, err
}

// GetSessionByID loads one visit, or nil when it does not exist.
func GetSessionByID(id uint) (*models.Session, error) {
	var s models.Session
	if err := database.DB.First(&s, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}
