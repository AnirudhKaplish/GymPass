package models

import (
	"time"

	"gorm.io/gorm"
)

type Purchase struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	UserID           uint           `json:"user_id" gorm:"not null;index"`
	PlanID           uint           `json:"plan_id" gorm:"not null;index"`
	Status           string         `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'expired'
	StartDate        time.Time      `json:"start_date" gorm:"not null"`
	EndDate          time.Time      `json:"end_date" gorm:"not null;index"`
	RemainingSeconds int            `json:"remaining_seconds" gorm:"not null"` // hourly pack balance
	CreatedAt        time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`

	// Join helper fields (ignored by GORM mapping)
	PlanName string  `json:"plan_name,omitempty" gorm:"-"`
	PlanType string  `json:"plan_type,omitempty" gorm:"-"`
	Price    float64 `json:"price,omitempty" gorm:"-"`
}

func (Purchase) TableName() string {
	return "purchases"
}
