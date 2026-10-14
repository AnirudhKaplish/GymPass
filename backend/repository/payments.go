package repository

import (
	"errors"
	"time"

	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm"
)

// ErrAlreadyProcessed means a payment was already approved, rejected or completed.
var ErrAlreadyProcessed = errors.New("this payment has already been processed")

func CreatePayment(p *models.Payment) error {
	return database.DB.Create(p).Error
}

func GetPaymentByID(id uint) (*models.Payment, error) {
	var payment models.Payment
	err := database.DB.First(&payment, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &payment, nil
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

// FindPendingCashRequest finds an open cash request for the same member, gym and plan.
func FindPendingCashRequest(userID, gymID, planID uint) (*models.Payment, error) {
	var payment models.Payment
	err := database.DB.
		Where("user_id = ? AND gym_id = ? AND plan_id = ? AND method = ? AND status = ?",
			userID, gymID, planID, models.PaymentMethodCash, models.PaymentPending).
		First(&payment).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &payment, nil
}

// ListUserPendingRequests returns a member's cash requests still waiting for the owner.
func ListUserPendingRequests(userID int) ([]models.Payment, error) {
	var payments []models.Payment
	err := database.DB.
		Where("user_id = ? AND method = ? AND status = ?", userID, models.PaymentMethodCash, models.PaymentPending).
		Order("created_at desc").
		Find(&payments).Error
	if err != nil {
		return nil, err
	}
	attachPaymentInfo(payments)
	return payments, nil
}

// ListGymPayments returns a gym's payments, newest first. status and method filter when non-empty.
func ListGymPayments(gymID uint, status, method string, limit int) ([]models.Payment, error) {
	var payments []models.Payment
	db := database.DB.Where("gym_id = ?", gymID)
	if status != "" {
		db = db.Where("status = ?", status)
	}
	if method != "" {
		db = db.Where("method = ?", method)
	}
	if limit > 0 {
		db = db.Limit(limit)
	}
	if err := db.Order("created_at desc").Find(&payments).Error; err != nil {
		return nil, err
	}
	attachPaymentInfo(payments)
	return payments, nil
}

// attachPaymentInfo fills member and gym names on payments.
func attachPaymentInfo(payments []models.Payment) {
	if len(payments) == 0 {
		return
	}

	userIDs := make([]uint, 0, len(payments))
	gymIDs := make([]uint, 0, len(payments))
	for _, p := range payments {
		userIDs = append(userIDs, p.UserID)
		gymIDs = append(gymIDs, p.GymID)
	}

	users, _ := GetUsersByIDs(userIDs)
	gyms, _ := GetGymsByIDs(gymIDs)

	for i := range payments {
		if u, ok := users[payments[i].UserID]; ok {
			payments[i].UserName = DisplayName(u)
			payments[i].UserPhone = u.Phone
		}
		if g, ok := gyms[payments[i].GymID]; ok {
			payments[i].GymName = g.Name
		}
	}
}

// claimPending moves a pending payment to a new status exactly once.
// It reports ErrAlreadyProcessed if someone else got there first.
func claimPending(tx *gorm.DB, paymentID uint, updates map[string]interface{}) error {
	res := tx.Model(&models.Payment{}).
		Where("id = ? AND status = ?", paymentID, models.PaymentPending).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrAlreadyProcessed
	}
	return nil
}

// activateForPayment loads the payment and its plan and grants the membership.
func activateForPayment(tx *gorm.DB, paymentID uint) (*models.Membership, error) {
	var payment models.Payment
	if err := tx.First(&payment, paymentID).Error; err != nil {
		return nil, err
	}

	// The plan may have been deleted since the request was made; the member
	// still paid for it, so it is loaded including soft-deleted rows.
	var plan models.Plan
	if err := tx.Unscoped().First(&plan, payment.PlanID).Error; err != nil {
		return nil, err
	}

	membership, err := ActivateMembership(tx, payment.UserID, payment.GymID, &plan, payment.Hours)
	if err != nil {
		return nil, err
	}

	if err := tx.Model(&models.Payment{}).Where("id = ?", paymentID).Update("membership_id", membership.ID).Error; err != nil {
		return nil, err
	}
	return membership, nil
}

// CompleteOnlinePayment marks an online payment as paid and activates the membership atomically.
func CompleteOnlinePayment(paymentID uint, razorpayPaymentID string) (*models.Membership, error) {
	var membership *models.Membership

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()
		if err := claimPending(tx, paymentID, map[string]interface{}{
			"razorpay_payment_id": razorpayPaymentID,
			"status":              models.PaymentSuccess,
			"resolved_at":         now,
		}); err != nil {
			return err
		}

		m, err := activateForPayment(tx, paymentID)
		if err != nil {
			return err
		}
		membership = m
		return nil
	})
	if err != nil {
		return nil, err
	}
	return membership, nil
}

// ApproveCashRequest records that the owner received the cash and activates the membership atomically.
func ApproveCashRequest(paymentID uint) (*models.Membership, error) {
	var membership *models.Membership

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()
		if err := claimPending(tx, paymentID, map[string]interface{}{
			"status":      models.PaymentSuccess,
			"resolved_at": now,
		}); err != nil {
			return err
		}

		m, err := activateForPayment(tx, paymentID)
		if err != nil {
			return err
		}
		membership = m
		return nil
	})
	if err != nil {
		return nil, err
	}
	return membership, nil
}

// CloseCashRequest ends a pending cash request without granting anything.
// status is 'rejected' (owner) or 'cancelled' (member).
func CloseCashRequest(paymentID uint, status string) error {
	return claimPending(database.DB, paymentID, map[string]interface{}{
		"status":      status,
		"resolved_at": time.Now().UTC(),
	})
}
