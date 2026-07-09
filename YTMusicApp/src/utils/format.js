import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const formatNumber = (n) => Number(n ?? 0).toLocaleString("en-US");

// Big minute totals read better as hours/days ("122 days of music").
export function humanizeMinutes(minutes) {
    const hours = minutes / 60;
    if (hours < 1) return `${Math.round(minutes)} minutes`;
    if (hours < 48) return `${Math.round(hours * 10) / 10} hours`;
    return `${Math.round((hours / 24) * 10) / 10} days`;
}

export const formatDate = (ms) => (ms ? dayjs(ms).format("MMM D, YYYY") : "—");

export const fromNow = (ms) => dayjs(ms).fromNow();

// Track length as m:ss.
export function formatTrackLength(seconds) {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

// Day headers for the history feed.
export function dayHeading(ms) {
    const d = dayjs(ms);
    if (d.isSame(dayjs(), "day")) return "Today";
    if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
    return d.format("MMM D, YYYY");
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function hourLabel(hour) {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
}
