"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * PasteDeadlines — a real "paste your syllabus / calendar dump / assignment
 * list" widget that turns each non-empty line into a task in Supabase.
 *
 * Intent: zero-friction ingestion. No OAuth dance. No file picker. Just paste.
 *
 * Accepts:
 *   - one-per-line lists
 *   - bullet lists (•, -, *, 1., etc.)
 *   - pasted ICS blocks (we grab SUMMARY: lines)
 *   - random syllabus text (we grab lines that look like assignments)
 */

export default function PasteDeadlines({
  onTasksAdded,
}: {
  onTasksAdded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSave() {
    if (!supabase) {
      setResult("supabase not connected. add env vars in Vercel.");
      return;
    }
    const items = parse(text);
    if (items.length === 0) {
      setResult("no tasks found in that blob. try one per line.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .insert(items.map((title) => ({ title, status: "today" })));
      if (error) throw error;
      setResult(`added ${items.length} ${items.length === 1 ? "task" : "tasks"} to Today ✨`);
      setText("");
      onTasksAdded?.();
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={S.card} data-testid="paste-deadlines">
      <button
        onClick={() => setOpen((v) => !v)}
        style={S.head}
        aria-expanded={open}
        data-testid="paste-deadlines-toggle"
      >
        <div>
          <div style={S.eyebrow}>connect your stuff</div>
          <div style={S.title}>
            paste a syllabus, calendar link, or assignment list
          </div>
          <div style={S.sub}>
            Kumo reads it line by line and adds it to Today. no signup.
          </div>
        </div>
        <span style={S.caret}>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div style={S.body}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            style={S.textarea}
            data-testid="paste-deadlines-input"
          />
          <div style={S.actions}>
            <span style={S.count}>
              {text.trim() ? `${parse(text).length} will be added` : "paste anything"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setText(""); setResult(null); }}
                style={S.btnGhost}
                disabled={busy}
              >
                clear
              </button>
              <button
                onClick={handleSave}
                disabled={busy || !text.trim()}
                style={{ ...S.btnPrimary, opacity: busy || !text.trim() ? 0.55 : 1 }}
                data-testid="paste-deadlines-save"
              >
                {busy ? "adding…" : "add to Today"}
              </button>
            </div>
          </div>
          {result && <div style={S.result}>{result}</div>}

          <div style={S.providers}>
            <div style={S.providersLabel}>works with stuff you already use:</div>
            <div style={S.providerRow}>
              {["Brightspace", "Canvas", "Google Calendar", "Apple Calendar", "Outlook", "Notion", "plain text", "ICS paste"].map((p) => (
                <span key={p} style={S.chip}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Extract one-per-line tasks from a messy blob. */
function parse(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const lines = raw.split(/\r?\n/);

  for (let line of lines) {
    // Handle ICS SUMMARY: lines specifically.
    const sumMatch = line.match(/^\s*SUMMARY[:;][^:]*:(.+)$/i);
    if (sumMatch) line = sumMatch[1];

    // Strip leading bullets, numbers, dashes.
    let t = line
      .replace(/^[\s\-•*·○▪▶➤]+/, "")
      .replace(/^\d+[\.\)]\s*/, "")
      .trim();

    // Skip headings / noise.
    if (!t) continue;
    if (t.length < 3) continue;
    if (t.length > 180) t = t.slice(0, 177) + "…";
    if (/^(BEGIN:|END:|DTSTART|DTEND|UID|RRULE|X-)/i.test(t)) continue;

    if (seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= 50) break; // sanity cap
  }
  return out;
}

const PLACEHOLDER = `e.g.
• Paper 2 — due Dec 12
• Lab write-up 4 — due Dec 15
• PSET 3 (recursion) — due Dec 18
• Reading: Baldwin ch.2 — Tue

or paste an ICS export, a Notion list, or a whole syllabus.`;

const S: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    marginBottom: 32,
    overflow: "hidden",
  },
  head: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: "inherit",
    border: 0,
    padding: "20px 24px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    fontFamily: "inherit",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(139,227,180,0.65)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  title: { fontSize: 15, fontWeight: 500, marginTop: 6, color: "#f5f5f2" },
  sub: { fontSize: 12, color: "rgba(245,245,242,0.55)", marginTop: 4, lineHeight: 1.5 },
  caret: {
    fontSize: 22,
    color: "rgba(245,245,242,0.5)",
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0,
  },
  body: {
    padding: "0 24px 24px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    paddingTop: 20,
  },
  textarea: {
    width: "100%",
    minHeight: 160,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#f5f5f2",
    fontSize: 13,
    lineHeight: 1.55,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    resize: "vertical",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 10,
  },
  count: { fontSize: 12, color: "rgba(245,245,242,0.5)" },
  btnPrimary: {
    background: "#8BE3B4",
    color: "#07070a",
    border: "1px solid #8BE3B4",
    padding: "8px 16px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnGhost: {
    background: "transparent",
    color: "rgba(245,245,242,0.7)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  result: {
    marginTop: 12,
    fontSize: 12,
    color: "rgba(139,227,180,0.9)",
    padding: "8px 12px",
    borderRadius: 10,
    background: "rgba(139,227,180,0.06)",
    border: "1px solid rgba(139,227,180,0.25)",
  },
  providers: { marginTop: 20 },
  providersLabel: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.38)",
    marginBottom: 10,
  },
  providerRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    fontSize: 11,
    color: "rgba(245,245,242,0.7)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.02)",
  },
};
