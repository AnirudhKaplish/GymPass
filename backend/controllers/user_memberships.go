package controllers

import (
	"errors"
	"net/http"

	"gympass/backend/models"
	"gympass/backend/repository"

	"github.com/gin-gonic/gin"
)

// activeUser loads the signed-in member and rejects suspended or missing accounts.
func activeUser(c *gin.Context) (*models.User, bool) {
	user, err := repository.GetUserByID(currentID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error fetching user"})
		return nil, false
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return nil, false
	}
	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account suspended"})
		return nil, false
	}
	return user, true
}

// GetUserDashboard returns everything on the member's home screen: all their
// memberships (with time left), cash requests awaiting approval, the visit in
// progress and recent workouts.
func GetUserDashboard(c *gin.Context) {
	user, ok := activeUser(c)
	if !ok {
		return
	}
	userID := int(user.ID)

	memberships, err := repository.GetUserMemberships(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading memberships"})
		return
	}
	pending, err := repository.ListUserPendingRequests(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading requests"})
		return
	}
	sessions, err := repository.ListUserSessions(userID, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading visits"})
		return
	}
	unread, err := repository.CountUnreadNotifications(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading notifications"})
		return
	}

	var activeSession *models.Session
	for i := range sessions {
		if sessions[i].Status == models.SessionActive {
			activeSession = &sessions[i]
			break
		}
	}

	if memberships == nil {
		memberships = []models.Membership{}
	}
	if pending == nil {
		pending = []models.Payment{}
	}
	if sessions == nil {
		sessions = []models.Session{}
	}

	c.JSON(http.StatusOK, gin.H{
		"user":                 user,
		"memberships":          memberships,
		"pending_requests":     pending,
		"active_session":       activeSession,
		"sessions":             sessions,
		"unread_notifications": unread,
	})
}

// CreateCashRequest asks a gym to accept cash for a plan. Nothing is activated
// until the owner approves it.
func CreateCashRequest(c *gin.Context) {
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

	existing, err := repository.FindPendingCashRequest(user.ID, quote.Gym.ID, quote.Plan.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking requests"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You already have a pending cash request for this plan"})
		return
	}

	payment := &models.Payment{
		UserID:   user.ID,
		GymID:    quote.Gym.ID,
		PlanID:   quote.Plan.ID,
		PlanName: quote.Plan.Name,
		PlanType: quote.Plan.Type,
		Method:   models.PaymentMethodCash,
		Amount:   quote.Amount,
		Hours:    quote.Hours,
		Status:   models.PaymentPending,
	}
	if err := repository.CreatePayment(payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to file cash request"})
		return
	}

	payment.GymName = quote.Gym.Name
	c.JSON(http.StatusCreated, gin.H{
		"message": "Request sent. Pay " + quote.Gym.Name + " in cash and they will activate your plan.",
		"request": payment,
	})
}

// CancelCashRequest lets a member withdraw a cash request that is still pending.
func CancelCashRequest(c *gin.Context) {
	paymentID, ok := pathID(c, "id")
	if !ok {
		return
	}

	payment, err := repository.GetPaymentByID(uint(paymentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading request"})
		return
	}
	if payment == nil || payment.UserID != uint(currentID(c)) || payment.Method != models.PaymentMethodCash {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	if err := repository.CloseCashRequest(payment.ID, models.PaymentCancelled); err != nil {
		if errors.Is(err, repository.ErrAlreadyProcessed) {
			c.JSON(http.StatusConflict, gin.H{"error": "This request was already handled by the gym"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Request cancelled"})
}

// ListNotifications returns the member's in-app notifications, newest first.
func ListNotifications(c *gin.Context) {
	userID := currentID(c)

	notifications, err := repository.ListUserNotifications(userID, queryLimit(c, 30, 100))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load notifications"})
		return
	}
	unread, err := repository.CountUnreadNotifications(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count notifications"})
		return
	}
	if notifications == nil {
		notifications = []models.Notification{}
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications, "unread": unread})
}

// MarkNotificationsRead marks some (or all) notifications as read.
func MarkNotificationsRead(c *gin.Context) {
	var req models.MarkReadRequest
	// An empty body is fine: it means "mark everything read".
	_ = c.ShouldBindJSON(&req)

	if err := repository.MarkNotificationsRead(currentID(c), req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Notifications updated"})
}
