import * as FileSystem from "expo-file-system";
import type { Note, NoteStatus } from "@racenotes/shared";
import { supabase, AUDIO_BUCKET } from "./supabase";

export async function listNotes(raceId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("race_id", raceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Note[];
}

export async function setNoteStatus(id: string, status: NoteStatus): Promise<void> {
  const { error } = await supabase.from("notes").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Move an "anytime" note to a specific mile (or back to anytime with null). */
export async function setNoteMile(id: string, mile: number | null): Promise<void> {
  const { error } = await supabase.from("notes").update({ mile_marker: mile }).eq("id", id);
  if (error) throw error;
}

/** Short-lived signed URL for previewing a note in the inbox (needs signal). */
export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

const CACHE_DIR = FileSystem.cacheDirectory + "racenotes/";

/**
 * Download every approved note's audio to local storage BEFORE the run, so
 * playback never depends on cell signal on the course. Returns a map of
 * noteId -> local file URI.
 */
export async function downloadApprovedNotes(
  notes: Note[],
): Promise<Record<string, string>> {
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(
    () => undefined,
  );

  const result: Record<string, string> = {};
  for (const note of notes) {
    if (note.status !== "approved") continue;
    if (!note.audio_path) continue; // text-only note — spoken at run time, nothing to fetch
    const ext = note.audio_path.split(".").pop() ?? "m4a";
    const dest = `${CACHE_DIR}${note.id}.${ext}`;

    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      result[note.id] = dest;
      continue;
    }
    const url = await signedUrl(note.audio_path);
    const dl = await FileSystem.downloadAsync(url, dest);
    result[note.id] = dl.uri;
  }
  return result;
}
