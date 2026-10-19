package models

// Request & Response DTOs (Data Transfer Objects)

type SendOTPRequest struct {
	Phone string `json:"phone" binding:"required"`
}

type VerifyOTPRequest struct {
	Phone   string `json:"phone" binding:"required"`
	OTP     string `json:"otp"`      // Optional if using Firebase Phone Auth
	IDToken string `json:"id_token"` // Firebase ID Token
}

type OnboardingRequest struct {
	Name   string `json:"name" binding:"required"`
	Age    int    `json:"age" binding:"required,gt=0"`
	Gender string `json:"gender" binding:"required"`
}

type OwnerRegisterRequest struct {
	Name     string `json:"name" binding:"required,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Phone    string `json:"phone"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type OwnerLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// GymRequest is used both to register a gym and to edit it.
type GymRequest struct {
	Name          string   `json:"name" binding:"required,max=100"`
	Description   string   `json:"description"`
	Address       string   `json:"address" binding:"required"`
	City          string   `json:"city"`
	Latitude      *float64 `json:"latitude" binding:"required,gte=-90,lte=90"`
	Longitude     *float64 `json:"longitude" binding:"required,gte=-180,lte=180"`
	ContactNumber string   `json:"contact_number"`
	OpeningTime   string   `json:"opening_time"`
	ClosingTime   string   `json:"closing_time"`
	Timezone      string   `json:"timezone"`
	Status        string   `json:"status"` // optional on edit: 'active' or 'inactive'
}

type PlanRequest struct {
	Name         string  `json:"name" binding:"required,max=100"`
	Type         string  `json:"type" binding:"required,oneof=hourly monthly quarterly half-yearly yearly"`
	Price        float64 `json:"price" binding:"required,gt=0"`
	ValidityDays int     `json:"validity_days" binding:"gte=0"`
	Description  string  `json:"description"`
	Status       string  `json:"status"` // optional on edit: 'active' or 'inactive'
	IsVisible    *bool   `json:"is_visible"`
}

// PurchaseRequest starts an online payment or files a cash request.
type PurchaseRequest struct {
	PlanID int  `json:"plan_id" binding:"required"`
	Hours  *int `json:"hours"` // required for hourly plans
}

type VerifyPaymentRequest struct {
	RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
	RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
	RazorpaySignature string `json:"razorpay_signature" binding:"required"`
}

type ScanQRRequest struct {
	Token string `json:"token" binding:"required"`
}

type MarkReadRequest struct {
	IDs []uint `json:"ids"` // empty = mark everything read
}

// AddMemberRequest lets an owner sign up a walk-in member who pays at the desk.
type AddMemberRequest struct {
	Phone  string `json:"phone" binding:"required"`
	Name   string `json:"name"`
	PlanID int    `json:"plan_id" binding:"required"`
	Hours  *int   `json:"hours"` // required for hourly plans
}
