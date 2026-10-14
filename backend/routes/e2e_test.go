package routes_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"gympass/backend/config"
	"gympass/backend/database"
	"gympass/backend/models"
	"gympass/backend/routes"
	"gympass/backend/services"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

type J = map[string]interface{}

func setup(t *testing.T) http.Handler {
	t.Helper()
	gin.SetMode(gin.TestMode)

	config.AppConfig = &config.Config{
		JWTSecret:         "test-secret",
		DevMode:           true,
		RazorpayKeyID:     "rzp_test_mock_id_123",
		RazorpayKeySecret: "unused",
		UploadDir:         t.TempDir(),
		MaxSessionHours:   6,
		OTPExpiry:         300,
	}

	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.db")), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		NowFunc:                                  func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	database.DB = db
	database.RunMigrations()

	return routes.SetupRouter()
}

func call(t *testing.T, r http.Handler, method, path, token string, payload interface{}) (int, interface{}) {
	t.Helper()

	var buf bytes.Buffer
	if payload != nil {
		if err := json.NewEncoder(&buf).Encode(payload); err != nil {
			t.Fatalf("encode payload: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var out interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func want(t *testing.T, got, expected int, body interface{}) {
	t.Helper()
	if got != expected {
		t.Fatalf("status = %d, want %d, body = %v", got, expected, body)
	}
}

func obj(t *testing.T, v interface{}) J {
	t.Helper()
	m, ok := v.(map[string]interface{})
	if !ok {
		t.Fatalf("expected a JSON object, got %#v", v)
	}
	return m
}

func arr(t *testing.T, v interface{}) []interface{} {
	t.Helper()
	a, ok := v.([]interface{})
	if !ok {
		t.Fatalf("expected a JSON array, got %#v", v)
	}
	return a
}

func num(t *testing.T, m J, key string) float64 {
	t.Helper()
	f, ok := m[key].(float64)
	if !ok {
		t.Fatalf("expected number at %q, got %#v", key, m[key])
	}
	return f
}

func str(t *testing.T, m J, key string) string {
	t.Helper()
	s, ok := m[key].(string)
	if !ok {
		t.Fatalf("expected string at %q, got %#v", key, m[key])
	}
	return s
}

func countKind(items []interface{}, kind string) int {
	n := 0
	for _, it := range items {
		if m, ok := it.(map[string]interface{}); ok && m["kind"] == kind {
			n++
		}
	}
	return n
}

// findMembership returns the membership of a given plan type from the member dashboard.
func findMembership(t *testing.T, r http.Handler, userToken, planType string) J {
	t.Helper()
	status, body := call(t, r, "GET", "/api/user/dashboard", userToken, nil)
	want(t, status, 200, body)
	for _, it := range arr(t, obj(t, body)["memberships"]) {
		m := obj(t, it)
		if m["plan_type"] == planType {
			return m
		}
	}
	t.Fatalf("no %s membership on the dashboard", planType)
	return nil
}

func scan(t *testing.T, r http.Handler, ownerToken string, gymID int, userToken string) (int, J) {
	t.Helper()
	status, qr := call(t, r, "GET", "/api/user/qr", userToken, nil)
	want(t, status, 200, qr)
	token := str(t, obj(t, qr), "token")

	status, body := call(t, r, "POST", fmt.Sprintf("/api/owner/gyms/%d/scan", gymID), ownerToken, J{"token": token})
	m, _ := body.(map[string]interface{})
	return status, m
}

func TestGymMembershipFlow(t *testing.T) {
	r := setup(t)

	// --- Owner registers a gym with an hourly and a monthly plan ---
	status, body := call(t, r, "POST", "/api/owner/register", "", J{
		"name": "Olive Owner", "email": "olive@example.com", "password": "password123",
	})
	want(t, status, 201, body)
	ownerToken := str(t, obj(t, body), "token")

	status, body = call(t, r, "POST", "/api/owner/gyms", ownerToken, J{
		"name": "Test Gym", "address": "1 Main Road", "city": "Bengaluru",
		"latitude": 12.97, "longitude": 77.59,
	})
	want(t, status, 201, body)
	gymID := int(num(t, obj(t, body), "id"))

	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/gyms/%d/plans", gymID), ownerToken, J{
		"name": "Pay per hour", "type": "hourly", "price": 100,
	})
	want(t, status, 201, body)
	hourlyPlan := int(num(t, obj(t, body), "id"))

	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/gyms/%d/plans", gymID), ownerToken, J{
		"name": "Monthly", "type": "monthly", "price": 1500,
	})
	want(t, status, 201, body)
	monthlyPlan := int(num(t, obj(t, body), "id"))
	if days := num(t, obj(t, body), "validity_days"); days != 30 {
		t.Fatalf("monthly plan validity_days = %v, want 30 (the default)", days)
	}

	// --- Member signs in and finds the gym by location ---
	status, body = call(t, r, "POST", "/api/auth/verify-otp", "", J{"phone": "9876543211", "otp": "123456"})
	want(t, status, 200, body)
	userToken := str(t, obj(t, body), "token")

	status, body = call(t, r, "GET", "/api/user/gyms?lat=12.98&lng=77.60", userToken, nil)
	want(t, status, 200, body)
	gyms := arr(t, body)
	if len(gyms) != 1 {
		t.Fatalf("expected 1 gym nearby, got %d", len(gyms))
	}
	first := obj(t, gyms[0])
	if num(t, first, "distance_km") <= 0 {
		t.Fatalf("expected a distance on the gym, got %v", first["distance_km"])
	}
	if plans := arr(t, first["plans"]); len(plans) != 2 {
		t.Fatalf("expected 2 plans on the gym, got %d", len(plans))
	}

	status, body = call(t, r, "GET", "/api/user/gyms?q=nothing-matches", userToken, nil)
	want(t, status, 200, body)
	if len(arr(t, body)) != 0 {
		t.Fatalf("search for a missing gym should return nothing")
	}

	// --- Cash request for 5 prepaid hours, approved by the owner ---
	status, body = call(t, r, "POST", "/api/user/memberships/cash-request", userToken, J{"plan_id": hourlyPlan})
	want(t, status, 400, body) // hours are required for hourly plans

	status, body = call(t, r, "POST", "/api/user/memberships/cash-request", userToken, J{"plan_id": hourlyPlan, "hours": 5})
	want(t, status, 201, body)

	status, body = call(t, r, "POST", "/api/user/memberships/cash-request", userToken, J{"plan_id": hourlyPlan, "hours": 5})
	want(t, status, 409, body) // duplicate pending request

	status, body = call(t, r, "GET", fmt.Sprintf("/api/owner/gyms/%d/requests", gymID), ownerToken, nil)
	want(t, status, 200, body)
	requests := arr(t, body)
	if len(requests) != 1 {
		t.Fatalf("expected 1 pending request, got %d", len(requests))
	}
	paymentID := int(num(t, obj(t, requests[0]), "id"))
	if amount := num(t, obj(t, requests[0]), "amount"); amount != 500 {
		t.Fatalf("5 hours at 100/hour should cost 500, got %v", amount)
	}

	// Nothing is usable until the owner approves
	status, miss := scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 403, miss)

	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/requests/%d/approve", paymentID), ownerToken, nil)
	want(t, status, 200, body)
	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/requests/%d/approve", paymentID), ownerToken, nil)
	want(t, status, 409, body) // cannot approve twice

	hourly := findMembership(t, r, userToken, "hourly")
	if num(t, hourly, "remaining_seconds") != 5*3600 {
		t.Fatalf("remaining_seconds = %v, want %d", hourly["remaining_seconds"], 5*3600)
	}

	// --- Punch in, spend 90 minutes, punch out: exactly that time is deducted ---
	status, res := scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 200, res)
	if res["type"] != "check_in" {
		t.Fatalf("first scan should check in, got %v", res["type"])
	}

	if err := database.DB.Model(&models.Session{}).Where("status = ?", models.SessionActive).
		Update("entry_time", time.Now().UTC().Add(-90*time.Minute)).Error; err != nil {
		t.Fatalf("backdate session: %v", err)
	}

	status, res = scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 200, res)
	if res["type"] != "check_out" {
		t.Fatalf("second scan should check out, got %v", res["type"])
	}
	if res["hours_deducted"] != "1.50 hrs" {
		t.Fatalf("hours_deducted = %v, want 1.50 hrs", res["hours_deducted"])
	}

	hourly = findMembership(t, r, userToken, "hourly")
	if left := num(t, hourly, "remaining_seconds"); left < 12500 || left > 12600 {
		t.Fatalf("remaining_seconds after 90 minutes = %v, want about 12600", left)
	}

	// A QR code works once only
	status, qr := call(t, r, "GET", "/api/user/qr", userToken, nil)
	want(t, status, 200, qr)
	reused := str(t, obj(t, qr), "token")
	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/gyms/%d/scan", gymID), ownerToken, J{"token": reused})
	want(t, status, 200, body)
	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/gyms/%d/scan", gymID), ownerToken, J{"token": reused})
	want(t, status, 403, body)
	// close the visit that scan opened
	status, res = scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 200, res)

	// --- Buy the monthly plan online (abandoned checkouts must not block a later one) ---
	status, body = call(t, r, "POST", "/api/user/payments/initiate", userToken, J{"plan_id": monthlyPlan})
	want(t, status, 200, body)
	status, body = call(t, r, "POST", "/api/user/payments/initiate", userToken, J{"plan_id": monthlyPlan})
	want(t, status, 200, body)
	orderID := str(t, obj(t, body), "razorpay_order_id")

	verify := J{"razorpay_order_id": orderID, "razorpay_payment_id": "pay_test_1", "razorpay_signature": "mock_signature_bypass"}
	status, body = call(t, r, "POST", "/api/user/payments/verify", userToken, verify)
	want(t, status, 200, body)
	status, body = call(t, r, "POST", "/api/user/payments/verify", userToken, verify)
	want(t, status, 200, body) // verifying again is harmless

	monthly := findMembership(t, r, userToken, "monthly")
	if monthly["end_date"] == nil {
		t.Fatalf("monthly membership should have an end date")
	}

	// With a monthly pass the hourly balance is left alone
	before := num(t, findMembership(t, r, userToken, "hourly"), "remaining_seconds")
	status, res = scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 200, res)
	if res["plan_type"] != "monthly" {
		t.Fatalf("check-in should use the monthly pass, used %v", res["plan_type"])
	}
	status, res = scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 200, res)
	if _, deducted := res["hours_deducted"]; deducted {
		t.Fatalf("a monthly visit must not deduct hours")
	}
	if after := num(t, findMembership(t, r, userToken, "hourly"), "remaining_seconds"); after != before {
		t.Fatalf("hourly balance changed from %v to %v during a monthly visit", before, after)
	}

	// --- Another owner cannot touch this gym ---
	status, body = call(t, r, "POST", "/api/owner/register", "", J{
		"name": "Other Owner", "email": "other@example.com", "password": "password123",
	})
	want(t, status, 201, body)
	otherToken := str(t, obj(t, body), "token")

	status, body = call(t, r, "GET", fmt.Sprintf("/api/owner/gyms/%d", gymID), otherToken, nil)
	want(t, status, 404, body)
	status, res = scan(t, r, otherToken, gymID, userToken)
	want(t, status, 404, res)
	status, body = call(t, r, "GET", "/api/owner/gyms", userToken, nil)
	want(t, status, 403, body) // a member token is not an owner token

	// --- Expiry reminders are created once, and expired memberships are closed ---
	if err := database.DB.Model(&models.Membership{}).Where("plan_type = ?", "monthly").
		Update("end_date", time.Now().UTC().Add(48*time.Hour)).Error; err != nil {
		t.Fatalf("shorten monthly pass: %v", err)
	}
	services.RunMaintenance(time.Now().UTC())
	services.RunMaintenance(time.Now().UTC())

	status, body = call(t, r, "GET", "/api/user/notifications", userToken, nil)
	want(t, status, 200, body)
	notifications := arr(t, obj(t, body)["notifications"])
	if n := countKind(notifications, models.NotifExpiry3Days); n != 1 {
		t.Fatalf("expected exactly one 3-day expiry reminder, got %d", n)
	}

	if err := database.DB.Model(&models.Membership{}).Where("plan_type = ?", "monthly").
		Update("end_date", time.Now().UTC().Add(-time.Hour)).Error; err != nil {
		t.Fatalf("expire monthly pass: %v", err)
	}
	services.RunMaintenance(time.Now().UTC())
	if got := findMembership(t, r, userToken, "monthly")["status"]; got != "expired" {
		t.Fatalf("monthly membership status = %v, want expired", got)
	}

	// --- A visit nobody punched out of is closed automatically and billed up to the cap ---
	hourly = findMembership(t, r, userToken, "hourly")
	userID := uint(num(t, obj(t, func() interface{} {
		_, b := call(t, r, "GET", "/api/user/dashboard", userToken, nil)
		return obj(t, b)["user"]
	}()), "id"))
	stale := models.Session{
		UserID:       userID,
		GymID:        uint(gymID),
		MembershipID: uint(num(t, hourly, "id")),
		EntryTime:    time.Now().UTC().Add(-8 * time.Hour),
		Status:       models.SessionActive,
	}
	if err := database.DB.Create(&stale).Error; err != nil {
		t.Fatalf("create stale session: %v", err)
	}
	services.RunMaintenance(time.Now().UTC())

	var closed models.Session
	if err := database.DB.First(&closed, stale.ID).Error; err != nil {
		t.Fatalf("reload session: %v", err)
	}
	if closed.Status != models.SessionAutoClosed {
		t.Fatalf("stale session status = %s, want %s", closed.Status, models.SessionAutoClosed)
	}
	hourly = findMembership(t, r, userToken, "hourly")
	if num(t, hourly, "remaining_seconds") != 0 || hourly["status"] != "expired" {
		t.Fatalf("hourly pack should be used up, got remaining=%v status=%v", hourly["remaining_seconds"], hourly["status"])
	}

	status, body = call(t, r, "GET", "/api/user/notifications", userToken, nil)
	want(t, status, 200, body)
	notifications = arr(t, obj(t, body)["notifications"])
	if countKind(notifications, models.NotifExhausted) != 1 {
		t.Fatalf("expected a 'prepaid hours used up' notification")
	}

	// --- Owner dashboard reflects the activity ---
	status, body = call(t, r, "GET", fmt.Sprintf("/api/owner/gyms/%d/dashboard", gymID), ownerToken, nil)
	want(t, status, 200, body)
	dash := obj(t, body)
	// Some of the visits above were backdated, so only the live ones are guaranteed to be "today".
	if num(t, dash, "today_entries") < 1 {
		t.Fatalf("today_entries = %v, want at least 1", dash["today_entries"])
	}
	if num(t, dash, "total_members") != 1 {
		t.Fatalf("total_members = %v, want 1", dash["total_members"])
	}
	if hours := arr(t, dash["hourly"]); len(hours) != 24 {
		t.Fatalf("hourly occupancy should have 24 buckets, got %d", len(hours))
	}
}
