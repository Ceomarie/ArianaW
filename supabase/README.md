# Supabase backend

The database schema, storage bucket, RLS policies, and contributor RPCs for
RaceNotes.

## Apply the schema

**Hosted project (fastest):**

1. Create a project at https://supabase.com.
2. Open the SQL editor and paste the contents of
   `migrations/0001_init.sql`, then run it.
3. Copy the project URL and the **anon** public key into the app `.env` files
   (see the root `.env.example`).

**Local (for development / testing RLS):**

```bash
npm i -g supabase        # or: brew install supabase/tap/supabase
supabase start           # boots Postgres + Storage in Docker
supabase db reset        # applies everything in migrations/
```

## What the policies guarantee

- A **runner** (authenticated) can read and moderate only the notes for races
  they own.
- A **contributor** (anonymous) has no direct table access at all. They can
  only:
  - call `get_public_race(slug)` — returns just a race's name + distance, and
  - call `add_note(...)` — inserts a note for a valid slug, with the audio file
    scoped to that race's folder.
- Audio lives in a **private** bucket; the runner app fetches it with
  short-lived signed URLs.

This means someone with a share link can send a note but cannot list, read, or
delete anyone else's notes.
