# Raku UI — drop-in patch for `blockwins17/Raku-`

This folder contains only the files you need to **replace/add** in the
Amplify Gen 2 Next.js starter.  Framework, Amplify config, and build setup
are untouched — `amplify.yml`, `amplify/`, `package.json`, `next.config.js`,
`tsconfig.json` stay exactly as they are.

## Files

| Action  | Path in your repo                         | Source here                          |
| ------- | ----------------------------------------- | ------------------------------------ |
| Replace | `app/page.tsx`                            | `app/page.tsx`                       |
| Replace | `app/layout.tsx`                          | `app/layout.tsx`                     |
| Replace | `app/globals.css`                         | `app/globals.css`                    |
| Replace | `app/app.css`                             | `app/app.css` (minimal shim)         |
| Replace | `app/page.module.css`                     | `app/page.module.css`                |
| Add     | `app/components/RakuLight.tsx`            | `app/components/RakuLight.tsx`       |
| Add     | `app/components/RakuLight.module.css`     | `app/components/RakuLight.module.css`|

## One-shot copy (local, in your cloned repo)

```bash
# from the root of blockwins17/Raku-
RAKU_EXPORT=/path/to/raku_next_export

mkdir -p app/components
cp "$RAKU_EXPORT/app/page.tsx"            app/page.tsx
cp "$RAKU_EXPORT/app/layout.tsx"          app/layout.tsx
cp "$RAKU_EXPORT/app/globals.css"         app/globals.css
cp "$RAKU_EXPORT/app/app.css"             app/app.css
cp "$RAKU_EXPORT/app/page.module.css"     app/page.module.css
cp "$RAKU_EXPORT/app/components/RakuLight.tsx"        app/components/RakuLight.tsx
cp "$RAKU_EXPORT/app/components/RakuLight.module.css" app/components/RakuLight.module.css

git add app
git commit -m "feat(ui): Raku dashboard — dark, minimal, pulsing block-light"
git push
```

Amplify picks up the push automatically and redeploys.  No other files
change, so the Amplify Data (`amplify/data/resource.ts`) Todo model and
Cognito Auth config keep working exactly as before.

## What you get

- Dark background, off-white type, one user-pickable accent color (7 swatches).
- Raku is a 3-by-3 pulsing cube of blocks — CSS only, no mascot.
- Left mini-nav → **Today · Calendar · Chat · Connections · Settings**.
- All in one scrollable page (`app/page.tsx`), just like the prototype.
- Copy is short, warm, Gen-Z; no guilt-trips.
- Uses only `next/font` and `react` — no new npm dependencies needed.

## Font note

`layout.tsx` loads **Fraunces** (display) + **Inter** (body) from
`next/font/google`. Both are free and resolved at build time on Amplify — no
extra config required.

## Notes on the Amplify boilerplate

`app/page.tsx` keeps these three lines at the top:

```tsx
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
Amplify.configure(outputs);
```

This preserves the starter's build behavior — Amplify Hosting generates
`amplify_outputs.json` during the backend phase, so the import works in
production.  The Raku UI doesn't call any Amplify Data APIs yet (sample
tasks are local state), so the existing `Todo` model just sits there unused
until you wire it in.

## Local dev

```bash
# once
npm ci
npx ampx sandbox        # generates amplify_outputs.json for local dev

# every time
npm run dev
# → http://localhost:3000
```

If you skip `ampx sandbox`, `next dev` will complain about the missing
`amplify_outputs.json`. That's the same behavior as the stock starter.
