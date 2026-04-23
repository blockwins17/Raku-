/*
 * Raku Capture — content script.
 * Injects a small floating "R" bubble in the bottom-right of every page.
 * Click → opens an overlay with two actions:
 *   • Organize assignments   → POST /api/capture  { mode: "organize_assignments" }
 *   • Explain in simple terms → POST /api/capture  { mode: "explain_simple" }
 *
 * This file runs in the page's isolated world (no module imports).
 * It talks to the service worker via chrome.runtime.sendMessage to avoid CORS headaches.
 */

(() => {
  if (window.__rakuCaptureInjected) return;
  window.__rakuCaptureInjected = true;

  // Don't inject inside iframes.
  if (window.top !== window.self) return;

  const ROOT_ID = "raku-capture-root";
  if (document.getElementById(ROOT_ID)) return;

  /* ───────── host + shadow root (so page CSS can't leak in) ───────── */
  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647"; // max
  host.style.bottom = "20px";
  host.style.right = "20px";
  host.style.width = "0";
  host.style.height = "0";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  /* ───────── styles (scoped inside shadow DOM) ───────── */
  const style = document.createElement("style");
  style.textContent = CSS_TEXT();
  shadow.appendChild(style);

  /* ───────── bubble ───────── */
  const bubble = document.createElement("button");
  bubble.className = "raku-bubble";
  bubble.setAttribute("aria-label", "Open Raku Capture");
  bubble.title = "Raku Capture";
  bubble.textContent = "R";
  shadow.appendChild(bubble);

  /* ───────── panel (hidden until bubble is clicked) ───────── */
  const panel = document.createElement("div");
  panel.className = "raku-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Raku Capture");
  panel.hidden = true;
  panel.innerHTML = `
    <div class="raku-panel-head">
      <div class="raku-brand">
        <span class="raku-dot"></span>
        <span>Raku Capture</span>
      </div>
      <button class="raku-close" aria-label="Close">×</button>
    </div>

    <div class="raku-panel-body" data-view="home">
      <!-- HOME VIEW -->
      <div class="raku-view raku-view-home">
        <label class="raku-field">
          <span class="raku-label">Course (optional)</span>
          <input
            type="text"
            class="raku-input"
            placeholder="e.g. HIST 101"
            autocomplete="off"
          />
        </label>

        <button class="raku-btn raku-btn-primary" data-action="organize">
          <span class="raku-btn-title">Organize assignments</span>
          <span class="raku-btn-sub">Send this page to Raku</span>
        </button>

        <button class="raku-btn raku-btn-ghost" data-action="explain">
          <span class="raku-btn-title">Explain this in simple terms</span>
          <span class="raku-btn-sub">TL;DR + what to do</span>
        </button>

        <p class="raku-footnote">
          Raku reads the visible text on this page. No background snooping.
        </p>
      </div>

      <!-- LOADING VIEW -->
      <div class="raku-view raku-view-loading" hidden>
        <div class="raku-spinner" aria-hidden="true"></div>
        <p class="raku-loading-text">reading the page…</p>
      </div>

      <!-- RESULT VIEW -->
      <div class="raku-view raku-view-result" hidden>
        <div class="raku-result"></div>
        <button class="raku-btn raku-btn-ghost raku-btn-back" data-action="back">Back</button>
      </div>

      <!-- ERROR VIEW -->
      <div class="raku-view raku-view-error" hidden>
        <div class="raku-error-text"></div>
        <button class="raku-btn raku-btn-ghost" data-action="back">Try again</button>
      </div>
    </div>
  `;
  shadow.appendChild(panel);

  /* ───────── wiring ───────── */
  const courseInput = panel.querySelector(".raku-input");
  const body = panel.querySelector(".raku-panel-body");
  const views = {
    home:    panel.querySelector(".raku-view-home"),
    loading: panel.querySelector(".raku-view-loading"),
    result:  panel.querySelector(".raku-view-result"),
    error:   panel.querySelector(".raku-view-error"),
  };

  function showView(name) {
    for (const [k, el] of Object.entries(views)) {
      el.hidden = k !== name;
    }
    body.setAttribute("data-view", name);
  }

  function openPanel() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("raku-panel-open"));
    courseInput?.focus({ preventScroll: true });
  }
  function closePanel() {
    panel.classList.remove("raku-panel-open");
    setTimeout(() => {
      panel.hidden = true;
      showView("home");
    }, 160);
  }

  bubble.addEventListener("click", () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  panel.querySelector(".raku-close")?.addEventListener("click", closePanel);

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "organize") runCapture("organize_assignments");
    else if (action === "explain") runCapture("explain_simple");
    else if (action === "back") showView("home");
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  /* ───────── capture flow ───────── */
  async function runCapture(mode) {
    showView("loading");
    const loadingText = panel.querySelector(".raku-loading-text");
    if (loadingText) {
      loadingText.textContent = mode === "explain_simple"
        ? "making it small…"
        : "sending to Raku…";
    }

    const rawText = getVisibleText().slice(0, 40000);
    const courseName = (courseInput?.value || "").trim() || null;

    if (!rawText || rawText.length < 20) {
      return showError("this page doesn't have much readable text. try scrolling first, then tap me again.");
    }

    const payload = {
      mode,
      url: window.location.href,
      courseName,
      rawText,
      source: "extension_v0",
    };

    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: "RAKU_CAPTURE", payload });
    } catch (err) {
      return showError(`couldn't reach Raku: ${err?.message ?? err}`);
    }
    if (!resp) return showError("no response from Raku. try again?");
    if (!resp.ok) return showError(resp.error || "something went wrong. try again?");

    const data = resp.data;

    if (mode === "organize_assignments") {
      return showResultHTML(`
        <h3 class="raku-h3">Sent to Raku</h3>
        <p class="raku-p">I'll organize this for you. check your Inbox in the Raku app soon.</p>
      `);
    }

    // explain_simple → render structured explanation
    const exp = data?.explanation;
    if (!exp) return showError("Raku didn't return an explanation. try again?");

    const summary   = String(exp.summary ?? "");
    const whatToDo  = Array.isArray(exp.whatToDo)  ? exp.whatToDo.map(String)  : [];
    const keyPoints = Array.isArray(exp.keyPoints) ? exp.keyPoints.map(String) : [];

    showResultHTML(`
      <div class="raku-section">
        <div class="raku-eyebrow">TL;DR</div>
        <p class="raku-p">${esc(summary) || "<em>no summary</em>"}</p>
      </div>

      <div class="raku-section">
        <div class="raku-eyebrow">What this wants from you</div>
        ${whatToDo.length
          ? `<ul class="raku-list">${whatToDo.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
          : `<p class="raku-p raku-muted">nothing specific jumped out.</p>`}
      </div>

      <div class="raku-section">
        <div class="raku-eyebrow">Key points</div>
        ${keyPoints.length
          ? `<ul class="raku-list">${keyPoints.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
          : `<p class="raku-p raku-muted">nothing specific jumped out.</p>`}
      </div>
    `);
  }

  function showResultHTML(html) {
    const slot = panel.querySelector(".raku-result");
    if (slot) slot.innerHTML = html;
    showView("result");
  }

  function showError(message) {
    const slot = panel.querySelector(".raku-error-text");
    if (slot) slot.textContent = message;
    showView("error");
  }

  /* ───────── get visible text from the page ───────── */
  function getVisibleText() {
    // Prefer <main>, <article>, or common LMS content wrappers if present.
    const candidates = [
      document.querySelector("main"),
      document.querySelector("article"),
      document.querySelector("[role='main']"),
      document.querySelector(".d2l-htmlblock, .d2l-page-main, #d2l_body"), // Brightspace hints
      document.body,
    ];
    const node = candidates.find((n) => n && textOf(n).trim().length > 200) ?? document.body;
    return textOf(node);
  }

  function textOf(node) {
    if (!node) return "";
    // innerText respects visibility/line breaks better than textContent
    const t = /** @type {HTMLElement} */ (node).innerText;
    return (t || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ───────── CSS ───────── */
  function CSS_TEXT() { return `
    :host, .raku-bubble, .raku-panel, .raku-panel *, .raku-panel *::before, .raku-panel *::after {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      line-height: 1.4;
      color: #f5f5f2;
    }

    .raku-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #0a0a0a;
      color: #f5f5f2;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.2);
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .raku-bubble:hover {
      transform: translateY(-1px);
      border-color: #8BE3B4;
      box-shadow: 0 10px 28px rgba(0,0,0,0.4), 0 0 0 3px rgba(139,227,180,0.15);
    }
    .raku-bubble:active { transform: translateY(0); }

    .raku-panel {
      position: fixed;
      bottom: 84px;
      right: 20px;
      width: 340px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      background: #07070a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      box-shadow: 0 18px 48px rgba(0,0,0,0.45);
      opacity: 0;
      transform: translateY(8px) scale(0.98);
      transition: opacity 0.18s ease, transform 0.18s ease;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .raku-panel.raku-panel-open {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .raku-panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .raku-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
    .raku-dot {
      width: 8px; height: 8px; border-radius: 2px;
      background: #8BE3B4;
      box-shadow: 0 0 10px rgba(139,227,180,0.55);
      transform: rotate(45deg);
    }
    .raku-close {
      background: transparent;
      border: 0;
      color: rgba(245,245,242,0.5);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .raku-close:hover { color: #f5f5f2; background: rgba(255,255,255,0.05); }

    .raku-panel-body { padding: 16px; overflow-y: auto; }

    .raku-field {
      display: block;
      margin-bottom: 14px;
    }
    .raku-label {
      display: block;
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(245,245,242,0.38);
      margin-bottom: 6px;
    }
    .raku-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: #f5f5f2;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .raku-input:focus { border-color: #8BE3B4; }

    .raku-btn {
      display: block;
      width: 100%;
      text-align: left;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
      color: #f5f5f2;
      cursor: pointer;
      margin-bottom: 10px;
      transition: border-color 0.15s ease, background 0.15s ease, transform 0.08s ease;
    }
    .raku-btn:hover { border-color: rgba(139,227,180,0.5); background: rgba(255,255,255,0.04); }
    .raku-btn:active { transform: translateY(1px); }
    .raku-btn-title {
      display: block;
      font-size: 14px;
      font-weight: 500;
    }
    .raku-btn-sub {
      display: block;
      font-size: 11px;
      color: rgba(245,245,242,0.5);
      margin-top: 3px;
    }
    .raku-btn-primary { border-color: rgba(139,227,180,0.35); background: rgba(139,227,180,0.06); }
    .raku-btn-ghost { }
    .raku-btn-back { margin-top: 12px; }

    .raku-footnote {
      font-size: 11px;
      color: rgba(245,245,242,0.35);
      margin-top: 6px;
      line-height: 1.5;
    }

    /* loading */
    .raku-view-loading {
      padding: 28px 12px;
      text-align: center;
    }
    .raku-spinner {
      width: 22px; height: 22px; margin: 0 auto 12px;
      border: 2px solid rgba(255,255,255,0.15);
      border-top-color: #8BE3B4;
      border-radius: 50%;
      animation: raku-spin 0.9s linear infinite;
    }
    @keyframes raku-spin { to { transform: rotate(360deg); } }
    .raku-loading-text { font-size: 13px; color: rgba(245,245,242,0.6); }

    /* result */
    .raku-section { margin-bottom: 14px; }
    .raku-section:last-child { margin-bottom: 6px; }
    .raku-eyebrow {
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(245,245,242,0.45);
      margin-bottom: 6px;
    }
    .raku-h3 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .raku-p  { font-size: 13px; color: rgba(245,245,242,0.85); }
    .raku-muted { color: rgba(245,245,242,0.45); }
    .raku-list {
      margin: 0; padding: 0; list-style: none;
    }
    .raku-list li {
      position: relative;
      padding-left: 14px;
      margin-bottom: 4px;
      font-size: 13px;
      color: rgba(245,245,242,0.85);
    }
    .raku-list li::before {
      content: ""; position: absolute;
      left: 0; top: 8px;
      width: 4px; height: 4px; border-radius: 1px;
      background: #8BE3B4;
    }

    /* error */
    .raku-view-error { padding: 6px 2px; }
    .raku-error-text {
      font-size: 13px;
      color: #F28FAD;
      background: rgba(242,143,173,0.08);
      border: 1px solid rgba(242,143,173,0.4);
      padding: 10px 12px;
      border-radius: 10px;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    @media (max-width: 480px) {
      .raku-panel { right: 10px; left: 10px; bottom: 80px; width: auto; }
      .raku-bubble { right: 14px; bottom: 14px; }
    }
  `; }
})();
