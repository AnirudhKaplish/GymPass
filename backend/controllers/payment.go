package controllers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"gympass/backend/config"
	"gympass/backend/models"
	"gympass/backend/repository"

	"github.com/gin-gonic/gin"
	"github.com/razorpay/razorpay-go"
)

// InitiatePayment creates a Razorpay order
func InitiatePayment(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req models.InitiatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := repository.GetPlanByID(req.PlanID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error fetching plan"})
		return
	}
	if plan == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	// Determine dynamic price and hours for hourly packs
	totalPrice := plan.Price
	hoursVal := 0

	if plan.Type == "hourly" {
		hoursVal = 1 // Default to 1 hour if not specified
		if req.Hours != nil && *req.Hours > 0 {
			hoursVal = *req.Hours
		} else if plan.LimitHours != nil && *plan.LimitHours > 0 {
			hoursVal = *plan.LimitHours
		}
		totalPrice = plan.Price * float64(hoursVal)
	}

	// Amount in paise for Razorpay
	amountPaise := int(totalPrice * 100)

	var orderID string
	// If in dev mode and keys are default/mock, bypass Razorpay API call
	if config.AppConfig.DevMode && config.AppConfig.RazorpayKeyID == "rzp_test_mock_id_123" {
		orderID = "order_mock_" + time.Now().Format("20060102150405")
	} else {
		// Call Razorpay API
		client := razorpay.NewClient(config.AppConfig.RazorpayKeyID, config.AppConfig.RazorpayKeySecret)
		data := map[string]interface{}{
			"amount":   amountPaise,
			"currency": "INR",
			"receipt":  "receipt_" + time.Now().Format("20060102150405"),
		}
		body, err := client.Order.Create(data, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Razorpay order: " + err.Error()})
			return
		}
		orderID = body["id"].(string)
	}

	// Save payment record as pending
	payment := &models.Payment{
		UserID:          uint(userID.(int)),
		PlanID:          plan.ID,
		RazorpayOrderID: orderID,
		Amount:          totalPrice,
		Hours:           hoursVal,
		Status:          "pending",
	}

	err = repository.CreatePayment(payment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log payment transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"razorpay_order_id": orderID,
		"amount":            totalPrice,
		"currency":          "INR",
		"key":               config.AppConfig.RazorpayKeyID,
		"plan_name":         plan.Name,
	})
}

// VerifyPayment verifies payment signature and activates plan
func VerifyPayment(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req models.VerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payment, err := repository.GetPaymentByOrderID(req.RazorpayOrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payment log"})
		return
	}
	if payment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment transaction not found"})
		return
	}

	// Verify signature
	if config.AppConfig.DevMode && req.RazorpaySignature == "mock_signature_bypass" {
		// Allowed bypass in dev mode
	} else {
		err = verifyRazorpaySignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature, config.AppConfig.RazorpayKeySecret)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment signature verification failed"})
			return
		}
	}

	// Activate Plan: Create/Update Purchase using GORM Transaction
	plan, err := repository.GetPlanByID(int(payment.PlanID))
	if err != nil || plan == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load purchased plan profile"})
		return
	}

	limitHours := plan.LimitHours
	if plan.Type == "hourly" && payment.Hours > 0 {
		limitHours = &payment.Hours
	}

	purchase, err := repository.VerifyPaymentAndActivateSubscription(
		req.RazorpayOrderID,
		req.RazorpayPaymentID,
		userID.(int),
		int(plan.ID),
		plan.ValidityDays,
		limitHours,
		plan.Type,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify payment and activate plan: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment verified and plan activated successfully!",
		"purchase": purchase,
	})
}

func verifyRazorpaySignature(orderID, paymentID, signature, secret string) error {
	signatureData := orderID + "|" + paymentID
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(signatureData))
	generatedSignature := hex.EncodeToString(h.Sum(nil))

	if generatedSignature != signature {
		return errors.New("signature mismatch")
	}
	return nil
}
