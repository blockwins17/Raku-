"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseReady, type Task } from "@/lib/supabase/client";

const DEFAULT_TASKS: Array<Pick<Task, "title" | "status">> = [
  { title: "Email professor about extension", status: "today" },
  { title: "Problem Set 3 — first 3 problems", status: "today" },
  { title: "Draft essay intro (one paragraph)", status: "today" },
];

type Section = {
  key: Task["status"];
  label: string;
  eyebrow: string;
};

const SECTIONS: Section[] = [
  { key: "today", label: "Today", eyebrow: "one thing at a time" },
  { key: "later", label: "Later", eyebrow: "safe, but not gone" },
  { key: "completed", label: "Completed", eyebrow: "you did that" },
];

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  /* ── data fetch ────────────────────────────────────────────── */
  const loadTasks = useCallback(async () => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("tasks")
      .select("id, user_id, title, status, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Task[];
  }, []);

  useEffect(() => {
    if (!isSupabaseReady || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let rows = await loadTasks();
        if (!rows) return;

        // Seed once if the table is empty
        if (rows.length === 0 && !seeded) {
          setSeeded(true);
          const { error: insertErr } = await supabase
            .from("tasks")
            .insert(DEFAULT_TASKS);
          if (insertErr) throw insertErr;
          rows = (await loadTasks()) ?? [];
        }

        if (!cancelled) setTasks(rows);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTasks, seeded]);

  /* ── handlers ──────────────────────────────────────────────── */
  const changeStatus = async (id: string, status: Task["status"]) => {
    if (!supabase) return;
    setBusy(id);
    // Optimistic update
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    } catch (e) {
      // Roll back by re-fetching
      const fresh = await loadTasks().catch(() => null);
      if (fresh) setTasks(fresh);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  /* ── render ────────────────────────────────────────────────── */
  if (!isSupabaseReady) {
    return (
      <main style={S.page}>
        <div style={S.banner}>
          <strong style={{ color: "#F28FAD" }}>Backend not configured.</strong>
          <div style={{ marginTop: 8, color: "rgba(245,245,242,0.55)" }}>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your Vercel
            project&apos;s Environment Variables, then redeploy.
          </div>
        </div>
      </main>
    );
  }

  const byStatus = (s: Task["status"]) =>
    tasks.filter((t) => t.status === s);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <RakuLight />
        <div>
          <div style={S.eyebrow}>raku</div>
          <h1 style={S.h1}>school feels lighter.</h1>
        </div>
      </header>

      {error && (
        <div style={S.errorBanner}>
          <strong>Something broke:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: "rgba(245,245,242,0.55)" }}>loading your day…</div>
      ) : (
        <div style={S.sections}>
          {SECTIONS.map((sec) => {
            const items = byStatus(sec.key);
            return (
              <section key={sec.key} style={S.section}>
                <div style={S.sectionHead}>
                  <div>
                    <div style={S.eyebrow}>{sec.label}</div>
                    <div style={S.sub}>{sec.eyebrow}</div>
                  </div>
                  <span style={S.count}>{items.length}</span>
                </div>

                {items.length === 0 ? (
                  <div style={S.empty}>nothing here.</div>
                ) : (
                  <ul style={S.list}>
                    {items.map((t) => (
                      <li key={t.id} style={S.item}>
                        <div style={S.itemTitle}>
                          {t.status === "completed" ? (
                            <s style={{ opacity: 0.55 }}>{t.title}</s>
                          ) : (
                            t.title
                          )}
                        </div>
                        <div style={S.itemActions}>
                          {t.status !== "completed" && (
                            <button
                              data-testid={`done-${t.id}`}
                              disabled={busy === t.id}
                              onClick={() => changeStatus(t.id, "completed")}
                              style={{ ...S.btn, ...S.btnPrimary }}
                            >
                              Done
                            </button>
                          )}
                          {t.status === "today" && (
                            <button
                              data-testid={`later-${t.id}`}
                              disabled={busy === t.id}
                              onClick={() => changeStatus(t.id, "later")}
                              style={{ ...S.btn, ...S.btnGhost }}
                            >
                              Later
                            </button>
                          )}
                          {t.status === "later" && (
                            <button
                              data-testid={`today-${t.id}`}
                              disabled={busy === t.id}
                              onClick={() => changeStatus(t.id, "today")}
                              style={{ ...S.btn, ...S.btnGhost }}
                            >
                              Back to Today
                            </button>
                          )}
                          {t.status === "completed" && (
                            <button
                              data-testid={`reopen-${t.id}`}
                              disabled={busy === t.id}
                              onClick={() => changeStatus(t.id, "today")}
                              style={{ ...S.btn, ...S.btnGhost }}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <footer style={S.footer}>v1 · raku-ui · backed by Supabase</footer>
    </main>
  );
}

/* ───────── Raku pulsing light (inline, no component file) ───────── */
function RakuLight() {
  return (
    <div
      aria-hidden
      style={{
        width: 56,
        height: 56,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: 3,
        transform: "rotate(45deg) skew(-8deg, -8deg)",
        filter:
          "drop-shadow(0 0 18px rgba(139,227,180,0.35)) drop-shadow(0 0 4px rgba(139,227,180,0.35))",
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{
            background: "#8BE3B4",
            borderRadius: 2,
            animation: "raku-pulse 2.4s ease-in-out infinite",
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
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
    </div>
  );
}

/* ───────── styles ───────── */
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07070a",
    color: "#f5f5f2",
    padding: "48px 24px 96px",
    maxWidth: 960,
    margin: "0 auto",
    fontFamily:
      "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    display: "flex",
    gap: 20,
    alignItems: "center",
    marginBottom: 48,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.38)",
  },
  h1: {
    fontFamily: "var(--font-display), 'Fraunces', ui-serif, Georgia, serif",
    fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
    marginTop: 8,
  },
  sub: {
    fontSize: 13,
    color: "rgba(245,245,242,0.55)",
    marginTop: 4,
  },
  sections: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  section: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: "24px 28px",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 16,
  },
  count: {
    fontSize: 11,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "rgba(245,245,242,0.4)",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
  },
  item: {
    padding: "14px 0",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 1.4,
    flex: "1 1 60%",
    minWidth: 180,
  },
  itemActions: {
    display: "flex",
    gap: 8,
  },
  btn: {
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.15s ease, border-color 0.15s ease",
  },
  btnPrimary: {
    background: "#8BE3B4",
    color: "#0a0a0a",
    border: "1px solid #8BE3B4",
  },
  btnGhost: {
    background: "transparent",
    color: "rgba(245,245,242,0.7)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  empty: {
    padding: "20px 0",
    color: "rgba(245,245,242,0.4)",
    fontSize: 13,
  },
  banner: {
    padding: 20,
    borderRadius: 16,
    border: "1px dashed rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.02)",
    fontSize: 14,
    lineHeight: 1.6,
  },
  errorBanner: {
    padding: 14,
    marginBottom: 24,
    borderRadius: 12,
    border: "1px solid #F28FAD",
    background: "rgba(242,143,173,0.08)",
    color: "#F28FAD",
    fontSize: 13,
  },
  footer: {
    marginTop: 60,
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(245,245,242,0.3)",
    textAlign: "center",
  },
};
