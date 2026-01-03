package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"timo/internal/config"
	"timo/internal/database"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Sử dụng: go run ./cmd/createadmin/main.go <username> <password>")
		fmt.Println("Ví dụ  : go run ./cmd/createadmin/main.go admin 123456")
		return
	}

	username := os.Args[1]
	password := os.Args[2]

	// Đọc config để lấy chuỗi kết nối DB
	cfg := config.Load()
	if cfg.SupabaseDB == "" {
		fmt.Println("❌ Lỗi: Cần cấu hình SUPABASE_DB_URL trong biến môi trường hoặc config.yaml")
		return
	}

	// Kết nối DB
	db := database.Connect(cfg)
	if db == nil {
		fmt.Println("❌ Lỗi kết nối Database. Vui lòng kiểm tra lại URL.")
		return
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Chạy migration để đảm bảo các cột Auth tồn tại
	if err := database.RunMigrations(db); err != nil {
		fmt.Println("❌ Lỗi khi chạy Auto Migration:", err)
		return
	}

	// Hash password
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		fmt.Println("❌ Lỗi mã hóa mật khẩu:", err)
		return
	}
	hash := string(bytes)

	// Tạo tài khoản admin
	query := `
		INSERT INTO family_members (full_name, gender, username, password_hash, role)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (username) DO UPDATE 
		SET password_hash = EXCLUDED.password_hash, role = 'admin'
		RETURNING id;
	`
	
	var id string
	err = db.Pool.QueryRow(ctx, query, "System Admin", "male", username, hash, "admin").Scan(&id)
	if err != nil {
		fmt.Println("❌ Lỗi khi lưu vào Database:", err)
		return
	}

	slog.Info("✅ Đã tạo tài khoản Admin thành công!", "id", id, "username", username)
}
