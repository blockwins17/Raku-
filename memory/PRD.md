# Kumo — PRD

**Product:** Kumo (Japanese for *cloud*) — a tiny AI cloud for college students with ADHD-adjacent brains. Float the hard stuff so they can finish it without drowning.
**Repo:** `blockwins17/Raku-`  ·  **Branch:** `raku-ui`
**Stack:** Next.js 14 (App Router) · Supabase (Postgres) · Vercel
**Extension:** Manifest V3 Chrome extension in `raku-capture-extension/` (folder name unchanged for now — user-visible strings all say "Kumo Capture")

## Routes
| Path           | Purpose |
|----------------|---------|
| `/`            | Landing page (hero, SMS QR, how-it-works, Kumo meaning, fake chat, Brightspace demo) |
| `/dashboard`   | Task dashboard (Today / Later / Completed) — Supabase-backed |
| `/api/ai/{explain,breakdown,plan,pause}` | 4 core AI modes |
| `/api/capture` | Chrome-extension webhook |

## Tone
Calm, Gen-Z friendly, never cringe. Short sentences. Normalize struggle. Always end toward ONE small concrete next step (5–15 min).

## Landing page components
- `app/components/TextKumoQR.tsx` — SMS QR + tap-to-text number (`DEMO_PHONE`).
- `app/components/BrightspaceDemo.tsx` — mock Brightspace assignment + live `/api/ai/explain` demo.
- `app/components/FakeChat.tsx` — static iMessage-style mock thread for video B-roll.

## Demo-video SMS flow
- `DEMO_PHONE` constant in `TextKumoQR.tsx` is a **placeholder 555 number**. The QR encodes `sms:+15555866000?&body=hi%20kumo`, which opens Messages on any modern iPhone / Android.
- The two-way chat ("Kumo texts back + a link to your laptop") is **visually faked** in `FakeChat.tsx` for now. To wire it for real, see *Backlog → SMS bot*.

## What's implemented (as of 2026-02)
- ✅ Full rebrand Raku → Kumo (UI strings, prompts, metadata, extension)
- ✅ New landing page at `/` — hero, 3 steps, SMS QR, Kumo meaning, fake chat, Brightspace live demo
- ✅ Dashboard moved to `/dashboard`
- ✅ All 5 AI/capture API routes still working; build passes
- ✅ Chrome extension rebranded (manifest name, popup, options, overlay strings)

## Backlog

### P0
- [ ] User shoots demo video. If the real SMS number is ready, swap `DEMO_PHONE` in `app/components/TextKumoQR.tsx`.

### P1 — real SMS bot (make the fake chat real)
- [ ] Register a Twilio / OpenPhone / Vonage number.
- [ ] Add `/api/sms/inbound` webhook → parses the message, calls `/api/ai/explain` or `/api/ai/breakdown`, texts back the response + a short `kumo.ai/c/:id` link.
- [ ] Session store (Supabase `sms_sessions` table) mapping phone # → chat id, so the link on laptop picks up the same conversation.

### P1 — ChatPanel in web app
- [ ] `<ChatPanel />` in `/dashboard` wired to `/api/ai/*` with mode toggle.
- [ ] Mini-timeline viz for `plan` response.
- [ ] Focus-session timer tied to `subtasks`.

### P1 — Supabase Auth
- [ ] Magic-link login, bind existing tables to `auth.uid()`, tighten RLS.

### P2
- [ ] Extension v1 — parse Brightspace assignment lists into structured items.
- [ ] Rename repo + extension folder to kumo (low priority; folder references are internal only).

## Constraints
- **Git push:** user clicks "Save to GitHub" in Emergent. No `git push`.
- **Target branch:** `raku-ui`.
- **No heavy AI SDKs** — pure `fetch` only.
- **Supabase-only.**
