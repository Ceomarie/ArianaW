# RaceNotes — runner app (Expo)

The runner's app: create a race, share the link, approve incoming notes,
download them, and run — with each note playing at its mile over your music.

## ⚠️ Needs a dev build (not Expo Go)

Background GPS + background audio + ducking require native config that Expo Go
does not include. You must build a **development client**:

```bash
cp ../../.env.example .env      # fill in EXPO_PUBLIC_SUPABASE_* values
npm install
npx expo prebuild               # generates native ios/android projects
npx expo run:ios                # or: npx expo run:android  (real device recommended)
```

For a shareable build without Xcode/Android Studio, use EAS:

```bash
npm i -g eas-cli
eas build --profile development --platform ios
```

## Environment variables

Set in `apps/mobile/.env` (Expo reads `EXPO_PUBLIC_*` at build time):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_BASE_URL` — where the contributor web app is hosted (used to
  build the share link), e.g. `https://racenotes.vercel.app`.

## How the pieces fit

- `src/lib/locationTask.ts` — background GPS task; feeds fixes into the shared
  `Odometer` via `runStore`.
- `src/lib/runStore.ts` — module-level odometer + observable so the headless
  task and the UI share one running total.
- `src/lib/useRunEngine.ts` — subscribes to distance, uses the shared
  `TriggerScheduler` to fire notes at their mile, and serialises playback.
- `src/lib/player.ts` — `expo-audio` session set to `duckOthers`; plays each
  note over the runner's music.
- `src/lib/notes.ts` — `downloadApprovedNotes` caches audio locally **before**
  the run so playback never needs signal.

## Test the run engine on a walk

Create a race, approve a couple of notes, and temporarily set their miles very
low (e.g. 0.1 and 0.2) from the inbox. Start a run with music playing and walk
~a block: each note should duck your music and play once, screen locked.
