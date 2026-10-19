package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/services"

	"github.com/gin-gonic/gin"
)

var phonePattern = regexp.MustCompile(`^\+\d{11,15}$`)

// OwnerAddMember signs up a walk-in member who pays cash at the desk. The member
// account is created from their phone number if needed (they finish their profile
// the first time they sign in), and the plan is activated straight away.
func OwnerAddMember(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	var req models.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	phone := normalizePhone(req.Phone)
	if !phonePattern.MatchString(phone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Enter a valid phone number"})
		return
	}

	quote, status, message := buildQuote(models.PurchaseRequest{PlanID: req.PlanID, Hours: req.Hours})
	if quote == nil {
		c.JSON(status, gin.H{"error": message})
		return
	}
	if quote.Gym.ID != gym.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "That plan does not belong to this gym"})
		return
	}

	user, err := repository.GetUserByPhone(phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error finding member"})
		return
	}
	if user == nil {
		user = &models.User{Phone: phone, Status: "active"}
		if name := strings.TrimSpace(req.Name); name != "" {
			user.Name = &name
		}
		if err := repository.CreateUser(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create member"})
			return
		}
	} else if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "This member account is suspended"})
		return
	}

	payment := &models.Payment{
		UserID:   user.ID,
		GymID:    gym.ID,
		PlanID:   quote.Plan.ID,
		PlanName: quote.Plan.Name,
		PlanType: quote.Plan.Type,
		Method:   models.PaymentMethodCash,
		Amount:   quote.Amount,
		Hours:    quote.Hours,
		Status:   models.PaymentPending,
	}
	if err := repository.CreatePayment(payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record the payment"})
		return
	}

	membership, err := repository.ApproveCashRequest(payment.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate the plan: " + err.Error()})
		return
	}

	services.Notify(user, gym.ID, membership.ID, fmt.Sprintf("approved_%d", payment.ID),
		"Membership active",
		fmt.Sprintf("%s activated your %s. Sign in with this phone number to get your entry QR.", gym.Name, payment.PlanName))

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Member added and plan activated",
		"membership": membership,
	})
}

// OwnerCheckoutSession ends a visit by hand, for a member who left without scanning out.
func OwnerCheckoutSession(c *gin.Context) {
	sessionID, ok := pathID(c, "id")
	if !ok {
		return
	}

	session, err := repository.GetSessionByID(uint(sessionID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading visit"})
		return
	}
	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found"})
		return
	}

	gym, err := repository.GetOwnerGym(currentID(c), int(session.GymID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading gym"})
		return
	}
	if gym == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found"})
		return
	}
	if session.Status != models.SessionActive {
		c.JSON(http.StatusConflict, gin.H{"error": "This visit is already closed"})
		return
	}

	now := time.Now().UTC()
	duration := int(now.Sub(session.EntryTime).Seconds())
	result, err := repository.CheckOutSession(session, now, duration, models.SessionCompleted)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyCheckedOut) {
			c.JSON(http.StatusConflict, gin.H{"error": "This visit is already closed"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check out: " + err.Error()})
		return
	}

	if user, _ := repository.GetUserByID(int(session.UserID)); user != nil {
		services.NotifyAfterCheckout(user, gym.Name, result)
	}

	response := gin.H{
		"message":  "Visit closed",
		"duration": formatDuration(duration),
	}
	if result.Hourly {
		response["hours_deducted"] = fmt.Sprintf("%.2f hrs", float64(result.DeductedSeconds)/3600.0)
	}
	c.JSON(http.StatusOK, response)
}
