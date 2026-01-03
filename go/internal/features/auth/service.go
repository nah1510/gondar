package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/smtp"

	"golang.org/x/crypto/bcrypt"
	"timo/internal/config"
	"timo/internal/features/family"
)

// Service xử lý logic liên quan đến Auth
type Service struct {
	cfg        *config.Config
	familyRepo *family.Repository
}

func NewService(cfg *config.Config, familyRepo *family.Repository) *Service {
	return &Service{
		cfg:        cfg,
		familyRepo: familyRepo,
	}
}

// GenerateRandomPassword tạo ngẫu nhiên một mật khẩu 8 ký tự
func GenerateRandomPassword() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// HashPassword băm mật khẩu
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

// CheckPasswordHash kiểm tra mật khẩu
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// SendPasswordEmail gửi email chứa mật khẩu mới
func (s *Service) SendPasswordEmail(toEmail, newPassword string) error {
	if s.cfg.SMTPUser == "" || s.cfg.SMTPPass == "" {
		return errors.New("Chưa cấu hình SMTP")
	}

	from := s.cfg.SMTPUser
	pass := s.cfg.SMTPPass
	host := s.cfg.SMTPHost
	port := s.cfg.SMTPPort

	addr := fmt.Sprintf("%s:%d", host, port)
	auth := smtp.PlainAuth("", from, pass, host)

	subject := "Subject: Mật khẩu mới truy cập Gia Phả\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/plain; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf("Xin chào,\n\nMật khẩu mới của bạn là: %s\n\nVui lòng đăng nhập và đổi mật khẩu sớm nhất có thể.", newPassword)

	msg := []byte(subject + mime + body)

	return smtp.SendMail(addr, auth, from, []string{toEmail}, msg)
}
