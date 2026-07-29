package controllers

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"gympass/backend/config"
	"gympass/backend/database"
	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/utils"

	"github.com/gin-gonic/gin"
)

// SendOTP handles sending/generating OTP
func SendOTP(c *gin.Context) {
	var req models.SendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate OTP (e.g. 6-digit)
	// In dev mode, we can use "123456" for convenience, or random. Let's make it random but return it in response if in dev mode
	rand.Seed(time.Now().UnixNano())
	otp := ""
	if config.AppConfig.DevMode {
		otp = "123456"
	} else {
		// Generate random 6-digit
		otpCode := 100000 + rand.Intn(900000)
		otp = string(rune(otpCode))
	}

	expiresAt := time.Now().Add(5 * time.Minute)
	err := repository.CreateOTPLog(req.Phone, otp, expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OTP log"})
		return
	}

	log.Printf("[SMS OTP] To Phone: %s | OTP: %s", req.Phone, otp)

	response := gin.H{"message": "OTP sent successfully"}
	if config.AppConfig.DevMode {
		response["otp_dev_bypass"] = otp // Send OTP in response for developers
	}

	c.JSON(http.StatusOK, response)
}

func normalizePhone(p string) string {
	var sb strings.Builder
	for _, char := range p {
		if (char >= '0' && char <= '9') || char == '+' {
			sb.WriteRune(char)
		}
	}
	res := sb.String()
	if len(res) == 10 && !strings.HasPrefix(res, "+") {
		res = "+91" + res
	}
	return res
}

// VerifyOTP checks OTP and logs in / signs up user
func VerifyOTP(c *gin.Context) {
	var req models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var firebaseUID string
	var verifiedPhone string
	isFirebaseUsed := req.IDToken != ""

	// In production, DEV_MODE=false requires Firebase ID Token
	if !config.AppConfig.DevMode && !isFirebaseUsed {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Firebase ID token is required"})
		return
	}

	if isFirebaseUsed {
		// Verify via Firebase Admin SDK
		var err error
		verifiedPhone, firebaseUID, err = utils.VerifyFirebaseToken(req.IDToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Firebase token verification failed: " + err.Error()})
			return
		}

		// Ensure the verified phone matches the requested phone number
		if normalizePhone(verifiedPhone) != normalizePhone(req.Phone) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number in token does not match request phone number"})
			return
		}
	} else {
		// Fall back to legacy mock database OTP validation
		otpLog, err := repository.GetLastUnverifiedOTP(req.Phone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking OTP"})
			return
		}

		isValidOTP := false
		if otpLog != nil && otpLog.OTPCode == req.OTP {
			isValidOTP = true
		} else if config.AppConfig.DevMode && len(req.OTP) == 6 {
			isValidOTP = true
		}

		if !isValidOTP {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired OTP"})
			return
		}

		if otpLog != nil {
			err = repository.VerifyOTPLog(otpLog.ID)
			if err != nil {
				log.Println("Warning: Failed to mark OTP log verified:", err)
			}
		}
		verifiedPhone = req.Phone
	}

	normPhone := normalizePhone(verifiedPhone)

	// Admin Check: Compare against ADMIN_PHONES
	isAdmin := false
	adminPhonesList := strings.Split(config.AppConfig.AdminPhones, ",")
	for _, ap := range adminPhonesList {
		if normalizePhone(strings.TrimSpace(ap)) == normPhone {
			isAdmin = true
			break
		}
	}

	if isAdmin {
		// Admin Flow: find or create Admin GORM entry
		var admin models.Admin
		err := database.DB.Where("email = ?", config.AppConfig.AdminEmail).First(&admin).Error
		if err != nil {
			// Create default admin if not found
			admin = models.Admin{
				Email:        config.AppConfig.AdminEmail,
				PasswordHash: "", // Firebase auth used instead of password
			}
			if err := database.DB.Create(&admin).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Admin account record"})
				return
			}
		}

		// Generate Admin JWT
		token, err := utils.GenerateToken(int(admin.ID), "admin", admin.Email, normPhone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Admin token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":       token,
			"role":        "admin",
			"admin_email": admin.Email,
		})
		return
	}

	// Member Flow: find or create User GORM entry
	var user models.User
	err := database.DB.Where("phone = ? OR phone = ?", normPhone, req.Phone).First(&user).Error
	if err != nil {
		// GORM record not found, create new user
		user = models.User{
			Phone:  normPhone,
			Status: "active",
		}
		if firebaseUID != "" {
			user.FirebaseUID = &firebaseUID
		}
		if err := database.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create User record"})
			return
		}
	} else {
		// User exists. Update FirebaseUID if empty
		if firebaseUID != "" && (user.FirebaseUID == nil || *user.FirebaseUID == "") {
			user.FirebaseUID = &firebaseUID
			database.DB.Save(&user)
		}
	}

	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been suspended by the administrator."})
		return
	}

	// Determine if user profile onboarding is complete
	isOnboarded := false
	if user.Name != nil && *user.Name != "" && user.Age != nil && user.Gender != nil {
		isOnboarded = true
	}

	// Generate Member JWT
	token, err := utils.GenerateToken(int(user.ID), "user", "", user.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate User token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":        token,
		"role":         "user",
		"is_onboarded": isOnboarded,
		"user":         user,
	})
}

