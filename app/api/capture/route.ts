import { NextResponse } from "next/server";
import { explain } from "@/lib/ai/explain";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/capture — called by the Raku Chrome extension.
 * Body: { mode, url, courseName?, rawText, source? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = String(body.mode ?? "");
    const rawText = String(body.rawText ?? "");
    const url = body.url ? String(body.url) : null;
    const courseName = body.courseName ? String(body.courseName) : null;
    const source = body.source ? String(body.source) : "extension_v0";

    if (mode !== "organize_assignments" && mode !== "explain_simple") {
      return NextResponse.json(
        { status: "error", error: "invalid mode" },
        { status: 400 },
      );
    }

    const sb = getServerSupabase();
    let captureId = "stub";
    if (sb) {
      const { data, error } = await sb
        .from("capture_raw")
        .insert({
          mode,
          source,
          url,
          course_name: courseName,
          raw_text: rawText.slice(0, 50000), // hard cap
        })
        .select("id")
        .single();
      if (error) {
        return NextResponse.json(
          { status: "error", error: error.message },
          { status: 500 },
        );
      }
      captureId = String(data.id);
    }

    if (mode === "explain_simple") {
      const explanation = await explain({
        rawText,
        url: url ?? undefined,
        courseName: courseName ?? undefined,
      });
      return NextResponse.json(
        { status: "ok", captureId, explanation },
        { headers: corsHeaders() },
      );
    }

    // mode === organize_assignments → just save + ack for v0
    return NextResponse.json(
      { status: "ok", captureId },
      { headers: corsHeaders() },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { status: "error", error: msg },
      { status: 500, headers: corsHeaders() },
    );
  }
}

/** Preflight for the Chrome extension (content scripts run on any origin). */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
