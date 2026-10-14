package controllers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"

	"gympass/backend/config"
	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/services"

	"github.com/gin-gonic/gin"
	"github.com/razorpay/razorpay-go"
)

const (
	maxHoursPerPurchase = 500
	mockRazorpayKeyID   = "rzp_test_mock_id_123"
)

// purchaseQuote is a validated plan choice with its price worked out.
type purchaseQuote struct {
	Plan   *models.Plan
	Gym    *models.Gym
	Amount float64
	Hours  int
}

// buildQuote checks that a plan can be bought and works out what it costs.
// On failure it returns the HTTP status and message to answer with.
func buildQuote(req models.PurchaseRequest) (*purchaseQuote, int, string) {
	plan, err := repository.GetPlanByID(req.PlanID)
	if err != nil {
		return nil, http.StatusInternalServerError, "Database error fetching plan"
	}
	if plan == nil || plan.Status != "active" || !plan.IsVisible {
		return nil, http.StatusNotFound, "This plan is not available"
	}

	gym, err := repository.GetGymByID(int(plan.GymID))
	if err != nil {
		return nil, http.StatusInternalServerError, "Database error fetching gym"
	}
	if gym == nil || gym.Status != "active" {
		return nil, http.StatusNotFound, "This gym is not accepting new memberships"
	}

	quote := &purchaseQuote{Plan: plan, Gym: gym, Amount: plan.Price}

	if plan.Type == models.PlanTypeHourly {
		if req.Hours == nil || *req.Hours < 1 {
			return nil, http.StatusBadRequest, "Choose how many hours to buy"
		}
		if *req.Hours > maxHoursPerPurchase {
			return nil, http.StatusBadRequest, fmt.Sprintf("You can buy at most %d hours at a time", maxHoursPerPurchase)
		}
		quote.Hours = *req.Hours
		quote.Amount = round2(plan.Price * float64(*req.Hours))
	}

	return quote, 0, ""
}

// InitiatePayment creates a Razorpay order for a plan. Razorpay's checkout offers
// UPI (Google Pay, Paytm, PhonePe), cards and netbanking.
func InitiatePayment(c *gin.Context) {
	user, ok := activeUser(c)
	if !ok {
		return
	}

	var req models.PurchaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	quote, status, message := buildQuote(req)
	if quote == nil {
		c.JSON(status, gin.H{"error": message})
		return
	}

	amountPaise := int(math.Round(quote.Amount * 100))

	var orderID string
	// In dev mode with the placeholder keys, skip the Razorpay API call.
	if config.AppConfig.DevMode && config.AppConfig.RazorpayKeyID == mockRazorpayKeyID {
		orderID = "order_mock_" + models.GenerateUUID()
	} else {
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
		id, isString := body["id"].(string)
		if !isString || id == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Razorpay did not return an order id"})
			return
		}
		orderID = id
	}

	payment := &models.Payment{
		UserID:          user.ID,
		GymID:           quote.Gym.ID,
		PlanID:          quote.Plan.ID,
		PlanName:        quote.Plan.Name,
		PlanType:        quote.Plan.Type,
		Method:          models.PaymentMethodOnline,
		RazorpayOrderID: &orderID,
		Amount:          quote.Amount,
		Hours:           quote.Hours,
		Status:          models.PaymentPending,
	}
	if err := repository.CreatePayment(payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log payment transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"razorpay_order_id": orderID,
		"amount":            quote.Amount,
		"currency":          "INR",
		"key":               config.AppConfig.RazorpayKeyID,
		"plan_name":         quote.Plan.Name,
		"gym_name":          quote.Gym.Name,
	})
}

// VerifyPayment verifies the payment signature and activates the membership.
func VerifyPayment(c *gin.Context) {
	user, ok := activeUser(c)
	if !ok {
		return
	}

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
	// Someone else's order is reported as missing rather than confirmed to exist.
	if payment == nil || payment.UserID != user.ID || payment.Method != models.PaymentMethodOnline {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment transaction not found"})
		return
	}

	// Verifying twice is harmless: return what the first call produced.
	if payment.Status == models.PaymentSuccess && payment.MembershipID != nil {
		existing, err := repository.GetMembershipByID(*payment.MembershipID)
		if err == nil && existing != nil {
			c.JSON(http.StatusOK, gin.H{"message": "Payment already verified", "membership": existing})
			return
		}
	}
	if payment.Status != models.PaymentPending {
		c.JSON(http.StatusConflict, gin.H{"error": "This payment can no longer be verified"})
		return
	}

	if config.AppConfig.DevMode && req.RazorpaySignature == "mock_signature_bypass" {
		// Allowed bypass in dev mode only
	} else if err := verifyRazorpaySignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature, config.AppConfig.RazorpayKeySecret); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment signature verification failed"})
		return
	}

	membership, err := repository.CompleteOnlinePayment(payment.ID, req.RazorpayPaymentID)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyProcessed) {
			c.JSON(http.StatusConflict, gin.H{"error": "This payment was already processed"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify payment and activate plan: " + err.Error()})
		return
	}

	gymName := ""
	if gyms, err := repository.GetGymsByIDs([]uint{payment.GymID}); err == nil {
		gymName = gyms[payment.GymID].Name
	}
	services.Notify(user, payment.GymID, membership.ID, fmt.Sprintf("activated_%d", payment.ID),
		"Membership active",
		fmt.Sprintf("Payment received. Your %s at %s is now active.", payment.PlanName, gymName))

	c.JSON(http.StatusOK, gin.H{
		"message":    "Payment verified and plan activated successfully!",
		"membership": membership,
	})
}

func verifyRazorpaySignature(orderID, paymentID, signature, secret string) error {
	signatureData := orderID + "|" + paymentID
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(signatureData))
	generatedSignature := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(generatedSignature), []byte(signature)) {
		return errors.New("signature mismatch")
	}
	return nil
}
