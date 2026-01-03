package database

import (
	"context"
	"log/slog"
	"time"
)

// RunMigrations tự động tạo các bảng cần thiết trong cơ sở dữ liệu nếu chưa tồn tại
func RunMigrations(db *DB) error {
	if db == nil || db.Pool == nil {
		slog.Warn("Bỏ qua Auto Migration do Database không khả dụng")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Query tạo bảng family_members
	// Lưu ý: Các khóa ngoại (father_id, mother_id, spouse_id) được định nghĩa là UUID và có thể NULL.
	// Tham chiếu đệ quy đến chính bảng family_members.
	query := `
	CREATE TABLE IF NOT EXISTS family_members (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		full_name VARCHAR(255) NOT NULL,
		nickname VARCHAR(100),
		gender VARCHAR(20) NOT NULL,
		birth_date DATE,
		phone VARCHAR(50),
		address TEXT,
		father_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
		mother_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
		spouse_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
		is_alive BOOLEAN DEFAULT TRUE,
		username VARCHAR(50) UNIQUE,
		email VARCHAR(255) UNIQUE,
		password_hash VARCHAR(255),
		role VARCHAR(20) DEFAULT 'member',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	-- Đảm bảo các cột Auth được thêm vào nếu bảng đã tồn tại từ trước
	ALTER TABLE family_members ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
	ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
	ALTER TABLE family_members ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
	ALTER TABLE family_members ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member';

	-- Bootstrap Admin nếu bảng trống
	-- INSERT INTO family_members (full_name, gender, username, password_hash, role)
	-- SELECT 'System Admin', 'male', 'admin', '$2a$10$xyz', 'admin'
	-- WHERE NOT EXISTS (SELECT 1 FROM family_members LIMIT 1);

	-- Trigger để tự động cập nhật updated_at (nếu cần)
	-- CREATE OR REPLACE FUNCTION update_updated_at_column()
	-- RETURNS TRIGGER AS $$
	-- BEGIN
	--     NEW.updated_at = now();
	--     RETURN NEW;
	-- END;
	-- $$ language 'plpgsql';

	-- DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
	-- CREATE TRIGGER update_family_members_updated_at
	--     BEFORE UPDATE ON family_members
	--     FOR EACH ROW
	--     EXECUTE FUNCTION update_updated_at_column();
	--     EXECUTE FUNCTION update_updated_at_column();
	`

	_, err := db.Pool.Exec(ctx, query)
	if err != nil {
		slog.Error("Lỗi khi chạy Migration cho bảng family_members", "error", err)
		return err
	}

	slog.Info("Đã chạy Auto Migration thành công")
	return nil
}
