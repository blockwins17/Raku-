# Changelog

## Unreleased

### Fixed
- Amplify backend build failing with "no package-lock.json in amplify/"
  → Added `amplify/package-lock.json` (empty lockfile matching
    `amplify/package.json`) and populated `amplify/package.json` with
    `name` + `version` fields so `npm ci` inside `amplify/` succeeds.
- `.gitignore` cleaned up (removed duplicated credential blocks, added
  `**/node_modules/` and `yarn.lock` to the ignore list).
