import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/waitlist
 * Body: { email: string, wantsUserTesting?: boolean }
 * Inserts into Supabase `waitlist` table.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const wants = Boolean(body.wantsUserTesting);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email required" },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "that email looks off — double check?" },
        { status: 400 },
      );
    }

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json(
        { ok: false, error: "database not connected" },
        { status: 503 },
      );
    }

    const { error } = await sb
      .from("waitlist")
      .insert({
        email,
        wants_user_testing: wants,
        source: "landing",
      });

    if (error) {
      // Treat duplicates as success — users won't know/care.
      if (/duplicate|unique/i.test(error.message)) {
        return NextResponse.json({ ok: true, already: true });
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

function isEmail(s: string): boolean {
  // Intentionally loose — don't reject valid edge-case emails.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}
