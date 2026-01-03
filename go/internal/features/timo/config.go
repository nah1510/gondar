package timo

import (
	"bytes"
	_ "embed"
	"fmt"
	"log"
	"strings"

	"github.com/spf13/viper"
)

// Cả config.yaml và credentials.json đều được embed vào binary — không cần file runtime
//
//go:embed config.yaml
var rawConfig string

//go:embed credentials.json
var rawCredentials string

type Config struct {
	// API Timo
	TimoAPIURL         string
	TimoSecurityCode   string
	TimoHashVerifyCode string
	// Google Sheets
	SheetID         string
	CredentialsFile string
	SheetTxnRange   string
	SheetHashRange  string
	// Telegram
	BotToken string
	ChatID   string
}

// LoadConfig tải cấu hình từ config.yaml đã được embed vào binary.
// Mọi giá trị đều có thể override bằng env var với prefix TIMO_
// Ví dụ: TIMO_BOTTOKEN, TIMO_SHEETID, TIMO_TIMOAPIURL, ...
func LoadConfig() *Config {
	v := viper.New()
	v.SetConfigType("yaml")
	v.SetEnvPrefix("TIMO")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadConfig(bytes.NewBufferString(rawConfig)); err != nil {
		log.Fatal(fmt.Errorf("[LỖI] Đọc embedded config.yaml thất bại: %w", err))
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		log.Fatal(fmt.Errorf("[LỖI] Parse config thất bại: %w", err))
	}

	cfg.CredentialsFile = rawCredentials
	return &cfg
}
