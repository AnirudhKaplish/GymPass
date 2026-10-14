package repository

import (
	"errors"
	"time"

	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm"
)

// ActivateMembership grants what a plan includes, inside the caller's transaction.
//
// If the member already holds an active membership of the same kind at this gym
// it is extended instead of creating a second one: time-based plans add their
// duration on top of the current end date, and prepaid hours are added to the
// existing balance.
func ActivateMembership(tx *gorm.DB, userID, gymID uint, plan *models.Plan, hours int) (*models.Membership, error) {
	now := time.Now().UTC()
	isHourly := plan.Type == models.PlanTypeHourly

	addSeconds := 0
	if isHourly {
		if hours < 1 {
			return nil, errors.New("hourly plans need at least 1 hour")
		}
		addSeconds = hours * 3600
	}

	var planEnd *time.Time
	if plan.ValidityDays > 0 {
		end := now.Add(time.Duration(plan.ValidityDays) * 24 * time.Hour)
		planEnd = &end
	}

	var existing models.Membership
	q := tx.Where("user_id = ? AND gym_id = ? AND status = ?", userID, gymID, "active").
		Where("(end_date IS NULL OR end_date > ?)", now)
	if isHourly {
		q = q.Where("plan_type = ?", models.PlanTypeHourly)
	} else {
		q = q.Where("plan_type <> ?", models.PlanTypeHourly)
	}
	err := q.Order("created_at desc").First(&existing).Error

	if err == nil {
		// Extend the membership the member already has.
		existing.PlanID = plan.ID
		existing.PlanName = plan.Name

		if isHourly {
			existing.TotalSeconds += addSeconds
			existing.RemainingSeconds += addSeconds
			// No date limit on either side keeps the hours open-ended;
			// otherwise the later of the two end dates wins.
			if existing.EndDate == nil || planEnd == nil {
				existing.EndDate = nil
			} else if planEnd.After(*existing.EndDate) {
				existing.EndDate = planEnd
			}
		} else if planEnd != nil {
			base := now
			if existing.EndDate != nil && existing.EndDate.After(now) {
				base = *existing.EndDate
			}
			end := base.Add(time.Duration(plan.ValidityDays) * 24 * time.Hour)
			existing.EndDate = &end
			existing.PlanType = plan.Type
		}

		if err := tx.Save(&existing).Error; err != nil {
			return nil, err
		}
		// A renewal or top-up makes earlier reminders obsolete.
		if err := tx.Where("membership_id = ? AND kind IN ?", existing.ID, models.ReminderKinds).Delete(&models.Notification{}).Error; err != nil {
			return nil, err
		}
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	membership := models.Membership{
		UserID:           userID,
		GymID:            gymID,
		PlanID:           plan.ID,
		PlanName:         plan.Name,
		PlanType:         plan.Type,
		Status:           "active",
		StartDate:        now,
		EndDate:          planEnd,
		TotalSeconds:     addSeconds,
		RemainingSeconds: addSeconds,
	}
	if err := tx.Create(&membership).Error; err != nil {
		return nil, err
	}
	return &membership, nil
}

// attachGymInfo fills the gym helper fields on memberships.
func attachGymInfo(memberships []models.Membership) {
	if len(memberships) == 0 {
		return
	}
	ids := make([]uint, 0, len(memberships))
	seen := make(map[uint]bool)
	for _, m := range memberships {
		if !seen[m.GymID] {
			seen[m.GymID] = true
			ids = append(ids, m.GymID)
		}
	}
	gyms, err := GetGymsByIDs(ids)
	if err != nil {
		return
	}
	for i := range memberships {
		if g, ok := gyms[memberships[i].GymID]; ok {
			memberships[i].GymName = g.Name
			memberships[i].GymAddress = g.Address
			memberships[i].GymCity = g.City
			memberships[i].GymLatitude = g.Latitude
			memberships[i].GymLongitude = g.Longitude
		}
	}
}

// attachExpiry fills ExpiresInSeconds from each membership's end date.
func attachExpiry(memberships []models.Membership) {
	now := time.Now().UTC()
	for i := range memberships {
		if memberships[i].EndDate != nil {
			secs := int64(memberships[i].EndDate.Sub(now).Seconds())
			if secs < 0 {
				secs = 0
			}
			memberships[i].ExpiresInSeconds = &secs
		}
	}
}

// GetUserMemberships returns every membership a user has, newest first, with gym details.
func GetUserMemberships(userID int) ([]models.Membership, error) {
	var memberships []models.Membership
	err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&memberships).Error
	if err != nil {
		return nil, err
	}
	attachGymInfo(memberships)
	attachExpiry(memberships)
	return memberships, nil
}

// PickUsableMembership chooses the membership to punch in with at a gym: a
// time-based membership first (it costs nothing per visit), otherwise a
// prepaid-hours pack that still has time left.
func PickUsableMembership(userID, gymID uint, now time.Time) (*models.Membership, error) {
	var memberships []models.Membership
	err := database.DB.
		Where("user_id = ? AND gym_id = ? AND status = ?", userID, gymID, "active").
		Where("(end_date IS NULL OR end_date > ?)", now).
		Order("created_at desc").
		Find(&memberships).Error
	if err != nil {
		return nil, err
	}

	for i := range memberships {
		if !memberships[i].IsHourly() {
			return &memberships[i], nil
		}
	}
	for i := range memberships {
		if memberships[i].IsHourly() && memberships[i].RemainingSeconds > 0 {
			return &memberships[i], nil
		}
	}
	return nil, nil
}

func GetMembershipByID(id uint) (*models.Membership, error) {
	var m models.Membership
	err := database.DB.First(&m, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// ListGymMembers returns a gym's memberships (all, or only one status) with member details.
func ListGymMembers(gymID uint, status string) ([]models.Membership, error) {
	var memberships []models.Membership
	db := database.DB.Where("gym_id = ?", gymID)
	if status != "" {
		db = db.Where("status = ?", status)
	}
	if err := db.Order("created_at desc").Find(&memberships).Error; err != nil {
		return nil, err
	}

	ids := make([]uint, 0, len(memberships))
	for _, m := range memberships {
		ids = append(ids, m.UserID)
	}
	users, err := GetUsersByIDs(ids)
	if err != nil {
		return nil, err
	}
	for i := range memberships {
		if u, ok := users[memberships[i].UserID]; ok {
			memberships[i].UserName = DisplayName(u)
			memberships[i].UserPhone = u.Phone
		}
	}
	attachExpiry(memberships)
	return memberships, nil
}

// ExpireDueMemberships marks memberships whose end date has passed as expired
// and returns the ones it just changed.
func ExpireDueMemberships(now time.Time) ([]models.Membership, error) {
	var due []models.Membership
	err := database.DB.
		Where("status = ? AND end_date IS NOT NULL AND end_date <= ?", "active", now).
		Find(&due).Error
	if err != nil || len(due) == 0 {
		return nil, err
	}

	ids := make([]uint, 0, len(due))
	for _, m := range due {
		ids = append(ids, m.ID)
	}
	if err := database.DB.Model(&models.Membership{}).Where("id IN ?", ids).Update("status", "expired").Error; err != nil {
		return nil, err
	}
	return due, nil
}

// GetMembershipsEndingBetween returns active memberships whose end date falls in [from, to].
func GetMembershipsEndingBetween(from, to time.Time) ([]models.Membership, error) {
	var memberships []models.Membership
	err := database.DB.
		Where("status = ? AND end_date IS NOT NULL AND end_date > ? AND end_date <= ?", "active", from, to).
		Find(&memberships).Error
	return memberships, err
}
