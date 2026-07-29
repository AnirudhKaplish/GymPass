package controllers

import (
	"net/http"
	"strconv"

	"gympass/backend/models"
	"gympass/backend/repository"

	"github.com/gin-gonic/gin"
)

// GetActivePlans fetches visible active plans for users
func GetActivePlans(c *gin.Context) {
	plans, err := repository.GetActivePlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, plans)
}

// AdminGetAllPlans fetches all plans for admin management
func AdminGetAllPlans(c *gin.Context) {
	plans, err := repository.GetAllPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch all plans"})
		return
	}
	c.JSON(http.StatusOK, plans)
}

// AdminCreatePlan creates a new plan
func AdminCreatePlan(c *gin.Context) {
	var req models.CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan := &models.Plan{
		Name:         req.Name,
		Type:         req.Type,
		Price:        req.Price,
		ValidityDays: req.ValidityDays,
		LimitHours:   req.LimitHours,
		Description:  req.Description,
		Status:       "active",
		IsVisible:    true,
	}

	err := repository.CreatePlan(plan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan"})
		return
	}

	c.JSON(http.StatusCreated, plan)
}

// AdminUpdatePlan updates an existing plan
func AdminUpdatePlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan ID"})
		return
	}

	var req models.Plan
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := repository.GetPlanByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to look up plan"})
		return
	}
	if plan == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	plan.Name = req.Name
	plan.Type = req.Type
	plan.Price = req.Price
	plan.ValidityDays = req.ValidityDays
	plan.LimitHours = req.LimitHours
	plan.Description = req.Description
	plan.Status = req.Status
	plan.IsVisible = req.IsVisible

	err = repository.UpdatePlan(plan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plan"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

// AdminDeletePlan deletes a plan
func AdminDeletePlan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan ID"})
		return
	}

	err = repository.DeletePlan(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete plan. It may be referenced in purchases."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plan deleted successfully"})
}
