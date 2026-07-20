-- RaceNotes schema: races, notes, storage, RLS, and the contributor RPC.
-- Run with `supabase db reset` (local) or apply via the Supabase dashboard.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.races (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  race_date      date,
  distance_miles numeric(5, 2) not null default 13.1
                   check (distance_miles > 0 and distance_miles <= 200),
  share_slug     text not null unique,
  created_at     timestamptz not null default now()
);

create type public.note_status as enum ('pending', 'approved', 'hidden');

create table if not exists public.notes (
  id               uuid primary key default gen_random_uuid(),
  race_id          uuid not null references public.races (id) on delete cascade,
  contributor_name text not null check (char_length(contributor_name) between 1 and 80),
  message          text check (message is null or char_length(message) <= 500),
  mile_marker      numeric(5, 2) check (mile_marker is null or mile_marker >= 0),
  audio_path       text not null,
  duration_seconds numeric(6, 2),
  status           public.note_status not null default 'pending',
  created_at       timestamptz not null default now()
);

create index if not exists notes_race_id_idx on public.notes (race_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for audio (private; access via signed URLs only)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('audio-notes', 'audio-notes', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.races enable row level security;
alter table public.notes enable row level security;

-- Runner owns their races.
create policy "owner reads own races"
  on public.races for select
  using (auth.uid() = owner_id);

create policy "owner inserts own races"
  on public.races for insert
  with check (auth.uid() = owner_id);

create policy "owner updates own races"
  on public.races for update
  using (auth.uid() = owner_id);

-- Runner reads and moderates notes for races they own.
create policy "owner reads own race notes"
  on public.notes for select
  using (
    exists (
      select 1 from public.races r
      where r.id = notes.race_id and r.owner_id = auth.uid()
    )
  );

create policy "owner updates own race notes"
  on public.notes for update
  using (
    exists (
      select 1 from public.races r
      where r.id = notes.race_id and r.owner_id = auth.uid()
    )
  );

-- NOTE: contributors (anon) get NO direct select/insert on notes. They reach
-- the data only through the two SECURITY DEFINER functions below, which expose
-- exactly what the contributor page needs and nothing more.

-- ---------------------------------------------------------------------------
-- Contributor RPCs (SECURITY DEFINER — run as owner, bypass RLS safely)
-- ---------------------------------------------------------------------------

-- Public projection of a race, looked up by its share slug. The id is exposed
-- only so the contributor can upload audio into this race's storage folder;
-- it grants no table access (notes stay protected by RLS).
create or replace function public.get_public_race(p_slug text)
returns table (id uuid, name text, distance_miles numeric, share_slug text)
language sql
security definer
set search_path = public
as $$
  select r.id, r.name, r.distance_miles, r.share_slug
  from public.races r
  where r.share_slug = p_slug;
$$;

-- Insert a note for a race identified by slug. Contributors never touch the
-- table directly, so they cannot read others' notes or spoof another race.
create or replace function public.add_note(
  p_slug             text,
  p_contributor_name text,
  p_message          text,
  p_mile_marker      numeric,
  p_audio_path       text,
  p_duration_seconds numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_race_id uuid;
  v_note_id uuid;
begin
  select id into v_race_id from public.races where share_slug = p_slug;
  if v_race_id is null then
    raise exception 'unknown race slug';
  end if;

  if char_length(coalesce(p_contributor_name, '')) = 0 then
    raise exception 'contributor_name is required';
  end if;

  -- Audio must live under this race's folder to keep uploads scoped.
  if position(v_race_id::text in p_audio_path) <> 1 then
    raise exception 'audio_path must be prefixed with the race id';
  end if;

  insert into public.notes (
    race_id, contributor_name, message, mile_marker, audio_path, duration_seconds
  )
  values (
    v_race_id, p_contributor_name, nullif(p_message, ''), p_mile_marker,
    p_audio_path, p_duration_seconds
  )
  returning id into v_note_id;

  return v_note_id;
end;
$$;

grant execute on function public.get_public_race(text) to anon, authenticated;
grant execute on function public.add_note(text, text, text, numeric, text, numeric)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies: anon may upload into a race folder; owner may read them.
-- ---------------------------------------------------------------------------

-- Contributors upload their audio (write-only) under audio-notes/<race_id>/...
create policy "anon uploads audio notes"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'audio-notes');

-- Owners read audio for races they own (folder name = race id).
create policy "owner reads race audio"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'audio-notes'
    and exists (
      select 1 from public.races r
      where r.owner_id = auth.uid()
        and (storage.foldername(name))[1] = r.id::text
    )
  );
