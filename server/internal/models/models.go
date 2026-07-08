// Package models defines the MongoDB document shapes shared across the API.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// User is keyed by the Clerk user ID.
type User struct {
	ID          string    `bson:"_id" json:"id"`
	Email       string    `bson:"email,omitempty" json:"email,omitempty"`
	Name        string    `bson:"name,omitempty" json:"name,omitempty"`
	AvatarKey   string    `bson:"avatarKey,omitempty" json:"avatarKey,omitempty"`
	DailyGoal   int       `bson:"dailyGoal" json:"dailyGoal"`
	Plan        string    `bson:"plan" json:"plan"` // "free" | "pro"
	TrialEndsAt time.Time `bson:"trialEndsAt" json:"trialEndsAt"`
	CreatedAt   time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time `bson:"updatedAt" json:"updatedAt"`
}

// Entitled reports whether the user can use the app (active trial or paid plan).
func (u *User) Entitled(now time.Time) bool {
	return u.Plan == "pro" || now.Before(u.TrialEndsAt)
}

// Session is one completed pushup set.
type Session struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      string        `bson:"userId" json:"-"`
	Reps        int           `bson:"reps" json:"reps"`
	DurationSec int           `bson:"durationSec" json:"durationSec"`
	Method      string        `bson:"method" json:"method"` // "pose" | "manual"
	VideoKey    string        `bson:"videoKey,omitempty" json:"videoKey,omitempty"`
	StartedAt   time.Time     `bson:"startedAt" json:"startedAt"`
	CreatedAt   time.Time     `bson:"createdAt" json:"createdAt"`
}

// Stats is the aggregate payload for the home/history screens.
type Stats struct {
	TodayReps    int         `json:"todayReps"`
	WeekReps     int         `json:"weekReps"`
	AllTimeReps  int         `json:"allTimeReps"`
	BestSession  int         `json:"bestSession"`
	StreakDays   int         `json:"streakDays"`
	SessionCount int         `json:"sessionCount"`
	Last7Days    []DayBucket `json:"last7Days"`
}

type DayBucket struct {
	Date string `json:"date"` // YYYY-MM-DD in the user's timezone
	Reps int    `json:"reps"`
}
