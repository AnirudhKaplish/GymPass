package utils

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gympass/backend/config"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

// VerifyFirebaseToken parses and verifies a Firebase ID Token using the official Go Admin SDK
func VerifyFirebaseToken(idToken string) (string, string, error) {
	if idToken == "" {
		return "", "", errors.New("empty firebase id token")
	}

	// Determine Firebase Project ID configuration
	projectID := config.AppConfig.FirebaseProjectID
	if projectID == "" {
		projectID = "gympass-587a1" // fallback default
	}

	// Dev mode offline bypass for mock testing
	if config.AppConfig.DevMode && strings.HasPrefix(idToken, "mock_token_") {
		// Mock token format: mock_token_[phone]_[uid]
		parts := strings.Split(idToken, "_")
		if len(parts) >= 4 {
			phone := parts[2]
			uid := parts[3]
			return phone, uid, nil
		}
		// General fallback mock credentials
		return "+919876543210", "mock_uid_123456", nil
	}

	// Official verification sequence
	ctx := context.Background()
	fbConfig := &firebase.Config{
		ProjectID: projectID,
	}

	app, err := firebase.NewApp(ctx, fbConfig, option.WithoutAuthentication())
	if err != nil {
		return "", "", fmt.Errorf("failed to initialize firebase admin app: %v", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return "", "", fmt.Errorf("failed to get firebase auth client: %v", err)
	}

	// Verify ID token (checks signatures, expiration, projectID aud, etc.)
	token, err := authClient.VerifyIDToken(ctx, idToken)
	if err != nil {
		return "", "", fmt.Errorf("firebase token validation failed: %v", err)
	}

	// Extract phone number from claims
	phoneNumber, _ := token.Claims["phone_number"].(string)
	if phoneNumber == "" {
		return "", "", errors.New("firebase id token does not contain a verified phone number")
	}

	return phoneNumber, token.UID, nil
}
