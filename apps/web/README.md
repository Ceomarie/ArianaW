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

Config is committed for both hosts — pick one. In **both** cases set the two
env vars in the host **dashboard** (never commit them), and point the project's
root/base directory at the **repo root** so the `@racenotes/shared` workspace
resolves during build:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Vercel** — uses `/vercel.json` at the repo root: `npm install` →
`npm run build:web` → serves `apps/web/dist`, with a rewrite so any unknown path
falls back to `index.html`. Set the Vercel project **Root Directory** to the
repo root.

**Netlify** — uses `/netlify.toml` at the repo root (same build/publish) plus
`apps/web/public/_redirects` (`/* /index.html 200`) which Vite copies into
`dist/`.

Both give you working deep links: `https://<host>/r/<slug>` loads the recorder
directly. Any other static host works too — just build `apps/web/dist` from the
repo root and add an equivalent SPA fallback.
