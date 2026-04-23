import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  endOfLocalDay,
  isFreshRestart,
  isPauseActive,
  pauseMessage,
  resumeMessage,
} from "@/lib/ai/burnout";

export const runtime = "nodejs";

// Single shared row id for v0 (no auth yet).
const SOLO_USER_KEY = "00000000-0000-0000-0000-000000000000";

/** GET /api/ai/pause — returns current pause status + a message. */
export async function GET() {
  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({
      paused: false,
      pauseUntil: null,
      message: "",
      note: "supabase not configured",
    });
  }
  const { data } = await sb
    .from("user_state")
    .select("pause_until, pause_reason, updated_at")
    .eq("user_id", SOLO_USER_KEY)
    .maybeSingle();

  const pauseUntil = data?.pause_until ?? null;
  const paused = isPauseActive(pauseUntil);
  const fresh = !paused && isFreshRestart(pauseUntil, data?.updated_at ?? null);
  const message = paused ? pauseMessage() : fresh ? resumeMessage() : "";

  return NextResponse.json({ paused, pauseUntil, message, fresh });
}

/** POST /api/ai/pause — toggle the killswitch. Body: { action: "pause" | "resume" } */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action === "resume" ? "resume" : "pause";

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }

  const patch =
    action === "pause"
      ? {
          user_id: SOLO_USER_KEY,
          pause_until: endOfLocalDay(),
          pause_reason: "burnout",
          updated_at: new Date().toISOString(),
        }
      : {
          user_id: SOLO_USER_KEY,
          pause_until: null,
          pause_reason: null,
          updated_at: new Date().toISOString(),
        };

  const { error } = await sb
    .from("user_state")
    .upsert(patch, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    paused: action === "pause",
    pauseUntil: patch.pause_until,
    message: action === "pause" ? pauseMessage() : resumeMessage(),
  });
}
