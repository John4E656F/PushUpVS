# PushUp — AI pushup counter

Prop your phone against the wall, drop down, and push. PushUp watches your body
with the front camera and counts every rep automatically — with streaks, goals,
personal bests, workout videos, and a synced history.

## Stack

| Layer | Tech |
| --- | --- |
| App | **Expo SDK 56** + Expo Router, TypeScript, **NativeWind** (Tailwind), Zustand |
| Rep counting | **VisionCamera** frame processors + **MoveNet** (TensorFlow Lite) + a pure-TS rep state machine |
| Auth & billing | **Clerk** (`@clerk/clerk-expo`) — sign-in/SSO and Clerk Billing subscriptions (7-day trial, then subscribe) |
| API | **Go** (`server/`) — stdlib `net/http`, Clerk JWT middleware, Svix-verified Clerk webhooks |
| Database | **MongoDB** (users, sessions, stats) |
| File storage | **Backblaze B2** via its S3-compatible API — presigned uploads/downloads for workout videos, avatars, and CSV/JSON exports |

## How counting works

1. The camera streams frames into a VisionCamera **frame processor** (worklet thread).
2. Each frame is resized to 192×192 RGB and run through **MoveNet SinglePose Lightning** (int8 TFLite) at ~15 fps.
3. The 17 keypoints go to the JS thread, where a pure TypeScript **state machine**
   (`src/lib/pose/rep-counter.ts`) tracks the elbow angle: arms extended → below the
   down threshold → extended again = 1 rep. Hysteresis + minimum cycle time filter jitter.
4. Haptic tick on every rep. If the model can't load, the session falls back to **manual tap counting**.

The state machine is fully unit-tested without a camera: `pnpm test:counter`.

## Getting started

### App

This is a **development build** app (VisionCamera + TFLite native modules) — it will not run in Expo Go.

```bash
pnpm install
cp .env.example .env       # add your Clerk publishable key + API URL
npx expo prebuild
npx expo run:ios           # or run:android
```

Optional: `./scripts/download-model.sh` grabs the MoveNet model so you can serve it
yourself (`EXPO_PUBLIC_MOVENET_MODEL_URL`); by default it loads from Google's hosted TFLite CDN at runtime.

### API server

```bash
cd server
cp .env.example .env       # Mongo URI, Clerk secret key, B2 credentials
go run ./cmd/api
```

Point a Clerk webhook (user.* and subscription.* events) at `POST /v1/webhooks/clerk`.

### Business model

Every new user gets a **7-day free trial** (started server-side on first sign-in).
When it ends, gated endpoints return `402` and the app routes to the paywall, which
opens your **Clerk Billing** hosted checkout (`EXPO_PUBLIC_BILLING_URL`). The
`subscription.*` webhook flips the user's plan to `pro`.

Without `EXPO_PUBLIC_API_URL` configured, the app runs in **local-only mode**:
counting and history work on-device, sync/uploads/exports wait for a server.

## Project structure

```
src/
  app/                Routes (Expo Router)
    (auth)/           Sign in / sign up (Clerk)
    (tabs)/           Today, Stats, You
    session.tsx       Live camera counting (fullscreen)
    session-complete.tsx  Summary, save & video upload
    paywall.tsx       Trial status + Clerk Billing checkout
  components/         UI kit (buttons, cards, rings, tab bar, ...)
  lib/
    pose/             MoveNet parsing, rep state machine (+ tests), camera hook
    api.ts            Typed client for the Go API
    store.ts          Zustand store — local-first sessions with server sync
    uploads.ts        Presigned direct-to-B2 uploads
server/
  cmd/api/            Entrypoint
  internal/httpapi/   Routes, auth middleware, webhooks
  internal/store/     MongoDB access + stats/streak aggregation
  internal/blob/      Backblaze B2 presigner (S3-compatible)
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/me` | Profile, plan, trial state, entitlement |
| PATCH | `/v1/me` | Update name / daily goal / avatar |
| POST | `/v1/sessions` | Save a completed set |
| GET | `/v1/sessions` | Paginated history |
| DELETE | `/v1/sessions/{id}` | Remove a set |
| POST | `/v1/sessions/{id}/video` | Attach an uploaded video |
| GET | `/v1/stats` | Today/week/all-time, streak, last-7-days |
| POST | `/v1/uploads/presign` | Presigned B2 PUT (video/avatar) |
| GET | `/v1/files/url` | Presigned B2 GET for your own files |
| POST | `/v1/export` | Generate CSV/JSON export → download link |
| POST | `/v1/webhooks/clerk` | Clerk user + subscription sync (Svix-verified) |

All `/v1/*` routes require a Clerk session JWT; everything except `/v1/me` also
requires an active trial or subscription (`402` otherwise).
