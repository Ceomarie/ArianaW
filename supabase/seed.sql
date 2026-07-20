-- Demo seed: one race with a fixed share slug so you can test the contributor
-- page before the mobile app exists. After running this, open:
--
--   https://<your-host>/r/demo
--
-- Safe to run more than once (idempotent). This is TEST data — delete the demo
-- race and user when you're done.
--
-- Local dev: `supabase db reset` runs this automatically.
-- Hosted project: paste this into the SQL editor and run it.

-- A race needs an owner in auth.users, so create a minimal demo user first.
-- No password: nobody signs in as this user; it only owns the demo race.
insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'demo@racenotes.local',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}'
)
on conflict (id) do nothing;

-- The demo race. `share_slug` = 'demo' -> visit /r/demo to leave a note.
insert into public.races (owner_id, name, race_date, distance_miles, share_slug)
values (
  '11111111-1111-1111-1111-111111111111',
  'Demo Half Marathon',
  null,
  13.1,
  'demo'
)
on conflict (share_slug) do nothing;
