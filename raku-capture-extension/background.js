/*
 * Raku Capture — background service worker.
 * The content script cannot cleanly reach cross-origin APIs without CORS, so
 * we funnel all /api/capture POSTs through the service worker via
 * chrome.runtime.sendMessage. This also lets us keep the API URL in one place.
 */

import { getBaseUrl } from "./config.js";

chrome.runtime.onInstalled.addListener(() => {
  // nothing to migrate for v0
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "RAKU_CAPTURE") {
    handleCapture(msg.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message ?? err) }));
    return true; // keep the message channel open for async response
  }
  return false;
});

async function handleCapture(payload) {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/api/capture`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!r.ok) {
    const msg = json?.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return json;
}
