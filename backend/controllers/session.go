package controllers

import (
	"fmt"
	"net/http"
	"time"

	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/services"
	"gympass/backend/utils"

	"github.com/gin-gonic/gin"
)

// ScanQR processes check-in or check-out of a user via scanner
func ScanQR(c *gin.Context) {
	var req models.ScanQRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Verify and decode QR Token
	userID, err := utils.VerifyQRToken(req.Token)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: " + err.Error()})
		return
	}

	// 2. Fetch User & validate status
	user, err := repository.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error retrieving user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User account not found"})
		return
	}

	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: User profile is suspended"})
		return
	}

	// 3. Fetch Active Plan
	activePurchase, err := repository.GetActivePurchaseForUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking subscription"})
		return
	}

	if activePurchase == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: No active membership plan found"})
		return
	}

	// Check if hourly plan has remaining balance
	if activePurchase.PlanType == "hourly" && activePurchase.RemainingSeconds <= 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: Hourly plan balance is exhausted (0 hours remaining)"})
		return
	}

	// 4. Check if user is already checked in (Active Session check)
	activeSession, err := repository.GetActiveSessionForUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking active sessions"})
		return
	}

	// Case A: No active session - Perform CHECK-IN
	if activeSession == nil {
		session, err := repository.CheckInSession(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create check-in session log: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"type":      "check_in",
			"message":   "Check-In Successful. Welcome to GymPass!",
			"user_name": getSafeUserName(user),
			"plan_name": activePurchase.PlanName,
			"plan_type": activePurchase.PlanType,
			"remaining": formatRemainingSeconds(activePurchase.RemainingSeconds, activePurchase.PlanType),
			"time":      session.EntryTime.Format("03:04 PM"),
		})
		return
	}

	now := time.Now()
	// Case B: Active session exists - Perform CHECK-OUT
	exitTime := now
	duration := exitTime.Sub(activeSession.EntryTime)
	durationSeconds := int(duration.Seconds())
	if durationSeconds < 60 {
		durationSeconds = 60 // Minimum 1 minute charge to avoid division/zero errors
	}

	hoursDeducted := float64(durationSeconds) / 3600.0

	// If hourly pack, deduct from remaining seconds
	newRemaining := activePurchase.RemainingSeconds
	isExpired := false
	if activePurchase.PlanType == "hourly" {
		newRemaining = activePurchase.RemainingSeconds - durationSeconds
		if newRemaining <= 0 {
			newRemaining = 0
			isExpired = true
		}
	}

	// Update check-out inside GORM Transaction
	err = repository.CheckOutSession(activeSession.ID, activePurchase.ID, durationSeconds, newRemaining, isExpired)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete check-out session log: " + err.Error()})
		return
	}

	if activePurchase.PlanType == "hourly" {
		// Trigger Firebase Notifications based on new balance
		services.CheckAndSendLowBalanceReminder(user.Phone, newRemaining)
		if isExpired {
			services.SendMembershipExpiredNotification(user.Phone, activePurchase.PlanName)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"type":           "check_out",
		"message":        "Check-Out Successful. Have a great day!",
		"user_name":      getSafeUserName(user),
		"entry_time":     activeSession.EntryTime.Format("03:04 PM"),
		"exit_time":      exitTime.Format("03:04 PM"),
		"duration":       formatDurationSeconds(durationSeconds),
		"hours_deducted": fmt.Sprintf("%.2f hrs", hoursDeducted),
		"remaining":      formatRemainingSeconds(newRemaining, activePurchase.PlanType),
	})
}

// Helpers for responses

func getSafeUserName(user *models.User) string {
	if user.Name != nil && *user.Name != "" {
		return *user.Name
	}
	return user.Phone
}

func formatRemainingSeconds(seconds int, planType string) string {
	if planType != "hourly" {
		return "Unlimited"
	}
	h := seconds / 3600
	m := (seconds % 3600) / 60
	return fmt.Sprintf("%dh %dm", h, m)
}

func formatDurationSeconds(seconds int) string {
	h := seconds / 3600
	m := (seconds % 3600) / 60
	if h > 0 {
		return fmt.Sprintf("%dh %dm", h, m)
	}
	return fmt.Sprintf("%dm", m)
}
