package repository

import (
	"errors"
	"time"

	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm"
)

// Legacy compatibility placeholder. Gin routers compile against this file.
// We proxy GORM operations through GORM best practices.

// InitDB is a legacy placeholder to prevent main.go compile breaks
func InitDB(host, port, user, password, dbname, sslmode string) error {
	return nil
}

// Admins Repository

func GetAdminByEmail(email string) (*models.Admin, error) {
	var admin models.Admin
	err := database.DB.Where("email = ?", email).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &admin, nil
}

// Users Repository

func GetUserByPhone(phone string) (*models.User, error) {
	var user models.User
	err := database.DB.Where("phone = ?", phone).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func GetUserByID(id int) (*models.User, error) {
	var user models.User
	err := database.DB.First(&user, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func CreateUser(user *models.User) error {
	return database.DB.Create(user).Error
}

func UpdateUser(user *models.User) error {
	return database.DB.Save(user).Error
}

func GetAllUsers() ([]models.User, error) {
	var users []models.User
	err := database.DB.Order("created_at desc").Find(&users).Error
	return users, err
}

func SearchUsers(q string) ([]models.User, error) {
	var users []models.User
	err := database.DB.Where("name LIKE ? OR phone LIKE ?", "%"+q+"%", "%"+q+"%").Order("created_at desc").Find(&users).Error
	return users, err
}

func SetUserStatus(id int, status string) error {
	return database.DB.Model(&models.User{}).Where("id = ?", id).Update("status", status).Error
}

// Plans Repository

func GetPlanByID(id int) (*models.Plan, error) {
	var plan models.Plan
	err := database.DB.First(&plan, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &plan, nil
}

func GetActivePlans() ([]models.Plan, error) {
	var plans []models.Plan
	err := database.DB.Where("status = ? AND is_visible = ?", "active", true).Order("price asc").Find(&plans).Error
	return plans, err
}

func GetAllPlans() ([]models.Plan, error) {
	var plans []models.Plan
	err := database.DB.Order("id desc").Find(&plans).Error
	return plans, err
}

func CreatePlan(plan *models.Plan) error {
	return database.DB.Create(plan).Error
}

func UpdatePlan(plan *models.Plan) error {
	return database.DB.Save(plan).Error
}

func DeletePlan(id int) error {
	return database.DB.Delete(&models.Plan{}, id).Error
}

// Purchases (Subscriptions) Repository

func CreatePurchase(p *models.Purchase) error {
	return database.DB.Create(p).Error
}

func UpdatePurchase(p *models.Purchase) error {
	return database.DB.Save(p).Error
}

func GetActivePurchaseForUser(userID int) (*models.Purchase, error) {
	var pur models.Purchase
	err := database.DB.Where("user_id = ? AND status = ? AND end_date > ?", userID, "active", time.Now()).Order("created_at desc").First(&pur).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	// Populate Plan details
	var plan models.Plan
	if err := database.DB.First(&plan, pur.PlanID).Error; err == nil {
		pur.PlanName = plan.Name
		pur.PlanType = plan.Type
		pur.Price = plan.Price
	}

	return &pur, nil
}

func GetUserPurchases(userID int) ([]models.Purchase, error) {
	var purchases []models.Purchase
	err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&purchases).Error
	if err != nil {
		return nil, err
	}

	// Populate plan names
	for i := range purchases {
		var plan models.Plan
		if err := database.DB.First(&plan, purchases[i].PlanID).Error; err == nil {
			purchases[i].PlanName = plan.Name
			purchases[i].PlanType = plan.Type
			purchases[i].Price = plan.Price
		}
	}

	return purchases, nil
}

// Payments Repository

func CreatePayment(p *models.Payment) error {
	return database.DB.Create(p).Error
}

func UpdatePaymentStatusByOrderID(orderID, paymentID, status string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&models.Payment{}).Where("razorpay_order_id = ?", orderID).Updates(map[string]interface{}{
			"razorpay_payment_id": paymentID,
			"status":              status,
		}).Error
	})
}

func GetPaymentByOrderID(orderID string) (*models.Payment, error) {
	var payment models.Payment
	err := database.DB.Where("razorpay_order_id = ?", orderID).First(&payment).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &payment, nil
}

func GetAllPayments() ([]map[string]interface{}, error) {
	var payments []models.Payment
	err := database.DB.Order("created_at desc").Find(&payments).Error
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for _, p := range payments {
		var user models.User
		var plan models.Plan

		userName := "Deleted User"
		userPhone := ""
		if err := database.DB.First(&user, p.UserID).Error; err == nil {
			if user.Name != nil {
				userName = *user.Name
			} else {
				userName = "Pending Onboard"
			}
			userPhone = user.Phone
		}

		planName := "Deleted Plan"
		if err := database.DB.First(&plan, p.PlanID).Error; err == nil {
			planName = plan.Name
		}

		results = append(results, map[string]interface{}{
			"id":                  p.ID,
			"uuid":                p.UUID,
			"razorpay_order_id":   p.RazorpayOrderID,
			"razorpay_payment_id": p.RazorpayPaymentID,
			"amount":              p.Amount,
			"status":              p.Status,
			"created_at":          p.CreatedAt,
			"user_name":           userName,
			"user_phone":          userPhone,
			"plan_name":           planName,
		})
	}

	return results, nil
}

// Sessions Repository

func CreateSession(s *models.Session) error {
	return database.DB.Create(s).Error
}

func UpdateSession(s *models.Session) error {
	return database.DB.Save(s).Error
}

