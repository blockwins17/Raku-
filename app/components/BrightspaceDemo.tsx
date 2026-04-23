"use client";

import { useState } from "react";

/**
 * BrightspaceDemo — a fake Brightspace assignment rendered in the browser,
 * with a button that actually calls /api/ai/explain on the pretend page text
 * and shows what Kumo would send back. Great for a demo video.
 */

const SAMPLE = {
  course: "HIST 202",
  title: "Paper 2: The Long Civil Rights Movement",
  body: `Due: Friday, Dec 12, 11:59 PM
Weight: 25% of final grade
Length: 1,500–1,800 words, double-spaced, 12pt Times New Roman

Prompt
Historians now argue that the Civil Rights Movement did not begin in 1955 with
Rosa Parks. Write an argumentative essay using at least three primary sources
and two secondary sources that supports or complicates this claim.

Submission
Submit a single PDF through the Brightspace Assignments tab. Late work loses
10% per day. Use Turnitin — plagiarism score must be below 18%.

Rubric (highlights)
- Thesis (20 pts): clear, arguable, appears in the first paragraph
- Evidence (40 pts): sources used as argument, not decoration
- Structure (20 pts): each paragraph earns its place
- Style (20 pts): clean prose, Chicago footnotes

Office hours
Prof. Alvarez — Thursdays 2–4 PM, room HUM 214. Come with a one-sentence thesis.`,
};

type ExplainResult = {
  summary?: string;
  whatToDo?: string[];
  keyPoints?: string[];
  stub?: boolean;
};

