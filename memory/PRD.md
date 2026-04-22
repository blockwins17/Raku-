# Raku — Product Requirements Document

_Last updated: 2026-04-22 (iteration 2)_

## Original problem statement

> Raku is an AI academic OS for college students. Pulls school work from
> Brightspace (via extension), Google Calendar, Notion, and manual tasks.
> Decides what matters next, breaks it into tiny steps, keeps student gently
> on track. Design: black bg / white type / single accent / pulsing block-light.

## Personas

- **Jordan, 19, sophomore** — ADHD-adjacent, uses Raku in 5-minute bursts.
- **Sam, 22, senior** — juggles thesis + job apps.
- **Taylor, 20, transfer** — multi-campus, needs calendar + LMS merged.

## Architecture

| Layer         | Tech                                                 |
| ------------- | ---------------------------------------------------- |
| Web app       | React 19 + Tailwind + shadcn/ui                      |
| API           | FastAPI + motor/MongoDB                              |
| Auth          | Emergent-managed Google OAuth (cookie session)       |
| AI            | Claude Sonnet 4.5 via Emergent LLM key               |
| Google Cal    | google-auth + google-api-python-client (OAuth)       |
| Notion        | notion-client (workspace-scoped)                     |
| Scheduler     | APScheduler AsyncIO (30-min sync + daily check-in)   |
| Extension     | Chrome MV3, side panel + content script              |
| Container     | Dockerfile + docker-compose (mongo/backend/frontend) |
| Deploy        | amplify.yml + .github/workflows/ci.yml               |

## Core requirements (static)

1. Multi-user via Google login. Each user has isolated data keyed on `user_id`.
2. Tone: simple, short, Gen-Z, no guilt.
3. Raku = pulsing block-light only.
4. `/api/today` returns top 3 tasks scored by urgency + importance + effort.
5. Chat is per-user, per-conversation.
6. Integrations degrade to **mock** path when OAuth/token env vars are unset.
7. Background worker: 30-min per-user sync + daily 13:00 UTC nudge.

## Implemented (2026-04-22 · iteration 1)

- [x] Models, endpoints, chat, extension, 6 screens, demo-mode, 14/14 tests.

## Implemented (2026-04-22 · iteration 2)

- [x] Emergent Google Auth (session cookie + bearer fallback, auth_testing.md)
- [x] Google Calendar OAuth real flow (connect / callback, refresh_token stored,
      read-only events → Raku Events). Degrades to mock if env unset (503 on
      /oauth/google/connect).
- [x] Notion API real sync (async client, pagination, property parser). Degrades
      to mock if env unset.
- [x] APScheduler: `sync_all` every 30 min + `morning_checkin` cron @ 13:00 UTC.
- [x] Per-user data isolation verified (22/22 backend tests).
- [x] Login + AuthCallback routes, Protected wrapper, avatar + sign-out.
- [x] Dockerfile, docker-compose.yml, amplify.yml, CI workflow, README deploy
      guide.

## P0 backlog

1. Supply `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in
   prod `.env`.
2. Supply `NOTION_TOKEN` + `NOTION_TASKS_DB_ID` in prod `.env` (or migrate to
   per-user OAuth via `/notion/auth` — spec in README).
3. Push to GitHub via Emergent "Save to GitHub" button; deploy frontend to
   Amplify, backend to App Runner, Mongo Atlas.

## P1 backlog

1. Per-user timezone (currently UTC).  Morning nudge should fire at 8am
   _local_.
2. Expo mobile app reusing `/api`.
3. Chat channels: iMessage / WhatsApp / Telegram bridges.

## P2 backlog

1. Break big assignments into micro-steps spread across days.
2. Weekly recap email.
3. Spotify-style focus timer with Raku light.
