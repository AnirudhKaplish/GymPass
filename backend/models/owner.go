package models

import (
	"time"
)

// Owner is a gym owner who registers on the platform and manages one or more gyms.
type Owner struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Name         string    `json:"name" gorm:"type:varchar(100);not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null;type:varchar(255)"`
	Phone        string    `json:"phone" gorm:"type:varchar(20)"`
	PasswordHash string    `json:"-" gorm:"not null"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Owner) TableName() string {
	return "owners"
}
