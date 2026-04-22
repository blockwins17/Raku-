export function formatDue(iso) {
    if (!iso) return "—";
    const dt = new Date(iso);
    const now = new Date();
    const diffMs = dt - now;
    const diffH = diffMs / 36e5;
    if (diffH < -24) return dt.toLocaleDateString();
    if (diffH < 0) return "overdue";
    if (diffH < 1) return `in ${Math.max(1, Math.round(diffMs / 60000))} min`;
    if (diffH < 24) return `in ${Math.round(diffH)}h`;
    const days = Math.round(diffH / 24);
    if (days === 1) return "tomorrow";
    if (days < 7) return `in ${days}d`;
    return dt.toLocaleDateString();
}

export function prettyDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

export function sameDay(a, b) {
    const d1 = new Date(a);
    const d2 = new Date(b);
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}
