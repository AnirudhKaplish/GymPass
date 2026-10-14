package main

import (
	"log"
	"os"

	// Embed the timezone database so gym timezones resolve on minimal servers too.
	_ "time/tzdata"

	"gympass/backend/config"
	"gympass/backend/database"
	"gympass/backend/routes"
	"gympass/backend/services"
)

func main() {
	log.Println("Starting GymPass Backend Server...")

	// 1. Load Configurations
	config.LoadConfig()

	// 2. Initialize Database Connection (runs migrations and demo seed)
	database.ConnectDatabase()

	// 3. Make sure the photo upload folder exists
	if err := os.MkdirAll(config.AppConfig.UploadDir, os.ModePerm); err != nil {
		log.Fatalf("Critical: could not create upload directory: %v", err)
	}

	// 4. Start the background job: expiry reminders, expiring memberships, stale visits
	services.StartScheduler()

	// 5. Initialize routes and start server
	router := routes.SetupRouter()

	log.Printf("Server listening on port %s", config.AppConfig.ServerPort)
	if err := router.Run(":" + config.AppConfig.ServerPort); err != nil {
		log.Fatalf("Critical: Server failed to start: %v", err)
	}
}
