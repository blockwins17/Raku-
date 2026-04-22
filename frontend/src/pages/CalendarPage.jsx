import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "../components/ui/calendar";
import { endpoints } from "../lib/api";
import { RakuLight } from "../components/RakuLight";
import { sameDay } from "../lib/format";

const KIND_LABEL = {
    class: "class",
    exam: "exam",
    assignment: "due",
    event: "event",
};

export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [selected, setSelected] = useState(new Date());

    useEffect(() => {
        (async () => {
            try {
                const d = await endpoints.calendar();
                setEvents(d.events || []);
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    const forDay = useMemo(
        () =>
            events
                .filter((e) => sameDay(e.start_at, selected))
                .sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
        [events, selected]
    );

    const markedDays = useMemo(() => {
        const set = new Set(
            events.map((e) => new Date(e.start_at).toDateString())
        );
        return Array.from(set).map((s) => new Date(s));
    }, [events]);

    return (
        <div className="p-6 md:p-12 max-w-5xl mx-auto" data-testid="calendar-page">
            <header className="mb-8 flex items-start justify-between gap-6">
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
                        calendar
                    </div>
                    <h1 className="display text-4xl sm:text-5xl lg:text-6xl">
                        the shape of your week.
                    </h1>
                </div>
                <RakuLight size="small" />
            </header>

            <div className="grid md:grid-cols-[auto_1fr] gap-10">
                <div
                    data-testid="calendar-grid-card"
                    className="card-thin p-5 w-fit"
                >
                    <Calendar
                        mode="single"
                        selected={selected}
                        onSelect={(d) => d && setSelected(d)}
                        modifiers={{ dot: markedDays }}
                        modifiersClassNames={{
                            dot: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-[var(--raku-accent)]",
                        }}
                        className="text-white"
                    />
                </div>

                <div
                    data-testid="calendar-day-list"
                    className="card-thin p-6 min-h-[260px]"
                >
                    <div className="flex items-baseline justify-between mb-6">
                        <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                                {selected.toLocaleDateString(undefined, {
                                    weekday: "long",
                                })}
                            </div>
                            <div className="display text-2xl">
                                {selected.toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </div>
                        </div>
                        <div className="text-xs text-white/40 mono">
                            {forDay.length} item{forDay.length === 1 ? "" : "s"}
                        </div>
                    </div>

                    {forDay.length === 0 && (
                        <div
                            className="text-white/50 text-sm py-8"
                            data-testid="calendar-empty-day"
                        >
                            clear day. good one to breathe.
                        </div>
                    )}

                    <ul className="flex flex-col divide-y divide-white/5">
                        {forDay.map((e) => (
                            <li
                                key={e.id}
                                data-testid={`cal-event-${e.id}`}
                                className="py-4 grid grid-cols-[60px_1fr_auto] items-start gap-4"
                            >
                                <div className="mono text-xs text-white/40">
                                    {new Date(e.start_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                                <div>
                                    <div className="text-sm">{e.title}</div>
                                    <div className="text-[11px] text-white/40 mt-0.5">
                                        {e.course ? `${e.course} · ` : ""}
                                        <span className="uppercase tracking-wide">
                                            {e.source}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 mt-1">
                                    {KIND_LABEL[e.kind] || e.kind}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
