package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"timo/internal/config"
	"timo/internal/database"
	"timo/internal/middleware"
	"timo/web"
)

// Server là HTTP server trung tâm của ứng dụng
type Server struct {
	cfg    *config.Config
	db     *database.DB
	mux    *http.ServeMux
	http   *http.Server
}

// New khởi tạo Server với config và database
func New(cfg *config.Config, db *database.DB) *Server {
	mux := http.NewServeMux()

	httpServer := &http.Server{
		Addr:         fmt.Sprintf("127.0.0.1:%d", cfg.Port),
		Handler:      applyMiddleware(mux, cfg),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // Cao hơn để hỗ trợ SSE
		IdleTimeout:  120 * time.Second,
	}

	s := &Server{
		cfg:  cfg,
		db:   db,
		mux:  mux,
		http: httpServer,
	}

	// Đăng ký health check endpoint
	s.registerHealthCheck()
	// Đăng ký trang Home chính
	s.registerHome()

	return s
}

// Mux trả về ServeMux để các feature đăng ký routes
func (s *Server) Mux() *http.ServeMux {
	return s.mux
}

// Run khởi động server và xử lý graceful shutdown
func (s *Server) Run() {
	// Lắng nghe tín hiệu OS để tắt server an toàn
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Khởi động server trong goroutine riêng
	go func() {
		slog.Info("Server đang khởi động", "addr", s.http.Addr)
		
		// Mở trình duyệt sau khi server bắt đầu lắng nghe (chờ 1 chút để server kịp start)
		go func() {
			time.Sleep(500 * time.Millisecond)
			openBrowser(fmt.Sprintf("http://localhost:%d", s.cfg.Port))
		}()

		if err := s.http.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Lỗi khởi động server", "error", err)
			os.Exit(1)
		}
	}()

	// Chờ tín hiệu tắt
	sig := <-quit
	slog.Info("Nhận tín hiệu tắt server", "signal", sig.String())

	// Cho phép 10 giây để hoàn thành các request đang xử lý
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := s.http.Shutdown(ctx); err != nil {
		slog.Error("Lỗi graceful shutdown", "error", err)
	}

	s.db.Close()
	slog.Info("Server đã tắt thành công")
}

// -------------------------------------------------------------------------
// Health Check endpoint
// -------------------------------------------------------------------------

func (s *Server) registerHealthCheck() {
	s.mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status":   "ok",
			"database": s.db.HealthStatus(),
			"time":     time.Now().Format(time.RFC3339),
		})
	})
}

// -------------------------------------------------------------------------
// Home Dashboard
// -------------------------------------------------------------------------

// HTML is loaded via web package

func (s *Server) registerHome() {
	s.mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		html, err := web.FS.ReadFile("templates/home.html")
		if err != nil {
			http.Error(w, "Không tìm thấy giao diện", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write(html)
	})
}

// -------------------------------------------------------------------------
// Middleware chain
// -------------------------------------------------------------------------

// applyMiddleware áp dụng middleware theo thứ tự: Logger → CORS → RequireAuth → Handler
func applyMiddleware(h http.Handler, cfg *config.Config) http.Handler {
	return middleware.Logger(middleware.CORS(middleware.RequireAuth(cfg, h)))
}

// openBrowser mở URL bằng trình duyệt mặc định của hệ thống
func openBrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}

	if err != nil {
		slog.Warn("Không thể mở trình duyệt tự động", "url", url, "error", err)
	} else {
		slog.Info("Đã mở trình duyệt", "url", url)
	}
}
