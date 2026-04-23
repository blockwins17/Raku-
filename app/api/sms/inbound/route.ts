import { NextResponse } from "next/server";
import { explain } from "@/lib/ai/explain";
import { breakdown } from "@/lib/ai/breakdown";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  chunkForSms,
  emptyTwiml,
  getTwilioEnv,
  sendSms,
  twiml,
  validateTwilioSignature,
} from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sms/inbound
 *
 * Twilio sends `application/x-www-form-urlencoded` webhooks here when someone
 * texts the Kumo number. We:
 *   1. Verify the X-Twilio-Signature.
 *   2. If the very first message from this phone → send a warm hello + how-to.
 *   3. Otherwise classify intent (explain vs breakdown) and call the AI.
 *   4. Short replies: return inline TwiML (one round-trip, <10s budget).
 *      Long AI calls: ack immediately, then send the real reply asynchronously
 *      via the REST API. Keeps Twilio happy on its 15s webhook timeout.
 */
export async function POST(req: Request) {
  const { token } = getTwilioEnv();

  // Twilio sends form data.
  const raw = await req.text();
  const form = new URLSearchParams(raw);
  const params: Record<string, string> = {};
  form.forEach((v, k) => { params[k] = v; });

  const from = params.From ?? "";
  const body = (params.Body ?? "").trim();

  // Best-effort signature validation (only if we have an auth token).
  if (token) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host  = req.headers.get("host") ?? "";
    const url   = `${proto}://${host}/api/sms/inbound`;
    const sig   = req.headers.get("x-twilio-signature");
    const ok    = validateTwilioSignature({ url, params, signatureHeader: sig, authToken: token });
    if (!ok) {
      // Silent reject — no SMS spent explaining to a scraper.
      return new Response("forbidden", { status: 403 });
    }
  }

  if (!from || !body) {
    return xmlResponse(emptyTwiml());
  }

  // Track session in Supabase (best effort — if no DB, we still reply).
  const isFirst = await recordInbound(from, body);

  // First contact → quick welcome with instructions + no LLM cost.
  if (isFirst) {
    return xmlResponse(twiml(FIRST_TIME_HELLO));
  }

  // Help command
  if (/^(help|\?|menu)$/i.test(body)) {
    return xmlResponse(twiml(HELP_MESSAGE));
  }

  // Short synchronous ack, then async AI reply. This avoids Twilio timeouts
  // and gives the student immediate feedback. We fire-and-forget the work.
  asyncReply(from, body).catch((err) => {
    console.error("[kumo-sms] async reply failed:", err);
  });

  return xmlResponse(twiml("got it. let me read this — one sec…"));
}

function xmlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

/** Fire-and-forget: do the AI work + send the real reply via REST API. */
async function asyncReply(to: string, body: string) {
  const intent = classify(body);
  let text = "";
  try {
    if (intent === "breakdown") {
      const r = await breakdown({ title: body });
      const lines = r.subtasks
        .map((s, i) => `${i + 1}. ${s.title} (${s.estimatedMinutes}m)`)
        .join("\n");
      text = `okay. tiny steps for "${truncate(body, 40)}":\n\n${lines}\n\ntotal ~${r.totalMinutes}m. start with #1 — just that one.`;
    } else {
      // default: explain
      const r = await explain({ rawText: body });
      const parts: string[] = [];
      if (r.summary)          parts.push(r.summary);
      if (r.whatToDo?.length) parts.push("do:\n" + r.whatToDo.map((b) => `• ${b}`).join("\n"));
      if (r.keyPoints?.length) parts.push("keep in mind:\n" + r.keyPoints.map((b) => `• ${b}`).join("\n"));
      text = parts.join("\n\n");
    }
  } catch (e) {
    text = "my brain glitched. can you re-send, or paste a bit more of the page text?";
    console.error("[kumo-sms] ai error:", e);
  }

  if (!text.trim()) text = "hmm, I don't have much to work with yet. paste the prompt or a screenshot's text and I'll break it down.";

  // SMS cap safety
  const chunks = chunkForSms(text);
  for (const c of chunks) await sendSms(to, c);
}

/** Classify intent with a tiny heuristic. Keeps the vibe: no jargon. */
function classify(text: string): "explain" | "breakdown" {
  const t = text.toLowerCase();
  if (/(break.*down|tiny steps?|step by step|how do i start|what do i do first|help me start)/.test(t)) {
    return "breakdown";
  }
  return "explain";
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Insert row; returns true if this is the first message from this phone. */
async function recordInbound(from: string, body: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) return false; // no DB → skip gating; treat as returning user.

  try {
    const { data } = await sb
      .from("sms_sessions")
      .select("id")
      .eq("phone", from)
      .limit(1);

    const isFirst = !data || data.length === 0;

    if (isFirst) {
      await sb.from("sms_sessions").insert({ phone: from, last_inbound: body.slice(0, 500) });
    } else {
      await sb
        .from("sms_sessions")
        .update({ last_inbound: body.slice(0, 500), updated_at: new Date().toISOString() })
        .eq("phone", from);
    }
    return isFirst;
  } catch (e) {
    console.error("[kumo-sms] sb record failed:", e);
    return false;
  }
}

const FIRST_TIME_HELLO = `hey — I'm Kumo ☁️
your little AI cloud for school.

send me:
• a syllabus paragraph
• an assignment prompt
• or just "help me start my paper"

I'll break it into tiny 10-min steps. no shame, no streaks.`;

const HELP_MESSAGE = `how to use me:
• paste any assignment text → I'll explain it
• say "break it down" → I'll split it into 10-min steps
• say "plan my night" → I'll schedule blocks

I keep it short. I'm here when you need me.`;

/** Some debugging helpers for GET (so visiting the URL doesn't 404). */
export async function GET() {
  return NextResponse.json({
    service: "kumo sms webhook",
    expects: "POST application/x-www-form-urlencoded from Twilio",
    ok: true,
  });
}
