/*
  Twilio helpers for Kumo — pure fetch, no SDK.

  - validateTwilioSignature: verifies X-Twilio-Signature so random bots
    can't spam our /api/sms/inbound route.
  - sendSms: POST to Twilio REST API.
  - chunkForSms: split a long reply into ≤1400-char SMS segments.
  - twiml / emptyTwiml: tiny TwiML builders so we can reply synchronously.
*/

import crypto from "node:crypto";

export const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

/** One SMS segment ≈ 160 GSM chars or 70 unicode chars, but many carriers
 *  concatenate up to ~6 segments. 1400 is a safe ceiling for a single logical
 *  message. Anything longer we split.
 */
const SMS_CHUNK_SIZE = 1400;

export function getTwilioEnv() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;
  return { sid, token, from };
}

/**
 * Validate Twilio's X-Twilio-Signature header.
 * Algorithm (per Twilio docs):
 *   data = fullWebhookUrl + concat(sorted(key+value) for each form param)
 *   sig  = base64(HMAC-SHA1(authToken, data))
 *   compare timing-safe to header.
 */
export function validateTwilioSignature(opts: {
  url: string;
  params: Record<string, string>;
  signatureHeader: string | null;
  authToken: string;
}): boolean {
  if (!opts.signatureHeader) return false;

  const keys = Object.keys(opts.params).sort();
  let data = opts.url;
  for (const k of keys) data += k + opts.params[k];

  const expected = crypto
    .createHmac("sha1", opts.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Send an SMS via the Twilio REST API using basic auth (pure fetch). */
export async function sendSms(to: string, body: string): Promise<void> {
  const { sid, token, from } = getTwilioEnv();
  if (!sid || !token || !from) {
    throw new Error("Twilio env vars not set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)");
  }

  const chunks = chunkForSms(body);
  // Send sequentially so the order is preserved on the receiving phone.
  for (const chunk of chunks) {
    const form = new URLSearchParams({ To: to, From: from, Body: chunk });
    const basic = Buffer.from(`${sid}:${token}`).toString("base64");
    const r = await fetch(`${TWILIO_API_BASE}/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Twilio ${r.status}: ${err.slice(0, 300)}`);
    }
  }
}

/** Chunk a long reply. Tries to break on paragraph, then sentence, then space. */
export function chunkForSms(text: string): string[] {
  const clean = (text ?? "").trim();
  if (!clean) return [];
  if (clean.length <= SMS_CHUNK_SIZE) return [clean];

  const parts: string[] = [];
  let remaining = clean;
  while (remaining.length > SMS_CHUNK_SIZE) {
    let cut = remaining.lastIndexOf("\n\n", SMS_CHUNK_SIZE);
    if (cut < SMS_CHUNK_SIZE * 0.6) cut = remaining.lastIndexOf(". ", SMS_CHUNK_SIZE);
    if (cut < SMS_CHUNK_SIZE * 0.6) cut = remaining.lastIndexOf(" ",  SMS_CHUNK_SIZE);
    if (cut <= 0) cut = SMS_CHUNK_SIZE;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  // Add tiny counters so multi-part is readable: (1/3), (2/3)…
  if (parts.length > 1) {
    return parts.map((p, i) => `(${i + 1}/${parts.length}) ${p}`);
  }
  return parts;
}

/** Build a TwiML response that Twilio will deliver inline as an SMS reply. */
export function twiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message,
  )}</Message></Response>`;
}

export function emptyTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;",
  }[c]!));
}
