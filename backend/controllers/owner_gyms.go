package controllers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gympass/backend/config"
	"gympass/backend/models"
	"gympass/backend/repository"

	"github.com/gin-gonic/gin"
)

const (
	maxGymPhotos   = 10
	maxPhotoBytes  = 5 << 20 // 5 MB per photo
	uploadsURLPath = "/uploads/"
)

var allowedPhotoTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// applyGymRequest copies a validated request onto a gym. It answers 400 itself
// and returns false when a field is invalid.
func applyGymRequest(c *gin.Context, gym *models.Gym, req *models.GymRequest) bool {
	opening := strings.TrimSpace(req.OpeningTime)
	closing := strings.TrimSpace(req.ClosingTime)
	if opening == "" {
		opening = "06:00"
	}
	if closing == "" {
		closing = "22:00"
	}
	if !validClock(opening) || !validClock(closing) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Opening and closing times must look like 06:00"})
		return false
	}

	status := req.Status
	if status == "" {
		status = gym.Status
	}
	if status == "" {
		status = "active"
	}
	if status != "active" && status != "inactive" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be 'active' or 'inactive'"})
		return false
	}

	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" {
		timezone = gym.Timezone
	}
	if timezone == "" {
		timezone = "Asia/Kolkata"
	}

	gym.Name = strings.TrimSpace(req.Name)
	gym.Description = strings.TrimSpace(req.Description)
	gym.Address = strings.TrimSpace(req.Address)
	gym.City = strings.TrimSpace(req.City)
	gym.Latitude = *req.Latitude
	gym.Longitude = *req.Longitude
	gym.ContactNumber = strings.TrimSpace(req.ContactNumber)
	gym.OpeningTime = opening
	gym.ClosingTime = closing
	gym.Timezone = timezone
	gym.Status = status
	return true
}

// OwnerListGyms returns every gym the signed-in owner has registered.
func OwnerListGyms(c *gin.Context) {
	gyms, err := repository.ListOwnerGyms(currentID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load gyms"})
		return
	}
	c.JSON(http.StatusOK, nonNil(gyms))
}

// OwnerCreateGym registers a new gym for the signed-in owner.
func OwnerCreateGym(c *gin.Context) {
	var req models.GymRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	gym := &models.Gym{OwnerID: uint(currentID(c))}
	if !applyGymRequest(c, gym, &req) {
		return
	}

	if err := repository.CreateGym(gym); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register gym"})
		return
	}

	c.JSON(http.StatusCreated, gym)
}

// OwnerGetGym returns one of the owner's gyms.
func OwnerGetGym(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gym)
}

// OwnerUpdateGym edits a gym's profile and location.
func OwnerUpdateGym(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	var req models.GymRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !applyGymRequest(c, gym, &req) {
		return
	}

	if err := repository.UpdateGym(gym); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save gym"})
		return
	}

	c.JSON(http.StatusOK, gym)
}

// OwnerUploadPhotos adds one or more photos (form field "photos") to a gym.
func OwnerUploadPhotos(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Send the photos as multipart form data"})
		return
	}
	files := form.File["photos"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No photos were attached"})
		return
	}

	existing, err := repository.CountGymPhotos(gym.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error counting photos"})
		return
	}
	if int(existing)+len(files) > maxGymPhotos {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A gym can have at most " + strconv.Itoa(maxGymPhotos) + " photos"})
		return
	}

	// Validate every file before saving any, so a bad file never leaves a partial upload behind.
	extensions := make([]string, len(files))
	for i, fh := range files {
		if fh.Size > maxPhotoBytes {
			c.JSON(http.StatusBadRequest, gin.H{"error": fh.Filename + " is larger than 5 MB"})
			return
		}

		f, err := fh.Open()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Could not read " + fh.Filename})
			return
		}
		head := make([]byte, 512)
		n, _ := io.ReadFull(f, head)
		f.Close()

		ext, allowed := allowedPhotoTypes[http.DetectContentType(head[:n])]
		if !allowed {
			c.JSON(http.StatusBadRequest, gin.H{"error": fh.Filename + " is not a JPG, PNG or WebP image"})
			return
		}
		extensions[i] = ext
	}

	gymFolder := strconv.Itoa(int(gym.ID))
	dir := filepath.Join(config.AppConfig.UploadDir, "gyms", gymFolder)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not prepare photo storage"})
		return
	}

	saved := make([]models.GymPhoto, 0, len(files))
	for i, fh := range files {
		name := models.GenerateUUID() + extensions[i]
		if err := c.SaveUploadedFile(fh, filepath.Join(dir, name)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store " + fh.Filename})
			return
		}

		photo := models.GymPhoto{GymID: gym.ID, URL: uploadsURLPath + "gyms/" + gymFolder + "/" + name}
		if err := repository.AddGymPhoto(&photo); err != nil {
			_ = os.Remove(filepath.Join(dir, name))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record " + fh.Filename})
			return
		}
		saved = append(saved, photo)
	}

	c.JSON(http.StatusCreated, saved)
}

// OwnerDeletePhoto removes one photo from a gym.
func OwnerDeletePhoto(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}
	photoID, ok := pathID(c, "photoId")
	if !ok {
		return
	}

	photo, err := repository.GetGymPhoto(int(gym.ID), photoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading photo"})
		return
	}
	if photo == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Photo not found"})
		return
	}

	if err := repository.DeleteGymPhoto(photo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete photo"})
		return
	}

	// Remove the file too, but only if it really lives inside the uploads folder.
	if strings.HasPrefix(photo.URL, uploadsURLPath) {
		base := filepath.Clean(config.AppConfig.UploadDir)
		target := filepath.Clean(filepath.Join(base, strings.TrimPrefix(photo.URL, uploadsURLPath)))
		if strings.HasPrefix(target, base+string(os.PathSeparator)) {
			_ = os.Remove(target)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Photo deleted"})
}
