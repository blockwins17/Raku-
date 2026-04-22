// Raku content script.
// Scans Brightspace / D2L style pages for assignment rows and pushes them to the side panel.

(function () {
    function parseDueDate(text) {
        if (!text) return null;
        // Try ISO first
        const iso = Date.parse(text);
        if (!Number.isNaN(iso)) return new Date(iso).toISOString();
        // Try patterns like "Sept 24, 2025 11:59 PM"
        const cleaned = text.replace(/\s+/g, " ").trim();
        const t = Date.parse(cleaned);
        if (!Number.isNaN(t)) return new Date(t).toISOString();
        return null;
    }

    function guessCourse() {
        // Brightspace often puts course code in breadcrumb or page title
        const crumb = document.querySelector(
            "d2l-breadcrumbs, .d2l-breadcrumbs, nav[aria-label*='bread']"
        );
        if (crumb) {
            const last = crumb.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
            return last[last.length - 1] || null;
        }
        return null;
    }

    function scan() {
        const assignments = [];

        // Look for typical dropbox/assignments tables.
        const rows = document.querySelectorAll(
            "tr, li, div[role='row']"
        );
        rows.forEach((row) => {
            const titleEl = row.querySelector(
                "a[href*='dropbox'], a[href*='quizzing'], a[href*='assign'], .d2l-link, h3 a, h2 a"
            );
            if (!titleEl) return;
            const title = titleEl.textContent.trim();
            if (!title || title.length < 3) return;

            // Due date heuristics
            const dueEl = row.querySelector(
                ".d2l-dates-text, time, [class*='due'], [data-testid*='due']"
            );
            const dueText = dueEl ? dueEl.textContent : "";
            const due_at = parseDueDate(dueText);

            assignments.push({
                title,
                course: guessCourse(),
                due_at,
                source_url: titleEl.href || location.href,
            });
        });

        // Dedup by title
        const seen = new Set();
        return assignments.filter((a) => {
            if (seen.has(a.title)) return false;
            seen.add(a.title);
            return true;
        });
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === "RAKU_SCAN") {
            try {
                const items = scan();
                sendResponse({ ok: true, items });
            } catch (e) {
                sendResponse({ ok: false, error: String(e) });
            }
            return true;
        }
    });
})();
