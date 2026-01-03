package timo

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"timo/web"
)

// HTML is loaded via web package

// -------------------------------------------------------------------------
// 1. State quản lý tiến trình sync trong RAM
// -------------------------------------------------------------------------

type syncState struct {
	sync.Mutex
	Logs      []LogEvent `json:"logs"`
	Status    string     `json:"status"` // "idle" | "running" | "done" | "error"
	Summary   string     `json:"summary,omitempty"`
	LastError string     `json:"lastError,omitempty"`
}

// -------------------------------------------------------------------------
// 2. Handler struct – entry point cho timo feature
// -------------------------------------------------------------------------

type Handler struct {
	state       *syncState
	syncService *SyncService
}

func NewHandler(timoClient TimoAPI, sheetService SheetAPI, notifier Notifier) *Handler {
	return &Handler{
		state: &syncState{
			Status: "idle",
			Logs:   make([]LogEvent, 0),
		},
		syncService: NewSyncService(timoClient, sheetService, notifier),
	}
}

// RegisterRoutes gắn tất cả routes của timo feature vào mux
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /timo", h.handleDashboard) // Dashboard chính của Timo
	mux.HandleFunc("GET /api/timo/stream", h.handleStream)
	mux.HandleFunc("POST /api/timo/sync", h.handleTrigger)
	mux.HandleFunc("GET /api/timo/poll", h.handlePoll)
}

// GET /timo – Serve trang dashboard
func (h *Handler) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/timo" && r.URL.Path != "/timo/" {
		http.NotFound(w, r)
		return
	}
	html, err := web.FS.ReadFile("templates/timo.html")
	if err != nil {
		http.Error(w, "Không tìm thấy giao diện", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(html)
}

// -------------------------------------------------------------------------
// 3. POST /api/timo/sync – Kích hoạt đồng bộ chạy ngầm
// -------------------------------------------------------------------------

func (h *Handler) handleTrigger(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	h.state.Lock()
	if h.state.Status == "running" {
		h.state.Unlock()
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"message": "Tiến trình đồng bộ đang bận, vui lòng đợi..."})
		return
	}

	// Reset state
	h.state.Status = "running"
	h.state.Logs = []LogEvent{{Level: "info", Message: fmt.Sprintf("[%s] Khởi động động cơ xử lý dữ liệu...", time.Now().Format("15:04:05"))}}
	h.state.Summary = ""
	h.state.LastError = ""
	h.state.Unlock()

	// Chạy sync trong goroutine ngầm
	go func() {
		// Dùng background context vì request này trả về ngay lập tức
		ctx := context.Background()
		logsChan := make(chan LogEvent, 100)
		doneChan := make(chan struct{})

		go func() {
			summary, syncErr := h.syncService.PerformSync(ctx, logsChan)

			h.state.Lock()
			if syncErr != nil {
				h.state.Status = "error"
				h.state.LastError = syncErr.Error()
			} else {
				h.state.Status = "done"
				h.state.Summary = summary
			}
			h.state.Unlock()
			close(doneChan)
		}()

		for {
			select {
			case logMsg, open := <-logsChan:
				if open {
					h.state.Lock()
					h.state.Logs = append(h.state.Logs, LogEvent{Level: logMsg.Level, Message: fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), logMsg.Message)})
					h.state.Unlock()
				}
			case <-doneChan:
				return
			}
		}
	}()

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"status":     "started",
		"message":    "Tiến trình Timo Sync đã được đưa vào hàng đợi chạy ngầm",
		"stream_url": "/api/timo/stream",
		"poll_url":   "/api/timo/poll",
	})
}

// -------------------------------------------------------------------------
// 4. GET /api/timo/poll – Kéo trạng thái định kỳ (cho Polling model)
// -------------------------------------------------------------------------

func (h *Handler) handlePoll(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	h.state.Lock()
	defer h.state.Unlock()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(h.state)
}

// -------------------------------------------------------------------------
// 5. GET /api/timo/stream – SSE stream logs thời gian thực
// -------------------------------------------------------------------------

func (h *Handler) handleStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming không được hỗ trợ", http.StatusInternalServerError)
		return
	}

	logsChan := make(chan LogEvent, 100)
	doneChan := make(chan struct{})

	var summary string
	var syncErr error

	go func() {
		// Dùng request context để cancel nếu FE đóng connection
		summary, syncErr = h.syncService.PerformSync(r.Context(), logsChan)
		close(logsChan)
		close(doneChan)
	}()

	for {
		select {
		case logMsg, open := <-logsChan:
			if open {
				timestamp := time.Now().Format("15:04:05")
				logMsg.Message = fmt.Sprintf("[%s] %s", timestamp, logMsg.Message)
				payload, _ := json.Marshal(logMsg)
				fmt.Fprintf(w, "data: %s\n\n", payload)
				flusher.Flush()
			}
		case <-doneChan:
			var payload []byte
			if syncErr != nil {
				payload, _ = json.Marshal(map[string]string{
					"event": "error",
					"log":   fmt.Sprintf("[LỖI NGHIÊM TRỌNG] %v", syncErr),
				})
			} else {
				payload, _ = json.Marshal(map[string]string{
					"event":   "done",
					"summary": summary,
				})
			}
			fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
			return
		case <-r.Context().Done():
			// Nếu FE mất kết nối, xả hết channel trong background để PerformSync
			// không bị block (deadlock) và có thể chạy tiếp đến khi hoàn thành (hoặc bị cancel bởi ctx).
			go func() {
				for range logsChan {
				}
			}()
			return
		}
	}
}
