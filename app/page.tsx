import Link from "next/link";
import TextKumoQR from "./components/TextKumoQR";
import BrightspaceDemo from "./components/BrightspaceDemo";
import FakeChat from "./components/FakeChat";
import KumoFeatures from "./components/KumoFeatures";
import ConnectAll from "./components/ConnectAll";

export default function LandingPage() {
  return (
    <main style={S.page}>
      {/* ───────── HERO ───────── */}
      <header style={S.heroHead}>
        <div style={S.navRow}>
          <div style={S.brand}>
            <KumoMark />
            <span style={S.brandName}>kumo</span>
          </div>
          <nav style={S.nav}>
            <a href="#how" style={S.navLink}>how it works</a>
            <a href="#demo" style={S.navLink}>demo</a>
            <Link href="/dashboard" style={S.navCta} data-testid="open-app">
              open the app →
            </Link>
          </nav>
        </div>

        <section style={S.hero}>
          <div style={S.heroCopy}>
            <div style={S.eyebrow}>an AI cloud for school</div>
            <h1 style={S.h1}>
              school is heavy.
              <br />
              <span style={S.heroAccent}>kumo floats it.</span>
            </h1>
            <p style={S.heroLede}>
              your tiny cloud for college. text it, scan your Brightspace
              pages, and watch big scary stuff turn into small 10-minute
              things. no signup. no shame.
            </p>
            <div style={S.heroCtas}>
              <a href="#text" style={S.ctaPrimary} data-testid="hero-text-kumo">
                text Kumo now →
              </a>
              <a href="#demo" style={S.ctaGhost}>
                see it on a real assignment
              </a>
            </div>
          </div>

          <div style={S.heroArt} aria-hidden>
            <Cloud />
          </div>
        </section>
      </header>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how" style={S.section}>
        <div style={S.eyebrow}>how it works</div>
        <h2 style={S.h2}>three steps. that's the whole app.</h2>

        <ol style={S.steps}>
          <li style={S.step}>
            <div style={S.stepNum}>01</div>
            <div>
              <div style={S.stepTitle}>text Kumo.</div>
              <p style={S.stepDesc}>
                scan the QR or tap the number. your Messages app opens with
                Kumo's number ready. send anything.
              </p>
            </div>
          </li>
          <li style={S.step}>
            <div style={S.stepNum}>02</div>
            <div>
              <div style={S.stepTitle}>Kumo breaks it small.</div>
              <p style={S.stepDesc}>
                paste an assignment, drop a screenshot, or send a Brightspace
                link. Kumo replies with the tiniest next step — 10 minutes,
                one sentence, go.
              </p>
            </div>
          </li>
          <li style={S.step}>
            <div style={S.stepNum}>03</div>
            <div>
              <div style={S.stepTitle}>open it on your laptop.</div>
              <p style={S.stepDesc}>
                Kumo texts a link. open it, AirDrop it, or email it to
                yourself. same chat, bigger screen. ready to work.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* ───────── FEATURES (deadlines / breakdown / pomodoro / nudge) ───────── */}
      <KumoFeatures />

      {/* ───────── CONNECTIONS (paste any calendar / syllabus) ───────── */}
      <ConnectAll />

      {/* ───────── TEXT KUMO QR ───────── */}
      <section id="text" style={S.section}>
        <TextKumoQR />
      </section>

      {/* ───────── WHAT KUMO MEANS ───────── */}
      <section style={{ ...S.section, ...S.meaningWrap }}>
        <div style={S.meaning}>
          <div style={S.eyebrow}>what kumo means</div>
          <p style={S.meaningBody}>
            kumo means <em>cloud</em> in Japanese. a cloud that floats through
            the sky, sways through the world, embraces the elements and all the
            atmosphere around it.
          </p>
          <p style={S.meaningBody}>
            kumo embraces all the hard things in your life — papers, problem
            sets, the 12pm lecture you skipped — and makes them easier to
            finish without drowning.
          </p>
        </div>
      </section>

      {/* ───────── FAKE CHAT (demo B-roll) ───────── */}
      <FakeChat />

      {/* ───────── BRIGHTSPACE DEMO ───────── */}
      <section id="demo" style={S.section}>
        <BrightspaceDemo />
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer style={S.footer}>
        <div>
          <KumoMark small />
          <span style={{ marginLeft: 8 }}>kumo · a cloud for school</span>
        </div>
        <Link href="/dashboard" style={S.footerLink}>
          open the dashboard →
        </Link>
      </footer>
    </main>
  );
}

