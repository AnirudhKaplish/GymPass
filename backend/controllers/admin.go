package controllers

import (
	"net/http"
	"strconv"

	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// AdminLogin checks credentials and returns a JWT token
func AdminLogin(c *gin.Context) {
	var req models.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	admin, err := repository.GetAdminByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking admin account"})
		return
	}

	if admin == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Verify password hash
	err = bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate Admin JWT Token
	token, err := utils.GenerateToken(int(admin.ID), "admin", admin.Email, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create authentication session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"admin": gin.H{
			"id":    admin.ID,
			"email": admin.Email,
		},
	})
}

// GetAdminDashboardStats aggregates data for the admin home view
func GetAdminDashboardStats(c *gin.Context) {
	stats, err := repository.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate statistics: " + err.Error()})
		return
	}

	// Load recent 5 payments
	payments, err := repository.GetAllPayments()
	if err == nil {
		limit := 5
		if len(payments) < limit {
			limit = len(payments)
		}
		stats["recent_payments"] = payments[:limit]
	} else {
		stats["recent_payments"] = []interface{}{}
	}

	// Load recent 5 check-ins
	sessions, err := repository.GetAllSessions()
	if err == nil {
		limit := 5
		if len(sessions) < limit {
			limit = len(sessions)
		}
		stats["recent_sessions"] = sessions[:limit]
	} else {
		stats["recent_sessions"] = []interface{}{}
	}

	c.JSON(http.StatusOK, stats)
}

// AdminListUsers returns all users or filters by search query
func AdminListUsers(c *gin.Context) {
	q := c.Query("q")
	var users []models.User
	var err error

	if q != "" {
		users, err = repository.SearchUsers(q)
	} else {
		users, err = repository.GetAllUsers()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user records"})
		return
	}

	c.JSON(http.StatusOK, users)
}

// AdminGetUserDetails returns detailed stats, active plans, and log histories for a single user
func AdminGetUserDetails(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := repository.GetUserByID(id)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found"})
		return
	}

	activePlan, _ := repository.GetActivePurchaseForUser(id)
	sessions, _ := repository.GetUserSessions(id)
	purchases, _ := repository.GetUserPurchases(id)

	c.JSON(http.StatusOK, gin.H{
		"user":           user,
		"active_plan":    activePlan,
		"sessions":       sessions,
		"purchase_history": purchases,
	})
}

// AdminSuspendUser suspends user entries
func AdminSuspendUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = repository.SetUserStatus(id, "suspended")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to suspend user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User suspended successfully"})
}

// AdminActivateUser reactivates a suspended user
func AdminActivateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = repository.SetUserStatus(id, "active")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reactivate user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User reactivated successfully"})
}

// AdminGetSettings loads gym-wide config parameters
func AdminGetSettings(c *gin.Context) {
	settings, err := repository.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load settings"})
		return
	}
	c.JSON(http.StatusOK, settings)
}

// AdminUpdateSettings updates details like opening times and currencies
func AdminUpdateSettings(c *gin.Context) {
	var req models.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settings, err := repository.GetSettings()
	if err != nil || settings == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settings template not found"})
		return
	}

	settings.GymName = req.GymName
	settings.LogoURL = req.LogoURL
	settings.Address = req.Address
	settings.ContactNumber = req.ContactNumber
	settings.Email = req.Email
	settings.OpeningTime = req.OpeningTime
	settings.ClosingTime = req.ClosingTime
	settings.Currency = req.Currency
	settings.Timezone = req.Timezone

	err = repository.UpdateSettings(settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings modifications"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// AdminListPayments fetches global transaction history
func AdminListPayments(c *gin.Context) {
	payments, err := repository.GetAllPayments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load payment transaction history"})
		return
	}
	c.JSON(http.StatusOK, payments)
}

// AdminListSessions fetches check-in histories globally
func AdminListSessions(c *gin.Context) {
	sessions, err := repository.GetAllSessions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch global check-in logs"})
		return
	}
	c.JSON(http.StatusOK, sessions)
}
