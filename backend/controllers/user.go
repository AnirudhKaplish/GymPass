package controllers

import (
	crand "crypto/rand"
	"fmt"
	"log"
	"math/big"
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

	// Dev mode uses a fixed code for convenience; otherwise a random 6-digit code.
	otp := "123456"
	if !config.AppConfig.DevMode {
		n, err := crand.Int(crand.Reader, big.NewInt(900000))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
			return
		}
		otp = fmt.Sprintf("%06d", 100000+n.Int64())
	}

	expiresAt := time.Now().UTC().Add(time.Duration(config.AppConfig.OTPExpiry) * time.Second)
	if err := repository.CreateOTPLog(req.Phone, otp, expiresAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OTP log"})
		return
	}

	response := gin.H{"message": "OTP sent successfully"}
	if config.AppConfig.DevMode {
		log.Printf("[SMS OTP] To Phone: %s | OTP: %s", req.Phone, otp)
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

// VerifyOTP checks OTP and logs in / signs up a member
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
		// Fall back to legacy mock database OTP validation (dev mode only)
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
			if err := repository.VerifyOTPLog(otpLog.ID); err != nil {
				log.Println("Warning: Failed to mark OTP log verified:", err)
			}
		}
		verifiedPhone = req.Phone
	}

	normPhone := normalizePhone(verifiedPhone)

	// Find or create the member
	var user models.User
	err := database.DB.Where("phone = ? OR phone = ?", normPhone, req.Phone).First(&user).Error
	if err != nil {
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
	} else if firebaseUID != "" && (user.FirebaseUID == nil || *user.FirebaseUID == "") {
		user.FirebaseUID = &firebaseUID
		database.DB.Save(&user)
	}

	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been suspended."})
		return
	}

	// Determine if user profile onboarding is complete
	isOnboarded := user.Name != nil && *user.Name != "" && user.Age != nil && user.Gender != nil

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
	var req models.OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := repository.GetUserByID(currentID(c))
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

	if err := repository.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Onboarding completed successfully",
		"user":    user,
	})
}

// GenerateQR generates a new QR code token for the member. The same QR works at
// every gym; the gym is decided by whose scanner reads it.
func GenerateQR(c *gin.Context) {
	user, ok := activeUser(c)
	if !ok {
		return
	}

	token, err := utils.GenerateQRToken(int(user.ID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_in": 60, // seconds
	})
}
