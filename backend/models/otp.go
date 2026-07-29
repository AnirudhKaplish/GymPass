package models

import (
	"time"
)

type OTPLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Phone     string    `json:"phone" gorm:"type:varchar(20);not null;index"`
	OTPCode   string    `json:"otp_code" gorm:"type:varchar(10);not null"`
	Verified  bool      `json:"verified" gorm:"default:false;index"`
	ExpiresAt time.Time `json:"expires_at" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"index"`
}

func (OTPLog) TableName() string {
	return "otp_logs"
}
