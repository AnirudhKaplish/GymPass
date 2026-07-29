package utils

import (
	"errors"
	"fmt"
	"time"

	"gympass/backend/config"

	"github.com/golang-jwt/jwt/v5"
)

type QRClaims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateQRToken creates a secure, signed token valid for 60 seconds.
func GenerateQRToken(userID int) (string, error) {
	expirationTime := time.Now().Add(60 * time.Second)
	claims := &QRClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("GP-%s", tokenString), nil
}

// VerifyQRToken parses and validates the secure token and returns the user ID.
func VerifyQRToken(tokenString string) (int, error) {
	// Strip "GP-" prefix
	if len(tokenString) < 4 || tokenString[:3] != "GP-" {
		return 0, errors.New("invalid QR token format")
	}
	actualToken := tokenString[3:]

	claims := &QRClaims{}
	token, err := jwt.ParseWithClaims(actualToken, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})

	if err != nil {
		return 0, fmt.Errorf("failed to parse QR token: %w", err)
	}

	if !token.Valid {
		return 0, errors.New("QR token is invalid or expired")
	}

	return claims.UserID, nil
}
