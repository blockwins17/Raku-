// Open the Raku side panel when the user clicks the extension icon.
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
    // Seed sensible defaults so the panel works out of the box.
    chrome.storage.sync.get(["rakuApiUrl"], (v) => {
        if (!v.rakuApiUrl) {
            chrome.storage.sync.set({
                rakuApiUrl: "http://localhost:8001/api",
            });
        }
    });
});
