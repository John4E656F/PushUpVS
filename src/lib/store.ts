// Zustand store — local-first session log with best-effort server sync.
// Sessions are always saved on device immediately; syncing to the Go API
// happens opportunistically and flips `synced` on success.

import { create } from 'zustand';

import { api, ApiUnavailableError, SubscriptionRequiredError, type TokenGetter } from './api';
import type { CountMethod, Me, Stats, WorkoutSession } from './types';

function computeLocalStats(sessions: WorkoutSession[], dailyGoal: number): Stats {
  const dayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const dayReps = new Map<string, number>();
  let allTime = 0;
  let best = 0;
  for (const s of sessions) {
    dayReps.set(dayKey(s.startedAt), (dayReps.get(dayKey(s.startedAt)) ?? 0) + s.reps);
    allTime += s.reps;
    best = Math.max(best, s.reps);
  }
  const now = new Date();
  const last7Days = [];
  let weekReps = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.toISOString());
    const reps = dayReps.get(key) ?? 0;
    last7Days.push({ date: key, reps });
    weekReps += reps;
  }
  const today = dayKey(now.toISOString());
  let streak = 0;
  const cursor = new Date(now);
  if (!dayReps.get(today)) cursor.setDate(cursor.getDate() - 1);
  while (dayReps.get(dayKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  void dailyGoal;
  return {
    todayReps: dayReps.get(today) ?? 0,
    weekReps,
    allTimeReps: allTime,
    bestSession: best,
    streakDays: streak,
    sessionCount: sessions.length,
    last7Days,
  };
}

type AppState = {
  me: Me | null;
  stats: Stats | null;
  sessions: WorkoutSession[];
  dailyGoal: number;
  /** false once the API said 402 — routes the user to the paywall. */
  entitled: boolean;
  usingServer: boolean;

  refresh: (getToken: TokenGetter) => Promise<void>;
  completeSession: (
    getToken: TokenGetter,
    input: {
      reps: number;
      durationSec: number;
      method: CountMethod;
      startedAt: string;
      repTimesMs?: number[];
      videoStartMs?: number;
    },
  ) => Promise<WorkoutSession>;
  attachVideo: (getToken: TokenGetter, session: WorkoutSession, videoKey: string) => Promise<void>;
  deleteSession: (getToken: TokenGetter, id: string) => Promise<void>;
  setDailyGoal: (getToken: TokenGetter, goal: number) => Promise<void>;
};

export const useStore = create<AppState>((set, get) => ({
  me: null,
  stats: null,
  sessions: [],
  dailyGoal: 50,
  entitled: true,
  usingServer: false,

  refresh: async (getToken) => {
    try {
      const [me, stats, list] = await Promise.all([
        api.getMe(getToken),
        api.getStats(getToken).catch((e) => {
          if (e instanceof SubscriptionRequiredError) return null;
          throw e;
        }),
        api.listSessions(getToken, { limit: 100 }).catch((e) => {
          if (e instanceof SubscriptionRequiredError) return null;
          throw e;
        }),
      ]);
      set({
        me,
        entitled: me.entitled,
        dailyGoal: me.dailyGoal,
        usingServer: true,
        ...(stats ? { stats } : {}),
        ...(list ? { sessions: list.sessions.map((s) => ({ ...s, synced: true })) } : {}),
      });
    } catch (e) {
      if (e instanceof ApiUnavailableError) {
        // Local-only mode: recompute stats from what we have on device.
        const { sessions, dailyGoal } = get();
        set({ usingServer: false, stats: computeLocalStats(sessions, dailyGoal) });
        return;
      }
      throw e;
    }
  },

  completeSession: async (getToken, input) => {
    const local: WorkoutSession = {
      id: `local-${Date.now()}`,
      ...input,
      synced: false,
    };
    set((s) => ({ sessions: [local, ...s.sessions] }));
    try {
      const saved = await api.createSession(getToken, input);
      const synced: WorkoutSession = { ...saved, synced: true };
      set((s) => ({ sessions: s.sessions.map((x) => (x.id === local.id ? synced : x)) }));
      get()
        .refresh(getToken)
        .catch(() => {});
      return synced;
    } catch (e) {
      if (e instanceof SubscriptionRequiredError) {
        set({ entitled: false });
      }
      const { sessions, dailyGoal } = get();
      set({ stats: computeLocalStats(sessions, dailyGoal) });
      return local;
    }
  },

  attachVideo: async (getToken, session, videoKey) => {
    if (!session.synced) return;
    await api.attachVideo(getToken, session.id, videoKey);
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? { ...x, videoKey } : x)),
    }));
  },

  deleteSession: async (getToken, id) => {
    const prev = get().sessions;
    set({ sessions: prev.filter((s) => s.id !== id) });
    const target = prev.find((s) => s.id === id);
    if (target?.synced) {
      try {
        await api.deleteSession(getToken, id);
      } catch {
        set({ sessions: prev }); // roll back on failure
        throw new Error('Could not delete this session — try again.');
      }
    }
    get()
      .refresh(getToken)
      .catch(() => {});
  },

  setDailyGoal: async (getToken, goal) => {
    set({ dailyGoal: goal });
    try {
      const me = await api.patchMe(getToken, { dailyGoal: goal });
      set({ me });
    } catch {
      // keep the local value; it syncs next time the server is reachable
    }
  },
}));