// OnboardUser completes initial user details
func OnboardUser(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req models.OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := repository.GetUserByID(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.Name = &req.Name
	user.Age = &req.Age
	user.Gender = &req.Gender

	err = repository.UpdateUser(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Onboarding completed successfully",
		"user":    user,
	})
}

// GetUserDashboard returns dashboard aggregated data
func GetUserDashboard(c *gin.Context) {
	userID, _ := c.Get("userID")

	// 1. Fetch User details
	user, err := repository.GetUserByID(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error fetching user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account suspended"})
		return
	}

	// 2. Fetch Active Purchase (active plan)
	activePurchase, err := repository.GetActivePurchaseForUser(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking subscriptions"})
		return
	}

	// 3. Fetch Active Gym Settings
	settings, err := repository.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading settings"})
		return
	}

	// 4. Check for active session
	activeSession, err := repository.GetActiveSessionForUser(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking check-ins"})
		return
	}

	// 5. Fetch Session History
	sessions, err := repository.GetUserSessions(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error fetching sessions"})
		return
	}

	// Format sessions history nicely
	type SessionHistoryItem struct {
		ID            int        `json:"id"`
		EntryTime     time.Time  `json:"entry_time"`
		ExitTime      *time.Time `json:"exit_time"`
		Duration      string     `json:"duration"`
		HoursDeducted float64    `json:"hours_deducted"`
		Status        string     `json:"status"`
	}

	history := []SessionHistoryItem{}
	for _, s := range sessions {
		durationStr := "In Progress"
		hoursDeductedVal := 0.0

		if s.ExitTime != nil {
			dur := s.ExitTime.Sub(s.EntryTime)
			h := int(dur.Hours())
			m := int(dur.Minutes()) % 60
			if h > 0 {
				durationStr = fmt.Sprintf("%dh %dm", h, m)
			} else {
				durationStr = fmt.Sprintf("%dm", m)
			}
		}

		if s.HoursDeducted != nil {
			hoursDeductedVal = *s.HoursDeducted
		}

		history = append(history, SessionHistoryItem{
			ID:            int(s.ID),
			EntryTime:     s.EntryTime,
			ExitTime:      s.ExitTime,
			Duration:      durationStr,
			HoursDeducted: hoursDeductedVal,
			Status:        s.Status,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"user":            user,
		"active_purchase": activePurchase,
		"settings":        settings,
		"active_session":  activeSession,
		"sessions":        history,
	})
}

// GenerateQR generates a new QR code token
func GenerateQR(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Verify user is active
	user, err := repository.GetUserByID(userID.(int))
	if err != nil || user == nil || user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "User suspended or not found"})
		return
	}

	// Generate QR token
	token, err := utils.GenerateQRToken(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_in": 60, // seconds
	})
}
