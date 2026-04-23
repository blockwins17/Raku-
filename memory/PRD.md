# Raku — PRD

**Product:** Raku — an AI academic OS for college students, built for ADHD-adjacent brains.
**Repo:** `blockwins17/Raku-`  ·  **Branch:** `raku-ui`
**Stack:** Next.js 14 (App Router) · Supabase (Postgres) · Vercel
**Extension:** Manifest V3 Chrome extension (`raku-capture-extension/`)

## Tone (applies to all AI output)
- Calm, Gen-Z friendly, never cringe, never shaming.
- Short sentences. No productivity jargon.
- Normalize struggle ("school is a lot, you're not the problem").
- Always end toward ONE small concrete next step (5–15 min).

## Core surfaces

### 1. Web app (Today / Later / Completed)
- Tasks stored in Supabase (`tasks` table).
- Optimistic UI with rollback on error.
- Friendly empty / error / "backend not configured" states.

### 2. Deep AI chat modes (backend)
- `POST /api/ai/explain` → `{ summary, whatToDo[], keyPoints[] }`
- `POST /api/ai/breakdown` → `{ subtasks[], totalMinutes }` (5–20 min each, max 8)
- `POST /api/ai/plan` → `{ windowMinutes, blocks[] }` (10–25 min blocks, 5-min gaps)
- `GET/POST /api/ai/pause` → burnout killswitch (pauses until end of local day)

### 3. Chrome extension — Raku Capture v0
- Floating **R** bubble on every page (Shadow-DOM isolated).
- Overlay with *Organize assignments* + *Explain this in simple terms*.
- Captures `document.innerText` + URL + optional course name.
- POSTs via service worker to `${BASE_URL}/api/capture`.
- Default base URL: `https://raku.vercel.app`, overridable in Options page.

## Data model

| Table         | Fields |
|---------------|--------|
| `tasks`       | id, user_id, title, status (`today|later|completed`), created_at |
| `subtasks`    | id, parent_task_id, title, estimated_minutes, status, order_index |
| `capture_raw` | id, user_id, mode, source, url, course_name, raw_text, created_at |
| `user_state`  | id, user_id (unique), pause_until, pause_reason, updated_at |

All tables have RLS enabled with permissive anon policies for v0.
**P1 work:** tighten when Supabase Auth is wired in.

## AI integration
- `lib/ai/provider.ts` — pure `fetch` wrapper.
  - **Primary:** Anthropic Claude Sonnet (`claude-sonnet-4-5-20250929`) via `ANTHROPIC_API_KEY`.
  - **Fallback:** OpenAI `gpt-4o-mini` via `OPENAI_API_KEY`.
  - **No keys set** → realistic stubbed JSON (prod UI never breaks).
- Prompts centralized in `lib/ai/prompts.ts`.
- Set keys in Vercel → Project → Environment Variables. No code change required.

## What's implemented (as of 2026-02)
- ✅ Task UI wired to Supabase
- ✅ All 5 AI/capture API routes + handlers + prompts
- ✅ Chrome extension (bubble, overlay, options, popup, icons, zip builder)
- ✅ `npm run build` passes
- ✅ Local curl tests pass for all 5 routes (stub + real modes)

## Backlog (priority order)

### P0 — verification
- [ ] User loads unpacked extension in Chrome + tests both modes end-to-end against their Vercel URL.

### P1 — make the web app chat live
- [ ] Wire a `<ChatPanel />` in `app/page.tsx` that calls `/api/ai/*` endpoints.
  - Mode selector (Explain / Break down / Plan / Recover).
  - Render structured responses (bullets / subtasks / time blocks).
  - "Recover" button toggles `/api/ai/pause`.
- [ ] Render a visual mini-timeline for the `plan` response (blocks on a bar).
- [ ] Focus-session timer using the subtasks list.

### P1 — real auth
- [ ] Swap anonymous mode for Supabase Auth (email magic link).
- [ ] Scope all existing tables by `auth.uid()` and tighten RLS policies.
- [ ] Bind `user_state.user_id` to the real auth UID (replace the `SOLO_USER_KEY` hack in `app/api/ai/pause/route.ts`).

### P2 — extension v1
- [ ] Auto-extract assignment list from a Brightspace "Assignments" page
      and send a structured list (not just raw text).
- [ ] Side panel view (`chrome.sidePanel`) for full chat inside the browser.
- [ ] Login button that mirrors the web-app session cookie.

## Constraints / gotchas
- **Git push:** user clicks "Save to GitHub" in Emergent — do NOT run `git push`.
- **Target branch:** `raku-ui` (not `main`).
- **No heavy AI SDKs** — pure `fetch` only.
- **Supabase-only** — no AWS Amplify, no MongoDB, no FastAPI.
