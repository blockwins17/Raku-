# Raku — school feels lighter

A tiny AI friend for college students. Pulls your school work, picks what
matters next, and breaks it into gentle steps.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript
**Storage:** browser `localStorage` (no backend)
**Host:** Vercel

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

## Deploy to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Defaults are correct (Framework: **Next.js**, Build: `next build`, Output: `.next`).
4. No environment variables needed.

## What's inside

One scrollable page with a left mini-nav:

- **Today** — ranked top 3 tasks (urgency × importance ÷ effort), Start / Later,
  today's schedule.
- **Calendar** — 7-day strip, dot markers for busy days, today's events.
- **Chat** — *"what now?"* sample chat bubbles + input (local state).
- **Connections** — Brightspace · Google Calendar · Notion tiles that
  sync fake sample data into the UI.
- **Settings** — 7 accent-color swatches, 4 vibe presets, coming-soon
  chat channels.

All state (tasks, events, integrations, accent, vibe) persists in
`localStorage` — reload keeps your changes. Reset with
`localStorage.clear()` in the browser devtools console.

## Files

```
app/
  page.tsx             full Raku dashboard — pure React state
  layout.tsx           Fraunces + Inter fonts, dark shell
  globals.css          CSS variables + reset
  app.css              body shim
  page.module.css      dashboard styles
  components/
    RakuLight.tsx      pulsing 3×3 block-light (no mascot)
    RakuLight.module.css
```

## Design

- Dark background, off-white type, single user-pickable accent color.
- Raku is a pulsing 3-by-3 block of light — CSS only, no images.
- Copy: short, warm, Gen-Z. No guilt-trips. No lectures.

## Roadmap

- Real AI chat (currently local canned responses) — wire up an edge
  function (`app/api/chat/route.ts`) that proxies to Claude / OpenAI.
- Real integration syncs — add API routes that call Google Calendar /
  Notion / Brightspace from the server.
- Multi-user — add an auth layer (Clerk, Auth.js, or Supabase).
- Mobile app — Expo + same React component shapes.
