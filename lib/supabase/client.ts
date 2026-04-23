"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client (singleton).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env.
 * If either is missing at build time (e.g. first Vercel preview before env
 * vars are set) we return a stub client and log a warning — the UI will
 * show a friendly "backend not configured" banner instead of crashing.
 */
let _client: SupabaseClient | null = null;
let _ready = false;

if (url && anonKey) {
  _client = createClient(url, anonKey);
  _ready = true;
} else if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[raku] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. Running in offline mode.",
  );
}

export const supabase = _client;
export const isSupabaseReady = _ready;

export type Task = {
  id: string;
  user_id: string | null;
  title: string;
  status: "today" | "later" | "completed";
  created_at: string;
};
