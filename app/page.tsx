"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import styles from "./page.module.css";
import RakuLight from "./components/RakuLight";

/* ──────────────── Amplify bootstrapping (graceful fallback) ──────────────── */
/*
  If `amplify_outputs.json` has a real `data` block, we talk to AppSync.
  If it's the placeholder ({auth:{}, data:{}}) or anything goes wrong,
  we fall back to local state persisted in localStorage — the UI is
  identical either way.

  Why this exists: the project is currently deployed to Vercel, which
  does NOT run `ampx pipeline-deploy`, so there is no real Amplify backend
  to talk to.  When the user later switches to Amplify Hosting (or pastes
  real values into `amplify_outputs.json`), the UI will automatically
  start using AppSync with zero code changes.
*/
type AmplifyClient = ReturnType<typeof generateClient<Schema>>;
const CFG = outputs as Record<string, unknown>;
const HAS_REAL_AMPLIFY =
  Boolean(
    CFG?.data &&
      typeof (CFG.data as Record<string, unknown>).url === "string",
  );

let client: AmplifyClient | null = null;
if (HAS_REAL_AMPLIFY) {
  try {
    Amplify.configure(outputs as never);
    client = generateClient<Schema>();
  } catch (err) {
    console.warn("[raku] Amplify configure failed, using local state:", err);
    client = null;
  }
}

/* ──────────────── constants ──────────────── */
const NAV = [
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "chat", label: "Chat" },
  { id: "connections", label: "Connections" },
  { id: "settings", label: "Settings" },
];

const ACCENTS = [
  { hex: "#8BE3B4", name: "mint" },
  { hex: "#F5C27A", name: "honey" },
  { hex: "#A4C8FF", name: "sky" },
  { hex: "#F28FAD", name: "rose" },
  { hex: "#C9A7FF", name: "lilac" },
  { hex: "#FF6B4A", name: "ember" },
  { hex: "#EDEDEA", name: "paper" },
];

const VIBES = [
  { id: "chill", label: "Chill friend", sub: "warm + low pressure" },
  { id: "hype", label: "Hype coach", sub: "short + excited" },
  { id: "study", label: "Study buddy", sub: "calm + precise" },
  { id: "quiet", label: "Quiet focus", sub: "barely speaks" },
];

type TaskStatus = "todo" | "doing" | "done" | "later";
type TaskSource = "manual" | "brightspace" | "notion" | "googleCalendar" | "raku";
type EventKind = "classroom" | "exam" | "assignment" | "event";
type IntStatus = "ready" | "mock" | "live" | "disconnected";

interface TaskRow {
  id: string;
  title: string;
  course?: string | null;
  dueAt?: string | null;
  effortMin?: number | null;
  importance?: number | null;
  status: TaskStatus;
  source: TaskSource;
  steps?: string[];
}

interface EventRow {
  id: string;
  title: string;
  course?: string | null;
  startAt: string;
  endAt?: string | null;
  kind?: EventKind;
  source?: TaskSource;
}

