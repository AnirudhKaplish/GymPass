package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/services"
	"gympass/backend/utils"

	"github.com/gin-gonic/gin"
)

// OwnerDashboard gathers everything the owner's home screen shows for one gym:
// who is inside right now, how busy each hour is, members, revenue and open requests.
func OwnerDashboard(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	now := time.Now().UTC()
	loc := utils.LoadLocation(gym.Timezone)
	localNow := now.In(loc)
	dayStart := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, loc)
	monthStart := time.Date(localNow.Year(), localNow.Month(), 1, 0, 0, 0, 0, loc)
	const peakDays = 30
	peakStart := dayStart.AddDate(0, 0, -(peakDays - 1))

	var firstErr error
	check := func(err error) {
		if err != nil && firstErr == nil {
			firstErr = err
		}
	}

	onFloor, err := repository.ListGymActiveSessions(gym.ID)
	check(err)
	todayEntries, err := repository.CountGymSessionsSince(gym.ID, dayStart.UTC())
	check(err)
	activeMembers, err := repository.CountGymActiveMembers(gym.ID, now)
	check(err)
	totalMembers, err := repository.CountGymTotalMembers(gym.ID)
	check(err)
	expiringSoon, err := repository.CountGymExpiringSoon(gym.ID, now, 7*24*time.Hour)
	check(err)
	revenueToday, err := repository.SumGymRevenue(gym.ID, dayStart.UTC())
	check(err)
	revenueMonth, err := repository.SumGymRevenue(gym.ID, monthStart.UTC())
	check(err)
	pendingRequests, err := repository.CountGymPendingRequests(gym.ID)
	check(err)
	todaySessions, err := repository.ListGymSessionsSince(gym.ID, dayStart.UTC())
	check(err)
	peakSessions, err := repository.ListGymSessionsSince(gym.ID, peakStart.UTC())
	check(err)
	recentSessions, err := repository.ListGymSessions(gym.ID, 8)
	check(err)
	recentPayments, err := repository.ListGymPayments(gym.ID, "", "", 8)
	check(err)

	if firstErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load dashboard: " + firstErr.Error()})
		return
	}

	todayBuckets := repository.HourlyOccupancy(todaySessions, loc, dayStart, now)
	peakBuckets := repository.HourlyOccupancy(peakSessions, loc, peakStart, now)

	hourly := make([]gin.H, 24)
	for h := 0; h < 24; h++ {
		hourly[h] = gin.H{
			"hour":    h,
			"today":   todayBuckets[h],
			"avg_30d": round2(float64(peakBuckets[h]) / float64(peakDays)),
		}
	}

	inside := make([]gin.H, 0, len(onFloor))
	for _, s := range onFloor {
		inside = append(inside, gin.H{
			"id":             s.ID,
			"user_id":        s.UserID,
			"user_name":      s.UserName,
			"user_phone":     s.UserPhone,
			"plan_name":      s.PlanName,
			"plan_type":      s.PlanType,
			"entry_time":     s.EntryTime,
			"minutes_inside": int(now.Sub(s.EntryTime).Minutes()),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"gym":              gym,
		"on_floor_now":     len(onFloor),
		"on_floor":         inside,
		"today_entries":    todayEntries,
		"active_members":   activeMembers,
		"total_members":    totalMembers,
		"expiring_soon":    expiringSoon,
		"revenue_today":    revenueToday,
		"revenue_month":    revenueMonth,
		"pending_requests": pendingRequests,
		"hourly":           hourly,
		"recent_sessions":  nonNil(recentSessions),
		"recent_payments":  nonNil(recentPayments),
		"timezone":         gym.Timezone,
	})
}

// OwnerListMembers returns a gym's memberships; ?status=active|expired narrows it.
func OwnerListMembers(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	status := c.Query("status")
	if status != "" && status != "active" && status != "expired" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be 'active' or 'expired'"})
		return
	}

	members, err := repository.ListGymMembers(gym.ID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load members"})
		return
	}
	c.JSON(http.StatusOK, nonNil(members))
}

