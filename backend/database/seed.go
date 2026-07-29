package database

import (
	"log"

	"gympass/backend/config"
	"gympass/backend/models"

	"golang.org/x/crypto/bcrypt"
)

func SeedDatabase() {
	log.Println("[SEED] INFO: Checking if database tables require seeding...")

	// 1. Seed Admin
	var adminCount int64
	DB.Model(&models.Admin{}).Count(&adminCount)
	if adminCount == 0 {
		log.Println("[SEED] INFO: Seeding default administrator account...")
		
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(config.AppConfig.AdminPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("[SEED] ERROR: Failed to hash admin password: %v", err)
			return
		}

		admin := &models.Admin{
			Email:        config.AppConfig.AdminEmail,
			PasswordHash: string(hashedPassword),
		}

		if err := DB.Create(admin).Error; err != nil {
			log.Printf("[SEED] ERROR: Failed to seed admin account: %v", err)
		} else {
			log.Printf("[SEED] INFO: Admin seed completed successfully (Email: %s).", admin.Email)
		}
	}

	// 2. Seed Gym Settings
	var settingsCount int64
	DB.Model(&models.Settings{}).Count(&settingsCount)
	if settingsCount == 0 {
		log.Println("[SEED] INFO: Seeding gym configurations...")
		settings := &models.Settings{
			ID:            1,
			GymName:       "GymPass Prime",
			LogoURL:       "/logo.png",
			Address:       "123 Fitness Avenue, Bangalore, India",
			ContactNumber: "+91 98765 43210",
			Email:         "info@gympassprime.com",
			OpeningTime:   "06:00",
			ClosingTime:   "22:00",
			Currency:      "INR",
			Timezone:      "Asia/Kolkata",
		}
		if err := DB.Create(settings).Error; err != nil {
			log.Printf("[SEED] ERROR: Failed to seed settings: %v", err)
		} else {
			log.Println("[SEED] INFO: Settings seed completed successfully.")
		}
	}

	// 3. Seed Sample Plans
	var plansCount int64
	DB.Model(&models.Plan{}).Count(&plansCount)
	if plansCount == 0 {
		log.Println("[SEED] INFO: Seeding subscription plans...")
		tenHours := 10
		twentyFiveHours := 25
		fiftyHours := 50

		plans := []models.Plan{
			{
				Name:         "Hourly Pack",
				Type:         "hourly",
				Price:        800.00,
				ValidityDays: 30,
				LimitHours:   &tenHours,
				Description:  "Prepaid 10 hours gym time valid for 30 days.",
				Status:       "active",
				IsVisible:    true,
			},
			{
				Name:         "25 Hour Pack",
				Type:         "hourly",
				Price:        1800.00,
				ValidityDays: 90,
				LimitHours:   &twentyFiveHours,
				Description:  "Prepaid 25 hours gym time valid for 90 days.",
				Status:       "active",
				IsVisible:    true,
			},
			{
				Name:         "50 Hour Pack",
				Type:         "hourly",
				Price:        3200.00,
				ValidityDays: 180,
				LimitHours:   &fiftyHours,
				Description:  "Prepaid 50 hours gym time valid for 180 days.",
				Status:       "active",
				IsVisible:    true,
			},
			{
				Name:         "Monthly Membership",
				Type:         "monthly",
				Price:        1500.00,
				ValidityDays: 30,
				LimitHours:   nil,
				Description:  "Unlimited gym access for 30 days.",
				Status:       "active",
				IsVisible:    true,
			},
			{
				Name:         "Quarterly Membership",
				Type:         "quarterly",
				Price:        4000.00,
				ValidityDays: 90,
				LimitHours:   nil,
				Description:  "Unlimited gym access for 90 days.",
				Status:       "active",
				IsVisible:    true,
			},
			{
				Name:         "Yearly Membership",
				Type:         "yearly",
				Price:        12000.00,
				ValidityDays: 365,
				LimitHours:   nil,
				Description:  "Unlimited gym access for 365 days.",
				Status:       "active",
				IsVisible:    true,
			},
		}

		for _, p := range plans {
			if err := DB.Create(&p).Error; err != nil {
				log.Printf("[SEED] ERROR: Failed to seed plan '%s': %v", p.Name, err)
			}
		}
		log.Println("[SEED] INFO: Plans seed completed successfully.")
	}

	log.Println("[SEED] INFO: Seeding operations finished.")
}
