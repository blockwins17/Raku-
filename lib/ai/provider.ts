/*
  LLM provider abstraction for Raku.

  Supports two providers via env vars (server-side only):
    - ANTHROPIC_API_KEY → Claude Sonnet (preferred — great at structured JSON)
    - OPENAI_API_KEY    → gpt-4o-mini (fallback)

  If neither is set, `callLLM` returns a `{ stub: true, raw: "<STUB>" }` marker
  and the handler returns a realistic stubbed JSON so the UI still works.
  Plug a key into Vercel env vars (no code change) and it goes live.
*/

type LlmResult =
  | { ok: true; text: string; stub: false }
  | { ok: true; text: "<STUB>"; stub: true };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
const OPENAI_MODEL = "gpt-4o-mini";

export async function callLLM(
  system: string,
  user: string,
): Promise<LlmResult> {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (!anthropic && !openai) {
    return { ok: true, text: "<STUB>", stub: true };
  }

  if (anthropic) {
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropic,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Anthropic ${r.status}: ${err.slice(0, 200)}`);
    }
    const j = (await r.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (j.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    return { ok: true, text, stub: false };
  }

  // OpenAI fallback
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${openai}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`OpenAI ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = (await r.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = j.choices?.[0]?.message?.content ?? "";
  return { ok: true, text, stub: false };
}

/**
 * Safely parse JSON, handling the common case where the model wraps the
 * output in ```json … ``` fences.
 */
export function parseJsonLoose<T>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last-ditch: find the first `{ ... }` block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
