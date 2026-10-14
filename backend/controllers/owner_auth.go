package controllers

import (
	"net/http"
	"strings"

	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// OwnerRegister creates a gym owner account and signs them in.
func OwnerRegister(c *gin.Context) {
	var req models.OwnerRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := normalizeEmail(req.Email)

	existing, err := repository.GetOwnerByEmail(email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking account"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An owner account with this email already exists"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	owner := &models.Owner{
		Name:         strings.TrimSpace(req.Name),
		Email:        email,
		Phone:        strings.TrimSpace(req.Phone),
		PasswordHash: string(hash),
	}
	if err := repository.CreateOwner(owner); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create owner account"})
		return
	}

	token, err := utils.GenerateToken(int(owner.ID), "owner", owner.Email, owner.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create authentication session"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"token": token, "owner": owner})
}

// OwnerLogin checks an owner's email and password and returns a token.
func OwnerLogin(c *gin.Context) {
	var req models.OwnerLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	owner, err := repository.GetOwnerByEmail(normalizeEmail(req.Email))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking account"})
		return
	}

	// Same message for "no such account" and "wrong password" so emails cannot be probed.
	if owner == nil || bcrypt.CompareHashAndPassword([]byte(owner.PasswordHash), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := utils.GenerateToken(int(owner.ID), "owner", owner.Email, owner.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create authentication session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token, "owner": owner})
}

// OwnerMe returns the signed-in owner's profile.
func OwnerMe(c *gin.Context) {
	owner, err := repository.GetOwnerByID(currentID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading account"})
		return
	}
	if owner == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Owner not found"})
		return
	}
	c.JSON(http.StatusOK, owner)
}
