package models

import (
	"time"
)

type Settings struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	GymName       string    `json:"gym_name" gorm:"type:varchar(100);not null"`
	LogoURL       string    `json:"logo_url" gorm:"type:text"`
	Address       string    `json:"address" gorm:"type:text"`
	ContactNumber string    `json:"contact_number" gorm:"type:varchar(20)"`
	Email         string    `json:"email" gorm:"type:varchar(255)"`
	OpeningTime   string    `json:"opening_time" gorm:"type:varchar(10);default:'06:00'"`
	ClosingTime   string    `json:"closing_time" gorm:"type:varchar(10);default:'22:00'"`
	Currency      string    `json:"currency" gorm:"type:varchar(10);default:'INR'"`
	Timezone      string    `json:"timezone" gorm:"type:varchar(50);default:'Asia/Kolkata'"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (Settings) TableName() string {
	return "settings"
}
