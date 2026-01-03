package timo

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"slices"
	"time"
)

// HashStruct tạo mã hash SHA256 cho struct bất kỳ để chống trùng lặp
func HashStruct(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}

	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:]), nil
}

// SyncService điều phối tiến trình đồng bộ dữ liệu
type SyncService struct {
	timoClient   TimoAPI
	sheetService SheetAPI
	notifier     Notifier
}

func NewSyncService(timoClient TimoAPI, sheetService SheetAPI, notifier Notifier) *SyncService {
	return &SyncService{
		timoClient:   timoClient,
		sheetService: sheetService,
		notifier:     notifier,
	}
}

// ParsedTxn đại diện cho một giao dịch đã được bóc tách và phân tích
type ParsedTxn struct {
	Item     Item
	Date     string
	Hash     string
	Type     string
	IsIncome bool
	Desc     string
}

// ExtractNewTransactions là một Pure Function: Lọc ra các giao dịch mới từ lịch sử ngân hàng
func (s *SyncService) ExtractNewTransactions(history []TxnHistory, existingHashes map[string]bool) ([]ParsedTxn, error) {
	var newTxns []ParsedTxn

	// Timo trả về dữ liệu mới nhất ở đầu mảng, ta đảo ngược để insert từ cũ tới mới
	slices.Reverse(history)

	for _, v := range history {
		date := v.DispDate
		switch v.DispDate {
		case "Today":
			date = time.Now().Format("02/01/2006")
		case "Yesterday":
			date = time.Now().AddDate(0, 0, -1).Format("02/01/2006")
		}

		// Đảo ngược mảng items trong ngày
		slices.Reverse(v.Items)

		for _, i := range v.Items {
			hash, err := HashStruct(fmt.Sprintf("%v%v%v%v", i.TxnTitle, i.TxnDesc, i.TxnAmount, i.RemainingAmount))
			if err != nil {
				slog.Error("Tạo hash thất bại", "item", i.TxnTitle, "error", err)
				continue
			}

			if existingHashes[hash] {
				continue // Bỏ qua giao dịch đã đồng bộ
			}

			desc := i.TxnDesc
			if i.Note != "" {
				desc = i.Note
			}

			isIncome := i.TxnAmount > 0
			txnType := "Chi tiêu"
			if isIncome {
				txnType = "Thu nhập"
			}

			newTxns = append(newTxns, ParsedTxn{
				Item:     i,
				Date:     date,
				Hash:     hash,
				Type:     txnType,
				IsIncome: isIncome,
				Desc:     desc,
			})

			// Thêm hash vào map để tránh trùng lặp chính trong mảng hiện tại (nếu có 2 giao dịch giống hệt nhau)
			existingHashes[hash] = true
		}
	}

	return newTxns, nil
}

