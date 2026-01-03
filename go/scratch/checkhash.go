package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgres://postgres.yfxikpuvhcvvllnnygti:SuperSecret123!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
	
	poolCfg, _ := pgxpool.ParseConfig(dbURL)
	poolCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec

	pool, err := pgxpool.NewWithConfig(context.Background(), poolCfg)
	if err != nil {
		fmt.Println("DB error:", err)
		return
	}
	defer pool.Close()

	var res *string
	input := "" // string rỗng
	
	query := "SELECT NULLIF($1::text, '')::UUID"
	err = pool.QueryRow(context.Background(), query, input).Scan(&res)
	if err != nil {
		fmt.Println("Query error with '':", err)
	} else {
		fmt.Println("Query success with '':", res)
	}

	var inputNil *string // nil pointer
	err = pool.QueryRow(context.Background(), query, inputNil).Scan(&res)
	if err != nil {
		fmt.Println("Query error with nil:", err)
	} else {
		fmt.Println("Query success with nil:", res)
	}
}
