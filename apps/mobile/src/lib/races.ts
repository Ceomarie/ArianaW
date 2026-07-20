import type { Race } from "@racenotes/shared";
import { supabase } from "./supabase";

/** Base URL of the deployed contributor web app (set per environment). */
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://racenotes.app";

export function shareUrl(slug: string): string {
  return `${WEB_BASE_URL}/r/${slug}`;
}

/** Short, unguessable, human-typable slug (no ambiguous chars). */
function makeSlug(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export async function listMyRaces(): Promise<Race[]> {
  const { data, error } = await supabase
    .from("races")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Race[];
}

export async function createRace(input: {
  name: string;
  race_date: string | null;
  distance_miles: number;
}): Promise<Race> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Retry on the (rare) slug collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const share_slug = makeSlug();
    const { data, error } = await supabase
      .from("races")
      .insert({ ...input, share_slug, owner_id: user.id })
      .select("*")
      .single();
    if (!error) return data as Race;
    if (error.code !== "23505") throw error; // not a unique-violation
  }
  throw new Error("Could not generate a unique share link, please retry.");
}
