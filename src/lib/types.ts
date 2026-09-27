// Shared app types, mirroring the Go API's JSON shapes.

export type CountMethod = 'pose' | 'manual';

export type WorkoutSession = {
  /** Server id once synced, otherwise a local `local-*` id. */
  id: string;
  reps: number;
  durationSec: number;
  method: CountMethod;
  startedAt: string; // ISO timestamp
  videoKey?: string;
  /** Per-rep offsets in ms from startedAt — powers rep-by-rep video scrubbing. */
  repTimesMs?: number[];
  /** Offset of the video recording start from startedAt, in ms. */
  videoStartMs?: number;
  /** True once the server has acknowledged this session. */
  synced: boolean;
};

export type DayBucket = { date: string; reps: number };

export type Stats = {
  todayReps: number;
  weekReps: number;
  allTimeReps: number;
  bestSession: number;
  streakDays: number;
  sessionCount: number;
  last7Days: DayBucket[];
};

export type Me = {
  id: string;
  email?: string;
  name?: string;
  dailyGoal: number;
  plan: 'free' | 'pro';
  trialEndsAt: string;
  entitled: boolean;
  avatarUrl?: string;
};

export type PresignedUpload = {
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
};
