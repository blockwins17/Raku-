"use client";

/**
 * ConnectAll — landing-page section showing Kumo plays with the tools
 * students already use. Visual only; the real paste + ingest UI lives
 * on the dashboard (PasteDeadlines.tsx).
 */

const LOGOS = [
  { name: "Brightspace",     dot: "#8a1431" },
  { name: "Canvas",          dot: "#e72429" },
  { name: "Google Calendar", dot: "#4285F4" },
  { name: "Apple Calendar",  dot: "#f5f5f2" },
  { name: "Outlook",         dot: "#0078d4" },
  { name: "Notion",          dot: "#f5f5f2" },
  { name: "iCal / ICS",      dot: "#8BE3B4" },
  { name: "plain paste",     dot: "#F6D38B" },
];

export default function ConnectAll() {
  return (
    <section style={S.section} data-testid="connect-all">
      <div style={S.head}>
        <div style={S.eyebrow}>connect everything you already use</div>
        <h2 style={S.title}>
          one paste. every deadline, in one place.
        </h2>
        <p style={S.lede}>
          Google Calendar, Apple Calendar, Brightspace, Canvas, Notion, a
          syllabus PDF, a random Discord message — paste it. Kumo reads it
          line by line and drops each deadline into Today.
        </p>
      </div>

      <div style={S.grid}>
        {LOGOS.map((l) => (
          <div key={l.name} style={S.tile}>
            <span style={{ ...S.tileDot, background: l.dot }} />
            <span style={S.tileName}>{l.name}</span>
          </div>
        ))}
      </div>

      <div style={S.paste}>
        <div style={S.pasteHead}>
          <span style={S.pasteDot} />
          <span style={S.pasteLabel}>PASTE ANYTHING</span>
        </div>
        <pre style={S.pastePre}>{SAMPLE}</pre>
        <div style={S.pasteArrow}>↓</div>
        <div style={S.pasteResult}>
          <span style={S.pill}>Paper 2 · due Dec 12</span>
          <span style={S.pill}>Lab write-up 4 · due Dec 15</span>
          <span style={S.pill}>PSET 3 (recursion) · due Dec 18</span>
          <span style={S.pill}>Reading: Baldwin ch.2 · Tue</span>
        </div>
        <div style={S.pasteFoot}>
          all in Today. all soft. all yours to reorder.
        </div>
      </div>
    </section>
  );
}

const SAMPLE = `• Paper 2 — due Dec 12
• Lab write-up 4 — due Dec 15
• PSET 3 (recursion) — due Dec 18
• Reading: Baldwin ch.2 — Tue`;

const S: Record<string, React.CSSProperties> = {
  section: { marginTop: 88 },
  head: { maxWidth: 680, marginBottom: 32 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.4)",
  },
  title: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(1.8rem, 3.4vw, 2.5rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.025em",
    marginTop: 8,
    marginBottom: 14,
  },
  lede: { fontSize: 15, lineHeight: 1.6, color: "rgba(245,245,242,0.7)" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10,
    marginBottom: 32,
  },
  tile: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    fontSize: 13,
    color: "rgba(245,245,242,0.8)",
  },
  tileDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "0 0 6px rgba(255,255,255,0.12)",
  },
  tileName: {},

  paste: {
    padding: "28px 28px 24px",
    borderRadius: 20,
    background:
      "radial-gradient(circle at 15% 10%, rgba(139,227,180,0.06), transparent 60%), rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  pasteHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  pasteDot: {
    width: 8,
    height: 8,
    background: "#8BE3B4",
    boxShadow: "0 0 10px rgba(139,227,180,0.6)",
    borderRadius: 2,
    transform: "rotate(45deg)",
  },
  pasteLabel: {
    fontSize: 10,
    letterSpacing: "0.22em",
    color: "rgba(245,245,242,0.4)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  pastePre: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.6,
    color: "rgba(245,245,242,0.8)",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: "14px 16px",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  pasteArrow: {
    textAlign: "center",
    color: "rgba(139,227,180,0.7)",
    fontSize: 20,
    margin: "14px 0 10px",
  },
  pasteResult: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(139,227,180,0.3)",
    background: "rgba(139,227,180,0.06)",
    color: "rgba(245,245,242,0.92)",
  },
  pasteFoot: {
    fontSize: 12,
    color: "rgba(245,245,242,0.5)",
    fontStyle: "italic",
  },
};
