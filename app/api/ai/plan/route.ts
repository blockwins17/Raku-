import { NextResponse } from "next/server";
import { plan } from "@/lib/ai/plan";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const windowMinutes = Number(body.windowMinutes) || 120;
    const startHHMM = body.startHHMM ? String(body.startHHMM) : undefined;

    // If caller didn't send subtasks, pull up to 20 open ones from Supabase.
    let subtasks = Array.isArray(body.subtasks) ? body.subtasks : null;
    if (!subtasks) {
      subtasks = [];
      const sb = getServerSupabase();
      if (sb) {
        const { data } = await sb
          .from("subtasks")
          .select("id, title, estimated_minutes, status, created_at")
          .in("status", ["todo", "doing"])
          .order("created_at", { ascending: true })
          .limit(20);
        subtasks = (data ?? []).map((s) => ({
          id: String(s.id),
          title: String(s.title),
          estimatedMinutes: Number(s.estimated_minutes),
        }));
      }
    }

    const result = await plan({ windowMinutes, startHHMM, subtasks });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
