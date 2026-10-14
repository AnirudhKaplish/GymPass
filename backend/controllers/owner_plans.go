package controllers

import (
	"net/http"
	"strings"

	"gympass/backend/models"
	"gympass/backend/repository"

	"github.com/gin-gonic/gin"
)

// applyPlanRequest copies a validated request onto a plan. It answers 400 itself
// and returns false when a field is invalid.
func applyPlanRequest(c *gin.Context, plan *models.Plan, req *models.PlanRequest) bool {
	validity := req.ValidityDays
	if req.Type != models.PlanTypeHourly && validity == 0 {
		validity = models.DefaultValidityDays(req.Type)
	}
	if validity < 0 || validity > 3650 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validity must be between 0 and 3650 days"})
		return false
	}

	status := req.Status
	if status == "" {
		status = plan.Status
	}
	if status == "" {
		status = "active"
	}
	if status != "active" && status != "inactive" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be 'active' or 'inactive'"})
		return false
	}

	plan.Name = strings.TrimSpace(req.Name)
	plan.Type = req.Type
	plan.Price = round2(req.Price)
	plan.ValidityDays = validity
	plan.Description = strings.TrimSpace(req.Description)
	plan.Status = status
	if req.IsVisible != nil {
		plan.IsVisible = *req.IsVisible
	}
	return true
}

// ownedPlan loads the plan named by :planId and checks its gym belongs to the signed-in owner.
func ownedPlan(c *gin.Context) (*models.Plan, bool) {
	planID, ok := pathID(c, "planId")
	if !ok {
		return nil, false
	}

	plan, err := repository.GetPlanByID(planID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading plan"})
		return nil, false
	}
	if plan == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return nil, false
	}

	gym, err := repository.GetOwnerGym(currentID(c), int(plan.GymID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading gym"})
		return nil, false
	}
	if gym == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return nil, false
	}
	return plan, true
}

// OwnerListPlans returns every plan of a gym, including inactive ones.
func OwnerListPlans(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	plans, err := repository.ListGymPlans(gym.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load plans"})
		return
	}
	c.JSON(http.StatusOK, nonNil(plans))
}

// OwnerCreatePlan adds a plan to a gym.
func OwnerCreatePlan(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	var req models.PlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan := &models.Plan{GymID: gym.ID, IsVisible: true}
	if !applyPlanRequest(c, plan, &req) {
		return
	}

	if err := repository.CreatePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan"})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

// OwnerUpdatePlan edits a plan. Memberships already sold are not affected.
func OwnerUpdatePlan(c *gin.Context) {
	plan, ok := ownedPlan(c)
	if !ok {
		return
	}

	var req models.PlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !applyPlanRequest(c, plan, &req) {
		return
	}

	if err := repository.UpdatePlan(plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plan"})
		return
	}
	c.JSON(http.StatusOK, plan)
}

// OwnerDeletePlan removes a plan from sale.
func OwnerDeletePlan(c *gin.Context) {
	plan, ok := ownedPlan(c)
	if !ok {
		return
	}

	if err := repository.DeletePlan(plan.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete plan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Plan deleted"})
}
