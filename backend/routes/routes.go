package routes

import (
	"net/http"

	"gympass/backend/config"
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

	// Gym photo uploads are limited to 5 MB each, up to 10 per request.
	r.MaxMultipartMemory = 8 << 20

	// Apply CORS
	r.Use(CORSMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	// Uploaded gym photos (directory listing is off)
	r.Static("/uploads", config.AppConfig.UploadDir)

	api := r.Group("/api")
	{
		// 1. Member authentication (phone OTP)
		auth := api.Group("/auth")
		auth.Use(middleware.RateLimiter())
		{
			auth.POST("/send-otp", controllers.SendOTP)
			auth.POST("/verify-otp", controllers.VerifyOTP)
		}

		// 2. Gym owner authentication (email + password)
		api.POST("/owner/register", middleware.RateLimiter(), controllers.OwnerRegister)
		api.POST("/owner/login", middleware.RateLimiter(), controllers.OwnerLogin)

		// 3. Member routes
		userRoutes := api.Group("/user")
		userRoutes.Use(middleware.AuthMiddleware("user"))
		{
			userRoutes.POST("/onboard", controllers.OnboardUser)
			userRoutes.GET("/dashboard", controllers.GetUserDashboard)
			userRoutes.GET("/qr", controllers.GenerateQR)

			// Find gyms: nearest first with ?lat=&lng=, search with ?q=
			userRoutes.GET("/gyms", controllers.ListGyms)
			userRoutes.GET("/gyms/:id", controllers.GetGymDetail)

			// Buy a plan online (UPI / cards via Razorpay) or ask to pay cash
			userRoutes.POST("/payments/initiate", controllers.InitiatePayment)
			userRoutes.POST("/payments/verify", controllers.VerifyPayment)
			userRoutes.POST("/memberships/cash-request", controllers.CreateCashRequest)
			userRoutes.POST("/requests/:id/cancel", controllers.CancelCashRequest)

			userRoutes.GET("/notifications", controllers.ListNotifications)
			userRoutes.POST("/notifications/read", controllers.MarkNotificationsRead)
		}

		// 4. Gym owner routes. Everything is scoped to gyms the owner registered.
		ownerRoutes := api.Group("/owner")
		ownerRoutes.Use(middleware.AuthMiddleware("owner"))
		{
			ownerRoutes.GET("/me", controllers.OwnerMe)

			// Gyms and photos
			ownerRoutes.GET("/gyms", controllers.OwnerListGyms)
			ownerRoutes.POST("/gyms", controllers.OwnerCreateGym)
			ownerRoutes.GET("/gyms/:id", controllers.OwnerGetGym)
			ownerRoutes.PUT("/gyms/:id", controllers.OwnerUpdateGym)
			ownerRoutes.POST("/gyms/:id/photos", controllers.OwnerUploadPhotos)
			ownerRoutes.DELETE("/gyms/:id/photos/:photoId", controllers.OwnerDeletePhoto)

			// Plans
			ownerRoutes.GET("/gyms/:id/plans", controllers.OwnerListPlans)
			ownerRoutes.POST("/gyms/:id/plans", controllers.OwnerCreatePlan)
			ownerRoutes.PUT("/plans/:planId", controllers.OwnerUpdatePlan)
			ownerRoutes.DELETE("/plans/:planId", controllers.OwnerDeletePlan)

			// Dashboard and logs
			ownerRoutes.GET("/gyms/:id/dashboard", controllers.OwnerDashboard)
			ownerRoutes.GET("/gyms/:id/members", controllers.OwnerListMembers)
			ownerRoutes.POST("/gyms/:id/members", controllers.OwnerAddMember)
			ownerRoutes.GET("/gyms/:id/sessions", controllers.OwnerListSessions)
			ownerRoutes.GET("/gyms/:id/payments", controllers.OwnerListPayments)

			// Cash requests
			ownerRoutes.GET("/gyms/:id/requests", controllers.OwnerListRequests)
			ownerRoutes.POST("/requests/:id/approve", controllers.OwnerApproveRequest)
			ownerRoutes.POST("/requests/:id/reject", controllers.OwnerRejectRequest)

			// Punch members in and out
			ownerRoutes.POST("/gyms/:id/scan", controllers.OwnerScan)
			ownerRoutes.POST("/sessions/:id/checkout", controllers.OwnerCheckoutSession)
		}
	}

	return r
}
