import { createContext, useContext, useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";

import { useDataset } from "./DatasetContext";

const TimeRangeContext = createContext(null);

export const PRESETS = [
    { id: "4w", label: "4 weeks" },
    { id: "6m", label: "6 months" },
    { id: "1y", label: "1 year" },
    { id: "life", label: "Lifetime" },
    { id: "custom", label: "Custom" },
];

const STORAGE_KEY = "ytm.timeRange";
const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function loadStored() {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        if (parsed && PRESETS.some((p) => p.id === parsed.preset)) return parsed;
    } catch {
        // ignore
    }
    return { preset: "life", custom: { from: null, to: null } };
}

export function TimeRangeProvider({ children }) {
    const { dataset } = useDataset();
    const [stored, setStored] = useState(loadStored);

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }, [stored]);

    const value = useMemo(() => {
        // Relative presets anchor to the newest play in the dataset (a Takeout
        // export is a snapshot — anchoring to "now" would show empty ranges).
        const anchor = dataset?.lastPlay ? dayjs(dataset.lastPlay) : dayjs();
        let from = null;
        let to = null;
        if (stored.preset === "4w") from = anchor.subtract(28, "day").format("YYYY-MM-DD");
        else if (stored.preset === "6m") from = anchor.subtract(6, "month").format("YYYY-MM-DD");
        else if (stored.preset === "1y") from = anchor.subtract(1, "year").format("YYYY-MM-DD");
        else if (stored.preset === "custom") {
            from = stored.custom.from;
            to = stored.custom.to;
        }

        return {
            preset: stored.preset,
            custom: stored.custom,
            from,
            to,
            tz: BROWSER_TZ,
            anchor,
            setPreset: (preset) => setStored((s) => ({ ...s, preset })),
            setCustom: (customFrom, customTo) =>
                setStored({ preset: "custom", custom: { from: customFrom, to: customTo } }),
        };
    }, [stored, dataset?.lastPlay]);

    return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
    const ctx = useContext(TimeRangeContext);
    if (!ctx) throw new Error("useTimeRange must be used inside TimeRangeProvider");
    return ctx;
}

// Query params ready to spread into useApi calls.
export function useRangeParams() {
    const { from, to, tz } = useTimeRange();
    const params = { tz };
    if (from) params.from = from;
    if (to) params.to = to;
    return params;
}