// OwnerListSessions returns a gym's visits; ?active=true shows only who is inside now.
func OwnerListSessions(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	var (
		sessions []models.Session
		err      error
	)
	if c.Query("active") == "true" {
		sessions, err = repository.ListGymActiveSessions(gym.ID)
	} else {
		sessions, err = repository.ListGymSessions(gym.ID, queryLimit(c, 100, 500))
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load visits"})
		return
	}
	c.JSON(http.StatusOK, nonNil(sessions))
}

// OwnerListPayments returns a gym's payments; ?status= and ?method= filter them.
func OwnerListPayments(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	payments, err := repository.ListGymPayments(gym.ID, c.Query("status"), c.Query("method"), queryLimit(c, 100, 500))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load payments"})
		return
	}
	c.JSON(http.StatusOK, nonNil(payments))
}

// OwnerListRequests returns the cash requests waiting for the owner's decision.
func OwnerListRequests(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	requests, err := repository.ListGymPayments(gym.ID, models.PaymentPending, models.PaymentMethodCash, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load requests"})
		return
	}
	c.JSON(http.StatusOK, nonNil(requests))
}

// ownedCashRequest loads the cash request named by :id and checks it belongs to one of the owner's gyms.
func ownedCashRequest(c *gin.Context) (*models.Payment, *models.Gym, bool) {
	paymentID, ok := pathID(c, "id")
	if !ok {
		return nil, nil, false
	}

	payment, err := repository.GetPaymentByID(uint(paymentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading request"})
		return nil, nil, false
	}
	if payment == nil || payment.Method != models.PaymentMethodCash {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return nil, nil, false
	}

	gym, err := repository.GetOwnerGym(currentID(c), int(payment.GymID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error loading gym"})
		return nil, nil, false
	}
	if gym == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return nil, nil, false
	}
	return payment, gym, true
}

// OwnerApproveRequest confirms the owner received the cash and activates the member's plan.
func OwnerApproveRequest(c *gin.Context) {
	payment, gym, ok := ownedCashRequest(c)
	if !ok {
		return
	}

	membership, err := repository.ApproveCashRequest(payment.ID)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyProcessed) {
			c.JSON(http.StatusConflict, gin.H{"error": "This request was already handled"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve request: " + err.Error()})
		return
	}

	user, _ := repository.GetUserByID(int(payment.UserID))
	services.Notify(user, gym.ID, membership.ID, fmt.Sprintf("approved_%d", payment.ID),
		"Payment approved",
		fmt.Sprintf("%s confirmed your cash payment. Your %s is now active.", gym.Name, payment.PlanName))

	c.JSON(http.StatusOK, gin.H{
		"message":    "Request approved and membership activated",
		"membership": membership,
	})
}

// OwnerRejectRequest turns down a cash request.
func OwnerRejectRequest(c *gin.Context) {
	payment, gym, ok := ownedCashRequest(c)
	if !ok {
		return
	}

	if err := repository.CloseCashRequest(payment.ID, models.PaymentRejected); err != nil {
		if errors.Is(err, repository.ErrAlreadyProcessed) {
			c.JSON(http.StatusConflict, gin.H{"error": "This request was already handled"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject request"})
		return
	}

	user, _ := repository.GetUserByID(int(payment.UserID))
	services.Notify(user, gym.ID, 0, fmt.Sprintf("rejected_%d", payment.ID),
		"Cash request declined",
		fmt.Sprintf("%s did not approve your cash request for %s. Please speak to the gym.", gym.Name, payment.PlanName))

	c.JSON(http.StatusOK, gin.H{"message": "Request rejected"})
}

func remainingText(m *models.Membership) string {
	if m.IsHourly() {
		return services.FormatHoursMinutes(m.RemainingSeconds)
	}
	return "Unlimited"
}

// OwnerScan punches a member in or out at this gym from their QR code.
// The first scan starts the visit; the next scan ends it and, for prepaid
// hours, deducts exactly the time spent inside.
func OwnerScan(c *gin.Context) {
	gym, ok := ownedGym(c)
	if !ok {
		return
	}

	var req models.ScanQRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, tokenID, tokenExpiry, err := utils.VerifyQRToken(req.Token)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: invalid or expired QR code"})
		return
	}

	user, err := repository.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error retrieving member"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member account not found"})
		return
	}
	if user.Status == "suspended" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: this member account is suspended"})
		return
	}

	now := time.Now().UTC()
	loc := utils.LoadLocation(gym.Timezone)
	memberName := repository.DisplayName(*user)

	activeSession, err := repository.GetActiveSessionForUser(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking open visits"})
		return
	}

	// Punch out
	if activeSession != nil {
		if activeSession.GymID != gym.ID {
			c.JSON(http.StatusConflict, gin.H{"error": "This member is checked in at another gym and must punch out there first"})
			return
		}
		if !utils.MarkQRTokenUsed(tokenID, tokenExpiry) {
			c.JSON(http.StatusForbidden, gin.H{"error": "This QR code was already scanned. Ask the member to refresh it."})
			return
		}

		duration := int(now.Sub(activeSession.EntryTime).Seconds())
		result, err := repository.CheckOutSession(activeSession, now, duration, models.SessionCompleted)
		if err != nil {
			if errors.Is(err, repository.ErrAlreadyCheckedOut) {
				c.JSON(http.StatusConflict, gin.H{"error": "This visit was already closed"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete check-out: " + err.Error()})
			return
		}
		services.NotifyAfterCheckout(user, gym.Name, result)

		response := gin.H{
			"type":       "check_out",
			"message":    "Check-out recorded. See you again!",
			"user_name":  memberName,
			"entry_time": activeSession.EntryTime.In(loc).Format("03:04 PM"),
			"exit_time":  now.In(loc).Format("03:04 PM"),
			"duration":   formatDuration(duration),
		}
		if result.Membership != nil {
			response["plan_name"] = result.Membership.PlanName
			response["plan_type"] = result.Membership.PlanType
			response["remaining"] = remainingText(result.Membership)
		}
		if result.Hourly {
			response["hours_deducted"] = fmt.Sprintf("%.2f hrs", float64(result.DeductedSeconds)/3600.0)
		}
		c.JSON(http.StatusOK, response)
		return
	}

	// Punch in
	membership, err := repository.PickUsableMembership(user.ID, gym.ID, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking membership"})
		return
	}
	if membership == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied: " + memberName + " has no active membership or prepaid hours at " + gym.Name})
		return
	}
	if !utils.MarkQRTokenUsed(tokenID, tokenExpiry) {
		c.JSON(http.StatusForbidden, gin.H{"error": "This QR code was already scanned. Ask the member to refresh it."})
		return
	}

	session, err := repository.CheckInSession(user.ID, gym.ID, membership.ID, now)
	if err != nil {
		if errors.Is(err, repository.ErrAlreadyCheckedIn) {
			c.JSON(http.StatusConflict, gin.H{"error": "This member is already checked in"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create check-in: " + err.Error()})
		return
	}

	response := gin.H{
		"type":      "check_in",
		"message":   "Check-in recorded. Welcome to " + gym.Name + "!",
		"user_name": memberName,
		"plan_name": membership.PlanName,
		"plan_type": membership.PlanType,
		"remaining": remainingText(membership),
		"time":      session.EntryTime.In(loc).Format("03:04 PM"),
	}
	if membership.EndDate != nil {
		response["valid_until"] = membership.EndDate.In(loc).Format("02 Jan 2006")
	}
	c.JSON(http.StatusOK, response)
}