interface IntegrationRow {
  id: string;
  integrationId: string;
  name: string;
  description?: string | null;
  status: IntStatus;
  lastSyncAt?: string | null;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const SEED_TASKS: Omit<TaskRow, "id">[] = [
  {
    title: "Email professor about extension",
    course: "BIO 130",
    dueAt: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    effortMin: 10,
    importance: 4,
    status: "todo",
    source: "manual",
    steps: ["Open email", "Draft 4 lines", "Send"],
  },
  {
    title: "Problem Set 3",
    course: "MATH 220",
    dueAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    effortMin: 90,
    importance: 5,
    status: "todo",
    source: "brightspace",
    steps: ["Open problem set", "Do Q1–Q3", "Break", "Do Q4–Q6", "Check"],
  },
  {
    title: "Draft essay intro — Identity & Memory",
    course: "ENG 210",
    dueAt: new Date(Date.now() + 96 * 3_600_000).toISOString(),
    effortMin: 45,
    importance: 4,
    status: "todo",
    source: "notion",
    steps: ["Pick 1 angle", "Write thesis sentence", "3 support bullets"],
  },
  {
    title: "Read Chapter 4 — Intro to Sociology",
    course: "SOC 101",
    dueAt: new Date(Date.now() + 20 * 3_600_000).toISOString(),
    effortMin: 40,
    importance: 3,
    status: "todo",
    source: "brightspace",
    steps: ["Skim headings", "Read 4.1", "3 bullet takeaways"],
  },
];

const SEED_EVENTS: Omit<EventRow, "id">[] = [
  {
    title: "MATH 220 Lecture",
    course: "MATH 220",
    startAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    endAt: new Date(Date.now() + 3.25 * 3_600_000).toISOString(),
    kind: "classroom",
    source: "googleCalendar",
  },
  {
    title: "SOC 101 Lecture",
    course: "SOC 101",
    startAt: new Date(Date.now() + 27 * 3_600_000).toISOString(),
    endAt: new Date(Date.now() + 28 * 3_600_000).toISOString(),
    kind: "classroom",
    source: "googleCalendar",
  },
  {
    title: "MATH 220 Midterm",
    course: "MATH 220",
    startAt: new Date(Date.now() + 144 * 3_600_000).toISOString(),
    endAt: new Date(Date.now() + 146 * 3_600_000).toISOString(),
    kind: "exam",
    source: "brightspace",
  },
];

const SEED_INTEGRATIONS: Omit<IntegrationRow, "id">[] = [
  {
    integrationId: "brightspace",
    name: "Brightspace",
    description: "Scans assignments via the Raku Chrome extension.",
    status: "ready",
  },
  {
    integrationId: "google",
    name: "Google Calendar",
    description: "Pulls class times + personal events.",
    status: "mock",
  },
  {
    integrationId: "notion",
    name: "Notion",
    description: "Syncs a tasks database you pick.",
    status: "mock",
  },
];

/* ──────────────── helpers ──────────────── */
function hexToRgba(hex: string, a: number) {
  const c = hex.replace("#", "");
  const n = parseInt(
    c.length === 3 ? c.split("").map((x) => x + x).join("") : c,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function hoursFromNow(iso?: string | null) {
  if (!iso) return null;
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}
function formatDue(iso?: string | null) {
  const h = hoursFromNow(iso);
  if (h === null) return "—";
  if (h < 0) return "overdue";
  if (h < 1) return "in <1h";
  if (h < 24) return `in ${Math.round(h)}h`;
  const days = Math.round(h / 24);
  return days === 1 ? "tomorrow" : `in ${days}d`;
}
function taskScore(t: TaskRow) {
  const importance = t.importance ?? 3;
  const effort = t.effortMin ?? 30;
  const h = hoursFromNow(t.dueAt);
  const urgency = h !== null && h > 0 ? 100 / Math.max(h, 0.1) : 0;
  return urgency + importance * 5 + 10 / Math.max(effort, 5);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function greetingFor(n: number) {
  const h = new Date().getHours();
  const tod = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  if (n === 0) return `Good ${tod}. nothing urgent — breathe.`;
  if (n === 1) return `Good ${tod}. just one thing worth doing.`;
  return `Good ${tod}. ${n} tiny things. we'll do them together.`;
}

/* Keys used for localStorage persistence in fallback mode. */
const LS = {
  tasks: "raku.tasks.v1",
  events: "raku.events.v1",
  integrations: "raku.integrations.v1",
  accent: "raku.accent",
  vibe: "raku.vibe",
};

/* ──────────────── page ──────────────── */
export default function Page() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [ready, setReady] = useState(false);
  const [busyIntegration, setBusyIntegration] = useState<string | null>(null);

  const [accent, setAccent] = useState("#8BE3B4");
  const [vibe, setVibe] = useState("chill");
  const [active, setActive] = useState("today");

  const [chat, setChat] = useState([
    {
      role: "assistant" as const,
      text: "hi. I'm Raku. tell me what's on your plate.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  /* ── load accent + vibe from localStorage ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = localStorage.getItem(LS.accent);
    const v = localStorage.getItem(LS.vibe);
    if (a) setAccent(a);
    if (v) setVibe(v);
  }, []);

  /* ── apply accent → CSS variables ── */
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--raku-accent", accent);
    r.style.setProperty("--raku-accent-soft", hexToRgba(accent, 0.18));
    r.style.setProperty("--raku-accent-strong", hexToRgba(accent, 0.9));
    if (typeof window !== "undefined") localStorage.setItem(LS.accent, accent);
  }, [accent]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS.vibe, vibe);
  }, [vibe]);

