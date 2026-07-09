import { ApiError } from "./errors.js";
import { isValidTz, localToUtcMs } from "./tz.js";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(y, m, d) {
    const probe = new Date(Date.UTC(y, m - 1, d));
    return (
        probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
    );
}

// Date-only bounds are interpreted in the listener's timezone; `to` runs
// through the end of that local day. The end bound is "next local midnight
// minus 1ms" rather than start+24h, so DST-transition days (23h/25h long)
// neither drop nor double-count their plays. Full ISO datetimes pass through.
function parseBound(value, tz, isEnd) {
    if (!value) return null;
    const match = DATE_ONLY.exec(value);
    if (match) {
        const y = Number(match[1]);
        const m = Number(match[2]);
        const d = Number(match[3]);
        if (!isRealDate(y, m, d)) {
            throw new ApiError(400, "BAD_RANGE", `Invalid calendar date: ${value}`);
        }
        return isEnd ? localToUtcMs(tz, y, m, d + 1) - 1 : localToUtcMs(tz, y, m, d);
    }
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) {
        throw new ApiError(400, "BAD_RANGE", `Invalid date: ${value}`);
    }
    return ms;
}

export function parseRange(query) {
    const tz = query.tz || "UTC";
    if (!isValidTz(tz)) {
        throw new ApiError(400, "BAD_TZ", `Unknown timezone: ${tz}`);
    }
    const fromMs = parseBound(query.from, tz, false);
    const toMs = parseBound(query.to, tz, true);
    if (fromMs != null && toMs != null && fromMs > toMs) {
        throw new ApiError(400, "BAD_RANGE", "`from` must not be after `to`.");
    }
    return { fromMs, toMs, tz };
}

export function parsePaging(query, { defaultLimit = 50, maxLimit = 500 } = {}) {
    const limit = Math.min(Math.max(1, Number(query.limit) || defaultLimit), maxLimit);
    const offset = Math.max(0, Number(query.offset) || 0);
    return { limit, offset };
}