func GetActiveSessionForUser(userID int) (*models.Session, error) {
	var s models.Session
	err := database.DB.Where("user_id = ? AND status = ?", userID, "active").First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func GetUserSessions(userID int) ([]models.Session, error) {
	var sessions []models.Session
	err := database.DB.Where("user_id = ?", userID).Order("entry_time desc").Find(&sessions).Error
	return sessions, err
}

func GetAllSessions() ([]models.Session, error) {
	var sessions []models.Session
	err := database.DB.Order("entry_time desc").Find(&sessions).Error
	if err != nil {
		return nil, err
	}

	for i := range sessions {
		var user models.User
		if err := database.DB.First(&user, sessions[i].UserID).Error; err == nil {
			if user.Name != nil {
				sessions[i].UserName = *user.Name
			} else {
				sessions[i].UserName = "Pending Onboard"
			}
			sessions[i].UserPhone = user.Phone
		}
	}

	return sessions, nil
}

// OTP Logs Repository

func CreateOTPLog(phone, code string, expiresAt time.Time) error {
	otpLog := &models.OTPLog{
		Phone:     phone,
		OTPCode:   code,
		ExpiresAt: expiresAt,
	}
	return database.DB.Create(otpLog).Error
}

func GetLastUnverifiedOTP(phone string) (*models.OTPLog, error) {
	var o models.OTPLog
	err := database.DB.Where("phone = ? AND verified = ? AND expires_at > ?", phone, false, time.Now()).Order("created_at desc").First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func VerifyOTPLog(id uint) error {
	return database.DB.Model(&models.OTPLog{}).Where("id = ?", id).Update("verified", true).Error
}

// Settings Repository

func GetSettings() (*models.Settings, error) {
	var s models.Settings
	err := database.DB.First(&s, 1).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func UpdateSettings(s *models.Settings) error {
	return database.DB.Save(s).Error
}

// GORM Transaction Helpers

// VerifyPaymentAndActivateSubscription activates subscription and updates payment in a single GORM transaction.
func VerifyPaymentAndActivateSubscription(orderID, paymentID string, userID, planID, validityDays int, limitHours *int, planType string) (*models.Purchase, error) {
	var purchase models.Purchase

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update Payment status
		if err := tx.Model(&models.Payment{}).Where("razorpay_order_id = ?", orderID).Updates(map[string]interface{}{
			"razorpay_payment_id": paymentID,
			"status":              "success",
		}).Error; err != nil {
			return err
		}

		// 2. Mark old active purchase as expired
		if err := tx.Model(&models.Purchase{}).Where("user_id = ? AND status = ?", userID, "active").Update("status", "expired").Error; err != nil {
			return err
		}

		// 3. Create new Purchase record
		startDate := time.Now()
		endDate := startDate.Add(time.Duration(validityDays) * 24 * time.Hour)
		remainingSeconds := 0
		if planType == "hourly" && limitHours != nil {
			remainingSeconds = *limitHours * 3600
		}

		purchase = models.Purchase{
			UserID:           uint(userID),
			PlanID:           uint(planID),
			Status:           "active",
			StartDate:        startDate,
			EndDate:          endDate,
			RemainingSeconds: remainingSeconds,
		}

		if err := tx.Create(&purchase).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return &purchase, nil
}

// CheckInSession starts a user workout check-in log inside a GORM transaction.
func CheckInSession(userID int) (*models.Session, error) {
	session := &models.Session{
		UserID:    uint(userID),
		EntryTime: time.Now(),
		Status:    "active",
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Verify no other active session exists (Double Check)
		var count int64
		if err := tx.Model(&models.Session{}).Where("user_id = ? AND status = ?", userID, "active").Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return errors.New("already checked in")
		}

		// Create CheckIn
		return tx.Create(session).Error
	})

	if err != nil {
		return nil, err
	}
	return session, nil
}

// CheckOutSession updates session durations and remaining subscription hours inside GORM transaction.
func CheckOutSession(sessionID, purchaseID uint, durationSeconds, newRemaining int, isExpired bool) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		exitTime := time.Now()
		hoursDeducted := float64(durationSeconds) / 3600.0

		// 1. Update session exit
		if err := tx.Model(&models.Session{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
			"exit_time":        exitTime,
			"duration_seconds": durationSeconds,
			"hours_deducted":   hoursDeducted,
			"status":           "completed",
		}).Error; err != nil {
			return err
		}

		// 2. Update remaining time in subscription
		purchaseStatus := "active"
		if isExpired {
			purchaseStatus = "expired"
		}
		if err := tx.Model(&models.Purchase{}).Where("id = ?", purchaseID).Updates(map[string]interface{}{
			"remaining_seconds": newRemaining,
			"status":            purchaseStatus,
		}).Error; err != nil {
			return err
		}

		return nil
	})
}

// Admin stats helper

func GetDashboardStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var totalUsers int64
	database.DB.Model(&models.User{}).Count(&totalUsers)
	stats["total_users"] = totalUsers

	var todayRevenue float64
	today := time.Now().Truncate(24 * time.Hour)
	database.DB.Model(&models.Payment{}).Where("status = ? AND created_at >= ?", "success", today).Select("COALESCE(SUM(amount), 0)").Row().Scan(&todayRevenue)
	stats["today_revenue"] = todayRevenue

	var todayEntries int64
	database.DB.Model(&models.Session{}).Where("entry_time >= ?", today).Count(&todayEntries)
	stats["today_entries"] = todayEntries

	return stats, nil
}
