package database

import (
	"log"

	"gympass/backend/models"
)

func RunMigrations() {
	log.Println("[MIGRATION] INFO: Starting GORM schema AutoMigrate...")

	err := DB.AutoMigrate(
		&models.User{},
		&models.Owner{},
		&models.Gym{},
		&models.GymPhoto{},
		&models.Plan{},
		&models.Membership{},
		&models.Payment{},
		&models.Session{},
		&models.Notification{},
		&models.OTPLog{},
	)

	if err != nil {
		log.Fatalf("[MIGRATION] FATAL: AutoMigrate failed: %v", err)
	}

	log.Println("[MIGRATION] INFO: GORM AutoMigrate completed successfully.")
}
