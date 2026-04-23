"use client";

/**
 * KumoFeatures — the "more than just texts" section.
 * 4 cards, each with a visual mock of a Kumo surface:
 *   1. Deadline tracker
 *   2. Assignment breakdown (tiny steps)
 *   3. Pomodoro focus session
 *   4. Gentle nudge / encouragement
 *
 * Pure visual mocks — not wired to backend. Matches the landing-page vibe.
 */

export default function KumoFeatures() {
  return (
    <section style={S.section} data-testid="kumo-features">
      <div style={S.head}>
        <div style={S.eyebrow}>kumo does more than text</div>
        <h2 style={S.title}>
          every assignment, tracked. every deadline, softened.
        </h2>
        <p style={S.lede}>
          scanning is just the front door. once you're in, Kumo holds every
          paper, problem set, and reading in one calm place — then walks with
          you through each one.
        </p>
      </div>

      <div style={S.grid}>
        <DeadlinesCard />
        <BreakdownCard />
        <PomodoroCard />
        <NudgeCard />
      </div>
    </section>
  );
}

/* ───────────────── Card 1: Deadlines ───────────────── */
function DeadlinesCard() {
  const items = [
    { course: "HIST 202", title: "Paper 2 — Civil Rights", days: 3, tone: "warn" },
    { course: "BIO 110",  title: "Lab write-up 4",           days: 6, tone: "ok"   },
    { course: "CS 162",   title: "PSET 3 (recursion)",       days: 9, tone: "ok"   },
    { course: "ENG 201",  title: "Reading: Baldwin ch.2",    days: 1, tone: "hot"  },
  ] as const;

  return (
    <article style={S.card}>
      <CardHead label="01 · deadlines" title="every due date, in one calm place." />
      <ul style={S.deadlineList}>
        {items.map((it, i) => (
          <li key={i} style={S.deadlineRow}>
            <div style={{ minWidth: 0 }}>
              <div style={S.deadlineCourse}>{it.course}</div>
              <div style={S.deadlineTitle}>{it.title}</div>
            </div>
            <span style={{ ...S.days, ...daysStyle(it.tone) }}>
              {it.days}d
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function daysStyle(tone: "hot" | "warn" | "ok"): React.CSSProperties {
  if (tone === "hot")  return { color: "#F28FAD", borderColor: "rgba(242,143,173,0.4)", background: "rgba(242,143,173,0.08)" };
  if (tone === "warn") return { color: "#F6D38B", borderColor: "rgba(246,211,139,0.35)", background: "rgba(246,211,139,0.06)" };
  return                    { color: "rgba(245,245,242,0.7)", borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" };
}

/* ───────────────── Card 2: Breakdown ───────────────── */
function BreakdownCard() {
  const subs = [
    { title: "Open the doc", min: 5,  done: true  },
    { title: "Read the prompt once", min: 10, done: true  },
    { title: "Write 1 ugly thesis sentence", min: 10, done: false },
    { title: "Skim 1 source for a quote", min: 15, done: false },
    { title: "Stop. save. breathe.", min: 5,  done: false },
  ];
  const total = subs.reduce((a, b) => a + b.min, 0);

  return (
    <article style={S.card}>
      <CardHead
        label="02 · breakdown"
        title="big assignment → 5 things you can actually start."
      />
      <div style={S.breakdownMeta}>
        <span>Paper 2</span>
        <span style={S.dot}>·</span>
        <span>{total} min total</span>
      </div>
      <ul style={S.subList}>
        {subs.map((s, i) => (
          <li key={i} style={S.subRow}>
            <span style={{ ...S.check, ...(s.done ? S.checkOn : {}) }}>
              {s.done ? "✓" : ""}
            </span>
            <span style={{
              ...S.subTitle,
              ...(s.done ? S.subTitleDone : {}),
            }}>
              {s.title}
            </span>
            <span style={S.subMin}>{s.min}m</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ───────────────── Card 3: Pomodoro ───────────────── */
function PomodoroCard() {
  // static visual — a "17:42 remaining" mid-session look
  const pct = 0.31; // 31% elapsed
  const CIRC = 2 * Math.PI * 54;
  return (
    <article style={S.card}>
      <CardHead
        label="03 · focus session"
        title="pomodoro, but Kumo sits with you."
      />
      <div style={S.pomoWrap}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ flexShrink: 0 }}>
          <circle cx="70" cy="70" r="54" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
          <circle
            cx="70" cy="70" r="54"
            stroke="#8BE3B4" strokeWidth="8" fill="none"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct)}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ filter: "drop-shadow(0 0 6px rgba(139,227,180,0.5))" }}
          />
          <text x="70" y="74" textAnchor="middle" fontSize="22"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight="500" fill="#f5f5f2">17:42</text>
          <text x="70" y="92" textAnchor="middle" fontSize="9"
            letterSpacing="3" fill="rgba(245,245,242,0.5)">FOCUS</text>
        </svg>

        <div style={{ minWidth: 0 }}>
          <div style={S.pomoTask}>writing thesis sentence</div>
          <div style={S.pomoKumo}>
            <span style={S.kumoDot} />
            <span style={S.pomoMsg}>
              you're in it. 17 min left. no phone checks — I'll ping you.
            </span>
          </div>
          <div style={S.pomoCtas}>
            <span style={S.pomoCtaPrimary}>pause</span>
            <span style={S.pomoCtaGhost}>done early</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────────────── Card 4: Gentle nudge ───────────────── */
function NudgeCard() {
  return (
    <article style={S.card}>
      <CardHead
        label="04 · gentle push"
        title="the friend who reminds you, nicely."
      />
      <div style={S.nudgeWrap}>
        <NudgeBubble>
          hey. Paper 2 is in 3 days. that's a lot, I know.
        </NudgeBubble>
        <NudgeBubble>
          can we do one 10-min thing tonight? you pick: the thesis, or just skim
          a source.
        </NudgeBubble>
        <NudgeBubble muted>
          not tonight? also fine. I'll try again tomorrow.
        </NudgeBubble>
      </div>
      <div style={S.nudgeFooter}>
        <span style={S.nudgeTag}>no shame · no streaks · no red numbers</span>
      </div>
    </article>
  );
}

function NudgeBubble({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        ...S.bubble,
        ...(muted ? S.bubbleMuted : {}),
      }}
    >
      {children}
    </div>
  );
}

/* ───────────────── shared card head ───────────────── */
function CardHead({ label, title }: { label: string; title: string }) {
  return (
    <div style={S.cardHead}>
      <div style={S.cardLabel}>{label}</div>
      <div style={S.cardTitle}>{title}</div>
    </div>
  );
}

/* ───────────────── styles ───────────────── */
const S: Record<string, React.CSSProperties> = {
  section: { marginTop: 88 },
  head: { marginBottom: 32, maxWidth: 680 },
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
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
  },

  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: "24px 24px",
    display: "flex",
    flexDirection: "column",
    minHeight: 320,
  },
  cardHead: { marginBottom: 20 },
  cardLabel: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(139,227,180,0.65)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 500,
    lineHeight: 1.3,
    marginTop: 6,
    color: "#f5f5f2",
  },

  /* Deadlines */
  deadlineList: { listStyle: "none", padding: 0, margin: 0 },
  deadlineRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  deadlineCourse: {
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.45)",
    marginBottom: 2,
  },
  deadlineTitle: { fontSize: 13, color: "rgba(245,245,242,0.88)" },
  days: {
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    border: "1px solid",
    flexShrink: 0,
  },

  /* Breakdown */
  breakdownMeta: {
    display: "flex",
    gap: 8,
    fontSize: 11,
    color: "rgba(245,245,242,0.5)",
    marginBottom: 14,
    letterSpacing: "0.02em",
  },
  dot: { opacity: 0.5 },
  subList: { listStyle: "none", padding: 0, margin: 0 },
  subRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.14)",
    display: "inline-grid",
    placeItems: "center",
    fontSize: 11,
    color: "#07070a",
    flexShrink: 0,
  },
  checkOn: {
    background: "#8BE3B4",
    borderColor: "#8BE3B4",
  },
  subTitle: {
    fontSize: 13,
    color: "rgba(245,245,242,0.88)",
    flex: 1,
    minWidth: 0,
  },
  subTitleDone: {
    color: "rgba(245,245,242,0.4)",
    textDecoration: "line-through",
  },
  subMin: {
    fontSize: 11,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "rgba(245,245,242,0.5)",
  },

  /* Pomodoro */
  pomoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    minWidth: 0,
  },
  pomoTask: {
    fontSize: 13,
    color: "rgba(245,245,242,0.9)",
    marginBottom: 8,
  },
  pomoKumo: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  kumoDot: {
    width: 8, height: 8, background: "#8BE3B4",
    boxShadow: "0 0 10px rgba(139,227,180,0.6)",
    borderRadius: 2, transform: "rotate(45deg)",
    marginTop: 5,
    flexShrink: 0,
  },
  pomoMsg: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "rgba(245,245,242,0.7)",
    fontStyle: "italic",
  },
  pomoCtas: { display: "flex", gap: 8 },
  pomoCtaPrimary: {
    fontSize: 11,
    padding: "5px 12px",
    borderRadius: 999,
    background: "#8BE3B4",
    color: "#07070a",
    fontWeight: 500,
  },
  pomoCtaGhost: {
    fontSize: 11,
    padding: "5px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    color: "rgba(245,245,242,0.7)",
  },

  /* Nudge */
  nudgeWrap: { display: "flex", flexDirection: "column", gap: 8 },
  bubble: {
    background: "rgba(139,227,180,0.08)",
    border: "1px solid rgba(139,227,180,0.25)",
    color: "rgba(245,245,242,0.92)",
    padding: "10px 14px",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: "90%",
  },
  bubbleMuted: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(245,245,242,0.55)",
    fontStyle: "italic",
  },
  nudgeFooter: { marginTop: "auto", paddingTop: 16 },
  nudgeTag: {
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.35)",
  },
};
