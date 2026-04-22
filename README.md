# Raku — AI Academic OS

> School feels lighter here.

Raku pulls your school work from wherever it lives (Brightspace via the Chrome
extension, Google Calendar, Notion), picks what actually matters next, breaks it
into tiny steps, and keeps you gently on track.

This repo contains:

| Piece           | Path             | Stack                               |
| --------------- | ---------------- | ----------------------------------- |
| Web app         | `frontend/`      | React 19 + Tailwind + shadcn/ui     |
| Backend API     | `backend/`       | FastAPI + MongoDB (motor) + Claude  |
| Chrome ext (v3) | `extension/`     | Manifest v3 + side panel + content  |

## Local dev

The preview environment already has everything running.

- Frontend: auto-served on port 3000 (see `frontend/.env` for the public URL).
- Backend: supervisor-managed on `0.0.0.0:8001`.
- Mongo: shipped locally; `MONGO_URL` is preconfigured.

Restart services after editing `.env` or installing deps:

```bash
sudo supervisorctl restart backend frontend
```

## API

All routes are prefixed with `/api`.

| Method | Path                                    | Purpose                               |
| ------ | --------------------------------------- | ------------------------------------- |
| GET    | `/api/me`                               | Demo user (single local profile)      |
| PATCH  | `/api/me`                               | Update name / pronouns / vibe / accent|
| GET    | `/api/today`                            | Ranked top 3 tasks + today’s events   |
| GET    | `/api/calendar`                         | Events + task due-date markers        |
| CRUD   | `/api/tasks`                            | Task CRUD                             |
| POST   | `/api/assignments/import`               | Bulk add (used by extension & Notion) |
| GET    | `/api/integrations`                     | List connections                      |
| POST   | `/api/integrations/:id/sync`            | Pull fresh items                      |
| POST   | `/api/integrations/:id/disconnect`      | Turn off an integration               |
| POST   | `/api/chat`                             | Talk to Raku (Claude Sonnet 4.5)      |
| GET    | `/api/chat/:conversation_id`            | Replay a conversation                 |

## AI

Chat uses **Claude Sonnet 4.5** via the Emergent LLM key, with a system prompt
that switches tone based on your chosen *vibe* (chill / hype / study / quiet)
and includes your open tasks for context.

## Adding real integrations

Currently **Google Calendar** and **Notion** ship as _mock_ connections that
add realistic sample data on `sync`. To go live:

### Google Calendar (read-only)

1. Create an OAuth client in Google Cloud Console (Web, scope
   `https://www.googleapis.com/auth/calendar.readonly`).
2. Add the following to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://<your-domain>/api/oauth/google/callback
   ```
3. Implement the OAuth callback in `backend/server.py` and replace the mock
   body of `sync_integration("google_calendar")` with a real Calendar API call.

### Notion

1. Create an internal integration at
   https://www.notion.so/my-integrations, share your tasks database with it.
2. Add to `backend/.env`:
   ```
   NOTION_TOKEN=secret_...
   NOTION_TASKS_DB_ID=...
   ```
3. Replace the Notion branch in `sync_integration()` with a call to
   `https://api.notion.com/v1/databases/{db}/query`.

## Chrome extension

The extension lives in `/extension`.

1. Visit `chrome://extensions`.
2. Toggle **Developer mode**.
3. Click **Load unpacked** → select `/extension`.
4. Open the extension once and set the **backend URL** (e.g. your preview URL
   `https://<preview>.preview.emergentagent.com/api`).
5. Navigate to any Brightspace course page, open the Raku side panel, hit
   **scan this page**, then **add all**.

What happens under the hood:

- `content.js` reads assignment titles + due dates from the DOM.
- The side panel POSTs them to `/api/assignments/import`.
- They appear instantly in **Today** and **Calendar**.

## Deploy on AWS Amplify

### Frontend

1. Push the repo to GitHub.
2. In AWS Amplify Hosting → **Host web app** → connect the repo.
3. Set base directory to `frontend/`, build command `yarn build`, publish
   directory `build/`.
4. Add env var `REACT_APP_BACKEND_URL` pointing at your deployed backend.

### Backend

Amplify Hosting is static-only, so host the FastAPI backend somewhere else:

- Containerise (the repo includes everything you need) and deploy to AWS App
  Runner, Fargate, or Lightbox Containers.
- Point Amplify’s `REACT_APP_BACKEND_URL` at that API.

## Design

- Black background. White type. Single accent color (user-pickable).
- Raku is a pulsing 3-by-3 block of light — no face, no mascot.
- Tone: short, warm, Gen-Z. No guilt, no lectures.

## Screens

- **Today** — the greeting, 1–3 ranked tasks, Start / Later, mini schedule.
- **Calendar** — month grid + day detail, with Raku-dot on busy days.
- **Chat** — conversational interface, suggestion chips, streaming feel.
- **Connections** — Brightspace · Google Calendar · Notion cards.
- **Extension** — install guide + mock side-panel preview.
- **Settings** — accent swatches, vibe picker, profile, chat channels.

## Next

1. Swap mocks → real OAuth flows for Google + Notion.
2. Expo mobile client that reuses the same `/api`.
3. Scheduled background worker to proactively drop tasks into Today.
