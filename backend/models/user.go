package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UUID        string         `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	Phone       string         `json:"phone" gorm:"uniqueIndex;not null;type:varchar(20)"`
	FirebaseUID *string        `json:"firebase_uid" gorm:"type:varchar(128);index"`
	Name        *string        `json:"name" gorm:"type:varchar(100)"`
	Age       *int           `json:"age"`
	Gender    *string        `json:"gender" gorm:"type:varchar(20)"`
	Status    string         `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'suspended'
	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (User) TableName() string {
	return "users"
}

// GORM Hook: BeforeCreate auto-populates UUID field
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	u.UUID = GenerateUUID()
	return
}
