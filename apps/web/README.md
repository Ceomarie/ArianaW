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

**GitHub Pages** — uses `.github/workflows/pages.yml`, which builds and deploys
on every push to the default branch. One-time setup:

1. In the repo, go to **Settings → Pages → Build and deployment → Source** and
   choose **GitHub Actions** (the workflow also tries to enable this
   automatically).
2. Add the two values as repository **secrets** (**Settings → Secrets and
   variables → Actions**): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   They're public anon values, but secrets keeps them out of the repo.
3. Push (or run the workflow manually). The site publishes at
   `https://<user>.github.io/<repo>/`.

The workflow sets Vite's `base` to `/<repo>/` (via `actions/configure-pages`)
so assets resolve, and copies `index.html` to `404.html` so deep links like
`/<repo>/r/<slug>` boot the app (Pages has no server-side rewrites). Point the
mobile app's `EXPO_PUBLIC_WEB_BASE_URL` at `https://<user>.github.io/<repo>` so
share links and QR codes use the live URL.

All three give you working deep links: `https://<host>/…/r/<slug>` loads the
recorder directly. Any other static host works too — just build `apps/web/dist`
from the repo root and add an equivalent SPA fallback.
