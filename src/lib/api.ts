// Thin typed client for the Go API. All calls carry the Clerk session JWT.
// A missing EXPO_PUBLIC_API_URL puts the app in local-only mode: callers
// treat ApiUnavailableError as "keep the data on device".

import type { Me, PresignedUpload, Stats, WorkoutSession } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class ApiUnavailableError extends Error {}

export class SubscriptionRequiredError extends ApiError {
  constructor(message: string) {
    super(402, 'subscription_required', message);
  }
}

export type TokenGetter = () => Promise<string | null>;

async function request<T>(getToken: TokenGetter, path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new ApiUnavailableError('EXPO_PUBLIC_API_URL is not configured');
  const token = await getToken();
  if (!token) throw new ApiUnavailableError('not signed in');

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiUnavailableError('network unreachable');
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body?.error?.code ?? 'unknown';
    const message = body?.error?.message ?? `request failed (${res.status})`;
    if (res.status === 402) throw new SubscriptionRequiredError(message);
    throw new ApiError(res.status, code, message);
  }
  return body as T;
}

export const api = {
  configured: BASE_URL !== '',

  getMe: (getToken: TokenGetter) => request<Me>(getToken, '/v1/me'),

  patchMe: (getToken: TokenGetter, patch: { name?: string; dailyGoal?: number; avatarKey?: string }) =>
    request<Me>(getToken, '/v1/me', { method: 'PATCH', body: JSON.stringify(patch) }),

  createSession: (
    getToken: TokenGetter,
    session: { reps: number; durationSec: number; method: string; startedAt: string; videoKey?: string },
  ) => request<WorkoutSession>(getToken, '/v1/sessions', { method: 'POST', body: JSON.stringify(session) }),

  listSessions: (getToken: TokenGetter, opts?: { limit?: number; before?: string }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.before) params.set('before', opts.before);
    const qs = params.toString();
    return request<{ sessions: WorkoutSession[] }>(getToken, `/v1/sessions${qs ? `?${qs}` : ''}`);
  },

  deleteSession: (getToken: TokenGetter, id: string) =>
    request<void>(getToken, `/v1/sessions/${id}`, { method: 'DELETE' }),

  attachVideo: (getToken: TokenGetter, sessionId: string, videoKey: string) =>
    request<void>(getToken, `/v1/sessions/${sessionId}/video`, {
      method: 'POST',
      body: JSON.stringify({ videoKey }),
    }),

  getStats: (getToken: TokenGetter) => {
    const tzOffset = -new Date().getTimezoneOffset(); // minutes east of UTC
    return request<Stats>(getToken, `/v1/stats?tzOffset=${tzOffset}`);
  },

  presignUpload: (getToken: TokenGetter, kind: 'video' | 'avatar', contentType: string) =>
    request<PresignedUpload>(getToken, '/v1/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ kind, contentType }),
    }),

  fileUrl: (getToken: TokenGetter, key: string) =>
    request<{ url: string; expiresIn: number }>(getToken, `/v1/files/url?key=${encodeURIComponent(key)}`),

  export: (getToken: TokenGetter, format: 'csv' | 'json') =>
    request<{ key: string; url: string; count: number }>(getToken, '/v1/export', {
      method: 'POST',
      body: JSON.stringify({ format }),
    }),
};
