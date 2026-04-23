"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * "Open Raku on your phone" — a tiny section that shows a QR code of the
 * current page URL so the user can scan it from their laptop and open the
 * same page on their phone for demos.
 *
 * - SSR-safe: the URL is only read inside useEffect, so `window` is never
 *   touched on the server.
 * - On a narrow viewport (phone), we hide the QR and show a friendly note
 *   instead, since scanning yourself is silly.
 */
export default function OpenOnPhone() {
  const [url, setUrl] = useState<string>("");
  const [isPhone, setIsPhone] = useState<boolean>(false);

  useEffect(() => {
    setUrl(window.location.href);

    const check = () => setIsPhone(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section data-testid="open-on-phone" style={S.card}>
      <div style={S.copy}>
        <div style={S.eyebrow}>Chat with Raku on your phone</div>
        <h2 style={S.title}>your tiny AI friend, in your pocket.</h2>
        <p style={S.desc}>
          {isPhone
            ? "you're already on your phone — tap below to start chatting."
            : "scan this QR with your camera to open Raku on your phone and start chatting."}
        </p>
        {isPhone && url && (
          <a
            href={url}
            style={S.cta}
            data-testid="open-on-phone-cta"
          >
            Chat with Raku →
          </a>
        )}
      </div>

      {!isPhone && (
        <div style={S.qrBox} aria-label="QR code to chat with Raku on your phone">
          {url ? (
            <QRCodeSVG
              value={url}
              size={180}
              bgColor="#f5f5f2"
              fgColor="#07070a"
              level="M"
              marginSize={2}
              data-testid="open-on-phone-qr"
            />
          ) : (
            <div style={S.qrPlaceholder} aria-hidden />
          )}
        </div>
      )}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: "28px 28px",
    marginTop: 32,
    display: "flex",
    gap: 28,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  copy: {
    flex: "1 1 280px",
    minWidth: 240,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.38)",
  },
  title: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(1.25rem, 2.2vw, 1.6rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    marginTop: 8,
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: "rgba(245,245,242,0.7)",
    lineHeight: 1.5,
    maxWidth: 340,
  },
  cta: {
    display: "inline-block",
    marginTop: 14,
    padding: "10px 18px",
    borderRadius: 999,
    background: "#8BE3B4",
    color: "#0a0a0a",
    border: "1px solid #8BE3B4",
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
  },
  qrBox: {
    background: "#f5f5f2",
    padding: 12,
    borderRadius: 12,
    lineHeight: 0,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 6,
  },
};
