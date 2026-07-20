# RaceNotes 🏃🎧

Let friends send you short audio notes before race day — optionally tagged
"play this at mile 8" — and hear them at the right point during your run,
layered over whatever music you're already playing.

Built for a real half-marathon in October, but reusable by anyone.

## How it works

- **Friends** open a link you text them (no login), record or upload a quick
  voice note — or just type a message and skip the mic entirely — add a name,
  and pick a mile (or leave it a surprise). Text-only notes are read aloud on
  the course with text-to-speech.
- **You** review and approve the notes in the app, then download them to your
  phone before the run.
- **On the course** the app tracks your distance by GPS and, when you cross
  each note's mile, plays it and **ducks your music** (Spotify, Apple Music,
  anything) underneath — then restores it. The app never plays your music
  itself; it just interjects, so it works with any music app.

## Repository layout

| Path                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `packages/shared`   | Types + the GPS **distance odometer** and **note-trigger engine** (pure, unit-tested). |
| `apps/web`          | Contributor web page (Vite + React) — record/upload a note.       |
| `apps/mobile`       | Runner app (Expo / React Native) — inbox, approve, run engine.    |
| `supabase`          | Postgres schema, storage, RLS, and the contributor RPC.           |

## Quick start

1. **Backend** — create a Supabase project and run `supabase/migrations/0001_init.sql`
   (see `supabase/README.md`). Copy the project URL + anon key.
2. **Env** — `cp .env.example` into `apps/web/.env` and `apps/mobile/.env`,
   filling in the values.
3. **Install & test the engine**

   ```bash
   npm install
   npm test            # runs the distance + trigger engine unit tests
   ```

4. **Contributor web** — `npm run dev:web`, open `/?slug=YOUR_SLUG`.
5. **Runner app** — see `apps/mobile/README.md` (requires an Expo **dev build**;
   background GPS/audio do not work in Expo Go).

## The core engine

The heart of the product is framework-agnostic and lives in `packages/shared`:

- `Odometer` — accumulates distance from GPS fixes, filtering poor-accuracy
  fixes, standing-still jitter, and teleport jumps so the mileage doesn't drift.
- `TriggerScheduler` — assigns each note a firing mile ("anytime" notes are
  spread evenly across the course) and reports which notes become due as
  distance grows, firing each exactly once.

Because it's pure, it's tested against synthetic GPS traces with no device:
`npm test`.

## Build order (see `.claude/plans` for the full plan)

1. Backend (schema + RLS + RPC).
2. Contributor web app — so friends can start sending notes early.
3. Runner inbox (auth, create race, approve, pre-run download).
4. Runner run engine (dev build: background GPS + ducked playback).
5. Polish (QR share, text-to-speech for text-only notes, spectator tracking).
