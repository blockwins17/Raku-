import React, { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { RakuLight } from "../components/RakuLight";

const STATUS_LABEL = {
    ready: "Ready",
    mock: "Mock",
    live: "Live",
    disconnected: "Off",
};

const STATUS_STYLE = {
    ready: "border-white/20 text-white/70",
    mock: "border-white/20 text-white/60",
    live: "accent-border accent-text",
    disconnected: "border-white/10 text-white/40",
};

export default function Connections() {
    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(null);

    const load = async () => {
        const data = await endpoints.integrations();
        setItems(data);
    };
    useEffect(() => {
        load();
        // Re-check after OAuth bounce (?google=ok)
        if (window.location.search.includes("google=ok")) {
            toast("Google Calendar connected.");
            window.history.replaceState(null, "", "/connections");
        }
    }, []);

    const doSync = async (id) => {
        setBusy(id);
        try {
            const res = await endpoints.syncIntegration(id);
            if (res.added) {
                toast("synced.", { description: `${res.added} new item(s).` });
            } else {
                toast("all caught up.", { description: "nothing new." });
            }
            await load();
        } catch (e) {
            toast("sync failed.", { description: "try again in a moment." });
        } finally {
            setBusy(null);
        }
    };

    const doConnectGoogle = async () => {
        setBusy("google_calendar");
        try {
            const r = await endpoints.googleConnect();
            window.location.href = r.authorization_url;
        } catch (e) {
            toast("Google OAuth isn't configured yet.", {
                description: "Ask your admin to add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.",
            });
            setBusy(null);
        }
    };

    const disconnect = async (id) => {
        setBusy(id);
        try {
            await endpoints.disconnectIntegration(id);
            toast("disconnected.");
            await load();
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="p-6 md:p-12 max-w-4xl mx-auto" data-testid="connections-page">
            <header className="mb-10 flex items-start justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                        connections
                    </div>
                    <h1 className="display text-4xl sm:text-5xl">
                        bring your school into raku.
                    </h1>
                    <p className="text-white/50 text-sm mt-4 max-w-md">
                        link each one once. Raku quietly watches for new work and
                        slots it into your day.
                    </p>
                </div>
                <RakuLight size="small" />
            </header>

            <ul className="flex flex-col gap-4" data-testid="integrations-list">
                {items.map((it) => {
                    const isGoogle = it.id === "google_calendar";
                    const isBrightspace = it.id === "brightspace";
                    const needsOAuth =
                        isGoogle && it.configured && it.status !== "live";
                    return (
                        <li
                            key={it.id}
                            data-testid={`integration-${it.id}`}
                            className="card-thin p-6 flex items-center gap-6 flex-wrap"
                        >
                            <div className="flex items-center gap-3 min-w-[180px]">
                                <RakuLight size="tiny" />
                                <div>
                                    <div className="font-medium">{it.name}</div>
                                    <div className="text-xs text-white/40 mt-0.5">
                                        {it.description}
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`text-[10px] uppercase tracking-[0.2em] border rounded-full px-3 py-1 ${STATUS_STYLE[it.status]}`}
                                data-testid={`status-${it.id}`}
                            >
                                {STATUS_LABEL[it.status] || it.status}
                                {it.configured === false &&
                                    (it.id === "google_calendar" || it.id === "notion") && (
                                        <span className="ml-1 text-white/30">· mock</span>
                                    )}
                            </div>

                            <div className="ml-auto flex gap-2">
                                {isBrightspace ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-white/10"
                                        onClick={() => window.open("/extension", "_self")}
                                        data-testid={`btn-setup-${it.id}`}
                                    >
                                        install extension
                                    </Button>
                                ) : needsOAuth ? (
                                    <Button
                                        data-testid={`btn-connect-${it.id}`}
                                        size="sm"
                                        className="accent-bg hover:opacity-90"
                                        disabled={busy === it.id}
                                        onClick={doConnectGoogle}
                                    >
                                        {busy === it.id ? "…" : "connect Google"}
                                    </Button>
                                ) : (
                                    <Button
                                        data-testid={`btn-sync-${it.id}`}
                                        size="sm"
                                        className="accent-bg hover:opacity-90"
                                        disabled={busy === it.id}
                                        onClick={() => doSync(it.id)}
                                    >
                                        {busy === it.id ? "syncing…" : "sync now"}
                                    </Button>
                                )}
                                {it.status !== "disconnected" && !isBrightspace && (
                                    <Button
                                        data-testid={`btn-off-${it.id}`}
                                        size="sm"
                                        variant="ghost"
                                        className="text-white/50"
                                        onClick={() => disconnect(it.id)}
                                    >
                                        disconnect
                                    </Button>
                                )}
                            </div>

                            {it.last_sync_at && (
                                <div
                                    className="w-full text-[11px] text-white/30 mono"
                                    data-testid={`last-sync-${it.id}`}
                                >
                                    last sync · {new Date(it.last_sync_at).toLocaleString()}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
