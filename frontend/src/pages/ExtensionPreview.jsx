import React, { useState } from "react";
import { endpoints } from "../lib/api";
import { RakuLight } from "../components/RakuLight";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const SAMPLE = [
    {
        title: "Essay: Identity & Memory (1500 words)",
        course: "ENG 210",
        due_at: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    },
    {
        title: "Lab Report 2 — Photosynthesis",
        course: "BIO 130",
        due_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
        title: "Quiz 4",
        course: "MATH 220",
        due_at: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    },
];

export default function ExtensionPreview() {
    const [added, setAdded] = useState(false);
    const [busy, setBusy] = useState(false);

    const simulateImport = async () => {
        setBusy(true);
        try {
            const r = await endpoints.importAssignments(SAMPLE, "brightspace");
            toast("added to Raku.", { description: `${r.count} new thing(s).` });
            setAdded(true);
        } catch (e) {
            toast("couldn't add.", { description: "try again." });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="p-6 md:p-12 max-w-5xl mx-auto"
            data-testid="extension-page"
        >
            <header className="mb-10 flex items-start justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                        extension
                    </div>
                    <h1 className="display text-4xl sm:text-5xl">
                        Raku on Brightspace.
                    </h1>
                    <p className="text-white/50 text-sm mt-4 max-w-lg">
                        a quiet side-panel that reads your assignments (with your
                        permission) and drops them into Raku.
                    </p>
                </div>
                <RakuLight size="small" />
            </header>

            <div className="grid md:grid-cols-[1fr_360px] gap-8">
                <div
                    data-testid="extension-how"
                    className="card-thin p-8 space-y-5"
                >
                    <h2 className="text-sm uppercase tracking-[0.2em] text-white/40">
                        how it works
                    </h2>
                    <ol className="space-y-4 text-sm text-white/80">
                        {[
                            "Install the Raku Chrome extension (see README).",
                            "Open any Brightspace course page.",
                            "Click the small Raku tab on the side.",
                            "Raku reads titles + due dates and asks before adding them.",
                        ].map((s, i) => (
                            <li key={i} className="flex gap-4 items-start">
                                <span className="mono text-xs text-white/40 mt-0.5">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span>{s}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="hline" />
                    <div className="text-xs text-white/40">
                        the extension lives in <code className="mono">/extension</code>{" "}
                        in this repo. load it unpacked via{" "}
                        <code className="mono">chrome://extensions</code>.
                    </div>
                    <Button
                        data-testid="extension-simulate-btn"
                        className="accent-bg hover:opacity-90"
                        onClick={simulateImport}
                        disabled={busy}
                    >
                        {busy ? "adding…" : "simulate a Brightspace scan"}
                    </Button>
                </div>

                {/* Mock extension side panel */}
                <div
                    data-testid="extension-panel-preview"
                    className="card-thin p-5 flex flex-col gap-4 self-start"
                >
                    <div className="flex items-center gap-2">
                        <RakuLight size="tiny" />
                        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                            raku · side panel
                        </div>
                    </div>
                    <div className="text-sm leading-relaxed text-white/80">
                        {added
                            ? "added. check Today — I'll pick the one worth starting."
                            : "I found 3 Brightspace assignments. add them?"}
                    </div>
                    <ul className="flex flex-col divide-y divide-white/5 text-xs">
                        {SAMPLE.map((s, i) => (
                            <li key={i} className="py-2.5">
                                <div className="text-white/85">{s.title}</div>
                                <div className="text-white/40 mt-0.5">
                                    {s.course} · due{" "}
                                    {new Date(s.due_at).toLocaleDateString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {!added ? (
                        <Button
                            data-testid="ext-add-btn"
                            size="sm"
                            className="accent-bg hover:opacity-90 w-full"
                            onClick={simulateImport}
                            disabled={busy}
                        >
                            add all
                        </Button>
                    ) : (
                        <div className="text-[11px] text-white/40">
                            these now show up in Today + Calendar.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
