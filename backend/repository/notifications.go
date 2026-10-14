package repository

import (
	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm/clause"
)

// CreateNotificationOnce stores a notification unless one with the same
// membership and kind already exists. It returns true only when a new row was created.
func CreateNotificationOnce(n *models.Notification) (bool, error) {
	res := database.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(n)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func ListUserNotifications(userID int, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	db := database.DB.Where("user_id = ?", userID).Order("created_at desc")
	if limit > 0 {
		db = db.Limit(limit)
	}
	err := db.Find(&notifications).Error
	return notifications, err
}

func CountUnreadNotifications(userID int) (int64, error) {
	var count int64
	err := database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count).Error
	return count, err
}

// MarkNotificationsRead marks the given notifications (or all of the user's, when ids is empty) as read.
func MarkNotificationsRead(userID int, ids []uint) error {
	db := database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false)
	if len(ids) > 0 {
		db = db.Where("id IN ?", ids)
	}
	return db.Update("is_read", true).Error
}
