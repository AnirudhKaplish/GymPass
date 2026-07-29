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

type AdminLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type CreatePlanRequest struct {
	Name         string  `json:"name" binding:"required"`
	Type         string  `json:"type" binding:"required"` // 'monthly', 'quarterly', 'half-yearly', 'yearly', 'hourly'
	Price        float64 `json:"price" binding:"required,gt=0"`
	ValidityDays int     `json:"validity_days" binding:"required,gt=0"`
	LimitHours   *int    `json:"limit_hours"` // Optional: only for hourly
	Description  string  `json:"description"`
}

type UpdateSettingsRequest struct {
	GymName       string `json:"gym_name" binding:"required"`
	LogoURL       string `json:"logo_url"`
	Address       string `json:"address"`
	ContactNumber string `json:"contact_number"`
	Email         string `json:"email" binding:"required,email"`
	OpeningTime   string `json:"opening_time"`
	ClosingTime   string `json:"closing_time"`
	Currency      string `json:"currency"`
	Timezone      string `json:"timezone"`
}

type InitiatePaymentRequest struct {
	PlanID int  `json:"plan_id" binding:"required"`
	Hours  *int `json:"hours"` // Optional: selected quantity of hours for hourly plans
}

type VerifyPaymentRequest struct {
	RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
	RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
	RazorpaySignature string `json:"razorpay_signature" binding:"required"`
}

type ScanQRRequest struct {
	Token string `json:"token" binding:"required"`
}