/* ───────── Kumo mark (diagonal pulsing grid) ───────── */
function KumoMark({ small = false }: { small?: boolean }) {
  const size = small ? 16 : 32;
  // Rotating 45° makes the diamond ~√2 wider visually; reserve that width
  // on the outer box so siblings don't overlap.
  const box = Math.ceil(size * 1.5);
  return (
    <span
      aria-hidden
      style={{
        width: box,
        height: box,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gap: 2,
          transform: "rotate(45deg) skew(-8deg, -8deg)",
          filter:
            "drop-shadow(0 0 14px rgba(139,227,180,0.35)) drop-shadow(0 0 3px rgba(139,227,180,0.35))",
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            style={{
              background: "#8BE3B4",
              borderRadius: 2,
              animation: "kumo-pulse 2.4s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </span>
      <style>{`
        @keyframes kumo-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.05); }
        }
        @keyframes kumo-spin { to { transform: rotate(360deg); } }
      `}</style>
    </span>
  );
}

/* ───────── floating cloud art ───────── */
function Cloud() {
  return (
    <svg viewBox="0 0 320 240" width="100%" height="100%" aria-hidden>
      <defs>
        <radialGradient id="kg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8BE3B4" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#8BE3B4" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#8BE3B4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kl" x1="0" x2="1">
          <stop offset="0%" stopColor="#f5f5f2" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#f5f5f2" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill="url(#kg)" />
      <g style={{ animation: "kumo-float 8s ease-in-out infinite" }}>
        <ellipse cx="160" cy="120" rx="92" ry="42" fill="url(#kl)" />
        <ellipse cx="118" cy="108" rx="44" ry="28" fill="url(#kl)" />
        <ellipse cx="204" cy="108" rx="52" ry="32" fill="url(#kl)" />
        <ellipse cx="160" cy="94" rx="38" ry="24" fill="url(#kl)" />
      </g>
      <style>{`
        @keyframes kumo-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </svg>
  );
}

/* ───────── styles ───────── */
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07070a",
    color: "#f5f5f2",
    padding: "24px 24px 96px",
    maxWidth: 1100,
    margin: "0 auto",
    fontFamily:
      "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  heroHead: { marginBottom: 88 },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 4px 32px",
    flexWrap: "wrap",
    gap: 16,
  },
  brand: { display: "flex", alignItems: "center", gap: 6 },
  brandName: {
    fontSize: 15,
    letterSpacing: "0.02em",
    fontWeight: 500,
  },
  nav: { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" },
  navLink: {
    fontSize: 13,
    color: "rgba(245,245,242,0.6)",
    textDecoration: "none",
  },
  navCta: {
    fontSize: 13,
    color: "#07070a",
    background: "#f5f5f2",
    padding: "8px 14px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 500,
  },

  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.8fr)",
    gap: 40,
    alignItems: "center",
    padding: "36px 4px 20px",
  },
  heroCopy: { minWidth: 0 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.4)",
  },
  h1: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(2.6rem, 6vw, 4.4rem)",
    lineHeight: 0.98,
    letterSpacing: "-0.035em",
    margin: "12px 0 20px",
    fontWeight: 500,
  },
  heroAccent: {
    color: "#8BE3B4",
    fontStyle: "italic",
  },
  heroLede: {
    fontSize: 16,
    lineHeight: 1.55,
    color: "rgba(245,245,242,0.72)",
    maxWidth: 520,
  },
  heroCtas: { display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" },
  ctaPrimary: {
    background: "#8BE3B4",
    color: "#07070a",
    padding: "12px 22px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    border: "1px solid #8BE3B4",
  },
  ctaGhost: {
    padding: "12px 22px",
    borderRadius: 999,
    fontSize: 14,
    color: "rgba(245,245,242,0.82)",
    border: "1px solid rgba(255,255,255,0.14)",
    textDecoration: "none",
  },
  heroArt: {
    aspectRatio: "4 / 3",
    width: "100%",
    minHeight: 220,
  },

  section: { marginTop: 72 },

  h2: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.025em",
    marginTop: 8,
    marginBottom: 32,
    maxWidth: 620,
  },

  steps: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
  },
  step: {
    padding: "24px 22px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  },
  stepNum: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
    color: "#8BE3B4",
    background: "rgba(139,227,180,0.08)",
    border: "1px solid rgba(139,227,180,0.3)",
    padding: "4px 8px",
    borderRadius: 8,
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
  stepTitle: { fontSize: 17, fontWeight: 500, marginBottom: 6 },
  stepDesc: { fontSize: 14, color: "rgba(245,245,242,0.65)", lineHeight: 1.55 },

  meaningWrap: { display: "flex" },
  meaning: {
    padding: "36px 36px",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.07)",
    background:
      "radial-gradient(circle at 20% 10%, rgba(139,227,180,0.08), transparent 60%), rgba(255,255,255,0.02)",
    maxWidth: 780,
  },
  meaningBody: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(1.1rem, 2vw, 1.35rem)",
    lineHeight: 1.5,
    color: "rgba(245,245,242,0.88)",
    marginTop: 18,
    fontWeight: 400,
  },

  footer: {
    marginTop: 88,
    padding: "28px 0 0",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    fontSize: 12,
    color: "rgba(245,245,242,0.45)",
  },
  footerLink: { color: "rgba(245,245,242,0.6)", textDecoration: "none" },
};
