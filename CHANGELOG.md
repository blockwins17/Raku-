# Changelog

## 2026-02 — Raku Capture v0 + Deep AI chat backend

### Added — Chrome extension (`raku-capture-extension/`)
- **Manifest V3** extension. Floating black **R** bubble injected into every
  page via a Shadow-DOM content script (styles fully isolated from the page).
- **Overlay UI** with two actions:
  - *Organize assignments* → sends page text to Raku for Inbox.
  - *Explain this in simple terms* → shows a structured TL;DR,
    "What this wants from you", and "Key points" right in the overlay.
- Optional **Course name** field for tagging captures.
- **Options page** lets the user override the backend URL
  (stored in `chrome.storage.local`). Default: `https://raku.vercel.app`.
- Toolbar **popup** showing current backend URL + shortcuts.
- **Background service worker** funnels all `/api/capture` requests from the
  content script (avoids CORS and keeps creds out of the page).
- `npm run build:extension` zips the folder to `dist/raku-capture-extension.zip`.
- Custom PNG icons (16/32/48/128) generated in-repo.

### Added — Backend AI layer (`lib/ai/*`, `app/api/*`)
- Pure-`fetch` LLM provider in `lib/ai/provider.ts`. Anthropic Claude preferred
  (better ADHD-friendly tone); OpenAI `gpt-4o-mini` fallback. If no keys are
  set, all endpoints return realistic **stubbed JSON** so the UI never breaks.
- Raku tone prompt + per-mode system prompts in `lib/ai/prompts.ts`.
- Mode handlers: `explain.ts`, `breakdown.ts`, `plan.ts`, `burnout.ts`.
- Route handlers:
  - `POST /api/ai/explain`    → `{ mode, summary, whatToDo[], keyPoints[] }`
  - `POST /api/ai/breakdown`  → `{ mode, subtasks[], totalMinutes }`
  - `POST /api/ai/plan`       → `{ mode, windowMinutes, blocks[] }`
  - `GET/POST /api/ai/pause`  → burnout killswitch, upserts `user_state`
  - `POST /api/capture`       → extension webhook; supports both modes +
    CORS preflight.

### Schema (`supabase-schema.sql`)
- Added idempotent DDL for `subtasks`, `capture_raw`, `user_state` (on top of
  existing `tasks`). RLS enabled; anon policies open for v0 — tighten when
  real auth is added.

### Verified
- `npm run build` passes. All 5 API routes compile as dynamic server routes.
- Local curl against each route (stub mode) returns the documented shape.
- CORS preflight (`OPTIONS /api/capture`) returns 204 with `*`.
- Extension packs into a valid `.zip` (17 KB).

---

## Unreleased

### Removed
- **AWS Amplify, completely.**
  - Deleted `amplify/` folder (backend + auth + data models).
  - Deleted `amplify_outputs.json`.
  - Deleted `amplify.yml`.
  - Removed `aws-amplify`, `@aws-amplify/*`, `aws-cdk*`, `constructs`,
    `esbuild`, `tsx` from `package.json`.
  - Removed `Amplify.configure(outputs)` and `generateClient<Schema>()`
    calls from `app/page.tsx`.

### Changed
- `app/page.tsx` is now a pure React component. All data (tasks, events,
  integrations, accent, vibe) lives in `useState` and persists to
  `localStorage`. No AWS dependencies, no network calls, no build-time
  backend required.
- `package.json` slimmed down to just `next`, `react`, `react-dom`, and
  the typing packages.
- `package-lock.json` regenerated to match the new, smaller dependency
  tree.
- `README.md` rewritten for the Vercel-only, pure-React setup.
- `.gitignore` simplified (dropped all Amplify-related rules).

### Notes
- Reset the local state in the browser devtools: `localStorage.clear()`.
- The UI is identical to before — only the persistence layer changed.
