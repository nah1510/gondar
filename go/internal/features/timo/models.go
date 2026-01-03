package timo

import (
	"context"
)

// LogEvent là một sự kiện log có cấu trúc để gửi xuống UI
type LogEvent struct {
	Level   string `json:"level"`   // info, success, error, warning
	Message string `json:"message"`
}

// TimoAPI định nghĩa các hàm cần thiết để gọi API Timo
type TimoAPI interface {
	FetchTxn(ctx context.Context) (*ApiResponse, error)
}

// SheetAPI định nghĩa các hàm tương tác với Google Sheets
type SheetAPI interface {
	LoadExistingHashes(ctx context.Context) (map[string]bool, error)
	AppendHash(ctx context.Context, hash string) error
	AppendSpending(ctx context.Context, values []interface{}) error
	AppendIncome(ctx context.Context, values []interface{}) error
	
	// Cập nhật cho Batch Update
	AppendBatchHashes(ctx context.Context, hashes [][]interface{}) error
	AppendBatchSpending(ctx context.Context, rows [][]interface{}) error
	AppendBatchIncome(ctx context.Context, rows [][]interface{}) error
}

// Notifier định nghĩa hàm gửi thông báo (Telegram)
type Notifier interface {
	SendMessage(text string) error
}
