package models

import (
	"time"

	"gorm.io/gorm"
)

type Payment struct {
	ID                uint           `json:"id" gorm:"primaryKey"`
	UUID              string         `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	UserID            uint           `json:"user_id" gorm:"not null;index"`
	PlanID            uint           `json:"plan_id" gorm:"index"`
	RazorpayOrderID   string         `json:"razorpay_order_id" gorm:"type:varchar(255);uniqueIndex;index"`
	RazorpayPaymentID string         `json:"razorpay_payment_id" gorm:"type:varchar(255);uniqueIndex"`
	Amount            float64        `json:"amount" gorm:"type:decimal(10,2);not null"`
	Hours             int            `json:"hours" gorm:"type:integer;default:0"` // Quantity of hours purchased for hourly plans
	Status            string         `json:"status" gorm:"type:varchar(50);default:'pending';index"` // 'pending', 'success', 'failed'
	CreatedAt         time.Time      `json:"created_at" gorm:"index"`
	DeletedAt         gorm.DeletedAt `json:"-" gorm:"index"`
}

func (Payment) TableName() string {
	return "payments"
}

func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) {
	p.UUID = GenerateUUID()
	return
}
