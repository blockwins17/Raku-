import React, { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import { RakuLight } from "../components/RakuLight";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDue } from "../lib/format";

export default function Today() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const load = async () => {
        try {
            const d = await endpoints.today();
            setData(d);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const act = async (task, action) => {
        if (action === "start") {
            await endpoints.updateTask(task.id, { status: "doing" });
            toast("okay, starting.", { description: task.title });
            navigate("/chat", { state: { prefill: `help me start: ${task.title}` } });
        } else if (action === "later") {
            await endpoints.updateTask(task.id, { status: "later" });
            toast("pushed. no stress.");
            load();
        } else if (action === "done") {
            await endpoints.updateTask(task.id, { status: "done" });
            toast("nice. one less thing.");
            load();
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-white/50" data-testid="today-loading">
                loading your day…
            </div>
        );
    }

    const tasks = data?.tasks || [];
    const events = data?.events || [];

    return (
        <div className="p-6 md:p-12 max-w-5xl mx-auto" data-testid="today-page">
            <header className="mb-10 flex items-start justify-between gap-8">
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                        today
                    </div>
                    <h1 className="display text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
                        {data?.greeting}
                    </h1>
                </div>
                <RakuLight size="large" data-testid="today-raku-light" />
            </header>

            <section
                data-testid="today-card"
                className="card-thin p-8 md:p-10"
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                        next {tasks.length} thing{tasks.length === 1 ? "" : "s"}
                    </div>
                    <button
                        data-testid="refresh-today-btn"
                        onClick={load}
                        className="text-xs text-white/40 hover:text-white transition"
                    >
                        refresh
                    </button>
                </div>

                {tasks.length === 0 && (
                    <div
                        className="py-16 text-center text-white/50"
                        data-testid="today-empty"
                    >
                        nothing urgent. breathe. drink water. 🪷 (kidding on the emoji.)
                    </div>
                )}

                <ol className="flex flex-col gap-6">
                    {tasks.map((t, idx) => (
                        <li
                            key={t.id}
                            data-testid={`today-task-${idx}`}
                            className="grid grid-cols-[32px_1fr_auto] gap-5 items-start"
                        >
                            <div className="mono text-sm text-white/30 pt-1">
                                {String(idx + 1).padStart(2, "0")}
                            </div>

                            <div className="min-w-0">
                                <div className="text-lg md:text-xl font-medium">
                                    {t.title}
                                </div>
                                <div className="mt-1 text-xs text-white/40 flex gap-3 flex-wrap">
                                    {t.course && <span>{t.course}</span>}
                                    {t.due_at && <span>· due {formatDue(t.due_at)}</span>}
                                    {t.effort_min ? <span>· ~{t.effort_min} min</span> : null}
                                </div>
                                {t.steps?.length ? (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {t.steps.slice(0, 3).map((s, i) => (
                                            <span
                                                key={i}
                                                className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-white/60"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                                <Button
                                    data-testid={`today-start-${idx}`}
                                    size="sm"
                                    className="accent-bg hover:opacity-90"
                                    onClick={() => act(t, "start")}
                                >
                                    Start
                                </Button>
                                <Button
                                    data-testid={`today-later-${idx}`}
                                    size="sm"
                                    variant="ghost"
                                    className="text-white/50 hover:text-white"
                                    onClick={() => act(t, "later")}
                                >
                                    Later
                                </Button>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            {events.length > 0 && (
                <section
                    data-testid="today-events"
                    className="mt-10 card-thin p-6"
                >
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
                        today’s schedule
                    </div>
                    <ul className="flex flex-col gap-3">
                        {events.map((e) => (
                            <li key={e.id} className="flex items-center gap-4">
                                <span className="mono text-xs text-white/40 w-14">
                                    {new Date(e.start_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                                <span className="text-sm">{e.title}</span>
                                {e.course && (
                                    <span className="text-xs text-white/40">
                                        {e.course}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="mt-10 flex gap-3 flex-wrap">
                <Button
                    data-testid="open-chat-btn"
                    variant="outline"
                    onClick={() => navigate("/chat", { state: { prefill: "what now?" } })}
                    className="border-white/10 hover:bg-white/5"
                >
                    ask Raku — what now?
                </Button>
                <Button
                    data-testid="open-calendar-btn"
                    variant="ghost"
                    onClick={() => navigate("/calendar")}
                    className="text-white/60 hover:text-white"
                >
                    see the week →
                </Button>
            </div>
        </div>
    );
}
