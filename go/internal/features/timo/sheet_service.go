package timo

import (
	"context"
	"fmt"
	"log"

	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

const (
	SheetNameTxn  = "Giao dịch!"
	SheetNameHash = "Hash!"
)

type SheetService struct {
	config *Config
	srv    *sheets.Service
}

func NewSheetService(config *Config) *SheetService {
	ctx := context.Background()

	srv, err := sheets.NewService(
		ctx,
		option.WithAuthCredentialsJSON(
			option.ServiceAccount,
			[]byte(config.CredentialsFile),
		),
		option.WithScopes(sheets.SpreadsheetsScope),
	)
	if err != nil {
		log.Fatalf("Không thể tạo Sheet Service: %v", err)
	}

	return &SheetService{
		config: config,
		srv:    srv,
	}
}

func (s *SheetService) getNextRow(ctx context.Context, readRange string) (int, error) {
	resp, err := s.srv.Spreadsheets.Values.Get(
		s.config.SheetID,
		readRange,
	).Context(ctx).Do()
	if err != nil {
		return 0, err
	}
	return len(resp.Values) + 1, nil
}

func (s *SheetService) AppendSpending(ctx context.Context, values []interface{}) error {
	if len(values) != 5 {
		return fmt.Errorf("yêu cầu chính xác 5 giá trị cho cột B:F")
	}
	row, err := s.getNextRow(ctx, SheetNameTxn+"B:B")
	if err != nil {
		return fmt.Errorf("không tìm được hàng tiếp theo cho chi tiêu: %w", err)
	}

	writeRange := fmt.Sprintf("%sB%d:F%d", SheetNameTxn, row, row)
	return s.appendValues(ctx, writeRange, [][]interface{}{values})
}

func (s *SheetService) AppendBatchSpending(ctx context.Context, rows [][]interface{}) error {
	if len(rows) == 0 {
		return nil
	}
	row, err := s.getNextRow(ctx, SheetNameTxn+"B:B")
	if err != nil {
		return fmt.Errorf("không tìm được hàng tiếp theo cho chi tiêu: %w", err)
	}

	writeRange := fmt.Sprintf("%sB%d:F%d", SheetNameTxn, row, row+len(rows)-1)
	return s.appendValues(ctx, writeRange, rows)
}

func (s *SheetService) AppendIncome(ctx context.Context, values []interface{}) error {
	if len(values) != 4 {
		return fmt.Errorf("yêu cầu chính xác 4 giá trị cho cột H:K")
	}
	row, err := s.getNextRow(ctx, SheetNameTxn+"H:H")
	if err != nil {
		return fmt.Errorf("không tìm được hàng tiếp theo cho thu nhập: %w", err)
	}

	writeRange := fmt.Sprintf("%sH%d:K%d", SheetNameTxn, row, row)
	return s.appendValues(ctx, writeRange, [][]interface{}{values})
}

func (s *SheetService) AppendBatchIncome(ctx context.Context, rows [][]interface{}) error {
	if len(rows) == 0 {
		return nil
	}
	row, err := s.getNextRow(ctx, SheetNameTxn+"H:H")
	if err != nil {
		return fmt.Errorf("không tìm được hàng tiếp theo cho thu nhập: %w", err)
	}

	writeRange := fmt.Sprintf("%sH%d:K%d", SheetNameTxn, row, row+len(rows)-1)
	return s.appendValues(ctx, writeRange, rows)
}

func (s *SheetService) AppendHash(ctx context.Context, hash string) error {
	writeRange := fmt.Sprintf("%s%s", SheetNameHash, "A:A")
	return s.appendValues(ctx, writeRange, [][]interface{}{{hash}})
}

func (s *SheetService) AppendBatchHashes(ctx context.Context, hashes [][]interface{}) error {
	if len(hashes) == 0 {
		return nil
	}
	writeRange := fmt.Sprintf("%s%s", SheetNameHash, "A:A")
	return s.appendValues(ctx, writeRange, hashes)
}

func (s *SheetService) appendValues(ctx context.Context, writeRange string, values [][]interface{}) error {
	vr := &sheets.ValueRange{
		Values: values,
	}
	_, err := s.srv.Spreadsheets.Values.Append(
		s.config.SheetID,
		writeRange,
		vr,
	).
		ValueInputOption("USER_ENTERED").
		Context(ctx).
		Do()

	return err
}

func (s *SheetService) LoadExistingHashes(ctx context.Context) (map[string]bool, error) {
	resp, err := s.srv.Spreadsheets.Values.Get(s.config.SheetID, s.config.SheetHashRange).Context(ctx).Do()
	if err != nil {
		return nil, err
	}

	existingHashes := make(map[string]bool)
	if len(resp.Values) == 0 {
		return existingHashes, nil
	}

	for _, row := range resp.Values {
		if len(row) > 0 {
			hashStr, ok := row[0].(string)
			if ok && hashStr != "" {
				existingHashes[hashStr] = true
			}
		}
	}
	return existingHashes, nil
}
