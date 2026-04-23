import { NextResponse } from "next/server";
import { breakdown } from "@/lib/ai/breakdown";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const result = await breakdown({
      title,
      description: body.description ? String(body.description) : undefined,
      dueDate: body.dueDate ? String(body.dueDate) : undefined,
      courseName: body.courseName ? String(body.courseName) : undefined,
    });

    // Optional: if parentTaskId was provided, persist the subtasks to Supabase.
    const parentTaskId = body.parentTaskId
      ? String(body.parentTaskId)
      : null;
    if (parentTaskId) {
      const sb = getServerSupabase();
      if (sb) {
        await sb
          .from("subtasks")
          .insert(
            result.subtasks.map((s, i) => ({
              parent_task_id: parentTaskId,
              title: s.title,
              estimated_minutes: s.estimatedMinutes,
              order_index: i,
              status: "todo",
            })),
          )
          .then(({ error }) => {
            if (error) console.error("[raku] subtasks insert failed:", error.message);
          });
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
