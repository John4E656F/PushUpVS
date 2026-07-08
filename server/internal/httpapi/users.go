package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type meResponse struct {
	ID          string    `json:"id"`
	Email       string    `json:"email,omitempty"`
	Name        string    `json:"name,omitempty"`
	DailyGoal   int       `json:"dailyGoal"`
	Plan        string    `json:"plan"`
	TrialEndsAt time.Time `json:"trialEndsAt"`
	Entitled    bool      `json:"entitled"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
}

func (a *API) handleGetMe(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	resp := meResponse{
		ID:          user.ID,
		Email:       user.Email,
		Name:        user.Name,
		DailyGoal:   user.DailyGoal,
		Plan:        user.Plan,
		TrialEndsAt: user.TrialEndsAt,
		Entitled:    user.Entitled(time.Now().UTC()),
	}
	if user.AvatarKey != "" && a.blob != nil {
		if url, err := a.blob.PresignGet(r.Context(), user.AvatarKey, time.Hour); err == nil {
			resp.AvatarURL = url
		} else {
			slog.Warn("presign avatar", "err", err)
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

func (a *API) handlePatchMe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name      *string `json:"name"`
		DailyGoal *int    `json:"dailyGoal"`
		AvatarKey *string `json:"avatarKey"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeErr(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	set := bson.M{}
	if body.Name != nil {
		set["name"] = *body.Name
	}
	if body.DailyGoal != nil {
		if *body.DailyGoal < 1 || *body.DailyGoal > 1000 {
			writeErr(w, http.StatusBadRequest, "bad_request", "dailyGoal must be between 1 and 1000")
			return
		}
		set["dailyGoal"] = *body.DailyGoal
	}
	if body.AvatarKey != nil {
		user := currentUser(r)
		if !ownedAvatarKey(*body.AvatarKey, user.ID) {
			writeErr(w, http.StatusBadRequest, "bad_request", "avatarKey does not belong to this user")
			return
		}
		set["avatarKey"] = *body.AvatarKey
	}
	if len(set) == 0 {
		writeErr(w, http.StatusBadRequest, "bad_request", "nothing to update")
		return
	}
	user, err := a.store.UpdateUser(r.Context(), currentUser(r).ID, set)
	if err != nil {
		slog.Error("update user", "err", err)
		writeErr(w, http.StatusInternalServerError, "internal", "could not update profile")
		return
	}
	writeJSON(w, http.StatusOK, meResponse{
		ID: user.ID, Email: user.Email, Name: user.Name, DailyGoal: user.DailyGoal,
		Plan: user.Plan, TrialEndsAt: user.TrialEndsAt, Entitled: user.Entitled(time.Now().UTC()),
	})
}
