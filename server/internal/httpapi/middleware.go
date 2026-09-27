package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"

	"github.com/John4E656F/Befit/server/internal/models"
)

type ctxKey int

const userKey ctxKey = iota

// currentUser returns the app user attached by requireUser.
func currentUser(r *http.Request) *models.User {
	u, _ := r.Context().Value(userKey).(*models.User)
	return u
}

// requireAuth validates the Clerk session JWT from the Authorization header.
func (a *API) requireAuth(next http.Handler) http.Handler {
	return clerkhttp.WithHeaderAuthorization()(next)
}

// requireUser upserts the Mongo user document for the authenticated Clerk
// user (starting their trial on first sight) and attaches it to the context.
func (a *API) requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := clerk.SessionClaimsFromContext(r.Context())
		if !ok {
			writeErr(w, http.StatusUnauthorized, "unauthorized", "missing or invalid session token")
			return
		}
		user, err := a.store.EnsureUser(r.Context(), claims.Subject, a.cfg.TrialDays)
		if err != nil {
			slog.Error("ensure user", "err", err)
			writeErr(w, http.StatusInternalServerError, "internal", "could not load user")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userKey, user)))
	})
}

// requireEntitled gates Pro features (cloud video, exports). Counting and
// stats stay free — expired trial + no plan => 402 so the app can upsell.
func (a *API) requireEntitled(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := currentUser(r)
		if user == nil || !user.Entitled(time.Now().UTC()) {
			writeErr(w, http.StatusPaymentRequired, "subscription_required", "PushUp Pro unlocks cloud videos and exports")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *API) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", a.cfg.AllowedOrigins)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("http", "method", r.Method, "path", r.URL.Path, "dur", time.Since(start).Round(time.Millisecond))
	})
}
