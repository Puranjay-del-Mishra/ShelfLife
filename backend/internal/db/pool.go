package db

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func New(ctx context.Context) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
	if err != nil {
		return nil, err
	}
	// light defaults; we can tune later
	cfg.MinConns = 0
	cfg.MaxConns = 4
	return pgxpool.NewWithConfig(ctx, cfg)
}
