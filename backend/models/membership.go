package models

import (
	"time"

	"gorm.io/gorm"
)

// Membership is what a user holds at one gym after a plan is paid for.
// Plan details are copied onto it so later edits or deletion of the plan
// never change what the member already bought.
type Membership struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	UserID   uint   `json:"user_id" gorm:"not null;index"`
	GymID    uint   `json:"gym_id" gorm:"not null;index"`
	PlanID   uint   `json:"plan_id" gorm:"not null;index"`
	PlanName string `json:"plan_name" gorm:"type:varchar(100)"`
	PlanType string `json:"plan_type" gorm:"type:varchar(50);index"`
	Status   string `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'expired'

	StartDate time.Time  `json:"start_date" gorm:"not null"`
	EndDate   *time.Time `json:"end_date" gorm:"index"` // nil = no date limit (prepaid hours only)

	// Prepaid hours bookkeeping (hourly plans only)
	TotalSeconds     int `json:"total_seconds"`
	RemainingSeconds int `json:"remaining_seconds"`

	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Helper fields (ignored by GORM mapping)
	GymName          string  `json:"gym_name,omitempty" gorm:"-"`
	GymAddress       string  `json:"gym_address,omitempty" gorm:"-"`
	GymCity          string  `json:"gym_city,omitempty" gorm:"-"`
	GymLatitude      float64 `json:"gym_latitude,omitempty" gorm:"-"`
	GymLongitude     float64 `json:"gym_longitude,omitempty" gorm:"-"`
	UserName         string  `json:"user_name,omitempty" gorm:"-"`
	UserPhone        string  `json:"user_phone,omitempty" gorm:"-"`
	ExpiresInSeconds *int64  `json:"expires_in_seconds,omitempty" gorm:"-"`
}

func (Membership) TableName() string {
	return "memberships"
}

// IsHourly reports whether this membership is a prepaid-hours pack.
func (m *Membership) IsHourly() bool {
	return m.PlanType == PlanTypeHourly
}
