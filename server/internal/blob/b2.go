// Package blob issues presigned URLs against Backblaze B2's S3-compatible API.
// The app uploads/downloads directly to B2; the server never proxies bytes.
package blob

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	appconfig "github.com/John4E656F/Befit/server/internal/config"
)

type Presigner struct {
	presign *s3.PresignClient
	bucket  string
}

func New(ctx context.Context, cfg appconfig.B2) (*Presigner, error) {
	if cfg.Endpoint == "" || cfg.KeyID == "" || cfg.AppKey == "" || cfg.Bucket == "" {
		return nil, fmt.Errorf("backblaze not configured: set B2_S3_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET")
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.KeyID, cfg.AppKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("aws config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(cfg.Endpoint)
	})
	return &Presigner{presign: s3.NewPresignClient(client), bucket: cfg.Bucket}, nil
}

// PresignPut returns a URL the client can PUT the object bytes to.
func (p *Presigner) PresignPut(ctx context.Context, key, contentType string, expires time.Duration) (string, error) {
	req, err := p.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(p.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(expires))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// PresignGet returns a URL the client can GET the object from.
func (p *Presigner) PresignGet(ctx context.Context, key string, expires time.Duration) (string, error) {
	req, err := p.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expires))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// OwnedByUser guards against users presigning reads of other users' objects.
// All keys follow "{kind}/{userID}/{filename}".
func OwnedByUser(key, userID string) bool {
	for _, prefix := range []string{"videos/", "avatars/", "exports/"} {
		if strings.HasPrefix(key, prefix+userID+"/") {
			return true
		}
	}
	return false
}
