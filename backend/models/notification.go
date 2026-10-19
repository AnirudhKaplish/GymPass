package models

import (
	"time"
)

// Notification kinds. Each (membership, kind) pair is only ever created once,
// so a reminder is never repeated.
const (
	NotifExpiry3Days  = "expiry_3d"
	NotifExpiry1Day   = "expiry_1d"
	NotifExpired      = "expired"
	NotifLow2Hours    = "low_2h"
	NotifLow30Minutes = "low_30m"
	NotifExhausted    = "exhausted"
	NotifAutoClosed   = "auto_closed" // suffixed with the session id
)

// ReminderKinds are the kinds that are cleared when a membership is renewed or topped up.
var ReminderKinds = []string{
	NotifExpiry3Days, NotifExpiry1Day, NotifExpired,
	NotifLow2Hours, NotifLow30Minutes, NotifExhausted,
}

// Notification is an in-app message for a member.
type Notification struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null;index"`
	GymID        uint      `json:"gym_id" gorm:"index"`
	MembershipID uint      `json:"membership_id" gorm:"not null;default:0;uniqueIndex:idx_notif_dedupe"`
	Kind         string    `json:"kind" gorm:"type:varchar(60);not null;uniqueIndex:idx_notif_dedupe"`
	Title        string    `json:"title" gorm:"type:varchar(150);not null"`
	Message      string    `json:"message" gorm:"type:text"`
	IsRead       bool      `json:"is_read" gorm:"default:false;index"`
	CreatedAt    time.Time `json:"created_at" gorm:"index"`
}

func (Notification) TableName() string {
	return "notifications"
}