// PerformSync thực thi quá trình đồng bộ hoàn chỉnh
func (s *SyncService) PerformSync(ctx context.Context, logs chan<- LogEvent) (string, error) {
	sysLog := func(level, format string, v ...any) {
		msg := fmt.Sprintf(format, v...)
		if level == "error" {
			slog.Error("[timo/sync] " + msg)
		} else {
			slog.Info("[timo/sync] " + msg)
		}
	}

	uiLog := func(level, format string, v ...any) {
		msg := fmt.Sprintf(format, v...)
		sysLog(level, msg)
		if logs != nil {
			logs <- LogEvent{Level: level, Message: msg}
		}
	}

	uiLog("info", "🔄 Bắt đầu tiến trình đồng bộ dữ liệu...")
	uiLog("info", "📡 Đang kết nối tới ngân hàng Timo và Google Sheets...")

	// 1. Tải hash hiện tại
	existingHashes, err := s.sheetService.LoadExistingHashes(ctx)
	if err != nil {
		uiLog("error", "❌ Không thể kết nối Google Sheets: %v", err)
		return "", fmt.Errorf("LoadExistingHashes: %w", err)
	}
	sysLog("info", "Đã tải thành công %d mã Hash hiện có.", len(existingHashes))

	// 2. Lấy dữ liệu Timo
	resp, err := s.timoClient.FetchTxn(ctx)
	if err != nil {
		uiLog("error", "❌ Không thể lấy giao dịch từ Timo: %v", err)
		return "", fmt.Errorf("FetchTxn: %w", err)
	}
	uiLog("success", "✅ Đã lấy dữ liệu thành công. Bắt đầu đối chiếu giao dịch...")

	// 3. Phân tích Business Logic (Pure memory)
	newTxns, err := s.ExtractNewTransactions(resp.Data.TxnHistories, existingHashes)
	if err != nil {
		uiLog("error", "❌ Lỗi phân tích giao dịch: %v", err)
		return "", err
	}

	if len(newTxns) == 0 {
		uiLog("info", "💤 Không có giao dịch mới nào kể từ lần đồng bộ trước.")
		return "", nil
	}

	// 4. Chuẩn bị Batch Update
	var batchHashes [][]interface{}
	var batchIncomes [][]interface{}
	var batchSpendings [][]interface{}
	var newTxnSummary string

	for _, tx := range newTxns {
		uiLog("success", "✨ Phát hiện giao dịch mới: %s (%.0f VND)", tx.Item.TxnTitle, math.Abs(tx.Item.TxnAmount))

		batchHashes = append(batchHashes, []interface{}{tx.Hash})

		if tx.IsIncome {
			batchIncomes = append(batchIncomes, []interface{}{
				tx.Date,
				tx.Item.TxnAmount,
				tx.Desc,
				"Lương",
			})
		} else {
			batchSpendings = append(batchSpendings, []interface{}{
				tx.Date,
				math.Abs(tx.Item.TxnAmount),
				tx.Desc,
				"Timo",
				"",
			})
		}

		newTxnSummary += fmt.Sprintf("• <b>Ngày:</b> %s\n• <b>Loại:</b> %s\n• <b>Số tiền:</b> <code>%.2f</code>\n• <b>Mô tả:</b> %s\n\n",
			tx.Date, tx.Type, tx.Item.TxnAmount, tx.Item.TxnTitle+" - "+tx.Item.TxnDesc)
	}

	// 5. Ghi Batch vào Google Sheets
	sysLog("info", "Bắt đầu Batch Update vào Google Sheets...")

	if err := s.sheetService.AppendBatchHashes(ctx, batchHashes); err != nil {
		uiLog("error", "⚠️ Lỗi khi ghi Batch Hash: %v", err)
	}

	if len(batchSpendings) > 0 {
		if err := s.sheetService.AppendBatchSpending(ctx, batchSpendings); err != nil {
			uiLog("error", "⚠️ Lỗi khi ghi Batch Chi Tiêu: %v", err)
		} else {
			uiLog("success", "   ➜ Đã ghi thành công %d dòng Chi Tiêu", len(batchSpendings))
		}
	}

	if len(batchIncomes) > 0 {
		if err := s.sheetService.AppendBatchIncome(ctx, batchIncomes); err != nil {
			uiLog("error", "⚠️ Lỗi khi ghi Batch Thu Nhập: %v", err)
		} else {
			uiLog("success", "   ➜ Đã ghi thành công %d dòng Thu Nhập", len(batchIncomes))
		}
	}

	// 6. Gửi Telegram
	uiLog("info", "📱 Đang gửi thông báo tổng hợp qua Telegram...")
	telegramMsg := fmt.Sprintf("<b>Timo Sheet Update</b>\n━━━━━━━━━━━━━━\n• <b>Cập nhật:</b> %s\n\n<b>Chi tiết:</b>\n%s",
		time.Now().Format("15:04:05 02/01/2006"), newTxnSummary)

	if err := s.notifier.SendMessage(telegramMsg); err != nil {
		sysLog("error", "Không thể gửi thông báo Telegram: %v", err)
		uiLog("warning", "⚠️ Đã đồng bộ nhưng không thể gửi thông báo Telegram")
	}

	uiLog("success", "🎉 Hoàn tất! Đã đồng bộ thành công %d giao dịch mới.", len(newTxns))
	sysLog("info", "=== TIẾN TRÌNH KẾT THÚC ===")

	return newTxnSummary, nil
}
