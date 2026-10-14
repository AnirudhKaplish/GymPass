package controllers

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gympass/backend/models"
	"gympass/backend/repository"

	"github.com/gin-gonic/gin"
)

// currentID returns the ID of the authenticated member or owner.
func currentID(c *gin.Context) int {
	v, _ := c.Get("userID")
	id, _ := v.(int)
	return id
}

// pathID reads a numeric URL parameter, answering 400 itself when it is invalid.
func pathID(c *gin.Context, name string) (int, bool) {
	id, err := strconv.Atoi(c.Param(name))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid " + name})
		return 0, false
	}
	return id, true
}

// ownedGym loads the gym named by the :id URL parameter, but only if it belongs
// to the signed-in owner. Anything else is answered as "not found" so one owner
// cannot probe another owner's gyms.
func ownedGym(c *gin.Context) (*models.Gym, bool) {
	gymID, ok := pathID(c, "id")
	if !ok {
		return nil, false
	}

	gym, err := repository.GetOwnerGym(currentID(c), gymID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading gym"})
		return nil, false
	}
	if gym == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gym not found"})
		return nil, false
	}
	return gym, true
}

// queryLimit reads ?limit= with a default and an upper bound.
func queryLimit(c *gin.Context, def, max int) int {
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit <= 0 {
		return def
	}
	if limit > max {
		return max
	}
	return limit
}

// nonNil makes sure an empty list is sent as [] rather than null.
func nonNil[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

// validClock reports whether s is an "HH:MM" time.
func validClock(s string) bool {
	_, err := time.Parse("15:04", s)
	return err == nil
}

// normalizeEmail lowercases and trims an email address.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func formatDuration(seconds int) string {
	h := seconds / 3600
	m := (seconds % 3600) / 60
	if h > 0 {
		return strconv.Itoa(h) + "h " + strconv.Itoa(m) + "m"
	}
	if m == 0 && seconds > 0 {
		return "<1m"
	}
	return strconv.Itoa(m) + "m"
}
