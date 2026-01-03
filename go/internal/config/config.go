package config

import (
	"log/slog"
	"os"
	"strconv"

	"github.com/spf13/viper"
)

// Config chứa cấu hình cấp ứng dụng (không liên quan đến các feature cụ thể)
type Config struct {
	Port       int    // HTTP server port, mặc định 8080
	SupabaseDB string // PostgreSQL connection string tới Supabase

	// Authentication
	JWTSecret string

	// SMTP (for password reset)
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
}

// Load đọc cấu hình chung của ứng dụng từ file config.yaml (hoặc env)
// PORT        – port HTTP server (default: 8080)
// SUPABASE_DB_URL – connection string PostgreSQL của Supabase
func Load() *Config {
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".") // Tìm config.yaml ở thư mục chạy ứng dụng

	// Mặc định
	v.SetDefault("Port", 8080)

	// Hỗ trợ override qua env var
	v.AutomaticEnv()
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			v.Set("Port", n)
		}
	}
	if dbURL := os.Getenv("SUPABASE_DB_URL"); dbURL != "" {
		v.Set("SupabaseDB", dbURL)
	}
	if jwtSecret := os.Getenv("JWT_SECRET"); jwtSecret != "" {
		v.Set("JWTSecret", jwtSecret)
	}
	if smtpHost := os.Getenv("SMTP_HOST"); smtpHost != "" {
		v.Set("SMTPHost", smtpHost)
	}
	if smtpPort := os.Getenv("SMTP_PORT"); smtpPort != "" {
		if n, err := strconv.Atoi(smtpPort); err == nil {
			v.Set("SMTPPort", n)
		}
	}
	if smtpUser := os.Getenv("SMTP_USER"); smtpUser != "" {
		v.Set("SMTPUser", smtpUser)
	}
	if smtpPass := os.Getenv("SMTP_PASS"); smtpPass != "" {
		v.Set("SMTPPass", smtpPass)
	}

	// Cố gắng đọc từ file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			slog.Warn("Lỗi khi đọc file config.yaml của app", "error", err)
		}
	} else {
		slog.Info("Đã tải cấu hình chung của app", "file", v.ConfigFileUsed())
	}

	cfg := &Config{
		Port:       v.GetInt("Port"),
		SupabaseDB: v.GetString("SupabaseDB"),
		JWTSecret:  v.GetString("JWTSecret"),
		SMTPHost:   v.GetString("SMTPHost"),
		SMTPPort:   v.GetInt("SMTPPort"),
		SMTPUser:   v.GetString("SMTPUser"),
		SMTPPass:   v.GetString("SMTPPass"),
	}

	// Default fallback
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "default-family-secret-do-not-use-in-production"
	}
	if cfg.SMTPHost == "" {
		cfg.SMTPHost = "smtp.gmail.com"
		cfg.SMTPPort = 587
	}

	if cfg.SupabaseDB == "" {
		slog.Warn("SupabaseDB chưa được cấu hình — database sẽ không khả dụng")
		cfg.SupabaseDB = "postgresql://postgres.abmtqlabglnckxkcscev:Gondar123456Xz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
	}

	return cfg
}
