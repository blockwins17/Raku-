"use client";

import { useEffect, useMemo, useState } from "react";
import { Amplify } from "aws-amplify";
// Amplify config file is generated at deploy time by `ampx`.
// Safe to keep the import + configure call — Amplify Hosting will produce it.
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./app.css";
import styles from "./page.module.css";
import RakuLight from "./components/RakuLight";

Amplify.configure(outputs);

// ───────────── sample data (static; swap for Amplify Data later) ─────────────
type Task = {
  id: string;
  title: string;
  course: string;
  dueInHrs: number;
  effortMin: number;
  steps: string[];
};

const SEED_TASKS: Task[] = [
  {
    id: "t1",
    title: "Email professor about extension",
    course: "BIO 130",
    dueInHrs: 6,
    effortMin: 10,
    steps: ["Open email", "Draft 4 lines", "Send"],
  },
  {
    id: "t2",
    title: "Problem Set 3",
    course: "MATH 220",
    dueInHrs: 48,
    effortMin: 90,
    steps: ["Open problem set", "Do Q1–Q3", "Break", "Do Q4–Q6", "Check"],
  },
  {
    id: "t3",
    title: "Draft essay intro — Identity & Memory",
    course: "ENG 210",
    dueInHrs: 96,
    effortMin: 45,
    steps: ["Pick 1 angle", "Write thesis", "3 support bullets"],
  },
];

const CAL_WEEK = [
  { day: "Mon", date: 21, dots: 2 },
  { day: "Tue", date: 22, dots: 3, today: true },
  { day: "Wed", date: 23, dots: 1 },
  { day: "Thu", date: 24, dots: 2 },
  { day: "Fri", date: 25, dots: 0 },
  { day: "Sat", date: 26, dots: 0 },
  { day: "Sun", date: 27, dots: 1 },
];

const CHAT_SEED = [
  { role: "assistant", text: "hi. I'm Raku. tell me what's on your plate." },
  { role: "user", text: "what now?" },
  {
    role: "assistant",
    text: "start with the Bio email. just 5 min. I'll give you 4 lines to copy.",
  },
];

const INTEGRATIONS = [
  { id: "brightspace", name: "Brightspace", status: "Ready", sub: "via Chrome extension" },
  { id: "google", name: "Google Calendar", status: "Mock", sub: "pulls classes + events" },
  { id: "notion", name: "Notion", status: "Mock", sub: "syncs a tasks database" },
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

const NAV = [
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "chat", label: "Chat" },
  { id: "connections", label: "Connections" },
  { id: "settings", label: "Settings" },
];

