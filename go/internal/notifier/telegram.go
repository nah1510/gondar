package notifier

import (
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// TelegramNotifier dùng để gửi tin nhắn thông báo chung cho toàn hệ thống
type TelegramNotifier struct {
	token  string
	chatID string
	client *http.Client
}

// NewTelegramNotifier khởi tạo một notifier mới với token và chat ID cụ thể
func NewTelegramNotifier(token, chatID string) *TelegramNotifier {
	return &TelegramNotifier{
		token:  token,
		chatID: chatID,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendMessage gửi tin nhắn dạng HTML qua Telegram
func (n *TelegramNotifier) SendMessage(text string) error {
	if text == "" {
		return nil
	}

	apiURL := fmt.Sprintf(
		"https://api.telegram.org/bot%s/sendMessage",
		n.token,
	)

	data := url.Values{}
	data.Set("chat_id", n.chatID)
	data.Set("parse_mode", "HTML")
	data.Set("text", text)

	resp, err := n.client.PostForm(apiURL, data)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram send failed, status=%d", resp.StatusCode)
	}

	return nil
}
