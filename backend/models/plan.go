package models

import (
	"time"

	"gorm.io/gorm"
)

type Plan struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	UUID         string         `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	Name         string         `json:"name" gorm:"type:varchar(100);not null"`
	Type         string         `json:"type" gorm:"type:varchar(50);not null"` // 'monthly', 'quarterly', 'half-yearly', 'yearly', 'hourly'
	Price        float64        `json:"price" gorm:"type:decimal(10,2);not null"`
	ValidityDays int            `json:"validity_days" gorm:"not null"`
	LimitHours   *int           `json:"limit_hours"` // NULL for standard monthly packages
	Description  string         `json:"description" gorm:"type:text"`
	Status       string         `json:"status" gorm:"type:varchar(50);default:'active';index"` // 'active', 'inactive'
	IsVisible    bool           `json:"is_visible" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at" gorm:"index"`
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
