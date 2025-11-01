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
	if port == "" { port = "8080" }

	// DB
	pool, err := mydb.New(context.Background())
	if err != nil { log.Fatal(err) }
	defer pool.Close()

	r := gin.New()
	r.Use(gin.Recovery())

	r.GET("/healthz", func(c *gin.Context) { c.String(http.StatusOK, "ok") })

	api := r.Group("/v1")
	api.Use(auth.Middleware())

	// GET /v1/settings -> ensure row exists, then return it
	api.GET("/settings", func(c *gin.Context) {
		userID := c.GetString(auth.UserIDKey)

		// create default row if missing (idempotent)
		_, _ = pool.Exec(c, `
		  insert into public.user_settings (user_id) values ($1)
		  on conflict (user_id) do nothing
		`, userID)

		type resp struct {
			UserID           string   `json:"user_id"`
			NotifyLocalTime  string   `json:"notify_local_time"`
			Timezone         string   `json:"timezone"`
			NotifyDaysBefore []int32  `json:"notify_days_before"`
			PushEnabled      bool     `json:"push_enabled"`
		}

		var out resp
		err := pool.QueryRow(c, `
		  select user_id::text, notify_local_time::text, timezone,
		         notify_days_before, push_enabled
		  from public.user_settings
		  where user_id = $1
		`, userID).Scan(&out.UserID, &out.NotifyLocalTime, &out.Timezone, &out.NotifyDaysBefore, &out.PushEnabled)

		if err != nil {
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, out)
	})

	api.PUT("/settings", func(c *gin.Context) {
  userID := c.GetString(auth.UserIDKey)

  var in struct {
    NotifyLocalTime  string  `json:"notify_local_time"`   // "HH:MM" or "HH:MM:SS"
    Timezone         string  `json:"timezone"`            // IANA TZ, e.g. "America/New_York"
    NotifyDaysBefore []int32 `json:"notify_days_before"`  // e.g. [3,1,0]
    PushEnabled      bool    `json:"push_enabled"`
  }
  if err := c.BindJSON(&in); err != nil {
    c.String(400, "invalid json: %v", err); return
  }

  // validate time (accept HH:MM or HH:MM:SS)
  if _, err := time.Parse("15:04:05", in.NotifyLocalTime); err != nil {
    if _, err2 := time.Parse("15:04", in.NotifyLocalTime); err2 != nil {
      c.String(400, "notify_local_time must be HH:MM or HH:MM:SS"); return
    }
  }
  // validate timezone
  if _, err := time.LoadLocation(in.Timezone); err != nil {
    c.String(400, "invalid timezone: %s", in.Timezone); return
  }
  // validate days range
  for _, d := range in.NotifyDaysBefore {
    if d < 0 || d > 30 {
      c.String(400, "notify_days_before values must be 0..30"); return
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
    c.String(500, err.Error()); return
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
      select user_id::text, notify_local_time::text, timezone,
             notify_days_before, push_enabled
        from public.user_settings where user_id = $1
  `, userID).Scan(&out.UserID, &out.NotifyLocalTime, &out.Timezone, &out.NotifyDaysBefore, &out.PushEnabled); err != nil {
    c.String(500, err.Error()); return
  }
  c.JSON(200, out)
})


	log.Printf("listening on :%s", port)
	if err := r.Run(":" + port); err != nil { log.Fatal(err) }
}
