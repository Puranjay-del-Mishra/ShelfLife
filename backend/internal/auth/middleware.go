package auth

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

const UserIDKey = "user_id"

func Middleware() gin.HandlerFunc {
	secret := []byte(os.Getenv("SUPABASE_JWT_SECRET"))
	devUser := os.Getenv("DEV_INSECURE_USER_ID")

	return func(c *gin.Context) {
		// dev-only bypass
		if devUser != "" && c.GetHeader("Authorization") == "" {
			c.Set(UserIDKey, devUser)
			c.Next()
			return
		}
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		raw := strings.TrimPrefix(h, "Bearer ")
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
		c.Set(UserIDKey, sub.(string))
		c.Next()
	}
}
