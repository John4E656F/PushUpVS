package httpapi

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	svix "github.com/svix/svix-webhooks/go"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// clerkEvent is the generic Clerk webhook envelope. Only the fields we act on
// are decoded; everything else is ignored.
type clerkEvent struct {
	Type string `json:"type"`
	Data struct {
		// user.* events
		ID             string `json:"id"`
		FirstName      string `json:"first_name"`
		LastName       string `json:"last_name"`
		EmailAddresses []struct {
			ID           string `json:"id"`
			EmailAddress string `json:"email_address"`
		} `json:"email_addresses"`
		PrimaryEmailAddressID string `json:"primary_email_address_id"`

		// subscription.* / subscriptionItem.* events (Clerk Billing)
		Status string `json:"status"`
		Payer  struct {
			UserID string `json:"user_id"`
		} `json:"payer"`
	} `json:"data"`
}

// handleClerkWebhook keeps Mongo in sync with Clerk users and Clerk Billing
// subscription state. Verified with the Svix signing secret.
func (a *API) handleClerkWebhook(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "could not read body")
		return
	}
	if a.cfg.ClerkWebhookSecret != "" {
		wh, err := svix.NewWebhook(a.cfg.ClerkWebhookSecret)
		if err != nil {
			slog.Error("svix init", "err", err)
			writeErr(w, http.StatusInternalServerError, "internal", "webhook verification unavailable")
			return
		}
		if err := wh.Verify(payload, r.Header); err != nil {
			writeErr(w, http.StatusUnauthorized, "unauthorized", "invalid webhook signature")
			return
		}
	} else {
		slog.Warn("CLERK_WEBHOOK_SIGNING_SECRET not set — accepting webhook unverified (dev only)")
	}

	var evt clerkEvent
	if err := json.Unmarshal(payload, &evt); err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid JSON payload")
		return
	}

	ctx := r.Context()
	switch {
	case evt.Type == "user.created" || evt.Type == "user.updated":
		if evt.Data.ID == "" {
			break
		}
		user, err := a.store.EnsureUser(ctx, evt.Data.ID, a.cfg.TrialDays)
		if err != nil {
			slog.Error("webhook ensure user", "err", err)
			break
		}
		set := bson.M{}
		name := strings.TrimSpace(evt.Data.FirstName + " " + evt.Data.LastName)
		if name != "" && name != user.Name {
			set["name"] = name
		}
		for _, e := range evt.Data.EmailAddresses {
			if e.ID == evt.Data.PrimaryEmailAddressID && e.EmailAddress != user.Email {
				set["email"] = e.EmailAddress
			}
		}
		if len(set) > 0 {
			if _, err := a.store.UpdateUser(ctx, evt.Data.ID, set); err != nil {
				slog.Error("webhook update user", "err", err)
			}
		}

	case evt.Type == "user.deleted":
		if evt.Data.ID != "" {
			if err := a.store.DeleteUser(ctx, evt.Data.ID); err != nil {
				slog.Error("webhook delete user", "err", err)
			}
		}

	case strings.HasPrefix(evt.Type, "subscription"):
		// subscription.active / subscription.updated / subscription.past_due / ...
		userID := evt.Data.Payer.UserID
		if userID == "" {
			break
		}
		plan := "free"
		if evt.Data.Status == "active" {
			plan = "pro"
		}
		if err := a.store.SetPlan(ctx, userID, plan); err != nil {
			slog.Error("webhook set plan", "err", err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "received"})
}
