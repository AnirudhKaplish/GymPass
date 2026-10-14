package database

import (
	"log"

	"gympass/backend/config"
	"gympass/backend/models"

	"golang.org/x/crypto/bcrypt"
)

const (
	DemoOwnerEmail    = "owner@gympass.com"
	DemoOwnerPassword = "owner12345"
)

// SeedDatabase inserts a demo owner with two gyms so the app can be explored
// straight after install. It only runs when SEED_DEMO_DATA is on (the default in
// DEV_MODE) and the owners table is empty.
func SeedDatabase() {
	if !config.AppConfig.SeedDemoData {
		return
	}

	var ownerCount int64
	DB.Model(&models.Owner{}).Count(&ownerCount)
	if ownerCount > 0 {
		return
	}

	log.Println("[SEED] INFO: Seeding demo owner and gyms...")

	hash, err := bcrypt.GenerateFromPassword([]byte(DemoOwnerPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[SEED] ERROR: Failed to hash demo owner password: %v", err)
		return
	}

	owner := &models.Owner{
		Name:         "Demo Owner",
		Email:        DemoOwnerEmail,
		Phone:        "+919876543210",
		PasswordHash: string(hash),
	}
	if err := DB.Create(owner).Error; err != nil {
		log.Printf("[SEED] ERROR: Failed to seed demo owner: %v", err)
		return
	}

	gyms := []models.Gym{
		{
			OwnerID:       owner.ID,
			Name:          "Iron Paradise Gym",
			Description:   "Free weights, cardio floor and a functional training zone.",
			Address:       "100 Feet Road, Indiranagar, Bengaluru",
			City:          "Bengaluru",
			Latitude:      12.9784,
			Longitude:     77.6408,
			ContactNumber: "+91 98765 43210",
			OpeningTime:   "05:30",
			ClosingTime:   "22:30",
			Timezone:      "Asia/Kolkata",
			Status:        "active",
		},
		{
			OwnerID:       owner.ID,
			Name:          "FitHub Koramangala",
			Description:   "Strength and conditioning with certified trainers on the floor.",
			Address:       "80 Feet Road, Koramangala 4th Block, Bengaluru",
			City:          "Bengaluru",
			Latitude:      12.9352,
			Longitude:     77.6245,
			ContactNumber: "+91 98765 43211",
			OpeningTime:   "06:00",
			ClosingTime:   "22:00",
			Timezone:      "Asia/Kolkata",
			Status:        "active",
		},
	}

	for i := range gyms {
		if err := DB.Create(&gyms[i]).Error; err != nil {
			log.Printf("[SEED] ERROR: Failed to seed gym '%s': %v", gyms[i].Name, err)
			continue
		}

		plans := []models.Plan{
			{GymID: gyms[i].ID, Name: "Pay per hour", Type: models.PlanTypeHourly, Price: 100, ValidityDays: 0,
				Description: "Prepaid hours. Only the time you actually train is counted, and hours never expire.", Status: "active", IsVisible: true},
			{GymID: gyms[i].ID, Name: "Monthly", Type: models.PlanTypeMonthly, Price: 1500, ValidityDays: 30,
				Description: "Unlimited visits for 30 days.", Status: "active", IsVisible: true},
			{GymID: gyms[i].ID, Name: "Quarterly", Type: models.PlanTypeQuarterly, Price: 4000, ValidityDays: 90,
				Description: "Unlimited visits for 90 days.", Status: "active", IsVisible: true},
			{GymID: gyms[i].ID, Name: "Yearly", Type: models.PlanTypeYearly, Price: 12000, ValidityDays: 365,
				Description: "Unlimited visits for a full year.", Status: "active", IsVisible: true},
		}
		for j := range plans {
			if err := DB.Create(&plans[j]).Error; err != nil {
				log.Printf("[SEED] ERROR: Failed to seed plan '%s': %v", plans[j].Name, err)
			}
		}
	}

	log.Printf("[SEED] INFO: Demo owner ready (email: %s, password: %s).", DemoOwnerEmail, DemoOwnerPassword)
}
