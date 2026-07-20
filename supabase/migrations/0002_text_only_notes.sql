-- Allow text-only notes: a contributor can send just a written message (no
-- audio), and the runner app reads it aloud with text-to-speech at its mile.

-- Audio is now optional...
alter table public.notes alter column audio_path drop not null;

-- ...but a note must still carry *something* to play: audio or a message.
alter table public.notes
  add constraint notes_has_content
  check (
    audio_path is not null
    or (message is not null and char_length(message) > 0)
  );

-- Recreate add_note so the audio-path folder check only applies when audio was
-- actually uploaded, and a message alone is a valid note.
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

  -- A note needs audio or a written message.
  if p_audio_path is null and char_length(coalesce(p_message, '')) = 0 then
    raise exception 'a note needs audio or a message';
  end if;

  -- When audio is present, it must live under this race's folder.
  if p_audio_path is not null and position(v_race_id::text in p_audio_path) <> 1 then
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
