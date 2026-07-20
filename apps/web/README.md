# RaceNotes — contributor web app

The page friends open (no login) to send the runner a voice note. Record in the
browser or upload a file, add a name + short message, pick a mile (or "anywhere"),
and submit.

## Run locally

```bash
cp ../../.env.example .env     # fill in VITE_SUPABASE_* values
npm install                    # from the repo root (workspaces)
npm run dev --workspace @racenotes/web
```

Open a race link: `http://localhost:5173/?slug=YOUR_SLUG` (in production the
path form `/r/YOUR_SLUG` works too — configure your host to serve `index.html`
for that route, e.g. a Vercel/Netlify SPA rewrite).

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages). Build with
`npm run build:web` from the repo root; deploy `apps/web/dist`. Add an SPA
rewrite so `/r/*` serves `index.html`.
