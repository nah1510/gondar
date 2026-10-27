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

	req.Header.Set("Accept", "application/json, text/plain")
	req.Header.Set("Accept-Language", "vi,en;q=0.9")
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")
	req.Header.Set("Origin", "https://share.timo.vn")
	req.Header.Set("Priority", "u=1, i")
	req.Header.Set("Referer", "https://share.timo.vn/")
	req.Header.Set("Sec-Ch-Ua", `"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"`)
	req.Header.Set("Sec-Ch-Ua-Mobile", "?1")
	req.Header.Set("Sec-Ch-Ua-Platform", `"Android"`)
	req.Header.Set("Sec-Fetch-Dest", "empty")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	req.Header.Set("Sec-Fetch-Site", "same-site")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36")

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
