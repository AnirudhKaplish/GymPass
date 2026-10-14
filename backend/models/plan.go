package models

import (
	"time"

	"gorm.io/gorm"
)

// Plan types. 'hourly' plans are prepaid hours (Price is the rate per hour);
// every other type is a fixed-duration membership with unlimited visits.
const (
	PlanTypeHourly     = "hourly"
	PlanTypeMonthly    = "monthly"
	PlanTypeQuarterly  = "quarterly"
	PlanTypeHalfYearly = "half-yearly"
	PlanTypeYearly     = "yearly"
)

// DefaultValidityDays returns the standard duration for a time-based plan type.
func DefaultValidityDays(planType string) int {
	switch planType {
	case PlanTypeMonthly:
		return 30
	case PlanTypeQuarterly:
		return 90
	case PlanTypeHalfYearly:
		return 180
	case PlanTypeYearly:
		return 365
	}
	return 0
}

type Plan struct {
	ID    uint   `json:"id" gorm:"primaryKey"`
	UUID  string `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	GymID uint   `json:"gym_id" gorm:"not null;default:0;index"`
	Name  string `json:"name" gorm:"type:varchar(100);not null"`
	Type  string `json:"type" gorm:"type:varchar(50);not null"`
	// Price is the full price for time-based plans and the per-hour rate for hourly plans.
	Price float64 `json:"price" gorm:"type:decimal(10,2);not null"`
	// ValidityDays is the membership length. For hourly plans 0 means purchased hours never expire.
	ValidityDays int            `json:"validity_days" gorm:"not null;default:0"`
	Description  string         `json:"description" gorm:"type:text"`
	Status       string         `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'inactive'
	IsVisible    bool           `json:"is_visible" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

func (Plan) TableName() string {
	return "plans"
}

func (p *Plan) BeforeCreate(tx *gorm.DB) (err error) {
	p.UUID = GenerateUUID()
	return
}
