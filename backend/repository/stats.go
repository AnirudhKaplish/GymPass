package repository

import (
	"time"

	"gympass/backend/database"
	"gympass/backend/models"
)

// Aggregate queries for the owner dashboard. All of them are scoped to one gym.

func CountGymSessionsSince(gymID uint, since time.Time) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Session{}).Where("gym_id = ? AND entry_time >= ?", gymID, since).Count(&count).Error
	return count, err
}

// CountGymActiveMembers counts distinct members who can punch in right now.
func CountGymActiveMembers(gymID uint, now time.Time) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Membership{}).
		Where("gym_id = ? AND status = ? AND (end_date IS NULL OR end_date > ?)", gymID, "active", now).
		Distinct("user_id").
		Count(&count).Error
	return count, err
}

// CountGymTotalMembers counts distinct members who ever bought something at the gym.
func CountGymTotalMembers(gymID uint) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Membership{}).Where("gym_id = ?", gymID).Distinct("user_id").Count(&count).Error
	return count, err
}

// CountGymExpiringSoon counts active memberships that end within the given window.
func CountGymExpiringSoon(gymID uint, now time.Time, within time.Duration) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Membership{}).
		Where("gym_id = ? AND status = ? AND end_date IS NOT NULL AND end_date > ? AND end_date <= ?", gymID, "active", now, now.Add(within)).
		Count(&count).Error
	return count, err
}

// SumGymRevenue adds up successful payments (online and approved cash) since the given time.
func SumGymRevenue(gymID uint, since time.Time) (float64, error) {
	var total float64
	row := database.DB.Model(&models.Payment{}).
		Where("gym_id = ? AND status = ? AND created_at >= ?", gymID, models.PaymentSuccess, since).
		Select("COALESCE(SUM(amount), 0)").
		Row()
	if err := row.Scan(&total); err != nil {
		return 0, err
	}
	return total, nil
}

func CountGymPendingRequests(gymID uint) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Payment{}).
		Where("gym_id = ? AND method = ? AND status = ?", gymID, models.PaymentMethodCash, models.PaymentPending).
		Count(&count).Error
	return count, err
}

// HourlyOccupancy counts, for each clock hour of the day (0-23), how many visits
// overlapped that hour on each of the given days, then returns the totals.
// dayStart is local midnight of the first day; openEnded visits count until now.
func HourlyOccupancy(sessions []models.Session, loc *time.Location, dayStart, now time.Time) [24]int {
	var buckets [24]int

	for _, s := range sessions {
		start := s.EntryTime.In(loc)
		end := now.In(loc)
		if s.ExitTime != nil {
			end = s.ExitTime.In(loc)
		}
		if start.Before(dayStart.In(loc)) {
			start = dayStart.In(loc)
		}
		if !end.After(start) {
			end = start.Add(time.Minute)
		}

		// Walk the clock hours the visit touches.
		cursor := time.Date(start.Year(), start.Month(), start.Day(), start.Hour(), 0, 0, 0, loc)
		for cursor.Before(end) {
			buckets[cursor.Hour()]++
			cursor = cursor.Add(time.Hour)
		}
	}

	return buckets
}
