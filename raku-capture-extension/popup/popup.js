import { getBaseUrl } from "../config.js";

const statusEl = document.getElementById("status");
const openAppEl = document.getElementById("openApp");
const openOptsEl = document.getElementById("openOptions");

(async () => {
  const url = await getBaseUrl();
  statusEl.innerHTML = `Sending captures to <strong>${escapeHtml(url)}</strong>`;
  if (openAppEl) openAppEl.href = url;
})();

openOptsEl?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[c]));
}
