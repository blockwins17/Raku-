# Raku — school feels lighter

A tiny AI friend for college students. Pulls your school work, picks what
matters next, and breaks it into gentle steps.

**Stack:** Next.js 14 App Router · TypeScript · AWS Amplify Gen 2 (Cognito
Auth + Amplify Data / AppSync / DynamoDB).

## Local dev

```bash
npm ci
npx ampx sandbox          # first time — generates amplify_outputs.json
npm run dev               # http://localhost:3000
```

> `npx ampx sandbox` spins up a personal Amplify cloud sandbox (DynamoDB
> tables + AppSync GraphQL + Cognito pool) and writes the required
> `amplify_outputs.json` to the project root. Keep that terminal open —
> schema changes hot-reload through it.

## Deploy

This repo is wired to **AWS Amplify Hosting**. Push to the connected branch
and Amplify builds both the backend (via `npx ampx pipeline-deploy`) and
the Next.js frontend (`npm run build`) using `amplify.yml`.

## Data model (`amplify/data/resource.ts`)

- **Task** — `title`, `course`, `dueAt`, `effortMin`, `importance`, `status`,
  `source`, `steps[]`
- **Event** — `title`, `course`, `startAt`, `endAt`, `kind`, `source`
- **Integration** — `integrationId`, `name`, `description`, `status`,
  `lastSyncAt`

All models use `allow.publicApiKey()` for v1 so the UI works without sign-in.
Switch to `allow.owner()` + Cognito groups to go per-user.

## UI (`app/page.tsx`)

One scrollable page with a left mini-nav:

- **Today** — ranked top 3 open tasks, Start / Later, today's schedule
- **Calendar** — 7-day strip, dot markers for busy days, today's events
- **Chat** — *"what now?"* — sample conversation + input (local state)
- **Connections** — Brightspace · Google Calendar · Notion tiles with
  live sync (Integration + Task/Event writes)
- **Settings** — accent color swatches, vibe picker, chat-channel teasers

Accent color + vibe persist in `localStorage`.

## Raku

Raku is a pulsing 3-by-3 block of light — no face, no mascot.
See `app/components/RakuLight.tsx`.

## Files

```
amplify/
  auth/resource.ts         Cognito email sign-in
  data/resource.ts         Task · Event · Integration models
  backend.ts               wires auth + data
app/
  page.tsx                 full Raku dashboard (client component)
  layout.tsx               Fraunces + Inter fonts, dark shell
  globals.css              CSS variables + reset
  app.css                  body shim
  page.module.css          dashboard styles
  components/
    RakuLight.tsx          pulsing block-light
    RakuLight.module.css
```
