// Package httpapi wires the REST API: routing, auth, and handlers.
package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/John4E656F/Befit/server/internal/blob"
	"github.com/John4E656F/Befit/server/internal/config"
	"github.com/John4E656F/Befit/server/internal/store"
)

type API struct {
	cfg   *config.Config
	store *store.Store
	blob  *blob.Presigner // nil when B2 is not configured
}

func New(cfg *config.Config, st *store.Store, presigner *blob.Presigner) *API {
	return &API{cfg: cfg, store: st, blob: presigner}
}

// Handler builds the full route table.
func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.Handle("POST /v1/webhooks/clerk", http.HandlerFunc(a.handleClerkWebhook))

	// Authenticated, free forever: counting, history, and stats are the core
	// product. /v1/me also tells the app whether Pro features are unlocked.
	authed := func(h http.HandlerFunc) http.Handler {
		return a.requireAuth(a.requireUser(h))
	}
	mux.Handle("GET /v1/me", authed(a.handleGetMe))
	mux.Handle("PATCH /v1/me", authed(a.handlePatchMe))
	mux.Handle("POST /v1/sessions", authed(a.handleCreateSession))
	mux.Handle("GET /v1/sessions", authed(a.handleListSessions))
	mux.Handle("DELETE /v1/sessions/{id}", authed(a.handleDeleteSession))
	mux.Handle("GET /v1/stats", authed(a.handleStats))
	// Presign endpoints are authed; video keys are Pro-gated inside the
	// handlers so avatar uploads stay free.
	mux.Handle("POST /v1/uploads/presign", authed(a.handlePresignUpload))
	mux.Handle("GET /v1/files/url", authed(a.handlePresignDownload))

	// Pro-gated (active trial or pro plan): cloud video and data exports.
	gated := func(h http.HandlerFunc) http.Handler {
		return a.requireAuth(a.requireUser(a.requireEntitled(h)))
	}
	mux.Handle("POST /v1/sessions/{id}/video", gated(a.handleAttachVideo))
	mux.Handle("POST /v1/export", gated(a.handleExport))

	return a.cors(logRequests(mux))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func decodeBody(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
