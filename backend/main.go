package main

import (
	"log"

	"gympass/backend/config"
	"gympass/backend/database"
	"gympass/backend/routes"
)

func main() {
	log.Println("Starting GymPass Backend Server...")

	// 1. Load Configurations
	config.LoadConfig()

	// 2. Initialize Database Connection
	database.ConnectDatabase()

	// 3. Initialize routes and start server
	router := routes.SetupRouter()

	log.Printf("Server listening on port %s", config.AppConfig.ServerPort)
	if err := router.Run(":" + config.AppConfig.ServerPort); err != nil {
		log.Fatalf("Critical: Server failed to start: %v", err)
	}
}
