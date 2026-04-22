import React, { useState } from "react";
import { useRaku } from "../context/RakuContext";
import { RakuLight } from "../components/RakuLight";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const ACCENTS = [
    { hex: "#8BE3B4", name: "mint" },
    { hex: "#F5C27A", name: "honey" },
    { hex: "#A4C8FF", name: "sky" },
    { hex: "#F28FAD", name: "rose" },
    { hex: "#C9A7FF", name: "lilac" },
    { hex: "#FF6B4A", name: "ember" },
    { hex: "#EDEDEA", name: "paper" },
];

const VIBES = [
    { id: "chill", label: "Chill friend", sub: "warm + low pressure" },
    { id: "hype", label: "Hype coach", sub: "short + excited" },
    { id: "study", label: "Study buddy", sub: "calm + precise" },
    { id: "quiet", label: "Quiet focus", sub: "barely speaks" },
];

const CHANNELS = ["iMessage", "WhatsApp", "Telegram", "Slack"];

export default function Settings() {
    const { user, updateUser } = useRaku();
    const [saving, setSaving] = useState(false);

    if (!user)
        return (
            <div className="p-8 text-white/50" data-testid="settings-loading">
                loading…
            </div>
        );

    const set = async (patch) => {
        setSaving(true);
        try {
            await updateUser(patch);
            toast("saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-12 max-w-3xl mx-auto" data-testid="settings-page">
            <header className="mb-10 flex items-start justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                        settings
                    </div>
                    <h1 className="display text-4xl sm:text-5xl">make Raku yours.</h1>
                </div>
                <RakuLight />
            </header>

            <section
                className="card-thin p-8 mb-6"
                data-testid="section-accent"
            >
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                    accent
                </div>
                <div className="text-sm text-white/60 mb-6">
                    pick the color of your Raku light.
                </div>
                <div className="flex flex-wrap gap-3">
                    {ACCENTS.map((a) => (
                        <button
                            key={a.hex}
                            data-testid={`accent-${a.name}`}
                            onClick={() => set({ accent_color: a.hex })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs transition ${
                                user.accent_color === a.hex
                                    ? "border-white/70 bg-white/10"
                                    : "border-white/10 hover:border-white/30"
                            }`}
                        >
                            <span
                                className="w-4 h-4 rounded-full"
                                style={{ background: a.hex }}
                            />
                            <span className="text-white/80 lowercase">{a.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section
                className="card-thin p-8 mb-6"
                data-testid="section-vibe"
            >
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                    Raku’s vibe
                </div>
                <div className="text-sm text-white/60 mb-6">
                    how should Raku talk to you?
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {VIBES.map((v) => (
                        <button
                            key={v.id}
                            data-testid={`vibe-${v.id}`}
                            onClick={() => set({ vibe: v.id })}
                            className={`text-left p-4 rounded-xl border transition ${
                                user.vibe === v.id
                                    ? "accent-border bg-white/5"
                                    : "border-white/10 hover:border-white/30"
                            }`}
                        >
                            <div className="text-sm font-medium">{v.label}</div>
                            <div className="text-[11px] text-white/50 mt-0.5">
                                {v.sub}
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <section
                className="card-thin p-8 mb-6"
                data-testid="section-profile"
            >
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                    profile
                </div>
                <div className="text-sm text-white/60 mb-6">
                    Raku uses these to sound like a friend.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-xs text-white/50">name</span>
                        <input
                            data-testid="profile-name"
                            defaultValue={user.name}
                            onBlur={(e) =>
                                e.target.value !== user.name &&
                                set({ name: e.target.value })
                            }
                            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs text-white/50">pronouns</span>
                        <input
                            data-testid="profile-pronouns"
                            defaultValue={user.pronouns}
                            onBlur={(e) =>
                                e.target.value !== user.pronouns &&
                                set({ pronouns: e.target.value })
                            }
                            className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
                        />
                    </label>
                </div>
            </section>

            <section
                className="card-thin p-8"
                data-testid="section-channels"
            >
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">
                    chat channels
                </div>
                <div className="text-sm text-white/60 mb-6">
                    bring Raku into the apps you already use. coming soon.
                </div>
                <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((c) => (
                        <span
                            key={c}
                            data-testid={`channel-${c}`}
                            className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-white/50"
                        >
                            {c} · soon
                        </span>
                    ))}
                </div>
            </section>

            {saving && (
                <div
                    className="mt-4 text-xs text-white/40"
                    data-testid="saving-indicator"
                >
                    saving…
                </div>
            )}
        </div>
    );
}
