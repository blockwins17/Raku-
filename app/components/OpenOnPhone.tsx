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
      <div>
        <div style={S.eyebrow}>Open Raku on your phone</div>
        <p style={S.desc}>
          {isPhone
            ? "you're already on your phone — no need to scan."
            : "scan this QR with your camera to open this page."}
        </p>
      </div>

      {!isPhone && (
        <div style={S.qrBox} aria-label="QR code for current page">
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
    padding: "24px 28px",
    marginTop: 32,
    display: "flex",
    gap: 24,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.38)",
  },
  desc: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(245,245,242,0.7)",
    lineHeight: 1.5,
    maxWidth: 320,
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
