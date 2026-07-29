package routes

import (
	"net/http"

	"gympass/backend/controllers"
	"gympass/backend/middleware"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware configuration for frontend-backend connection
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// Apply CORS
	r.Use(CORSMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	api := r.Group("/api")
	{
		// 1. Public Authentication Routes
		auth := api.Group("/auth")
		auth.Use(middleware.RateLimiter())
		{
			auth.POST("/send-otp", controllers.SendOTP)
			auth.POST("/verify-otp", controllers.VerifyOTP)
		}

		// 2. Admin Auth Route
		api.POST("/admin/login", controllers.AdminLogin)

		// 3. QR Scanner Check-in/Check-out (Gym hardware endpoint)
		api.POST("/scanner/scan", controllers.ScanQR)

		// 4. User Protected Routes
		userRoutes := api.Group("/user")
		userRoutes.Use(middleware.AuthMiddleware("user"))
		{
			userRoutes.POST("/onboard", controllers.OnboardUser)
			userRoutes.GET("/dashboard", controllers.GetUserDashboard)
			userRoutes.GET("/plans", controllers.GetActivePlans)
			userRoutes.GET("/qr", controllers.GenerateQR)
			userRoutes.POST("/payments/initiate", controllers.InitiatePayment)
			userRoutes.POST("/payments/verify", controllers.VerifyPayment)
		}

		// 5. Admin Protected Routes
		adminRoutes := api.Group("/admin")
		adminRoutes.Use(middleware.AuthMiddleware("admin"))
		{
			adminRoutes.GET("/dashboard", controllers.GetAdminDashboardStats)
			adminRoutes.GET("/users", controllers.AdminListUsers)
			adminRoutes.GET("/users/:id", controllers.AdminGetUserDetails)
			adminRoutes.POST("/users/:id/suspend", controllers.AdminSuspendUser)
			adminRoutes.POST("/users/:id/activate", controllers.AdminActivateUser)

			// Plan CRUD
			adminRoutes.GET("/plans", controllers.AdminGetAllPlans)
			adminRoutes.POST("/plans", controllers.AdminCreatePlan)
			adminRoutes.PUT("/plans/:id", controllers.AdminUpdatePlan)
			adminRoutes.DELETE("/plans/:id", controllers.AdminDeletePlan)

			// Settings Configuration
			adminRoutes.GET("/settings", controllers.AdminGetSettings)
			adminRoutes.PUT("/settings", controllers.AdminUpdateSettings)

			// Logs Lists
			adminRoutes.GET("/payments", controllers.AdminListPayments)
			adminRoutes.GET("/sessions", controllers.AdminListSessions)
		}
	}

	return r
}
