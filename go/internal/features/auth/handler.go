package auth

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"timo/internal/config"
	"timo/internal/features/family"
	"timo/internal/middleware"
	"timo/web"
)

type Handler struct {
	svc        *Service
	cfg        *config.Config
	familyRepo *family.Repository
}

func NewHandler(svc *Service, cfg *config.Config, familyRepo *family.Repository) *Handler {
	return &Handler{
		svc:        svc,
		cfg:        cfg,
		familyRepo: familyRepo,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /login", h.handleLoginPage)
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("POST /api/auth/forgot-password", h.handleForgotPassword)
	mux.HandleFunc("POST /api/auth/logout", h.handleLogout)
	mux.HandleFunc("GET /api/auth/me", h.handleMe)
}

func (h *Handler) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	html, err := web.FS.ReadFile("templates/login.html")
	if err != nil {
		http.Error(w, "Không tìm thấy giao diện", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(html)
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("Lỗi parse payload đăng nhập", "error", err)
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	user, err := h.familyRepo.GetByUsername(r.Context(), req.Username)
	if err != nil || user == nil || user.PasswordHash == nil {
		if err != nil {
			slog.Error("Lỗi kiểm tra CSDL khi đăng nhập", "username", req.Username, "error", err)
		}
		http.Error(w, "Sai tài khoản hoặc mật khẩu", http.StatusUnauthorized)
		return
	}

	if !CheckPasswordHash(req.Password, *user.PasswordHash) {
		http.Error(w, "Sai tài khoản hoặc mật khẩu", http.StatusUnauthorized)
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Role, h.cfg)
	if err != nil {
		slog.Error("Lỗi khởi tạo JWT Token", "userID", user.ID, "error", err)
		http.Error(w, "Lỗi server", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Đăng nhập thành công",
		"token":   token,
		"role":    user.Role,
	})
}

func (h *Handler) handleForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	user, err := h.familyRepo.GetByEmail(r.Context(), req.Email)
	if err != nil || user == nil {
		// Tránh leak email: vẫn báo thành công dù không thấy user
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Nếu email hợp lệ, mật khẩu mới đã được gửi."})
		return
	}

	newPassword := GenerateRandomPassword()
	hash, err := HashPassword(newPassword)
	if err != nil {
		slog.Error("Lỗi mã hóa mật khẩu mới", "error", err)
		http.Error(w, "Lỗi tạo mật khẩu", http.StatusInternalServerError)
		return
	}

	user.PasswordHash = &hash
	if err := h.familyRepo.Update(r.Context(), user); err != nil {
		slog.Error("Lỗi cập nhật mật khẩu mới vào DB", "email", req.Email, "error", err)
		http.Error(w, "Lỗi lưu mật khẩu", http.StatusInternalServerError)
		return
	}

	// Gửi email
	if err := h.svc.SendPasswordEmail(req.Email, newPassword); err != nil {
		slog.Error("Lỗi gửi email cấp lại mật khẩu", "email", req.Email, "error", err)
		http.Error(w, "Không thể gửi email: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Mật khẩu mới đã được gửi vào email của bạn."})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Đã đăng xuất"})
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	userID, role := middleware.GetUserFromContext(r.Context())
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id":   userID,
		"role": role,
	})
}
