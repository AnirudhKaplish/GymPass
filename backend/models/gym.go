package models

import (
	"time"

	"gorm.io/gorm"
)

// Gym is a single facility registered by an owner.
type Gym struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	UUID          string         `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	OwnerID       uint           `json:"owner_id" gorm:"not null;index"`
	Name          string         `json:"name" gorm:"type:varchar(100);not null;index"`
	Description   string         `json:"description" gorm:"type:text"`
	Address       string         `json:"address" gorm:"type:text"`
	City          string         `json:"city" gorm:"type:varchar(100);index"`
	Latitude      float64        `json:"latitude"`
	Longitude     float64        `json:"longitude"`
	ContactNumber string         `json:"contact_number" gorm:"type:varchar(20)"`
	OpeningTime   string         `json:"opening_time" gorm:"type:varchar(10);default:'06:00'"`
	ClosingTime   string         `json:"closing_time" gorm:"type:varchar(10);default:'22:00'"`
	Timezone      string         `json:"timezone" gorm:"type:varchar(50);default:'Asia/Kolkata'"`
	Status        string         `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'inactive'
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	Photos []GymPhoto `json:"photos" gorm:"foreignKey:GymID"`
	Plans  []Plan     `json:"plans,omitempty" gorm:"foreignKey:GymID"`

	// Computed helper (ignored by GORM mapping)
	DistanceKm *float64 `json:"distance_km,omitempty" gorm:"-"`
}

func (Gym) TableName() string {
	return "gyms"
}

func (g *Gym) BeforeCreate(tx *gorm.DB) (err error) {
	g.UUID = GenerateUUID()
	return
}

// GymPhoto is an optional photo an owner uploads for a gym.
type GymPhoto struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	GymID     uint      `json:"gym_id" gorm:"not null;index"`
	URL       string    `json:"url" gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at"`
}

func (GymPhoto) TableName() string {
	return "gym_photos"
}