// ───────────── helpers ─────────────
function hexToRgba(hex: string, a: number) {
  const clean = hex.replace("#", "");
  const n = parseInt(
    clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function formatDue(hrs: number) {
  if (hrs < 1) return "now";
  if (hrs < 24) return `in ${Math.round(hrs)}h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "tomorrow" : `in ${days}d`;
}

// ───────────── page ─────────────
export default function App() {
  const [accent, setAccent] = useState(ACCENTS[0].hex);
  const [vibe, setVibe] = useState("chill");
  const [active, setActive] = useState("today");
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [chat, setChat] = useState(CHAT_SEED);
  const [chatInput, setChatInput] = useState("");

  // Apply accent to CSS variables
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--raku-accent", accent);
    r.style.setProperty("--raku-accent-soft", hexToRgba(accent, 0.18));
    r.style.setProperty("--raku-accent-strong", hexToRgba(accent, 0.9));
  }, [accent]);

  // Smooth-scroll on mini-nav click + track active section
  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const tod = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    const n = tasks.length;
    if (n === 0) return `Good ${tod}. nothing urgent — breathe.`;
    if (n === 1) return `Good ${tod}. just one thing worth doing.`;
    return `Good ${tod}. ${n} tiny things. we'll do them together.`;
  }, [tasks.length]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const start = (id: string) => {
    setChat((c) => [
      ...c,
      { role: "user", text: `help me start: ${tasks.find((t) => t.id === id)?.title}` },
      { role: "assistant", text: "okay. 5 minutes. open it. I'll sit with you." },
    ]);
    jump("chat");
  };

  const later = (id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
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
        text: "okay. want me to break it into 3 tiny steps?",
      },
    ]);
  };

  return (
    <div className={styles.app}>
      {/* left mini-nav */}
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
                next {tasks.length} thing{tasks.length === 1 ? "" : "s"}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className={styles.empty}>clear. breathe. you did good.</div>
            ) : (
              <ol className={styles.tasks}>
                {tasks.map((t, i) => (
                  <li key={t.id} className={styles.task} data-testid={`task-${i}`}>
                    <span className={styles.taskNum}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.taskBody}>
                      <div className={styles.taskTitle}>{t.title}</div>
                      <div className={styles.taskMeta}>
                        <span>{t.course}</span>
                        <span>· due {formatDue(t.dueInHrs)}</span>
                        <span>· ~{t.effortMin} min</span>
                      </div>
                      <div className={styles.taskSteps}>
                        {t.steps.slice(0, 3).map((s, si) => (
                          <span key={si} className={styles.chip}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.taskActions}>
                      <button
                        className={styles.primaryBtn}
                        onClick={() => start(t.id)}
                        data-testid={`start-${i}`}
                      >
                        Start
                      </button>
                      <button
                        className={styles.ghostBtn}
                        onClick={() => later(t.id)}
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
            <button className={styles.ghostBtn} onClick={() => jump("calendar")}>
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
              {CAL_WEEK.map((d) => (
                <div
                  key={d.date}
                  className={`${styles.calDay} ${d.today ? styles.calDayToday : ""}`}
                >
                  <div className={styles.calDayLabel}>{d.day}</div>
                  <div className={styles.calDayNum}>{d.date}</div>
                  <div className={styles.calDots}>
                    {Array.from({ length: d.dots }).map((_, i) => (
                      <span key={i} className={styles.calDot} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.hline} />
            <ul className={styles.eventList}>
              <li className={styles.event}>
                <span className={styles.eventTime}>10:00 AM</span>
                <span className={styles.eventTitle}>MATH 220 Lecture</span>
                <span className={styles.eventTag}>class</span>
              </li>
              <li className={styles.event}>
                <span className={styles.eventTime}>1:00 PM</span>
                <span className={styles.eventTitle}>SOC 101 Lecture</span>
                <span className={styles.eventTag}>class</span>
              </li>
              <li className={styles.event}>
                <span className={styles.eventTime}>11:59 PM</span>
                <span className={styles.eventTitle}>Problem Set 3 due</span>
                <span className={styles.eventTag}>due</span>
              </li>
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
            <div className={styles.chatList} data-testid="chat-list">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.bubbleRow} ${
                    m.role === "user" ? styles.bubbleRowUser : ""
                  }`}
                >
                  <div
                    className={`${styles.bubble} ${
                      m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant
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
                  onClick={() => {
                    setChatInput(s);
                  }}
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
            {INTEGRATIONS.map((it) => (
              <li key={it.id} className={styles.connItem}>
                <div className={styles.connHead}>
                  <RakuLight size="tiny" />
                  <div>
                    <div className={styles.connName}>{it.name}</div>
                    <div className={styles.connSub}>{it.sub}</div>
                  </div>
                </div>
                <span className={styles.status}>{it.status}</span>
                <div className={styles.connActions}>
                  {it.id === "brightspace" ? (
                    <button className={styles.outlineBtn}>install extension</button>
                  ) : (
                    <button className={styles.primaryBtn}>sync now</button>
                  )}
                </div>
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
            <div className={styles.subSmall}>pick the color of your Raku light.</div>
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
        </footer>
      </main>
    </div>
  );
}
