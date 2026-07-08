package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/John4E656F/Befit/server/internal/models"
	"github.com/John4E656F/Befit/server/internal/store"
)

func (a *API) handleCreateSession(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Reps        int       `json:"reps"`
		DurationSec int       `json:"durationSec"`
		Method      string    `json:"method"`
		StartedAt   time.Time `json:"startedAt"`
		VideoKey    string    `json:"videoKey"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if body.Reps < 1 || body.Reps > 10000 {
		writeErr(w, http.StatusBadRequest, "bad_request", "reps must be between 1 and 10000")
		return
	}
	if body.Method != "pose" && body.Method != "manual" {
		writeErr(w, http.StatusBadRequest, "bad_request", `method must be "pose" or "manual"`)
		return
	}
	if body.StartedAt.IsZero() {
		body.StartedAt = time.Now().UTC()
	}
	user := currentUser(r)
	sess := &models.Session{
		UserID:      user.ID,
		Reps:        body.Reps,
		DurationSec: body.DurationSec,
		Method:      body.Method,
		StartedAt:   body.StartedAt.UTC(),
	}
	if body.VideoKey != "" {
		if !ownedVideoKey(body.VideoKey, user.ID) {
			writeErr(w, http.StatusBadRequest, "bad_request", "videoKey does not belong to this user")
			return
		}
		sess.VideoKey = body.VideoKey
	}
	if err := a.store.InsertSession(r.Context(), sess); err != nil {
		slog.Error("insert session", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not save session")
		return
	}
	writeJSON(w, http.StatusCreated, sess)
}

func (a *API) handleListSessions(w http.ResponseWriter, r *http.Request) {
	limit := int64(50)
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	var before time.Time
	if v := r.URL.Query().Get("before"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			writeErr(w, http.StatusBadRequest, "bad_request", "before must be RFC3339")
			return
		}
		before = t
	}
	sessions, err := a.store.ListSessions(r.Context(), currentUser(r).ID, limit, before)
	if err != nil {
		slog.Error("list sessions", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not load sessions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessions": sessions})
}

func (a *API) handleDeleteSession(w http.ResponseWriter, r *http.Request) {
	id, err := bson.ObjectIDFromHex(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid session id")
		return
	}
	if err := a.store.DeleteSession(r.Context(), currentUser(r).ID, id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "not_found", "session not found")
			return
		}
		slog.Error("delete session", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not delete session")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleAttachVideo links an uploaded B2 object to an existing session.
func (a *API) handleAttachVideo(w http.ResponseWriter, r *http.Request) {
	id, err := bson.ObjectIDFromHex(r.PathValue("id"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid session id")
		return
	}
	var body struct {
		VideoKey string `json:"videoKey"`
	}
	if err := decodeBody(r, &body); err != nil || body.VideoKey == "" {
		writeErr(w, http.StatusBadRequest, "bad_request", "videoKey is required")
		return
	}
	user := currentUser(r)
	if !ownedVideoKey(body.VideoKey, user.ID) {
		writeErr(w, http.StatusBadRequest, "bad_request", "videoKey does not belong to this user")
		return
	}
	if err := a.store.SetSessionVideo(r.Context(), user.ID, id, body.VideoKey); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "not_found", "session not found")
			return
		}
		slog.Error("attach video", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not attach video")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) handleStats(w http.ResponseWriter, r *http.Request) {
	tzOffsetMin := 0
	if v := r.URL.Query().Get("tzOffset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= -840 && n <= 840 {
			tzOffsetMin = n
		}
	}
	stats, err := a.store.Stats(r.Context(), currentUser(r).ID, tzOffsetMin)
	if err != nil {
		slog.Error("stats", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not compute stats")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
