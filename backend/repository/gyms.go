package repository

import (
	"errors"
	"strings"

	"gympass/backend/database"
	"gympass/backend/models"

	"gorm.io/gorm"
)

// Gyms

func CreateGym(g *models.Gym) error {
	return database.DB.Create(g).Error
}

func UpdateGym(g *models.Gym) error {
	// Photos and plans are managed through their own endpoints.
	return database.DB.Omit("Photos", "Plans").Save(g).Error
}

// GetGymByID loads a gym with its photos.
func GetGymByID(id int) (*models.Gym, error) {
	var gym models.Gym
	err := database.DB.Preload("Photos").First(&gym, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &gym, nil
}

// GetOwnerGym loads a gym only if it belongs to the given owner.
func GetOwnerGym(ownerID, gymID int) (*models.Gym, error) {
	var gym models.Gym
	err := database.DB.Preload("Photos").Where("id = ? AND owner_id = ?", gymID, ownerID).First(&gym).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &gym, nil
}

func ListOwnerGyms(ownerID int) ([]models.Gym, error) {
	var gyms []models.Gym
	err := database.DB.Preload("Photos").Where("owner_id = ?", ownerID).Order("created_at asc").Find(&gyms).Error
	return gyms, err
}

// ListActiveGyms returns active gyms with photos and their active plans.
// A non-empty query matches the gym name, city or address.
func ListActiveGyms(query string) ([]models.Gym, error) {
	var gyms []models.Gym

	db := database.DB.
		Preload("Photos").
		Preload("Plans", "status = ? AND is_visible = ?", "active", true).
		Where("status = ?", "active")

	q := strings.ToLower(strings.TrimSpace(query))
	if q != "" {
		like := "%" + q + "%"
		db = db.Where("(LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(address) LIKE ?)", like, like, like)
	}

	err := db.Order("name asc").Find(&gyms).Error
	return gyms, err
}

// GetActiveGymDetail loads one active gym with photos and its active plans.
func GetActiveGymDetail(id int) (*models.Gym, error) {
	var gym models.Gym
	err := database.DB.
		Preload("Photos").
		Preload("Plans", "status = ? AND is_visible = ?", "active", true).
		Where("status = ?", "active").
		First(&gym, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &gym, nil
}

// GetGymsByIDs loads several gyms (without photos or plans), keyed by ID.
func GetGymsByIDs(ids []uint) (map[uint]models.Gym, error) {
	result := make(map[uint]models.Gym)
	if len(ids) == 0 {
		return result, nil
	}

	var gyms []models.Gym
	if err := database.DB.Unscoped().Where("id IN ?", ids).Find(&gyms).Error; err != nil {
		return nil, err
	}
	for _, g := range gyms {
		result[g.ID] = g
	}
	return result, nil
}

// Gym photos

func CountGymPhotos(gymID uint) (int64, error) {
	var count int64
	err := database.DB.Model(&models.GymPhoto{}).Where("gym_id = ?", gymID).Count(&count).Error
	return count, err
}

func AddGymPhoto(p *models.GymPhoto) error {
	return database.DB.Create(p).Error
}

func GetGymPhoto(gymID, photoID int) (*models.GymPhoto, error) {
	var photo models.GymPhoto
	err := database.DB.Where("id = ? AND gym_id = ?", photoID, gymID).First(&photo).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &photo, nil
}

func DeleteGymPhoto(p *models.GymPhoto) error {
	return database.DB.Delete(p).Error
}

// Plans

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

func ListGymPlans(gymID uint) ([]models.Plan, error) {
	var plans []models.Plan
	err := database.DB.Where("gym_id = ?", gymID).Order("price asc").Find(&plans).Error
	return plans, err
}

func CreatePlan(plan *models.Plan) error {
	return database.DB.Create(plan).Error
}

func UpdatePlan(plan *models.Plan) error {
	return database.DB.Save(plan).Error
}

// DeletePlan soft-deletes a plan. Memberships already sold keep their own copy
// of the plan details, so they are unaffected.
func DeletePlan(id uint) error {
	return database.DB.Delete(&models.Plan{}, id).Error
}
