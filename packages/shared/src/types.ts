/** Domain types shared by the runner (mobile) and contributor (web) apps. */

export type NoteStatus = "pending" | "approved" | "hidden";

/** A race owned by a runner. `share_slug` is the unguessable key friends use. */
export interface Race {
  id: string;
  owner_id: string;
  name: string;
  /** ISO date (YYYY-MM-DD). */
  race_date: string | null;
  /** Course length in miles. Half-marathon = 13.1. */
  distance_miles: number;
  share_slug: string;
  created_at: string;
}

/** The public projection a contributor sees before recording (no owner data). */
export interface PublicRace {
  /** Exposed only to scope the contributor's audio upload folder. */
  id: string;
  name: string;
  distance_miles: number;
  share_slug: string;
}

/** An audio note sent by a friend, played at a mile during the run. */
export interface Note {
  id: string;
  race_id: string;
  contributor_name: string;
  /** Optional short text shown alongside the audio. */
  message: string | null;
  /** null = "play anytime" — the engine spreads these across the course. */
  mile_marker: number | null;
  /** Storage object key inside the `audio-notes` bucket. null = text-only note. */
  audio_path: string | null;
  duration_seconds: number | null;
  status: NoteStatus;
  created_at: string;
}

/** Payload the contributor page sends to the `add_note` RPC. */
export interface AddNoteInput {
  slug: string;
  contributor_name: string;
  message: string | null;
  mile_marker: number | null;
  audio_path: string | null;
  duration_seconds: number | null;
}
