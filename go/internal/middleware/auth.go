package middleware

import (
	"context"
	"net/http"
	"strings"

	"timo/internal/config"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	UserRoleKey contextKey = "user_role"
)

// RequireAuth là middleware kiểm tra JWT token, nếu không có hoặc không hợp lệ sẽ bị chặn
func RequireAuth(cfg *config.Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Với Bearer Token, ta chỉ bảo vệ các API endpoints. HTML pages sẽ tự động fetch API và bị chặn nếu không có Token.
		path := r.URL.Path
		if path == "/login" || path == "/api/auth/login" || path == "/api/auth/forgot-password" || !strings.HasPrefix(path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := ValidateToken(tokenString, cfg)
		if err != nil {
			http.Error(w, "Invalid Token", http.StatusUnauthorized)
			return
		}

		// Inject UserID và Role vào context
		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
		
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserFromContext lấy UserID và Role từ request context
func GetUserFromContext(ctx context.Context) (userID string, role string) {
	uid, _ := ctx.Value(UserIDKey).(string)
	rl, _ := ctx.Value(UserRoleKey).(string)
	return uid, rl
}
