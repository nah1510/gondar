package timo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type TxnRequest struct {
	Size           int    `json:"size"`
	XidIndex       int    `json:"xidIndex"`
	HashVerifyCode string `json:"hashVerifyCode"`
	Lang           string `json:"lang"`
	SecurityCode   string `json:"securityCode"`
}

type ApiResponse struct {
	Code    int  `json:"code"`
	Success bool `json:"success"`
	Data    Data `json:"data"`
}

type Data struct {
	TxnHistories []TxnHistory `json:"txnHistories"`
	Amount       float64      `json:"amount"`
	LastIndex    int64        `json:"lastIndex"`
	PreXidIdx    int64        `json:"preXidIdx"`
}

type TxnHistory struct {
	DispDate string `json:"dispDate"`
	Items    []Item `json:"item"`
}

type Item struct {
	TxnTitle        string  `json:"txnTitle"`
	TxnDesc         string  `json:"txnDesc"`
	TxnAmount       float64 `json:"txnAmount"`
	RemainingAmount float64 `json:"remainingAmount"`
	Note            string  `json:"note"`
	FromTimoBank    bool    `json:"fromTimoBank"`
}

type TimoClient struct {
	config *Config
	client *http.Client
}

func NewTimoClient(config *Config) *TimoClient {
	return &TimoClient{
		config: config,
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// FetchTxn thực hiện gọi API để lấy lịch sử giao dịch
func (c *TimoClient) FetchTxn(ctx context.Context) (*ApiResponse, error) {
	payload := TxnRequest{
		Size:           20,
		XidIndex:       0,
		HashVerifyCode: c.config.TimoHashVerifyCode,
		Lang:           "EN",
		SecurityCode:   c.config.TimoSecurityCode,
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", c.config.TimoAPIURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status=%d body=%s", resp.StatusCode, string(raw))
	}

	var apiResp ApiResponse
	if err := json.Unmarshal(raw, &apiResp); err != nil {
		return nil, err
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("api success=false (Code: %d)", apiResp.Code)
	}

	return &apiResp, nil
}
