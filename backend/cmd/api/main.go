package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/auth"
	mydb "backend/internal/db"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// DB pool
	pool, err := mydb.New(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// Router
	r := gin.New()
	r.Use(gin.Recovery())
	_ = r.SetTrustedProxies(nil) // silence "trusted all proxies" warning

	// Liveness
	r.GET("/healthz", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	api := r.Group("/v1")
	api.Use(auth.Middleware())

	// GET /v1/settings
	api.GET("/settings", func(c *gin.Context) {
		userID := c.GetString(auth.UserIDKey)

		// ensure default row
		_, _ = pool.Exec(c, `
			insert into public.user_settings (user_id)
			values ($1)
			on conflict (user_id) do nothing
		`, userID)

		type resp struct {
			UserID           string  `json:"user_id"`
			NotifyLocalTime  string  `json:"notify_local_time"`
			Timezone         string  `json:"timezone"`
			NotifyDaysBefore []int32 `json:"notify_days_before"`
			PushEnabled      bool    `json:"push_enabled"`
		}
		var out resp

		if err := pool.QueryRow(c, `
			select user_id::text,
			       notify_local_time::text,
			       timezone,
			       notify_days_before,
			       push_enabled
			from public.user_settings
			where user_id = $1
		`, userID).Scan(&out.UserID, &out.NotifyLocalTime, &out.Timezone, &out.NotifyDaysBefore, &out.PushEnabled); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, out)
	})

	// PUT /v1/settings
	api.PUT("/settings", func(c *gin.Context) {
		userID := c.GetString(auth.UserIDKey)

		var in struct {
			NotifyLocalTime  string  `json:"notify_local_time"`   // "HH:MM" or "HH:MM:SS"
			Timezone         string  `json:"timezone"`            // IANA TZ, e.g. "America/New_York"
			NotifyDaysBefore []int32 `json:"notify_days_before"`  // e.g. [3,1,0]
			PushEnabled      bool    `json:"push_enabled"`
		}
		if err := c.BindJSON(&in); err != nil {
			c.String(http.StatusBadRequest, "invalid json: %v", err)
			return
		}

		// validate time
		if _, err := time.Parse("15:04:05", in.NotifyLocalTime); err != nil {
			if _, err2 := time.Parse("15:04", in.NotifyLocalTime); err2 != nil {
				c.String(http.StatusBadRequest, "notify_local_time must be HH:MM or HH:MM:SS")
				return
			}
		}
		// validate timezone
		if _, err := time.LoadLocation(in.Timezone); err != nil {
			c.String(http.StatusBadRequest, "invalid timezone: %s", in.Timezone)
			return
		}
		// validate days range
		for _, d := range in.NotifyDaysBefore {
			if d < 0 || d > 30 {
				c.String(http.StatusBadRequest, "notify_days_before values must be 0..30")
				return
			}
		}

		// ensure row exists, then update
		_, _ = pool.Exec(c, `insert into public.user_settings (user_id) values ($1)
		                     on conflict (user_id) do nothing`, userID)

		if _, err := pool.Exec(c, `
			update public.user_settings
			   set notify_local_time  = $2::time,
			       timezone           = $3,
			       notify_days_before = $4,
			       push_enabled       = $5
			 where user_id = $1
		`, userID, in.NotifyLocalTime, in.Timezone, in.NotifyDaysBefore, in.PushEnabled); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}

		// return saved row
		var out struct {
			UserID           string  `json:"user_id"`
			NotifyLocalTime  string  `json:"notify_local_time"`
			Timezone         string  `json:"timezone"`
			NotifyDaysBefore []int32 `json:"notify_days_before"`
			PushEnabled      bool    `json:"push_enabled"`
		}
		if err := pool.QueryRow(c, `
			select user_id::text,
			       notify_local_time::text,
			       timezone,
			       notify_days_before,
			       push_enabled
			from public.user_settings
			where user_id = $1
		`, userID).Scan(&out.UserID, &out.NotifyLocalTime, &out.Timezone, &out.NotifyDaysBefore, &out.PushEnabled); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, out)
	})

	// POST /v1/webpush/subscribe
	api.POST("/webpush/subscribe", func(c *gin.Context) {
		userID := c.GetString(auth.UserIDKey)

		var in struct {
			Endpoint string `json:"endpoint"`
			Keys     struct {
				P256dh string `json:"p256dh"`
				Auth   string `json:"auth"`
			} `json:"keys"`
			Platform string `json:"platform"` // optional label (ios/android/macos/etc.)
		}
		if err := c.BindJSON(&in); err != nil {
			c.String(http.StatusBadRequest, "invalid json: %v", err)
			return
		}
		if in.Endpoint == "" || in.Keys.P256dh == "" || in.Keys.Auth == "" {
			c.String(http.StatusBadRequest, "endpoint, keys.p256dh and keys.auth are required")
			return
		}

		ua := c.GetHeader("User-Agent")

		// idempotent upsert on (user_id, endpoint)
		if _, err := pool.Exec(c, `
			insert into public.web_push_subscriptions
			  (user_id, endpoint, p256dh, auth, user_agent, platform)
			values ($1, $2, $3, $4, $5, $6)
			on conflict (user_id, endpoint) do update
			  set p256dh = excluded.p256dh,
			      auth = excluded.auth,
			      user_agent = excluded.user_agent,
			      platform = excluded.platform,
			      last_seen_at = now(),
			      updated_at = now()
		`, userID, in.Endpoint, in.Keys.P256dh, in.Keys.Auth, ua, in.Platform); err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.Status(http.StatusNoContent)
	})

	log.Printf("listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
