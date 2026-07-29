package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	ipRequests = make(map[string][]time.Time)
	mu         sync.Mutex
)

// RateLimiter limits requests per client IP to a maximum of 10 requests per minute
func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		mu.Lock()
		defer mu.Unlock()

		// Remove timestamps older than 1 minute
		var activeTimestamps []time.Time
		for _, t := range ipRequests[ip] {
			if now.Sub(t) < time.Minute {
				activeTimestamps = append(activeTimestamps, t)
			}
		}

		// Deny request if limit exceeded
		if len(activeTimestamps) >= 10 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please try again in a minute."})
			c.Abort()
			return
		}

		// Log current request timestamp
		activeTimestamps = append(activeTimestamps, now)
		ipRequests[ip] = activeTimestamps

		c.Next()
	}
}
