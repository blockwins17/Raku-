# Kumo — your AI cloud for school

**Kumo** (Japanese for *cloud*) is a tiny AI friend for college students with ADHD-ish brains. Text it, scan your Brightspace pages, and watch big scary stuff turn into small 10-minute things. No signup. No shame.

**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Vercel
**Extension:** Chrome Manifest V3 — see [`raku-capture-extension/`](./raku-capture-extension)

> The extension folder is still named `raku-capture-extension/` for now. Rename when convenient — nothing references it externally.

## Routes

| Path           | What it is                                                        |
|----------------|-------------------------------------------------------------------|
| `/`            | Landing page — hero, SMS QR, "how it works", Brightspace demo     |
| `/dashboard`   | Today / Later / Completed task dashboard (backed by Supabase)     |
| `/api/ai/*`    | 4 AI modes: explain, breakdown, plan, pause (burnout killswitch)  |
| `/api/capture` | Extension webhook — accepts `organize_assignments` & `explain_simple` |

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Environment variables (Vercel)

| Var                              | Required | What it does                                 |
|----------------------------------|----------|----------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`       | yes      | Your Supabase project URL                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | yes      | Anon public key                              |
| `ANTHROPIC_API_KEY`              | no*      | Claude Sonnet (preferred for ADHD-tone AI)   |
| `OPENAI_API_KEY`                 | no*      | `gpt-4o-mini` fallback                       |

\* If neither AI key is set, all `/api/ai/*` endpoints return realistic stubbed JSON so nothing breaks in the UI.

## Supabase schema

Run [`supabase-schema.sql`](./supabase-schema.sql) once in the Supabase SQL editor. It's idempotent — safe to re-run.

Tables: `tasks`, `subtasks`, `capture_raw`, `user_state`. All with RLS on + open anon policies for v0.

## Chrome extension

See [`raku-capture-extension/README.md`](./raku-capture-extension/README.md) for load instructions. `npm run build:extension` inside that folder produces `dist/raku-capture-extension.zip` ready for the Chrome Web Store.
