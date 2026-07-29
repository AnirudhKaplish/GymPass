package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBDriver          string
	DBPath            string
	DatabaseURL       string // For PostgreSQL later
	ServerPort        string
	JWTSecret         string
	RazorpayKeyID     string
	RazorpayKeySecret string
	DevMode           bool
	
	// Redesign requirements
	AdminEmail        string
	AdminPassword     string
	AdminPhone        string
	OTPExpiry         int // in seconds
	QRRefreshSeconds  int // in seconds

	// Firebase config
	FirebaseProjectID string
	AdminPhones       string
}

var AppConfig *Config

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Info: .env file not found. Reading direct environment variables.")
	}

	AppConfig = &Config{
		DBDriver:          getEnv("DB_DRIVER", "sqlite"),
		DBPath:            getEnv("DB_PATH", "database/gympass.db"),
		DatabaseURL:       getEnv("DATABASE_URL", "host=localhost port=5432 user=gympass_user password=gympass_password dbname=gympass_db sslmode=disable"),
		ServerPort:        getEnv("PORT", "8080"),
		JWTSecret:         getEnv("JWT_SECRET", "super_secret_jwt_key_gympass_2026"),
		RazorpayKeyID:     getEnv("RAZORPAY_KEY_ID", "rzp_test_mock_id_123"),
		RazorpayKeySecret: getEnv("RAZORPAY_KEY_SECRET", "rzp_test_mock_secret_abc"),
		DevMode:           getEnv("DEV_MODE", "true") == "true",
		
		AdminEmail:        getEnv("ADMIN_EMAIL", "admin@gympass.com"),
		AdminPassword:     getEnv("ADMIN_PASSWORD", "admin123"),
		AdminPhone:        getEnv("ADMIN_PHONE", "9876543210"),
		OTPExpiry:         getEnvAsInt("OTP_EXPIRY", 300),          // Default 5 mins
		QRRefreshSeconds:  getEnvAsInt("QR_REFRESH_SECONDS", 60),   // Default 60 seconds
		
		FirebaseProjectID: getEnv("FIREBASE_PROJECT_ID", "gympass-587a1"),
		AdminPhones:       getEnv("ADMIN_PHONES", "+919876543210"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return fallback
	}
	val, err := strconv.Atoi(valueStr)
	if err != nil {
		return fallback
	}
	return val
}
