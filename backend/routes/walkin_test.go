package routes_test

import (
	"fmt"
	"testing"
)

func TestWalkInMemberAndManualCheckout(t *testing.T) {
	r := setup(t)

	status, body := call(t, r, "POST", "/api/owner/register", "", J{
		"name": "Wanda Owner", "email": "wanda@example.com", "password": "password123",
	})
	want(t, status, 201, body)
	ownerToken := str(t, obj(t, body), "token")

	status, body = call(t, r, "POST", "/api/owner/gyms", ownerToken, J{
		"name": "Walk-in Gym", "address": "2 Side Street", "latitude": 12.9, "longitude": 77.6,
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

	membersURL := fmt.Sprintf("/api/owner/gyms/%d/members", gymID)

	// Bad phone numbers are rejected, hourly plans need hours
	status, body = call(t, r, "POST", membersURL, ownerToken, J{"phone": "123", "plan_id": monthlyPlan})
	want(t, status, 400, body)
	status, body = call(t, r, "POST", membersURL, ownerToken, J{"phone": "9876500001", "plan_id": hourlyPlan})
	want(t, status, 400, body)

	// A walk-in who has never used the app gets an account and an active plan
	status, body = call(t, r, "POST", membersURL, ownerToken, J{"phone": "98765 00001", "name": "Walk In", "plan_id": monthlyPlan})
	want(t, status, 201, body)
	status, body = call(t, r, "POST", membersURL, ownerToken, J{"phone": "9876500001", "plan_id": hourlyPlan, "hours": 3})
	want(t, status, 201, body)

	status, body = call(t, r, "GET", fmt.Sprintf("/api/owner/gyms/%d/payments", gymID), ownerToken, nil)
	want(t, status, 200, body)
	if n := len(arr(t, body)); n != 2 {
		t.Fatalf("expected 2 recorded payments, got %d", n)
	}

	// When they sign in with that number, the plans are already there
	status, body = call(t, r, "POST", "/api/auth/verify-otp", "", J{"phone": "9876500001", "otp": "123456"})
	want(t, status, 200, body)
	userToken := str(t, obj(t, body), "token")

	hourly := findMembership(t, r, userToken, "hourly")
	if num(t, hourly, "remaining_seconds") != 3*3600 {
		t.Fatalf("remaining_seconds = %v, want %d", hourly["remaining_seconds"], 3*3600)
	}
	findMembership(t, r, userToken, "monthly")

	// Punch in, then the owner closes the visit by hand
	status, res := scan(t, r, ownerToken, gymID, userToken)
	want(t, status, 200, res)

	status, body = call(t, r, "GET", fmt.Sprintf("/api/owner/gyms/%d/sessions?active=true", gymID), ownerToken, nil)
	want(t, status, 200, body)
	open := arr(t, body)
	if len(open) != 1 {
		t.Fatalf("expected 1 open visit, got %d", len(open))
	}
	sessionID := int(num(t, obj(t, open[0]), "id"))

	// Another owner cannot close it
	status, body = call(t, r, "POST", "/api/owner/register", "", J{
		"name": "Other Owner", "email": "other@example.com", "password": "password123",
	})
	want(t, status, 201, body)
	otherToken := str(t, obj(t, body), "token")
	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/sessions/%d/checkout", sessionID), otherToken, nil)
	want(t, status, 404, body)

	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/sessions/%d/checkout", sessionID), ownerToken, nil)
	want(t, status, 200, body)
	status, body = call(t, r, "POST", fmt.Sprintf("/api/owner/sessions/%d/checkout", sessionID), ownerToken, nil)
	want(t, status, 409, body)

	status, body = call(t, r, "GET", fmt.Sprintf("/api/owner/gyms/%d/sessions?active=true", gymID), ownerToken, nil)
	want(t, status, 200, body)
	if n := len(arr(t, body)); n != 0 {
		t.Fatalf("expected no open visits, got %d", n)
	}
}
