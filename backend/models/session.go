package models

import (
	"time"

	"gorm.io/gorm"
)

type Session struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	UUID            string         `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	UserID          uint           `json:"user_id" gorm:"not null;index"`
	EntryTime       time.Time      `json:"entry_time" gorm:"not null;index"`
	ExitTime        *time.Time     `json:"exit_time"`
	DurationSeconds *int           `json:"duration_seconds"`
	HoursDeducted   *float64       `json:"hours_deducted"`
	Status          string         `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'completed', 'aborted'
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`

	// Join helper fields (ignored by GORM mapping)
	UserName  string `json:"user_name,omitempty" gorm:"-"`
	UserPhone string `json:"user_phone,omitempty" gorm:"-"`
}

func (Session) TableName() string {
	return "sessions"
}

func (s *Session) BeforeCreate(tx *gorm.DB) (err error) {
	s.UUID = GenerateUUID()
	return
}
