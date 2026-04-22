const qs = (s) => document.querySelector(s);

let API = "http://localhost:8001/api";

async function loadConfig() {
    const { rakuApiUrl } = await chrome.storage.sync.get(["rakuApiUrl"]);
    if (rakuApiUrl) API = rakuApiUrl;
    qs("#api-url").value = API;
}

async function fetchToday() {
    try {
        const r = await fetch(`${API}/today`);
        const d = await r.json();
        const list = qs("#today-list");
        list.innerHTML = "";
        (d.tasks || []).forEach((t) => {
            const li = document.createElement("li");
            li.innerHTML = `<div>${escapeHtml(t.title)}</div>
                <div class="meta">${escapeHtml(t.course || "")}${t.due_at ? " · due " + new Date(t.due_at).toLocaleString() : ""}</div>`;
            list.appendChild(li);
        });
        if (!d.tasks?.length) {
            list.innerHTML = `<li style="border:none;padding:0;color:rgba(255,255,255,.5)">nothing urgent. breathe.</li>`;
        }
    } catch (e) {
        qs("#today-list").innerHTML = `<li style="border:none;color:#f88">can't reach Raku at ${API}</li>`;
    }
}

function escapeHtml(s) {
    return String(s || "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
}

let scannedItems = [];

async function scanCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
        });
    } catch (_) {
        /* already injected */
    }
    chrome.tabs.sendMessage(tab.id, { type: "RAKU_SCAN" }, (res) => {
        const list = qs("#scan-list");
        list.innerHTML = "";
        if (!res || !res.ok) {
            qs("#scan-msg").textContent =
                "couldn’t read this page. open a Brightspace course/assignment page and try again.";
            scannedItems = [];
            qs("#add-btn").disabled = true;
            return;
        }
        scannedItems = res.items || [];
        if (scannedItems.length === 0) {
            qs("#scan-msg").textContent = "no assignments found on this page.";
            qs("#add-btn").disabled = true;
            return;
        }
        qs("#scan-msg").textContent = `found ${scannedItems.length} assignment${scannedItems.length === 1 ? "" : "s"}. add to Raku?`;
        scannedItems.forEach((it) => {
            const li = document.createElement("li");
            li.innerHTML = `<div>${escapeHtml(it.title)}</div>
                <div class="meta">${escapeHtml(it.course || "")}${it.due_at ? " · " + new Date(it.due_at).toLocaleDateString() : ""}</div>`;
            list.appendChild(li);
        });
        qs("#add-btn").disabled = false;
    });
}

async function addAll() {
    if (scannedItems.length === 0) return;
    qs("#add-btn").disabled = true;
    qs("#add-btn").textContent = "adding…";
    try {
        const r = await fetch(`${API}/assignments/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignments: scannedItems, source: "brightspace" }),
        });
        const d = await r.json();
        qs("#scan-msg").textContent = `added ${d.count || 0}. skipped ${d.skipped || 0}.`;
        await fetchToday();
    } catch (e) {
        qs("#scan-msg").textContent = "add failed.";
    } finally {
        qs("#add-btn").textContent = "add all";
    }
}

async function saveUrl() {
    const v = qs("#api-url").value.trim().replace(/\/$/, "");
    await chrome.storage.sync.set({ rakuApiUrl: v });
    API = v;
    qs("#scan-msg").textContent = "saved.";
    fetchToday();
}

qs("#refresh").addEventListener("click", fetchToday);
qs("#scan-btn").addEventListener("click", scanCurrentPage);
qs("#add-btn").addEventListener("click", addAll);
qs("#save-url").addEventListener("click", saveUrl);

loadConfig().then(fetchToday);
