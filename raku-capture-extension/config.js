/*
 * Raku Capture — config.
 * The extension POSTs to `${BASE_URL}/api/capture`.
 * The Options page lets the user override BASE_URL and save it in chrome.storage.
 */

export const DEFAULT_BASE_URL = "https://raku.vercel.app";

/**
 * Read the active base URL (user override in chrome.storage, else default).
 * Works in service worker, popup, options, and content-script contexts.
 */
export async function getBaseUrl() {
  try {
    const { rakuBaseUrl } = await chrome.storage.local.get("rakuBaseUrl");
    const v = typeof rakuBaseUrl === "string" ? rakuBaseUrl.trim() : "";
    return (v || DEFAULT_BASE_URL).replace(/\/+$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export async function setBaseUrl(url) {
  await chrome.storage.local.set({ rakuBaseUrl: url });
}
