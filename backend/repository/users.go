package repository

import (
	"errors"
	"time"

	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm"
)

// Users

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

func UpdateUser(user *models.User) error {
	return database.DB.Save(user).Error
}

// GetUsersByIDs loads several users at once, keyed by ID.
func GetUsersByIDs(ids []uint) (map[uint]models.User, error) {
	result := make(map[uint]models.User)
	if len(ids) == 0 {
		return result, nil
	}

	var users []models.User
	if err := database.DB.Where("id IN ?", ids).Find(&users).Error; err != nil {
		return nil, err
	}
	for _, u := range users {
		result[u.ID] = u
	}
	return result, nil
}

// DisplayName is the name shown to gym owners, falling back to the phone number.
func DisplayName(u models.User) string {
	if u.Name != nil && *u.Name != "" {
		return *u.Name
	}
	return u.Phone
}

// OTP logs

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
	err := database.DB.Where("phone = ? AND verified = ? AND expires_at > ?", phone, false, time.Now().UTC()).Order("created_at desc").First(&o).Error
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

// Owners

func GetOwnerByEmail(email string) (*models.Owner, error) {
	var owner models.Owner
	err := database.DB.Where("email = ?", email).First(&owner).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &owner, nil
}

func GetOwnerByID(id int) (*models.Owner, error) {
	var owner models.Owner
	err := database.DB.First(&owner, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &owner, nil
}

func CreateOwner(owner *models.Owner) error {
	return database.DB.Create(owner).Error
}

// GetUserByPhone finds a member by phone number, or nil.
func GetUserByPhone(phone string) (*models.User, error) {
	var u models.User
	if err := database.DB.Where("phone = ?", phone).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// CreateUser adds a member record.
func CreateUser(u *models.User) error {
	return database.DB.Create(u).Error
}
