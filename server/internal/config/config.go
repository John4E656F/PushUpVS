// Package config loads server configuration from environment variables.
package config

import (
	"fmt"
	"os"
	"strconv"
)

type B2 struct {
	// S3-compatible endpoint, e.g. https://s3.us-west-004.backblazeb2.com
	Endpoint string
	// Region embedded in the endpoint, e.g. us-west-004
	Region string
	KeyID  string
	AppKey string
	Bucket string
}

type Config struct {
	Addr               string
	MongoURI           string
	MongoDB            string
	ClerkSecretKey     string
	ClerkWebhookSecret string
	B2                 B2
	TrialDays          int
	// AllowedOrigins for CORS ("*" during development).
	AllowedOrigins string
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func Load() (*Config, error) {
	cfg := &Config{
		Addr:               ":" + env("PORT", "8080"),
		MongoURI:           env("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDB:            env("MONGODB_DB", "pushup"),
		ClerkSecretKey:     os.Getenv("CLERK_SECRET_KEY"),
		ClerkWebhookSecret: os.Getenv("CLERK_WEBHOOK_SIGNING_SECRET"),
		B2: B2{
			Endpoint: os.Getenv("B2_S3_ENDPOINT"),
			Region:   env("B2_REGION", "us-west-004"),
			KeyID:    os.Getenv("B2_KEY_ID"),
			AppKey:   os.Getenv("B2_APPLICATION_KEY"),
			Bucket:   os.Getenv("B2_BUCKET"),
		},
		TrialDays:      7,
		AllowedOrigins: env("ALLOWED_ORIGINS", "*"),
	}
	if v := os.Getenv("TRIAL_DAYS"); v != "" {
		d, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("invalid TRIAL_DAYS %q: %w", v, err)
		}
		cfg.TrialDays = d
	}
	if cfg.ClerkSecretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY is required")
	}
	return cfg, nil
}
