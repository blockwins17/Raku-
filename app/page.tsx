"use client";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07070a",
        color: "#f5f5f2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        fontFamily:
          "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gap: 3,
          transform: "rotate(45deg) skew(-8deg, -8deg)",
          filter:
            "drop-shadow(0 0 20px rgba(139, 227, 180, 0.35)) drop-shadow(0 0 4px rgba(139, 227, 180, 0.35))",
          marginBottom: 48,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            style={{
              background: "#8BE3B4",
              borderRadius: 2,
              opacity: 0.85,
              animation: "raku-pulse 2.4s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>

      <h1
        style={{
          fontFamily:
            "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        Raku is live.
      </h1>

      <p
        style={{
          marginTop: 20,
          fontSize: "0.95rem",
          color: "rgba(245, 245, 242, 0.55)",
          maxWidth: "32ch",
          lineHeight: 1.6,
        }}
      >
        Clean reset. Backend coming soon.
      </p>

      <style jsx>{`
        @keyframes raku-pulse {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
    </main>
  );
}
