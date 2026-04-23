# Changelog

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
