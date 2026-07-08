// Package store wraps MongoDB access for users and sessions.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/John4E656F/Befit/server/internal/models"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	client   *mongo.Client
	users    *mongo.Collection
	sessions *mongo.Collection
}

func Connect(ctx context.Context, uri, db string) (*Store, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("mongo connect: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		return nil, fmt.Errorf("mongo ping: %w", err)
	}
	s := &Store{
		client:   client,
		users:    client.Database(db).Collection("users"),
		sessions: client.Database(db).Collection("sessions"),
	}
	if err := s.ensureIndexes(ctx); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) ensureIndexes(ctx context.Context) error {
	_, err := s.sessions.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "startedAt", Value: -1}}},
	})
	return err
}

func (s *Store) Close(ctx context.Context) error { return s.client.Disconnect(ctx) }

// EnsureUser upserts the user on first sight, starting their trial clock.
func (s *Store) EnsureUser(ctx context.Context, id string, trialDays int) (*models.User, error) {
	now := time.Now().UTC()
	after := options.After
	res := s.users.FindOneAndUpdate(ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{"updatedAt": now},
			"$setOnInsert": bson.M{
				"dailyGoal":   50,
				"plan":        "free",
				"trialEndsAt": now.Add(time.Duration(trialDays) * 24 * time.Hour),
				"createdAt":   now,
			},
		},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(after),
	)
	var u models.User
	if err := res.Decode(&u); err != nil {
		return nil, fmt.Errorf("ensure user: %w", err)
	}
	return &u, nil
}

func (s *Store) UpdateUser(ctx context.Context, id string, set bson.M) (*models.User, error) {
	set["updatedAt"] = time.Now().UTC()
	after := options.After
	res := s.users.FindOneAndUpdate(ctx,
		bson.M{"_id": id},
		bson.M{"$set": set},
		options.FindOneAndUpdate().SetReturnDocument(after),
	)
	var u models.User
	if err := res.Decode(&u); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (s *Store) SetPlan(ctx context.Context, userID, plan string) error {
	_, err := s.users.UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{"plan": plan, "updatedAt": time.Now().UTC()}},
	)
	return err
}

func (s *Store) DeleteUser(ctx context.Context, userID string) error {
	if _, err := s.sessions.DeleteMany(ctx, bson.M{"userId": userID}); err != nil {
		return err
	}
	_, err := s.users.DeleteOne(ctx, bson.M{"_id": userID})
	return err
}

func (s *Store) InsertSession(ctx context.Context, sess *models.Session) error {
	sess.CreatedAt = time.Now().UTC()
	res, err := s.sessions.InsertOne(ctx, sess)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		sess.ID = oid
	}
	return nil
}

func (s *Store) ListSessions(ctx context.Context, userID string, limit int64, before time.Time) ([]models.Session, error) {
	filter := bson.M{"userId": userID}
	if !before.IsZero() {
		filter["startedAt"] = bson.M{"$lt": before}
	}
	cur, err := s.sessions.Find(ctx, filter,
		options.Find().SetSort(bson.D{{Key: "startedAt", Value: -1}}).SetLimit(limit),
	)
	if err != nil {
		return nil, err
	}
	sessions := []models.Session{}
	if err := cur.All(ctx, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (s *Store) GetSession(ctx context.Context, userID string, id bson.ObjectID) (*models.Session, error) {
	var sess models.Session
	err := s.sessions.FindOne(ctx, bson.M{"_id": id, "userId": userID}).Decode(&sess)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *Store) SetSessionVideo(ctx context.Context, userID string, id bson.ObjectID, videoKey string) error {
	res, err := s.sessions.UpdateOne(ctx,
		bson.M{"_id": id, "userId": userID},
		bson.M{"$set": bson.M{"videoKey": videoKey}},
	)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeleteSession(ctx context.Context, userID string, id bson.ObjectID) error {
	res, err := s.sessions.DeleteOne(ctx, bson.M{"_id": id, "userId": userID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// AllSessions streams every session for a user, oldest first (for exports).
func (s *Store) AllSessions(ctx context.Context, userID string) ([]models.Session, error) {
	cur, err := s.sessions.Find(ctx, bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "startedAt", Value: 1}}),
	)
	if err != nil {
		return nil, err
	}
	sessions := []models.Session{}
	if err := cur.All(ctx, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

// Stats computes aggregates in the user's timezone (tzOffsetMin: minutes east of UTC).
func (s *Store) Stats(ctx context.Context, userID string, tzOffsetMin int) (*models.Stats, error) {
	sessions, err := s.AllSessions(ctx, userID)
	if err != nil {
		return nil, err
	}
	loc := time.FixedZone("user", tzOffsetMin*60)
	now := time.Now().In(loc)
	today := now.Format("2006-01-02")

	dayReps := map[string]int{}
	stats := &models.Stats{SessionCount: len(sessions)}
	for _, sess := range sessions {
		day := sess.StartedAt.In(loc).Format("2006-01-02")
		dayReps[day] += sess.Reps
		stats.AllTimeReps += sess.Reps
		if sess.Reps > stats.BestSession {
			stats.BestSession = sess.Reps
		}
	}

	stats.Last7Days = make([]models.DayBucket, 0, 7)
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i).Format("2006-01-02")
		stats.Last7Days = append(stats.Last7Days, models.DayBucket{Date: d, Reps: dayReps[d]})
		stats.WeekReps += dayReps[d]
	}
	stats.TodayReps = dayReps[today]

	// Streak: consecutive days with reps, counting back from today
	// (yesterday if nothing yet today, so a live streak isn't shown as 0).
	start := now
	if dayReps[today] == 0 {
		start = now.AddDate(0, 0, -1)
	}
	for {
		d := start.Format("2006-01-02")
		if dayReps[d] == 0 {
			break
		}
		stats.StreakDays++
		start = start.AddDate(0, 0, -1)
	}
	return stats, nil
}
