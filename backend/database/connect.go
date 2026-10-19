package database

import (
	"log"
	"os"
	"time"

	"gympass/backend/config"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	var db *gorm.DB
	var err error

	// Determine Log level based on DevMode
	logLevel := logger.Error
	if config.AppConfig.DevMode {
		logLevel = logger.Info
	}

	// Create custom logger with slow query threshold (e.g. 200ms)
	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	gormConfig := &gorm.Config{
		PrepareStmt: true, // Enable prepared statements for performance
		Logger:      gormLogger,
		// Relations are resolved with Preload; skipping DB-level foreign keys keeps
		// AutoMigrate simple on SQLite and PostgreSQL alike.
		DisableForeignKeyConstraintWhenMigrating: true,
		// Store every timestamp in UTC so range comparisons are consistent.
		NowFunc: func() time.Time { return time.Now().UTC() },
	}

	driver := config.AppConfig.DBDriver
	log.Printf("[DATABASE] INFO: Connecting to database using driver: %s", driver)

	if driver == "postgres" {
		// PostgreSQL Connection
		db, err = gorm.Open(postgres.Open(config.AppConfig.DatabaseURL), gormConfig)
		if err != nil {
			log.Fatalf("[DATABASE] FATAL: Failed to connect to PostgreSQL: %v", err)
		}
	} else {
		// SQLite Connection (Default)
		// Ensure parent database folder exists
		dbDir := "database"
		if err := os.MkdirAll(dbDir, os.ModePerm); err != nil {
			log.Fatalf("[DATABASE] FATAL: Failed to create database directory: %v", err)
		}

		db, err = gorm.Open(sqlite.Open(config.AppConfig.DBPath), gormConfig)
		if err != nil {
			log.Fatalf("[DATABASE] FATAL: Failed to connect to SQLite: %v", err)
		}

		// SQLite specific configurations
		sqlDB, err := db.DB()
		if err == nil {
			// 1. Enable WAL Mode
			if _, err := sqlDB.Exec("PRAGMA journal_mode=WAL;"); err != nil {
				log.Printf("[DATABASE] ERROR: Failed to enable WAL mode: %v", err)
			} else {
				log.Println("[DATABASE] INFO: SQLite WAL mode enabled successfully.")
			}

			// 2. Enable Foreign Key Constraints
			if _, err := sqlDB.Exec("PRAGMA foreign_keys=ON;"); err != nil {
				log.Printf("[DATABASE] ERROR: Failed to enable foreign keys: %v", err)
			} else {
				log.Println("[DATABASE] INFO: SQLite Foreign Keys constraint enabled.")
			}
		}
	}

	// Configure connection pooling
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
		log.Println("[DATABASE] INFO: Connection pool limits and lifetime configured.")
	}

	DB = db
	log.Println("[DATABASE] INFO: Database connection completed successfully.")

	// Execute migrations & seeds
	RunMigrations()
	SeedDatabase()
}
