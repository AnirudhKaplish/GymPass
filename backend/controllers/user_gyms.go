package controllers

import (
	"net/http"
	"sort"
	"strconv"

	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/utils"

	"github.com/gin-gonic/gin"
)

// parseCoords reads ?lat= and ?lng=. ok is false unless both are valid coordinates.
func parseCoords(c *gin.Context) (lat, lng float64, ok bool) {
	lat, err1 := strconv.ParseFloat(c.Query("lat"), 64)
	lng, err2 := strconv.ParseFloat(c.Query("lng"), 64)
	if err1 != nil || err2 != nil || lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		return 0, 0, false
	}
	return lat, lng, true
}

// ListGyms returns active gyms. With ?lat=&lng= they are sorted nearest first and
// carry their distance; ?q= searches by name, city or address; ?radius_km= limits distance.
func ListGyms(c *gin.Context) {
	gyms, err := repository.ListActiveGyms(c.Query("q"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load gyms"})
		return
	}

	if lat, lng, hasLocation := parseCoords(c); hasLocation {
		radius, _ := strconv.ParseFloat(c.Query("radius_km"), 64)

		nearby := make([]models.Gym, 0, len(gyms))
		for i := range gyms {
			distance := round2(utils.HaversineKm(lat, lng, gyms[i].Latitude, gyms[i].Longitude))
			gyms[i].DistanceKm = &distance
			if radius <= 0 || distance <= radius {
				nearby = append(nearby, gyms[i])
			}
		}
		sort.SliceStable(nearby, func(a, b int) bool {
			return *nearby[a].DistanceKm < *nearby[b].DistanceKm
		})
		gyms = nearby
	}

	if limit := queryLimit(c, 50, 100); len(gyms) > limit {
		gyms = gyms[:limit]
	}

	c.JSON(http.StatusOK, nonNil(gyms))
}

// GetGymDetail returns one gym with its photos and plans, plus what the signed-in
// member already holds there.
func GetGymDetail(c *gin.Context) {
	gymID, ok := pathID(c, "id")
	if !ok {
		return
	}

	gym, err := repository.GetActiveGymDetail(gymID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load gym"})
		return
	}
	if gym == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gym not found"})
		return
	}

	if lat, lng, hasLocation := parseCoords(c); hasLocation {
		distance := round2(utils.HaversineKm(lat, lng, gym.Latitude, gym.Longitude))
		gym.DistanceKm = &distance
	}

	userID := currentID(c)
	mine := []models.Membership{}
	if memberships, err := repository.GetUserMemberships(userID); err == nil {
		for _, m := range memberships {
			if m.GymID == gym.ID && m.Status == "active" {
				mine = append(mine, m)
			}
		}
	}

	pendingHere := []models.Payment{}
	if pending, err := repository.ListUserPendingRequests(userID); err == nil {
		for _, p := range pending {
			if p.GymID == gym.ID {
				pendingHere = append(pendingHere, p)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"gym":              gym,
		"my_memberships":   mine,
		"pending_requests": pendingHere,
	})
}
