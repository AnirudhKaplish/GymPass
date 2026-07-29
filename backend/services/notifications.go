package services

import (
	"log"
)

// SendNotification simulates/sends an FCM push notification
func SendNotification(phone, title, message string) {
	// Log the notification payload to stdout (development requirement)
	log.Printf("[FCM NOTIFICATION] Target Phone: %s | Title: %s | Message: %s", phone, title, message)
}

func CheckAndSendLowBalanceReminder(phone string, remainingSeconds int) {
	remainingMinutes := remainingSeconds / 60
	remainingHours := float64(remainingMinutes) / 60.0

	// Check levels and fire appropriate notifications
	if remainingHours <= 0.5 && remainingHours > 0 {
		SendNotification(phone, "Balance Warning!", "You only have 30 minutes remaining in your prepaid hour pack. Top up now to avoid session disruption!")
	} else if remainingHours <= 1.0 && remainingHours > 0.5 {
		SendNotification(phone, "Low Balance Alert", "You have less than 1 hour remaining in your hourly plan.")
	} else if remainingHours <= 2.0 && remainingHours > 1.0 {
		SendNotification(phone, "Prepaid Balance Reminder", "You have less than 2 hours remaining in your hourly plan.")
	}
}

func SendMembershipExpiredNotification(phone, planName string) {
	SendNotification(phone, "Plan Expired!", "Your plan '"+planName+"' has expired. Buy a new membership to continue your gym sessions.")
}
