"use client";

/**
 * FakeChat — a static mock iMessage-style thread for demo-video B-roll.
 * Not wired to any backend; purely visual.
 */

type Msg =
  | { from: "me"; text: string }
  | { from: "kumo"; text: string; link?: { label: string; href: string } };

const SCRIPT: Msg[] = [
  { from: "me", text: "hi kumo" },
  {
    from: "kumo",
    text:
      "hey. I'm Kumo — your little cloud for school. send me a photo of an assignment or paste a link. I'll break it into tiny steps you can start in 10 min.",
  },
  { from: "me", text: "ok I have a 1500 word paper due friday and I'm cooked" },
  {
    from: "kumo",
    text:
      "got you. give me the prompt — screenshot, Brightspace link, or just paste it. Friday's not a boss fight, it's 5 small things.",
  },
  { from: "me", text: "sent it" },
  {
    from: "kumo",
    text:
      "okay. tonight's first step: 10 min — open a doc and write one ugly sentence answering the prompt. that's it. I'll hold the rest.",
    link: { label: "open this chat on my laptop →", href: "#" },
  },
];

export default function FakeChat() {
  return (
    <section style={S.section} data-testid="fake-chat">
      <div style={S.eyebrow}>a real chat, simplified</div>
      <h2 style={S.title}>texting Kumo feels like texting a friend.</h2>

      <div style={S.phone}>
        <div style={S.phoneNotch} />
        <div style={S.phoneScreen}>
          <div style={S.phoneHeader}>
            <div style={S.avatar}>k</div>
            <div>
              <div style={S.peerName}>Kumo</div>
              <div style={S.peerSub}>cloud · active now</div>
            </div>
          </div>

          <div style={S.thread}>
            {SCRIPT.map((m, i) => (
              <Bubble key={i} msg={m} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const me = msg.from === "me";
  return (
    <div style={{ ...S.row, justifyContent: me ? "flex-end" : "flex-start" }}>
      <div
        style={{
          ...S.bubble,
          ...(me ? S.bubbleMe : S.bubbleKumo),
        }}
      >
        <span>{msg.text}</span>
        {msg.from === "kumo" && msg.link && (
          <a href={msg.link.href} style={S.bubbleLink} onClick={(e) => e.preventDefault()}>
            {msg.link.label}
          </a>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  section: { marginTop: 72 },
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
    marginBottom: 28,
    maxWidth: 560,
  },

  phone: {
    width: 320,
    maxWidth: "100%",
    margin: "0 auto",
    background: "#0a0a0c",
    borderRadius: 42,
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 10,
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
    position: "relative",
  },
  phoneNotch: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: "translateX(-50%)",
    width: 90,
    height: 22,
    background: "#000",
    borderRadius: 999,
    zIndex: 2,
  },
  phoneScreen: {
    background: "#f5f5f2",
    color: "#07070a",
    borderRadius: 34,
    overflow: "hidden",
    minHeight: 520,
    display: "flex",
    flexDirection: "column",
  },
  phoneHeader: {
    padding: "42px 16px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "#fbfbf8",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#07070a",
    color: "#8BE3B4",
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 600,
  },
  peerName: { fontSize: 13, fontWeight: 600 },
  peerSub: { fontSize: 11, color: "rgba(0,0,0,0.45)" },

  thread: {
    padding: "14px 12px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  row: { display: "flex", width: "100%" },
  bubble: {
    maxWidth: "78%",
    padding: "8px 12px",
    fontSize: 13,
    lineHeight: 1.45,
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  bubbleMe: {
    background: "#3b82f6",
    color: "white",
    borderBottomRightRadius: 6,
  },
  bubbleKumo: {
    background: "#e8e8e3",
    color: "#07070a",
    borderBottomLeftRadius: 6,
  },
  bubbleLink: {
    fontSize: 12,
    color: "#2563eb",
    textDecoration: "underline",
    fontWeight: 500,
  },
};
