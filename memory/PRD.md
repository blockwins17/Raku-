# Raku — Product Requirements Document

_Last updated: 2026-04-22_

## Original problem statement

> Raku is an AI academic OS, not a planner. It pulls school work from
> Brightspace, Google Calendar, Notion and manual tasks, decides what matters
> next, breaks big work into tiny steps, and keeps students gently on track via
> web app + browser extension.
>
> Visual: black background, white type, single accent color, pulsing 3-by-3
> block-light as Raku's only "character". Sections: Today · Calendar · Chat ·
> Connections · Extension · Settings.

## Personas

- **Jordan, 19, sophomore** — ADHD-adjacent, uses Raku in 5-minute bursts
  between classes. Needs one clear "next thing".
- **Sam, 22, senior** — juggles thesis + job apps. Wants all their work in one
  calm surface.

## Architecture (what shipped)

| Layer       | Tech                                            |
| ----------- | ----------------------------------------------- |
| Web app     | React 19 + Tailwind + shadcn/ui                 |
| API         | FastAPI + motor/MongoDB, all routes under /api  |
| AI          | Claude Sonnet 4.5 via Emergent LLM key          |
| Extension   | Chrome MV3, side panel + content script (D2L)   |

## Core requirements (static)

1. Single-user demo instance (no auth). Room to upgrade to Emergent Google Auth.
2. Tone: simple, short, Gen-Z, never guilt-trips.
3. Raku = pulsing block-light. No face, no mascot.
4. `/api/today` returns top 3 tasks ranked by urgency + importance + inverse effort.
5. Chat remembers context per `conversation_id`.
6. Extension POSTs scanned Brightspace assignments to `/api/assignments/import`.

## Implemented (2026-04-22)

- [x] Backend: User, Task, Event, Integration, Message models in MongoDB.
- [x] Endpoints: /me, /today, /calendar, /tasks CRUD, /assignments/import,
      /integrations + sync/disconnect, /chat + /chat/{id}, /conversations.
- [x] Frontend: Today · Calendar · Chat · Connections · Extension preview · Settings.
- [x] Accent color swatches bound to CSS variables; vibe switches system prompt.
- [x] Chrome MV3 extension: side panel + content.js for D2L/Brightspace DOM scan.
- [x] Tests: 14/14 backend pytest + full e2e UI flow verified.

## P0 backlog (next)

1. Real Google Calendar OAuth (read-only).
2. Real Notion integration (query a tasks database).
3. Emergent Google Auth to enable multi-user.

## P1 backlog

1. Proactive nudges (background worker): detect new items, auto-slot into Today.
2. Expo mobile client reusing same API.
3. Chat channels: iMessage / WhatsApp / Telegram bridges.

## P2 backlog

1. Break big assignments into micro-steps distributed across days.
2. Spotify-style "focus mode" with timer + Raku light.
3. Per-course weekly summaries.
