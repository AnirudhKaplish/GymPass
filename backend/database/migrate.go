package database

import (
	"log"

	"gympass/backend/models"
)

func RunMigrations() {
	log.Println("[MIGRATION] INFO: Starting GORM schema AutoMigrate...")
	
	err := DB.AutoMigrate(
		&models.User{},
		&models.Admin{},
		&models.Plan{},
		&models.Purchase{},
		&models.Payment{},
		&models.Session{},
		&models.OTPLog{},
		&models.Settings{},
	)
	
	if err != nil {
		log.Fatalf("[MIGRATION] FATAL: AutoMigrate failed: %v", err)
	}
	
	log.Println("[MIGRATION] INFO: GORM AutoMigrate completed successfully.")
}
