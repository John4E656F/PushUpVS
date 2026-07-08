// PushUp API server: Clerk-authenticated REST API backed by MongoDB,
// with Backblaze B2 (S3-compatible) presigned storage.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"

	"github.com/John4E656F/Befit/server/internal/blob"
	"github.com/John4E656F/Befit/server/internal/config"
	"github.com/John4E656F/Befit/server/internal/httpapi"
	"github.com/John4E656F/Befit/server/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	clerk.SetKey(cfg.ClerkSecretKey)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Connect(ctx, cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		return err
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = st.Close(shutdownCtx)
	}()

	var presigner *blob.Presigner
	if p, err := blob.New(ctx, cfg.B2); err != nil {
		slog.Warn("backblaze disabled", "reason", err)
	} else {
		presigner = p
	}

	api := httpapi.New(cfg, st, presigner)
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
