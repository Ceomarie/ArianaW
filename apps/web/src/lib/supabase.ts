import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True only when both Supabase env values were provided at build time. */
export const isConfigured = Boolean(url && anonKey);

if (!isConfigured) {
  // Surface a clear message instead of a cryptic network error later.
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to apps/web/.env.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
export const AUDIO_BUCKET = "audio-notes";