export default function BrightspaceDemo() {
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askKumo() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawText: `${SAMPLE.title}\n\n${SAMPLE.body}`,
          courseName: SAMPLE.course,
          url: "https://brightspace.example.edu/d2l/le/content/12345/paper-2",
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ExplainResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={S.section} data-testid="brightspace-demo">
      <div style={S.head}>
        <div style={S.eyebrow}>try kumo on a real assignment</div>
        <h2 style={S.title}>scan any Brightspace page. Kumo makes it small.</h2>
        <p style={S.lede}>
          here's a fake Brightspace assignment. tap the button and watch Kumo
          turn it into one sentence, three things to do, and what actually
          matters.
        </p>
      </div>

      <div style={S.split}>
        {/* mock Brightspace card */}
        <div style={S.mockBrightspace}>
          <div style={S.bsChrome}>
            <span style={S.bsDot} />
            <span style={S.bsDot} />
            <span style={S.bsDot} />
            <span style={S.bsUrl}>brightspace.edu / {SAMPLE.course.toLowerCase().replace(" ", "")} / paper-2</span>
          </div>
          <div style={S.bsBody}>
            <div style={S.bsCourse}>{SAMPLE.course}</div>
            <div style={S.bsTitle}>{SAMPLE.title}</div>
            <pre style={S.bsText}>{SAMPLE.body}</pre>
          </div>
        </div>

        {/* kumo card */}
        <div style={S.kumoCard}>
          <div style={S.kumoHead}>
            <span style={S.kumoDot} />
            <span style={S.kumoName}>kumo</span>
          </div>

          {!result && !loading && !error && (
            <>
              <p style={S.placeholder}>
                tap below. Kumo reads the page like a friend would — and texts
                you the small version.
              </p>
              <button
                onClick={askKumo}
                style={S.btnPrimary}
                data-testid="brightspace-demo-ask"
              >
                ask Kumo to explain it →
              </button>
            </>
          )}

          {loading && (
            <div style={S.loadingRow}>
              <span style={S.spinner} aria-hidden />
              <span style={S.loadingText}>kumo is reading…</span>
            </div>
          )}

          {error && (
            <div style={S.errorBox}>
              couldn't reach Kumo: {error}
            </div>
          )}

          {result && (
            <div style={S.resultWrap} data-testid="brightspace-demo-result">
              <div style={S.block}>
                <div style={S.blockLabel}>TL;DR</div>
                <p style={S.p}>{result.summary || "—"}</p>
              </div>
              <div style={S.block}>
                <div style={S.blockLabel}>what this wants from you</div>
                <ul style={S.ul}>
                  {(result.whatToDo ?? []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              <div style={S.block}>
                <div style={S.blockLabel}>key points</div>
                <ul style={S.ul}>
                  {(result.keyPoints ?? []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              {result.stub && (
                <p style={S.stubNote}>
                  (demo preview — the live Kumo bot is even sharper. add an
                  AI key in Vercel env to unstub.)
                </p>
              )}
              <button
                onClick={askKumo}
                style={S.btnGhost}
                data-testid="brightspace-demo-again"
              >
                run again
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  section: { marginTop: 72 },
  head: { marginBottom: 28, maxWidth: 640 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.4)",
  },
  title: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(1.6rem, 3vw, 2.1rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    marginTop: 8,
    marginBottom: 10,
  },
  lede: { fontSize: 15, lineHeight: 1.55, color: "rgba(245,245,242,0.7)" },

  split: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
    alignItems: "start",
  },

  /* Brightspace mock */
  mockBrightspace: {
    background: "#fff",
    color: "#111",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
  },
  bsChrome: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 12px",
    background: "#ececec",
    borderBottom: "1px solid #d9d9d9",
  },
  bsDot: { width: 10, height: 10, borderRadius: "50%", background: "#c9c9c9" },
  bsUrl: {
    marginLeft: 12,
    fontSize: 11,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "#666",
  },
  bsBody: { padding: "20px 22px" },
  bsCourse: {
    fontSize: 11,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#8a1431",
    fontWeight: 600,
    marginBottom: 6,
  },
  bsTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12, color: "#111" },
  bsText: {
    whiteSpace: "pre-wrap",
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
    fontSize: 13,
    lineHeight: 1.55,
    color: "#333",
    margin: 0,
  },

  /* Kumo card */
  kumoCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "20px 22px",
    minHeight: 260,
  },
  kumoHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  kumoDot: {
    width: 10,
    height: 10,
    background: "#8BE3B4",
    boxShadow: "0 0 12px rgba(139,227,180,0.55)",
    borderRadius: 2,
    transform: "rotate(45deg)",
  },
  kumoName: {
    fontSize: 12,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.65)",
  },

  placeholder: {
    fontSize: 14,
    color: "rgba(245,245,242,0.68)",
    lineHeight: 1.55,
    marginBottom: 18,
  },

  btnPrimary: {
    background: "#8BE3B4",
    color: "#07070a",
    border: "1px solid #8BE3B4",
    padding: "10px 16px",
    borderRadius: 999,
    fontSize: 13,
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
    marginTop: 12,
  },

  loadingRow: { display: "flex", alignItems: "center", gap: 10 },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.15)",
    borderTopColor: "#8BE3B4",
    borderRadius: "50%",
    display: "inline-block",
    animation: "kumo-spin 0.9s linear infinite",
  },
  loadingText: { fontSize: 13, color: "rgba(245,245,242,0.7)" },

  errorBox: {
    fontSize: 13,
    color: "#F28FAD",
    background: "rgba(242,143,173,0.08)",
    border: "1px solid rgba(242,143,173,0.4)",
    padding: "10px 12px",
    borderRadius: 10,
  },

  resultWrap: { display: "flex", flexDirection: "column", gap: 14 },
  block: {},
  blockLabel: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.45)",
    marginBottom: 6,
  },
  p: { fontSize: 14, color: "rgba(245,245,242,0.85)", lineHeight: 1.55, margin: 0 },
  ul: { margin: 0, paddingLeft: 18, color: "rgba(245,245,242,0.85)", fontSize: 14, lineHeight: 1.6 },
  stubNote: {
    fontSize: 11,
    color: "rgba(245,245,242,0.4)",
    fontStyle: "italic",
  },
};
