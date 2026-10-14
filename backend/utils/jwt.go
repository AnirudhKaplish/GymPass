package utils

import (
	"errors"
	"time"

	"gympass/backend/config"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	ID    int    `json:"id"`
	Role  string `json:"role"` // 'user' or 'owner'
	Email string `json:"email,omitempty"`
	Phone string `json:"phone,omitempty"`
	jwt.RegisteredClaims
}

func GenerateToken(id int, role, email, phone string) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour) // Token valid for 7 days
	claims := &Claims{
		ID:    id,
		Role:  role,
		Email: email,
		Phone: phone,
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

	return tokenString, nil
}

func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