  /* ── data bootstrap ─────────────────────────────────────────────
     Amplify mode: subscribe to observeQuery for each model.
     Local mode: hydrate from localStorage; seed if empty.
  */
  useEffect(() => {
    if (client) {
      const subT = client.models.Task.observeQuery().subscribe({
        next: ({ items }) => {
          setTasks(
            items.map((t) => ({
              id: t.id,
              title: t.title,
              course: t.course,
              dueAt: t.dueAt,
              effortMin: t.effortMin,
              importance: t.importance,
              status: (t.status ?? "todo") as TaskStatus,
              source: (t.source ?? "manual") as TaskSource,
              steps: (t.steps ?? []).filter(Boolean) as string[],
            })),
          );
          setReady(true);
        },
      });
      const subE = client.models.Event.observeQuery().subscribe({
        next: ({ items }) =>
          setEvents(
            items.map((e) => ({
              id: e.id,
              title: e.title,
              course: e.course,
              startAt: e.startAt,
              endAt: e.endAt,
              kind: (e.kind ?? "event") as EventKind,
              source: (e.source ?? "manual") as TaskSource,
            })),
          ),
      });
      const subI = client.models.Integration.observeQuery().subscribe({
        next: ({ items }) =>
          setIntegrations(
            items.map((i) => ({
              id: i.id,
              integrationId: i.integrationId,
              name: i.name,
              description: i.description,
              status: (i.status ?? "mock") as IntStatus,
              lastSyncAt: i.lastSyncAt,
            })),
          ),
      });
      return () => {
        subT.unsubscribe();
        subE.unsubscribe();
        subI.unsubscribe();
      };
    }

    // LOCAL MODE
    const load = <T,>(key: string, fallback: T[]): T[] => {
      if (typeof window === "undefined") return fallback;
      try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as T[];
      } catch {
        /* ignore */
      }
      return fallback;
    };

    const seededTasks = load<TaskRow>(
      LS.tasks,
      SEED_TASKS.map((s) => ({ ...s, id: uid() })),
    );
    const seededEvents = load<EventRow>(
      LS.events,
      SEED_EVENTS.map((e) => ({ ...e, id: uid() })),
    );
    const seededInts = load<IntegrationRow>(
      LS.integrations,
      SEED_INTEGRATIONS.map((i) => ({ ...i, id: uid() })),
    );

    setTasks(seededTasks);
    setEvents(seededEvents);
    setIntegrations(seededInts);
    setReady(true);
  }, []);

  /* Persist to localStorage whenever state changes (LOCAL MODE only). */
  useEffect(() => {
    if (!ready || client) return;
    localStorage.setItem(LS.tasks, JSON.stringify(tasks));
  }, [tasks, ready]);
  useEffect(() => {
    if (!ready || client) return;
    localStorage.setItem(LS.events, JSON.stringify(events));
  }, [events, ready]);
  useEffect(() => {
    if (!ready || client) return;
    localStorage.setItem(LS.integrations, JSON.stringify(integrations));
  }, [integrations, ready]);

  /* ── section tracking for mini-nav ── */
  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ready]);

  /* ── derived ── */
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === "todo" || t.status === "doing"),
    [tasks],
  );
  const topTasks = useMemo(
    () => [...openTasks].sort((a, b) => taskScore(b) - taskScore(a)).slice(0, 3),
    [openTasks],
  );
  const greeting = useMemo(
    () => greetingFor(topTasks.length),
    [topTasks.length],
  );

  const todayEvents = useMemo(() => {
    const now = new Date();
    const todayTasks = tasks
      .filter((t) => t.dueAt && sameDay(new Date(t.dueAt), now))
      .map((t) => ({
        id: `task-${t.id}`,
        title: `${t.title} due`,
        course: t.course ?? "",
        startAt: t.dueAt!,
        kind: "assignment" as EventKind,
      }));
    const todayEv = events
      .filter((e) => sameDay(new Date(e.startAt), now))
      .map((e) => ({
        id: e.id,
        title: e.title,
        course: e.course ?? "",
        startAt: e.startAt,
        kind: e.kind ?? "event",
      }));
    return [...todayEv, ...todayTasks].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [events, tasks]);

  /* ── handlers ── */
  const jump = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const updateStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      if (client) {
        await client.models.Task.update({ id, status });
        return;
      }
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
    },
    [],
  );

  const start = async (t: TaskRow) => {
    await updateStatus(t.id, "doing");
    setChat((c) => [
      ...c,
      { role: "user", text: `help me start: ${t.title}` },
      {
        role: "assistant",
        text: "okay. 5 minutes. open it. I'll sit with you.",
      },
    ]);
    jump("chat");
  };

  const syncIntegration = async (it: IntegrationRow) => {
    setBusyIntegration(it.id);
    try {
      const now = new Date();
      if (it.integrationId === "google") {
        const start = new Date(now.getTime() + 48 * 3_600_000);
        start.setHours(18, 0, 0, 0);
        const end = new Date(start.getTime() + 1.5 * 3_600_000);
        const newEvent = {
          title: "Study Group — Organic Chem",
          course: "CHEM 210",
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          kind: "event" as EventKind,
          source: "googleCalendar" as TaskSource,
        };
        if (client) {
          await client.models.Event.create(newEvent);
        } else {
          setEvents((ev) => [...ev, { id: uid(), ...newEvent }]);
        }
      } else if (it.integrationId === "notion") {
        const newTask = {
          title: "Read hooks — Teaching to Transgress Ch.1",
          course: "EDU 200",
          dueAt: new Date(now.getTime() + 72 * 3_600_000).toISOString(),
          effortMin: 40,
          importance: 3,
          status: "todo" as TaskStatus,
          source: "notion" as TaskSource,
          steps: [] as string[],
        };
        if (client) {
          await client.models.Task.create(newTask);
        } else {
          setTasks((ts) => [...ts, { id: uid(), ...newTask }]);
        }
      }
      const patch = { status: "live" as IntStatus, lastSyncAt: now.toISOString() };
      if (client) {
        await client.models.Integration.update({ id: it.id, ...patch });
      } else {
        setIntegrations((ins) =>
          ins.map((i) => (i.id === it.id ? { ...i, ...patch } : i)),
        );
      }
    } finally {
      setBusyIntegration(null);
    }
  };

  const disconnectIntegration = async (it: IntegrationRow) => {
    setBusyIntegration(it.id);
    try {
      const patch = { status: "disconnected" as IntStatus, lastSyncAt: null };
      if (client) {
        await client.models.Integration.update({ id: it.id, ...patch });
      } else {
        setIntegrations((ins) =>
          ins.map((i) => (i.id === it.id ? { ...i, ...patch } : i)),
        );
      }
    } finally {
      setBusyIntegration(null);
    }
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setChat((c) => [
      ...c,
      { role: "user", text },
      {
        role: "assistant",
        text: topTasks[0]
          ? `start with: ${topTasks[0].title}. just 5 min. want me to break it down?`
          : "nothing urgent. take 5, drink water, come back when ready.",
      },
    ]);
  };

  /* ──────────────── render ──────────────── */
  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <RakuLight size="tiny" />
          <div>
            <div className={styles.brandName}>raku</div>
            <div className={styles.brandSub}>school feels lighter</div>
          </div>
        </div>
        <nav className={styles.nav}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => jump(n.id)}
              className={`${styles.navBtn} ${active === n.id ? styles.navBtnActive : ""}`}
              data-testid={`nav-${n.id}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          v1 · beta
          <br />
          no pressure, just progress.
        </div>
      </aside>

      <main className={styles.main}>
        {/* Today */}
        <section id="today" className={styles.section}>
          <header className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>today</div>
              <h1 className={styles.h1}>{greeting}</h1>
            </div>
            <RakuLight size="large" testId="today-raku-light" />
          </header>

          <div className={styles.card} data-testid="today-card">
            <div className={styles.cardHeader}>
              <span className={styles.eyebrow}>
                next {topTasks.length} thing{topTasks.length === 1 ? "" : "s"}
              </span>
            </div>
            {!ready ? (
              <div className={styles.empty}>loading your day…</div>
            ) : topTasks.length === 0 ? (
              <div className={styles.empty}>clear. breathe. you did good.</div>
            ) : (
              <ol className={styles.tasks}>
                {topTasks.map((t, i) => (
                  <li
                    key={t.id}
                    className={styles.task}
                    data-testid={`task-${i}`}
                  >
                    <span className={styles.taskNum}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.taskBody}>
                      <div className={styles.taskTitle}>{t.title}</div>
                      <div className={styles.taskMeta}>
                        {t.course && <span>{t.course}</span>}
                        {t.dueAt && <span>· due {formatDue(t.dueAt)}</span>}
                        {t.effortMin ? (
                          <span>· ~{t.effortMin} min</span>
                        ) : null}
                      </div>
                      {(t.steps ?? []).length > 0 && (
                        <div className={styles.taskSteps}>
                          {(t.steps ?? []).slice(0, 3).map((s, si) => (
                            <span key={si} className={styles.chip}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.taskActions}>
                      <button
                        className={styles.primaryBtn}
                        onClick={() => start(t)}
                        data-testid={`start-${i}`}
                      >
                        Start
                      </button>
                      <button
                        className={styles.ghostBtn}
                        onClick={() => updateStatus(t.id, "later")}
                        data-testid={`later-${i}`}
                      >
                        Later
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className={styles.rowBtns}>
            <button
              className={styles.outlineBtn}
              onClick={() => jump("chat")}
              data-testid="ask-raku"
            >
              ask Raku — what now?
            </button>
            <button
              className={styles.ghostBtn}
              onClick={() => jump("calendar")}
            >
              see the week →
            </button>
          </div>
        </section>

        {/* Calendar */}
        <section id="calendar" className={styles.section}>
          <header className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>calendar</div>
              <h1 className={styles.h1}>the shape of your week.</h1>
            </div>
            <RakuLight size="small" />
          </header>

          <div className={styles.card}>
            <div className={styles.calStrip}>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + i);
                const eventCount = events.filter((e) =>
                  sameDay(new Date(e.startAt), d),
                ).length;
                const taskCount = tasks.filter(
                  (t) => t.dueAt && sameDay(new Date(t.dueAt), d),
                ).length;
                const dots = Math.min(eventCount + taskCount, 4);
                const isToday = i === 0;
                return (
                  <div
                    key={i}
                    className={`${styles.calDay} ${isToday ? styles.calDayToday : ""}`}
                  >
                    <div className={styles.calDayLabel}>
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div className={styles.calDayNum}>{d.getDate()}</div>
                    <div className={styles.calDots}>
                      {Array.from({ length: dots }).map((_, di) => (
                        <span key={di} className={styles.calDot} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.hline} />
            <ul className={styles.eventList}>
              {todayEvents.length === 0 && (
                <li
                  style={{ color: "var(--fg-muted)", padding: "24px 0" }}
                >
                  clear day. good one to breathe.
                </li>
              )}
              {todayEvents.map((e) => (
                <li key={e.id} className={styles.event}>
                  <span className={styles.eventTime}>
                    {new Date(e.startAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className={styles.eventTitle}>
                    {e.title}
                    {e.course ? (
                      <span
                        style={{ color: "var(--fg-dim)", marginLeft: 8 }}
                      >
                        {e.course}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.eventTag}>
                    {e.kind === "classroom"
                      ? "class"
                      : e.kind === "assignment"
                        ? "due"
                        : e.kind}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Chat */}
        <section id="chat" className={styles.section}>
          <header className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>raku · chat</div>
              <h1 className={styles.h1}>what now?</h1>
            </div>
            <RakuLight size="small" />
          </header>

          <div className={styles.card}>
            <div className={styles.chatList}>
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.bubbleRow} ${
                    m.role === "user" ? styles.bubbleRowUser : ""
                  }`}
                >
                  <div
                    className={`${styles.bubble} ${
                      m.role === "user"
                        ? styles.bubbleUser
                        : styles.bubbleAssistant
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.chatSuggest}>
              {["what now?", "help me plan", "I'm tired"].map((s) => (
                <button
                  key={s}
                  className={styles.chip}
                  onClick={() => setChatInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className={styles.chatInputRow}>
              <input
                className={styles.input}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="tell Raku what's up…"
                data-testid="chat-input"
              />
              <button
                className={styles.primaryBtn}
                onClick={sendChat}
                data-testid="chat-send"
              >
                send
              </button>
            </div>
          </div>
        </section>

        {/* Connections */}
        <section id="connections" className={styles.section}>
          <header className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>connections</div>
              <h1 className={styles.h1}>bring your school in.</h1>
              <p className={styles.sub}>
                link each one once. Raku watches for new work.
              </p>
            </div>
            <RakuLight size="small" />
          </header>

          <ul className={styles.connList}>
            {integrations.map((it) => (
              <li
                key={it.id}
                className={styles.connItem}
                data-testid={`integration-${it.integrationId}`}
              >
                <div className={styles.connHead}>
                  <RakuLight size="tiny" />
                  <div>
                    <div className={styles.connName}>{it.name}</div>
                    <div className={styles.connSub}>{it.description}</div>
                  </div>
                </div>
                <span
                  className={`${styles.status} ${it.status === "live" ? styles.statusLive : ""}`}
                >
                  {it.status}
                </span>
                <div className={styles.connActions}>
                  {it.integrationId === "brightspace" ? (
                    <button className={styles.outlineBtn}>
                      install extension
                    </button>
                  ) : (
                    <button
                      className={styles.primaryBtn}
                      disabled={busyIntegration === it.id}
                      onClick={() => syncIntegration(it)}
                      data-testid={`btn-sync-${it.integrationId}`}
                    >
                      {busyIntegration === it.id ? "syncing…" : "sync now"}
                    </button>
                  )}
                  {it.status !== "disconnected" &&
                    it.integrationId !== "brightspace" && (
                      <button
                        className={styles.ghostBtn}
                        onClick={() => disconnectIntegration(it)}
                      >
                        disconnect
                      </button>
                    )}
                </div>
                {it.lastSyncAt && (
                  <div className={styles.connLast}>
                    last sync · {new Date(it.lastSyncAt).toLocaleString()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Settings */}
        <section id="settings" className={styles.section}>
          <header className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>settings</div>
              <h1 className={styles.h1}>make Raku yours.</h1>
            </div>
            <RakuLight />
          </header>

          <div className={styles.card}>
            <div className={styles.eyebrow}>accent</div>
            <div className={styles.subSmall}>
              pick the color of your Raku light.
            </div>
            <div className={styles.swatchRow}>
              {ACCENTS.map((a) => (
                <button
                  key={a.hex}
                  onClick={() => setAccent(a.hex)}
                  className={`${styles.swatch} ${accent === a.hex ? styles.swatchOn : ""}`}
                  data-testid={`accent-${a.name}`}
                >
                  <span
                    className={styles.swatchDot}
                    style={{ background: a.hex }}
                  />
                  <span>{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.eyebrow}>Raku’s vibe</div>
            <div className={styles.subSmall}>how should Raku talk to you?</div>
            <div className={styles.vibeGrid}>
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVibe(v.id)}
                  className={`${styles.vibeBtn} ${vibe === v.id ? styles.vibeBtnOn : ""}`}
                  data-testid={`vibe-${v.id}`}
                >
                  <div className={styles.vibeLabel}>{v.label}</div>
                  <div className={styles.vibeSub}>{v.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.eyebrow}>chat channels</div>
            <div className={styles.subSmall}>coming soon.</div>
            <div className={styles.chipRow}>
              {["iMessage", "WhatsApp", "Telegram", "Slack"].map((c) => (
                <span key={c} className={styles.chipMuted}>
                  {c} · soon
                </span>
              ))}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          v1 · beta · school feels lighter.
          {!client && (
            <div style={{ marginTop: 6, letterSpacing: 0, textTransform: "none" }}>
              running in local-state mode (no Amplify backend configured)
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}
