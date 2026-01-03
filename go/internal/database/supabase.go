package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"timo/internal/config"
)

// DB wraps pgxpool để dễ inject vào các feature sau này
type DB struct {
	Pool *pgxpool.Pool
}

// Connect khởi tạo connection pool tới Supabase.
// Trả về nil nếu SUPABASE_DB_URL chưa được cấu hình (không fatal).
func Connect(cfg *config.Config) *DB {
	if cfg.SupabaseDB == "" {
		slog.Warn("Database không được khởi tạo — SUPABASE_DB_URL trống")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(cfg.SupabaseDB)
	if err != nil {
		slog.Error("Không thể parse Supabase DB URL", "error", err)
		return nil
	}

	// Cấu hình connection pool
	poolCfg.MaxConns = 10
	poolCfg.MinConns = 2
	poolCfg.MaxConnLifetime = 1 * time.Hour
	poolCfg.MaxConnIdleTime = 30 * time.Minute
	// Vô hiệu hóa prepared statement cache vì Supabase dùng PgBouncer (Transaction mode, port 6543)
	poolCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		slog.Error("Không thể tạo connection pool", "error", err)
		return nil
	}

	// Ping để xác nhận kết nối thành công
	if err := pool.Ping(ctx); err != nil {
		slog.Error("Không thể kết nối tới Supabase", "error", err)
		pool.Close()
		return nil
	}

	slog.Info("Kết nối Supabase thành công", "max_conns", poolCfg.MaxConns)
	return &DB{Pool: pool}
}

// Close đóng tất cả connections trong pool
func (db *DB) Close() {
	if db != nil && db.Pool != nil {
		db.Pool.Close()
		slog.Info("Đã đóng kết nối database")
	}
}

// IsReady kiểm tra DB có sẵn sàng không (dùng cho health check)
func (db *DB) IsReady() bool {
	if db == nil || db.Pool == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return db.Pool.Ping(ctx) == nil
}

// HealthStatus trả về string mô tả trạng thái DB
func (db *DB) HealthStatus() string {
	if db.IsReady() {
		stat := db.Pool.Stat()
		return fmt.Sprintf("ok (connections: %d/%d)", stat.AcquiredConns(), stat.MaxConns())
	}
	return "unavailable"
}
