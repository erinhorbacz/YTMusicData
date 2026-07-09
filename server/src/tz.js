// Timezone helpers. Takeout timestamps are UTC; every hour/day/month bucket
// must be computed in the listener's local timezone or the patterns are
// meaningless. dayjs.tz() per play is too slow for 47k plays per request, so
// we cache one UTC offset per (tz, utc-day) via Intl and shift with plain
// arithmetic. (Plays inside the few hours around a DST switch can land one
// hour off — acceptable for listening stats.)

const DAY_MS = 86400000;

const formatterCache = new Map();
function getFormatter(tz) {
    let fmt = formatterCache.get(tz);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        formatterCache.set(tz, fmt);
    }
    return fmt;
}

export function isValidTz(tz) {
    try {
        getFormatter(tz);
        return true;
    } catch {
        return false;
    }
}

const offsetCache = new Map();

export function offsetMs(tz, ms) {
    // Sample the offset at UTC noon of the play's UTC day.
    const day = Math.floor(ms / DAY_MS);
    const key = `${tz}:${day}`;
    let offset = offsetCache.get(key);
    if (offset === undefined) {
        const sample = day * DAY_MS + DAY_MS / 2;
        const parts = {};
        for (const part of getFormatter(tz).formatToParts(sample)) {
            parts[part.type] = part.value;
        }
        const localAsUtc = Date.UTC(
            Number(parts.year),
            Number(parts.month) - 1,
            Number(parts.day),
            Number(parts.hour) % 24,
            Number(parts.minute),
            Number(parts.second),
        );
        offset = localAsUtc - sample;
        offsetCache.set(key, offset);
    }
    return offset;
}

// Local wall-clock fields for a UTC timestamp.
export function localParts(tz, ms) {
    const shifted = new Date(ms + offsetMs(tz, ms));
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        // Monday = 0 ... Sunday = 6
        dayOfWeek: (shifted.getUTCDay() + 6) % 7,
        // Days since epoch in local wall-clock terms (for streak math).
        dayNumber: Math.floor((ms + offsetMs(tz, ms)) / DAY_MS),
    };
}

const pad = (n) => String(n).padStart(2, "0");

export function dayKey(parts) {
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function monthKey(parts) {
    return `${parts.year}-${pad(parts.month)}`;
}

// Key weeks by the local date of their Monday.
export function weekKey(parts) {
    const monday = new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day - parts.dayOfWeek),
    );
    return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

// Convert a local wall-clock moment (date-only strings from the UI) to UTC ms.
export function localToUtcMs(tz, year, month, day, hour = 0, minute = 0, second = 0) {
    const naive = Date.UTC(year, month - 1, day, hour, minute, second);
    return naive - offsetMs(tz, naive);
}
