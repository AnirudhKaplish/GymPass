package models

import (
	"time"

	"gorm.io/gorm"
)

// Payment methods and statuses
const (
	PaymentMethodOnline = "online"
	PaymentMethodCash   = "cash"

	PaymentPending   = "pending"
	PaymentSuccess   = "success"
	PaymentFailed    = "failed"
	PaymentRejected  = "rejected"
	PaymentCancelled = "cancelled"
)

// Payment records one purchase attempt. A cash request is simply a pending
// payment with method 'cash' that the gym owner approves or rejects.
type Payment struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	UUID     string `json:"uuid" gorm:"type:varchar(36);uniqueIndex;not null"`
	UserID   uint   `json:"user_id" gorm:"not null;index"`
	GymID    uint   `json:"gym_id" gorm:"not null;default:0;index"`
	PlanID   uint   `json:"plan_id" gorm:"index"`
	PlanName string `json:"plan_name" gorm:"type:varchar(100)"`
	PlanType string `json:"plan_type" gorm:"type:varchar(50)"`
	Method   string `json:"method" gorm:"type:varchar(20);default:'online';index"`

	// Pointers so that rows without a value store NULL (a unique index would
	// otherwise reject a second empty string).
	RazorpayOrderID   *string `json:"razorpay_order_id" gorm:"type:varchar(255);uniqueIndex"`
	RazorpayPaymentID *string `json:"razorpay_payment_id" gorm:"type:varchar(255);uniqueIndex"`

	Amount       float64        `json:"amount" gorm:"type:decimal(10,2);not null"`
	Hours        int            `json:"hours" gorm:"type:integer;default:0"` // Hours purchased (hourly plans)
	Status       string         `json:"status" gorm:"type:varchar(50);default:'pending';index"`
	MembershipID *uint          `json:"membership_id" gorm:"index"`
	ResolvedAt   *time.Time     `json:"resolved_at"`
	CreatedAt    time.Time      `json:"created_at" gorm:"index"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	// Helper fields (ignored by GORM mapping)
	UserName  string `json:"user_name,omitempty" gorm:"-"`
	UserPhone string `json:"user_phone,omitempty" gorm:"-"`
	GymName   string `json:"gym_name,omitempty" gorm:"-"`
}

func (Payment) TableName() string {
	return "payments"
}

func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) {
	p.UUID = GenerateUUID()
	return
}
