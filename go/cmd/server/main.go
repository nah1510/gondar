package main

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"timo/internal/config"
	"timo/internal/database"
	"timo/internal/features/auth"
	"timo/internal/features/family"
	"timo/internal/features/timo"
	"timo/internal/notifier"
	"timo/internal/server"
)

func main() {
	// Lấy thư mục gốc hiện tại để tính đường dẫn tương đối
	cwd, _ := os.Getwd()

	// Structured logging với level INFO mặc định và có kèm theo tên file/dòng code (AddSource)
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level:     slog.LevelInfo,
		AddSource: true, // Thêm thông tin file và dòng code
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.SourceKey {
				source, ok := a.Value.Any().(*slog.Source)
				if ok && source != nil {
					// Lấy đường dẫn tương đối từ thư mục gốc
					rel, err := filepath.Rel(cwd, source.File)
					if err == nil {
						rel = filepath.ToSlash(rel) // Dùng dấu '/' thay vì '\' trên Windows
						a.Value = slog.StringValue(fmt.Sprintf("%s:%d", rel, source.Line))
					} else {
						a.Value = slog.StringValue(fmt.Sprintf("%s:%d", filepath.Base(source.File), source.Line))
					}
				}
			}
			return a
		},
	})))

	slog.Info("Khởi động Family Web Server...")

	// 1. Tải cấu hình ứng dụng
	cfg := config.Load()

	// 2. Kết nối Supabase (không fatal nếu chưa cấu hình)
	db := database.Connect(cfg)
	if db != nil {
		database.RunMigrations(db)
	}

	// 3. Khởi tạo HTTP server
	srv := server.New(cfg, db)

	// 4. Khởi tạo các phụ thuộc cho Timo feature
	timoCfg := timo.LoadConfig()
	timoClient := timo.NewTimoClient(timoCfg)
	sheetService := timo.NewSheetService(timoCfg)
	telegramNotifier := notifier.NewTelegramNotifier(timoCfg.BotToken, timoCfg.ChatID)

	// Đăng ký các feature
	timoHandler := timo.NewHandler(timoClient, sheetService, telegramNotifier)
	timoHandler.RegisterRoutes(srv.Mux())
	slog.Info("Đã đăng ký Timo Sync feature", "routes", "/api/timo/...")

	// 4. Khởi tạo các feature
	
	// --- Auth Feature ---
	familyRepo := family.NewRepository(db) // Share chung repo với family feature
	authService := auth.NewService(cfg, familyRepo)
	authHandler := auth.NewHandler(authService, cfg, familyRepo)
	authHandler.RegisterRoutes(srv.Mux())
	slog.Info("Đã đăng ký Auth feature", "routes", "/login, /api/auth/...")

	// --- Family Feature ---
	familyHandler := family.NewHandler(familyRepo)
	familyHandler.RegisterRoutes(srv.Mux())
	slog.Info("Đã đăng ký Family Tree feature", "routes", "/family, /api/family")

	// 5. Khởi động server (blocking, graceful shutdown)
	srv.Run()
}
