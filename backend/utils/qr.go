package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"gympass/backend/config"

	"github.com/golang-jwt/jwt/v5"
)

type QRClaims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

func randomTokenID() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("t%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// GenerateQRToken creates a secure, signed, single-use token valid for 60 seconds.
// The token identifies the member only; the gym is decided by whichever gym's
// owner console scans it.
func GenerateQRToken(userID int) (string, error) {
	now := time.Now()
	claims := &QRClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        randomTokenID(),
			ExpiresAt: jwt.NewNumericDate(now.Add(60 * time.Second)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("GP-%s", tokenString), nil
}

// VerifyQRToken parses and validates the secure token. It returns the member's
// user ID together with the token's unique ID and expiry so callers can enforce
// single use.
func VerifyQRToken(tokenString string) (int, string, time.Time, error) {
	// Strip "GP-" prefix
	if len(tokenString) < 4 || tokenString[:3] != "GP-" {
		return 0, "", time.Time{}, errors.New("invalid QR token format")
	}
	actualToken := tokenString[3:]

	claims := &QRClaims{}
	token, err := jwt.ParseWithClaims(actualToken, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))

	if err != nil {
		return 0, "", time.Time{}, fmt.Errorf("failed to parse QR token: %w", err)
	}

	if !token.Valid {
		return 0, "", time.Time{}, errors.New("QR token is invalid or expired")
	}

	if claims.UserID <= 0 || claims.ID == "" || claims.ExpiresAt == nil {
		return 0, "", time.Time{}, errors.New("QR token is missing required claims")
	}

	return claims.UserID, claims.ID, claims.ExpiresAt.Time, nil
}

var (
	usedQRMu     sync.Mutex
	usedQRTokens = make(map[string]time.Time)
)

// MarkQRTokenUsed records a token as consumed. It returns false when the token
// has already been used, which stops one QR code from punching in and out twice.
func MarkQRTokenUsed(tokenID string, expiresAt time.Time) bool {
	usedQRMu.Lock()
	defer usedQRMu.Unlock()

	now := time.Now()
	for id, exp := range usedQRTokens {
		if now.After(exp) {
			delete(usedQRTokens, id)
		}
	}

	if _, used := usedQRTokens[tokenID]; used {
		return false
	}
	usedQRTokens[tokenID] = expiresAt
	return true
}
