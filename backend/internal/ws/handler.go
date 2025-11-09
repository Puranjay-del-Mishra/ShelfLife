package ws

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// TODO: in prod, restrict to your frontend domains.
		return true
	},
}

// RegisterRoutes registers /v1/ws (WebSocket) endpoint.
func RegisterRoutes(rg *gin.RouterGroup, hub *Hub) {
	secret := []byte(os.Getenv("SUPABASE_JWT_SECRET"))

	rg.GET("/ws", func(c *gin.Context) {
		// JWT is passed as ?token=<access_token>
		raw := c.Query("token")
		if raw == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		tok, err := jwt.ParseString(raw, jwt.WithKey(jwa.HS256, secret))
		if err != nil {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		sub, ok := tok.Get("sub")
		if !ok {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		userID, _ := sub.(string)
		if userID == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		client := &Client{
			UserID: userID,
			Conn:   conn,
			Send:   make(chan []byte, 16),
		}
		hub.Add(client)

		client.Send <- []byte(`{
		"type": "notification",
		"notice": {
			"kind": "info",
			"title": "Connected",
			"body": "Realtime link is live."
		}
		}`)

		// Writer goroutine
		go func() {
			for msg := range client.Send {
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					break
				}
			}
			conn.Close()
		}()

		// Reader loop (ignore incoming; close on error)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}

		hub.Remove(client)
	})
}
