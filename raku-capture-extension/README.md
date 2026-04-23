# Raku Capture — v0.1.0 (Chrome Extension)

A tiny floating **R** bubble on every page. One click →

- **Organize assignments** → send what's on the page to your Raku app's Inbox.
- **Explain this in simple terms** → show a TL;DR, what the page is asking you to do, and the key points.

Built for Raku, an academic OS for college students with ADHD-adjacent brains. No tracking, no background snooping, no data sent unless you click a button.

---

## Install (unpacked, for dev)

1. Clone or pull this repo.
2. In Chrome, open **chrome://extensions**.
3. Toggle **Developer mode** (top-right).
4. Click **Load unpacked** → select the `raku-capture-extension/` folder.
5. The **R** bubble should now appear on most pages.

> No build step is required. The extension is plain ES modules + static assets. "Build" for this v0 is just zipping the folder (see below).

---

## Configure

The extension posts captures to `${BASE_URL}/api/capture`.

- **Default:** `https://raku.vercel.app` (update via Options if your Vercel URL is different).
- **Change it:** click the extension icon in the Chrome toolbar → **Change backend URL**, or visit **chrome://extensions → Raku Capture → Details → Extension options**.
- Stored in `chrome.storage.local` as `rakuBaseUrl`.

---

## Usage

1. Open any page — a Brightspace assignment, a syllabus PDF viewer, a Wikipedia article, anything.
2. Click the **R** bubble in the bottom-right corner.
3. (Optional) Type a course tag like `HIST 101`.
4. Choose:
   - **Organize assignments** → page text is saved to your Raku Inbox as a raw capture.
   - **Explain this in simple terms** → Raku returns a structured explanation shown right in the overlay.
5. **Esc** or the **×** button closes the overlay.

---

## Scripts

```bash
# Package the extension into a .zip you can upload to Chrome Web Store.
npm run build:extension
```

This produces `dist/raku-capture-extension.zip` at the repo root.

---

## What it sends

When you click a button, the extension POSTs this JSON to `${BASE_URL}/api/capture`:

```json
{
  "mode": "organize_assignments",   // or "explain_simple"
  "url": "https://<current page>",
  "courseName": "HIST 101",          // or null
  "rawText": "<visible text, capped at 40k chars>",
  "source": "extension_v0"
}
```

The request goes through the extension's **background service worker**, so there are no CORS issues and the content script never touches your Supabase creds.

---

## File map

```
raku-capture-extension/
├── manifest.json          Manifest V3
├── background.js          Service worker — fetches /api/capture
├── config.js              Base-URL helpers (chrome.storage backed)
├── content/
│   ├── content.js         Floating bubble + overlay (Shadow DOM isolated)
│   └── content.css        (intentionally empty — all styles are scoped)
├── popup/                 Toolbar popup (status + open options)
├── options/               Settings page for backend URL
├── icons/                 16/32/48/128 PNGs
└── README.md
```

---

## Permissions (and why)

- `activeTab` — so we can read the visible page text *only when you click*.
- `storage` — to remember your custom backend URL.
- `scripting` — reserved for future re-injection on navigation-without-reload LMS pages.
- `host_permissions: <all_urls>` — the bubble lives on every site. Content script never calls external APIs directly; all network goes through the service worker.

No analytics. No telemetry. No remote code.
