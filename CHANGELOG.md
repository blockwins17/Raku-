# Changelog

## Unreleased

### Added
- `amplify_outputs.json` placeholder at repo root (`{version:"1", auth:{}, data:{}}`)
  so Vercel builds can resolve the `import outputs from "@/amplify_outputs.json"`
  statement in `app/page.tsx`.

### Changed
- `app/page.tsx` now auto-detects whether Amplify Data is actually available:
  - If `amplify_outputs.json.data.url` is a string → connect to AppSync as before.
  - If it's empty (Vercel / placeholder) → fall back to `useState` + `localStorage`.
  The UI is identical in both modes. Start/Later/Sync still work; they just
  persist to the browser instead of DynamoDB.
- `.gitignore` no longer excludes `amplify_outputs.json` (we intentionally
  commit the placeholder for Vercel).

### Fixed
- Amplify/Vercel builds crashing with `Cannot find module '@/amplify_outputs.json'`.
- Amplify backend phase failure due to missing `amplify/package-lock.json`
  (added an empty lockfile matching `amplify/package.json`).
