# Raku — AI Academic OS

> School feels lighter here.

Raku pulls school work from wherever it lives (Brightspace via a Chrome
extension, Google Calendar, Notion), picks what actually matters next, breaks
it into tiny steps, and keeps you gently on track — with proactive morning
check-ins and a background worker that keeps everything in sync.

| Piece              | Path               | Stack                                    |
| ------------------ | ------------------ | ---------------------------------------- |
| Web app            | `frontend/`        | React 19 + Tailwind + shadcn/ui          |
| Backend API        | `backend/`         | FastAPI + MongoDB (motor) + APScheduler  |
| Chrome ext (MV3)   | `extension/`       | Side panel + content script              |
| Container          | `Dockerfile`       | Python 3.11 slim, backend on :8001       |
| Local orchestration| `docker-compose.yml`| mongo + backend + frontend              |
| Amplify build      | `amplify.yml`      | Builds `frontend/` for AWS Amplify       |
| GitHub Actions     | `.github/workflows/ci.yml` | Lint + build on every PR         |

## What's inside

- **Multi-user auth** — Emergent-managed Google login (one-click, cookie
  session). `GET /api/auth/me`, `POST /api/auth/session`, `POST /api/auth/logout`.
- **Google Calendar** — real OAuth read-only sync; falls back to mock sample
  events if `GOOGLE_CLIENT_*` env vars aren’t set.
- **Notion** — real API sync of a tasks database; falls back to a mock sample
  if `NOTION_TOKEN` / `NOTION_TASKS_DB_ID` aren’t set.
- **Brightspace** — scanned via the MV3 Chrome extension which POSTs parsed
  assignments to `/api/assignments/import`.
- **Background worker** — every 30 minutes, sync Google + Notion for every
  user. Once a day at 13:00 UTC, drop a "gentle check-in" assistant message
  into each user's latest chat.
- **AI chat** — Claude Sonnet 4.5 via Emergent LLM key, system prompt tuned
  by the selected *vibe* (chill / hype / study / quiet).

## Local development

The preview environment is already running; supervisor manages both
services. If you change `.env` or install deps:

```bash
sudo supervisorctl restart backend frontend
```

### Run locally with Docker (recommended for your own machine)

```bash
cp backend/.env.example backend/.env   # if you keep an example file
docker compose up --build
# frontend → http://localhost:3000
# backend  → http://localhost:8001/api/
```

## Environment variables

`backend/.env`:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=sk-emergent-...

# Google Calendar (optional — mock is used until these are set)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://<your-domain>/api/oauth/google/callback

# Notion (optional — mock is used until these are set)
NOTION_TOKEN=
NOTION_TASKS_DB_ID=
```

`frontend/.env`:

```
REACT_APP_BACKEND_URL=https://<your-backend-host>
```

## API

All routes prefixed with `/api`. All protected except `/api/auth/*`.

| Method | Path                               | Purpose                                  |
| ------ | ---------------------------------- | ---------------------------------------- |
| POST   | `/auth/session`                    | Exchange Emergent `session_id` → cookie  |
| GET    | `/auth/me`                         | Current user                             |
| POST   | `/auth/logout`                     | Clear session                            |
| GET    | `/me` · PATCH `/me`                | Profile / settings                       |
| GET    | `/today`                           | Ranked top 3 tasks + today's events      |
| GET    | `/calendar`                        | Events + task due-dates                  |
| CRUD   | `/tasks`                           | Full CRUD                                |
| POST   | `/assignments/import`              | Bulk add (extension / Notion)            |
| GET    | `/integrations`                    | Per-user connections with status         |
| POST   | `/integrations/:id/sync`           | Pull fresh items                         |
| POST   | `/integrations/:id/disconnect`     | Disable an integration                   |
| GET    | `/oauth/google/connect`            | Kick off Google OAuth                    |
| GET    | `/oauth/google/callback`           | OAuth redirect target                    |
| POST   | `/chat` · GET `/chat/:id`          | Raku conversational AI                   |

## Going real — Google Calendar

1. **Cloud project** → https://console.cloud.google.com/ → new project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **OAuth consent screen** → External → add your email as a test user.
   Add scope `https://www.googleapis.com/auth/calendar.readonly`.
4. **Credentials → Create Credentials → OAuth client ID** (Web application).
   - Authorized JS origins: your frontend URL
   - Authorized redirect URI: `https://<backend-host>/api/oauth/google/callback`
5. Drop the values into `backend/.env` and restart the backend.
6. In-app: **Connections** → **connect Google** → follow the OAuth flow.

## Going real — Notion

1. Create an internal integration at
   https://www.notion.so/my-integrations.
2. Share your tasks database with the integration (database → **...** →
   *Add connections*).
3. Copy the database ID from the URL.
4. Add to `backend/.env`:
   ```
   NOTION_TOKEN=secret_...
   NOTION_TASKS_DB_ID=...
   ```
5. Restart backend. `POST /api/integrations/notion/sync` now pulls real pages.

## Chrome extension

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick
   `/extension`.
2. Open the side panel once and set **backend URL** (e.g. your preview URL +
   `/api`).
3. Visit any Brightspace course page → **scan this page** → **add all**.

## Pushing to GitHub

In the Emergent builder toolbar click **Save to GitHub** (top-right). That
creates a repo with everything in `/app`. Locally:

```bash
git clone <your-repo-url>
cd raku
```

## Deploying

### Frontend → AWS Amplify Hosting

1. AWS Amplify → **Host web app** → connect your GitHub repo.
2. Framework: **React**. Amplify auto-detects `amplify.yml` at repo root.
3. Add environment variable **`REACT_APP_BACKEND_URL`** pointing to your
   backend (the App Runner URL below).
4. Deploy. Each push to `main` rebuilds.

### Backend → AWS App Runner

1. Make sure `Dockerfile` at repo root builds cleanly:
   ```bash
   docker build -t raku-backend .
   ```
2. Push the image to ECR, or point App Runner at your GitHub repo.
3. In App Runner → **Create service**:
   - Source: your repo (or the ECR image).
   - Build: *Use existing Dockerfile*.
   - Port: **8001**.
   - Env vars: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `EMERGENT_LLM_KEY`,
     plus the OAuth / Notion vars when you have them.
4. Attach a managed MongoDB (MongoDB Atlas is simplest — paste the SRV URI
   into `MONGO_URL`).
5. After deploy, copy the App Runner URL and use it as
   `REACT_APP_BACKEND_URL` in Amplify.

### CI

`.github/workflows/ci.yml` lints + builds both sides on every PR.

## Design

- Black background. White type. One user-pickable accent color.
- Raku is a pulsing 3-by-3 block of light — no face, no mascot.
- Tone: simple, warm, Gen-Z. No guilt. No lectures.

## Screens

Today · Calendar · Chat · Connections · Extension · Settings · Login · AuthCallback.
