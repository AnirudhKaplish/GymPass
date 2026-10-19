package services

import (
	"errors"
	"fmt"
	"log"
	"time"

	"gympass/backend/config"
	"gympass/backend/models"
	"gympass/backend/repository"
	"gympass/backend/utils"
)

const (
	maintenanceInterval = 10 * time.Minute
	reminderWindow      = 72 * time.Hour
	finalReminderWindow = 24 * time.Hour
)

// StartScheduler runs the background maintenance job now and then every few minutes.
func StartScheduler() {
	go func() {
		RunMaintenance(time.Now().UTC())

		ticker := time.NewTicker(maintenanceInterval)
		defer ticker.Stop()
		for range ticker.C {
			RunMaintenance(time.Now().UTC())
		}
	}()
}

// lookups caches users and gyms for the duration of one maintenance run.
type lookups struct {
	users map[uint]*models.User
	gyms  map[uint]models.Gym
}

func newLookups() *lookups {
	return &lookups{users: make(map[uint]*models.User), gyms: make(map[uint]models.Gym)}
}

func (l *lookups) user(id uint) *models.User {
	if u, ok := l.users[id]; ok {
		return u
	}
	u, err := repository.GetUserByID(int(id))
	if err != nil {
		u = nil
	}
	l.users[id] = u
	return u
}

func (l *lookups) gym(id uint) models.Gym {
	if g, ok := l.gyms[id]; ok {
		return g
	}
	found, err := repository.GetGymsByIDs([]uint{id})
	if err != nil {
		return models.Gym{}
	}
	g := found[id]
	l.gyms[id] = g
	return g
}

// RunMaintenance does the periodic housekeeping:
//  1. closes visits that were never punched out,
//  2. expires memberships whose end date has passed,
//  3. sends "about to expire" reminders.
func RunMaintenance(now time.Time) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[SCHEDULER] ERROR: maintenance run panicked: %v", r)
		}
	}()

	cache := newLookups()
	closeStaleSessions(now, cache)
	expireMemberships(now, cache)
	sendExpiryReminders(now, cache)
}

func closeStaleSessions(now time.Time, cache *lookups) {
	maxHours := config.AppConfig.MaxSessionHours
	if maxHours <= 0 {
		maxHours = 6
	}
	capSeconds := maxHours * 3600

	sessions, err := repository.ListStaleActiveSessions(now.Add(-time.Duration(capSeconds) * time.Second))
	if err != nil {
		log.Printf("[SCHEDULER] ERROR: listing stale sessions: %v", err)
		return
	}

	for i := range sessions {
		s := sessions[i]
		exit := s.EntryTime.Add(time.Duration(capSeconds) * time.Second)

		res, err := repository.CheckOutSession(&s, exit, capSeconds, models.SessionAutoClosed)
		if err != nil {
			if !errors.Is(err, repository.ErrAlreadyCheckedOut) {
				log.Printf("[SCHEDULER] ERROR: auto-closing session %d: %v", s.ID, err)
			}
			continue
		}

		user := cache.user(s.UserID)
		gym := cache.gym(s.GymID)
		Notify(user, s.GymID, s.MembershipID, fmt.Sprintf("%s_%d", models.NotifAutoClosed, s.ID),
			"Workout closed automatically",
			fmt.Sprintf("You were still checked in at %s after %d hours, so the visit was closed. Remember to scan out when you leave.", gym.Name, maxHours))
		NotifyAfterCheckout(user, gym.Name, res)
	}
}

func expireMemberships(now time.Time, cache *lookups) {
	expired, err := repository.ExpireDueMemberships(now)
	if err != nil {
		log.Printf("[SCHEDULER] ERROR: expiring memberships: %v", err)
		return
	}

	for _, m := range expired {
		gym := cache.gym(m.GymID)
		Notify(cache.user(m.UserID), m.GymID, m.ID, models.NotifExpired,
			"Membership expired",
			fmt.Sprintf("Your %s at %s has expired. Renew to keep training.", m.PlanName, gym.Name))
	}
}

func sendExpiryReminders(now time.Time, cache *lookups) {
	ending, err := repository.GetMembershipsEndingBetween(now, now.Add(reminderWindow))
	if err != nil {
		log.Printf("[SCHEDULER] ERROR: loading expiring memberships: %v", err)
		return
	}

	for _, m := range ending {
		if m.EndDate == nil {
			continue
		}

		gym := cache.gym(m.GymID)
		loc := utils.LoadLocation(gym.Timezone)
		endsAt := m.EndDate.In(loc).Format("02 Jan 2006, 03:04 PM")

		kind := models.NotifExpiry3Days
		title := "Membership ends in 3 days"
		if m.EndDate.Sub(now) <= finalReminderWindow {
			kind = models.NotifExpiry1Day
			title = "Membership ends within 24 hours"
		}

		Notify(cache.user(m.UserID), m.GymID, m.ID, kind, title,
			fmt.Sprintf("Your %s at %s ends on %s. Renew now to avoid a break in access.", m.PlanName, gym.Name, endsAt))
	}
}
