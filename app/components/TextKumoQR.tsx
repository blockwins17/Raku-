"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * TextKumoQR — a QR code that, when scanned with a phone camera, opens the
 * phone's Messages app with Kumo's number + a prefilled "hi kumo" message.
 *
 * No signup. No app. Just text.
 *
 * DEMO_PHONE is a placeholder — swap to a real Twilio / OpenPhone /
 * messaging-provider number when you wire up the real SMS bot.
 */

// Real Kumo SMS number (Twilio).
export const DEMO_PHONE = "+1 (844) 569-6850";
const SMS_NUMBER_RAW = "+18445696850"; // E.164, no spaces
const SMS_BODY = "hi kumo";

const SMS_URI = `sms:${SMS_NUMBER_RAW}?&body=${encodeURIComponent(SMS_BODY)}`;

export default function TextKumoQR() {
  return (
    <div style={S.card} data-testid="text-kumo-qr">
      <div style={S.copy}>
        <div style={S.eyebrow}>step 1 · no signup</div>
        <h2 style={S.title}>text Kumo.</h2>
        <p style={S.desc}>
          scan this with your phone camera. your Messages app opens with Kumo's
          number ready. hit send. Kumo replies in plain words.
        </p>

        <div style={S.numberRow}>
          <span style={S.numberLabel}>or text</span>
          <a href={SMS_URI} style={S.numberLink} data-testid="text-kumo-number">
            {DEMO_PHONE}
          </a>
        </div>

        <p style={S.fine}>
          no app. no password. Kumo texts back a link that opens this same chat on your laptop.
        </p>
      </div>

      <div style={S.qrBox} aria-label="QR code to text Kumo">
        <QRCodeSVG
          value={SMS_URI}
          size={196}
          bgColor="#f5f5f2"
          fgColor="#07070a"
          level="M"
          marginSize={2}
          data-testid="text-kumo-qr-svg"
        />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: "32px 32px",
    display: "flex",
    gap: 32,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  copy: { flex: "1 1 280px", minWidth: 260 },
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
    marginBottom: 12,
  },
  desc: {
    fontSize: 15,
    lineHeight: 1.55,
    color: "rgba(245,245,242,0.82)",
    maxWidth: 380,
  },
  numberRow: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  numberLabel: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.4)",
  },
  numberLink: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 15,
    color: "#8BE3B4",
    textDecoration: "none",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(139,227,180,0.35)",
    background: "rgba(139,227,180,0.08)",
  },
  fine: {
    marginTop: 14,
    fontSize: 12,
    color: "rgba(245,245,242,0.45)",
    lineHeight: 1.5,
    maxWidth: 380,
  },
  qrBox: {
    background: "#f5f5f2",
    padding: 14,
    borderRadius: 16,
    lineHeight: 0,
    boxShadow: "0 12px 32px rgba(0,0,0,0.32)",
  },
};
