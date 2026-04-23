"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [wantsTesting, setWantsTesting] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: "email first — then I got you." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setStatus({ kind: "error", message: "that email looks off — try again?" });
      return;
    }

    setStatus({ kind: "loading" });
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed, wantsUserTesting: wantsTesting }),
      });
      const j = await r.json().catch(() => ({ ok: false, error: "bad response" }));
      if (!r.ok || !j.ok) {
        setStatus({
          kind: "error",
          message: j.error || "couldn't save that. try again?",
        });
        return;
      }
      setStatus({ kind: "ok" });
      setEmail("");
      setWantsTesting(false);
    } catch {
      setStatus({ kind: "error", message: "network hiccup. one more try?" });
    }
  }

  const isSuccess = status.kind === "ok";
  const isLoading = status.kind === "loading";

  return (
    <section style={S.section} data-testid="waitlist">
      <div style={S.card}>
        <div style={S.head}>
          <div style={S.eyebrow}>early access</div>
          <h2 style={S.title}>
            want Kumo when it launches?
          </h2>
          <p style={S.desc}>
            join the early access list. I'll email you the moment it's ready —
            no marketing, no spam, just a heads-up.
          </p>
        </div>

        {isSuccess ? (
          <div style={S.success} data-testid="waitlist-success" role="status">
            <div style={S.successIcon}>✓</div>
            <div>
              <div style={S.successTitle}>you're in.</div>
              <div style={S.successSub}>
                I'll email you when Kumo is ready.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={S.form} data-testid="waitlist-form">
            <div style={S.field}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status.kind === "error") setStatus({ kind: "idle" });
                }}
                disabled={isLoading}
                style={S.input}
                data-testid="waitlist-email"
                aria-label="email"
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...S.btn,
                  ...(isLoading ? S.btnDisabled : {}),
                }}
                data-testid="waitlist-submit"
              >
                {isLoading ? "joining…" : "Join early access"}
              </button>
            </div>

            <label style={S.check} data-testid="waitlist-testing-label">
              <input
                type="checkbox"
                checked={wantsTesting}
                onChange={(e) => setWantsTesting(e.target.checked)}
                disabled={isLoading}
                style={S.checkBox}
                data-testid="waitlist-testing"
              />
              <span style={S.checkText}>
                I'd like to help with user testing and give feedback.
              </span>
            </label>

            {status.kind === "error" && (
              <div style={S.error} data-testid="waitlist-error" role="alert">
                {status.message}
              </div>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  section: { marginTop: 88 },
  card: {
    padding: "36px 32px",
    borderRadius: 24,
    background:
      "radial-gradient(circle at 15% 10%, rgba(139,227,180,0.08), transparent 60%), rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    maxWidth: 720,
  },
  head: { marginBottom: 22, maxWidth: 540 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(139,227,180,0.65)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  title: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(1.6rem, 3vw, 2.1rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.025em",
    marginTop: 10,
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "rgba(245,245,242,0.7)",
  },

  form: { display: "flex", flexDirection: "column", gap: 14 },
  field: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  input: {
    flex: "1 1 260px",
    minWidth: 200,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f5f5f2",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s ease",
  },
  btn: {
    padding: "12px 22px",
    borderRadius: 999,
    background: "#8BE3B4",
    color: "#07070a",
    border: "1px solid #8BE3B4",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  check: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 13,
    color: "rgba(245,245,242,0.72)",
    cursor: "pointer",
    lineHeight: 1.5,
  },
  checkBox: {
    marginTop: 2,
    width: 16,
    height: 16,
    accentColor: "#8BE3B4",
    flexShrink: 0,
    cursor: "pointer",
  },
  checkText: {},

  error: {
    padding: "10px 14px",
    borderRadius: 10,
    background: "rgba(242,143,173,0.08)",
    border: "1px solid rgba(242,143,173,0.35)",
    color: "#F28FAD",
    fontSize: 13,
  },

  success: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: "16px 18px",
    background: "rgba(139,227,180,0.08)",
    border: "1px solid rgba(139,227,180,0.3)",
    borderRadius: 14,
  },
  successIcon: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#8BE3B4",
    color: "#07070a",
    display: "grid",
    placeItems: "center",
    fontWeight: 600,
    fontSize: 16,
    flexShrink: 0,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: "#f5f5f2",
  },
  successSub: {
    fontSize: 13,
    color: "rgba(245,245,242,0.7)",
    marginTop: 2,
  },
};
