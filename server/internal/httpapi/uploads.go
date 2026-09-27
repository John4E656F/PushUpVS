package httpapi

import (
	"crypto/rand"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/John4E656F/Befit/server/internal/blob"
)

const presignTTL = 15 * time.Minute

var videoContentTypes = map[string]string{
	"video/mp4":       ".mp4",
	"video/quicktime": ".mov",
}

var imageContentTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

func randomID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// handlePresignUpload returns a presigned PUT URL for a video or avatar.
// The client uploads directly to B2, then references the returned key.
func (a *API) handlePresignUpload(w http.ResponseWriter, r *http.Request) {
	if a.blob == nil {
		writeErr(w, http.StatusServiceUnavailable, "storage_unavailable", "file storage is not configured")
		return
	}
	var body struct {
		Kind        string `json:"kind"` // "video" | "avatar"
		ContentType string `json:"contentType"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	user := currentUser(r)
	var key string
	switch body.Kind {
	case "video":
		if !user.Entitled(time.Now().UTC()) {
			writeErr(w, http.StatusPaymentRequired, "subscription_required", "PushUp Pro unlocks cloud workout videos")
			return
		}
		ext, ok := videoContentTypes[body.ContentType]
		if !ok {
			writeErr(w, http.StatusBadRequest, "bad_request", "contentType must be video/mp4 or video/quicktime")
			return
		}
		key = fmt.Sprintf("videos/%s/%s%s", user.ID, randomID(), ext)
	case "avatar":
		ext, ok := imageContentTypes[body.ContentType]
		if !ok {
			writeErr(w, http.StatusBadRequest, "bad_request", "contentType must be image/jpeg, image/png or image/webp")
			return
		}
		key = fmt.Sprintf("avatars/%s/avatar%s", user.ID, ext)
	default:
		writeErr(w, http.StatusBadRequest, "bad_request", `kind must be "video" or "avatar"`)
		return
	}
	url, err := a.blob.PresignPut(r.Context(), key, body.ContentType, presignTTL)
	if err != nil {
		slog.Error("presign put", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not presign upload")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"key":       key,
		"url":       url,
		"method":    "PUT",
		"headers":   map[string]string{"Content-Type": body.ContentType},
		"expiresIn": int(presignTTL.Seconds()),
	})
}

// handlePresignDownload returns a presigned GET URL for one of the user's own objects.
func (a *API) handlePresignDownload(w http.ResponseWriter, r *http.Request) {
	if a.blob == nil {
		writeErr(w, http.StatusServiceUnavailable, "storage_unavailable", "file storage is not configured")
		return
	}
	key := r.URL.Query().Get("key")
	user := currentUser(r)
	if key == "" || !blob.OwnedByUser(key, user.ID) {
		writeErr(w, http.StatusForbidden, "forbidden", "key does not belong to this user")
		return
	}
	if strings.HasPrefix(key, "videos/") && !user.Entitled(time.Now().UTC()) {
		writeErr(w, http.StatusPaymentRequired, "subscription_required", "PushUp Pro unlocks cloud workout videos")
		return
	}
	url, err := a.blob.PresignGet(r.Context(), key, presignTTL)
	if err != nil {
		slog.Error("presign get", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not presign download")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": url, "expiresIn": int(presignTTL.Seconds())})
}

// handleExport generates a CSV/JSON workout history export, uploads it to B2,
// and returns a presigned download link.
func (a *API) handleExport(w http.ResponseWriter, r *http.Request) {
	if a.blob == nil {
		writeErr(w, http.StatusServiceUnavailable, "storage_unavailable", "file storage is not configured")
		return
	}
	var body struct {
		Format string `json:"format"` // "csv" | "json"
	}
	if err := decodeBody(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if body.Format != "csv" && body.Format != "json" {
		writeErr(w, http.StatusBadRequest, "bad_request", `format must be "csv" or "json"`)
		return
	}
	user := currentUser(r)
	sessions, err := a.store.AllSessions(r.Context(), user.ID)
	if err != nil {
		slog.Error("export sessions", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not load sessions")
		return
	}

	var payload []byte
	var contentType string
	switch body.Format {
	case "csv":
		var sb strings.Builder
		cw := csv.NewWriter(&sb)
		_ = cw.Write([]string{"startedAt", "reps", "durationSec", "method"})
		for _, s := range sessions {
			_ = cw.Write([]string{
				s.StartedAt.UTC().Format(time.RFC3339),
				strconv.Itoa(s.Reps),
				strconv.Itoa(s.DurationSec),
				s.Method,
			})
		}
		cw.Flush()
		payload = []byte(sb.String())
		contentType = "text/csv"
	case "json":
		payload, err = json.MarshalIndent(sessions, "", "  ")
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "internal", "could not encode export")
			return
		}
		contentType = "application/json"
	}

	key := fmt.Sprintf("exports/%s/pushups-%s.%s", user.ID, time.Now().UTC().Format("20060102-150405"), body.Format)
	putURL, err := a.blob.PresignPut(r.Context(), key, contentType, presignTTL)
	if err != nil {
		slog.Error("presign export put", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not store export")
		return
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPut, putURL, strings.NewReader(string(payload)))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal", "could not store export")
		return
	}
	req.Header.Set("Content-Type", contentType)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Error("upload export", "err", err)
		writeErr(w, http.StatusBadGateway, "storage_error", "could not upload export to storage")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		slog.Error("upload export", "status", resp.StatusCode)
		writeErr(w, http.StatusBadGateway, "storage_error", "storage rejected the export upload")
		return
	}

	getURL, err := a.blob.PresignGet(r.Context(), key, time.Hour)
	if err != nil {
		slog.Error("presign export get", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not presign export download")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"key": key, "url": getURL, "count": len(sessions)})
}

func ownedVideoKey(key, userID string) bool {
	return strings.HasPrefix(key, "videos/"+userID+"/")
}

func ownedAvatarKey(key, userID string) bool {
	return strings.HasPrefix(key, "avatars/"+userID+"/")
}
