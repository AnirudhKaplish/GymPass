package services

import (
	"fmt"
	"log"

	"gympass/backend/models"
	"gympass/backend/repository"
)

// SendNotification simulates/sends a push or SMS notification. Delivery is only
// logged for now; swap this for FCM, Twilio or WhatsApp when ready. The in-app
// notification stored by Notify is what members see in the app today.
func SendNotification(phone, title, message string) {
	log.Printf("[NOTIFICATION] Target Phone: %s | Title: %s | Message: %s", phone, title, message)
}

// Notify stores an in-app notification, once per (membership, kind), and only
// pushes it out when it is new.
func Notify(user *models.User, gymID, membershipID uint, kind, title, message string) {
	if user == nil {
		return
	}

	created, err := repository.CreateNotificationOnce(&models.Notification{
		UserID:       user.ID,
		GymID:        gymID,
		MembershipID: membershipID,
		Kind:         kind,
		Title:        title,
		Message:      message,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] ERROR: could not store '%s' for user %d: %v", kind, user.ID, err)
		return
	}
	if created {
		SendNotification(user.Phone, title, message)
	}
}

// FormatHoursMinutes renders seconds as "2h 05m".
func FormatHoursMinutes(seconds int) string {
	if seconds < 0 {
		seconds = 0
	}
	return fmt.Sprintf("%dh %02dm", seconds/3600, (seconds%3600)/60)
}

// NotifyAfterCheckout raises low-balance alerts after a punch-out on prepaid hours.
func NotifyAfterCheckout(user *models.User, gymName string, res *repository.CheckoutResult) {
	if res == nil || !res.Hourly || res.Membership == nil {
		return
	}
	m := res.Membership

	switch {
	case res.Exhausted:
		Notify(user, m.GymID, m.ID, models.NotifExhausted,
			"Prepaid hours used up",
			fmt.Sprintf("Your prepaid hours at %s are finished. Buy more hours to keep training.", gymName))
	case res.RemainingSeconds <= 30*60:
		Notify(user, m.GymID, m.ID, models.NotifLow30Minutes,
			"Less than 30 minutes left",
			fmt.Sprintf("You have %s of prepaid time left at %s. Top up soon.", FormatHoursMinutes(res.RemainingSeconds), gymName))
	case res.RemainingSeconds <= 2*3600:
		Notify(user, m.GymID, m.ID, models.NotifLow2Hours,
			"Running low on prepaid hours",
			fmt.Sprintf("You have %s of prepaid time left at %s.", FormatHoursMinutes(res.RemainingSeconds), gymName))
	}
}
