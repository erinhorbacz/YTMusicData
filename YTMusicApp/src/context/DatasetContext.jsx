import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import client from "../api/client";

const DatasetContext = createContext(null);

const ACTIVE_ENRICHMENT_STATES = new Set(["seeding", "durations", "albums"]);

export function DatasetProvider({ children }) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const refreshStatus = useCallback(async () => {
        try {
            const res = await client.get("/status");
            setStatus(res.data);
            setError(null);
        } catch (err) {
            setError(err);
        }
    }, []);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    // Poll faster while enrichment is actively filling the cache.
    const enrichmentActive = ACTIVE_ENRICHMENT_STATES.has(status?.enrichment?.state);
    useEffect(() => {
        const id = setInterval(refreshStatus, enrichmentActive ? 5000 : 30000);
        return () => clearInterval(id);
    }, [refreshStatus, enrichmentActive]);

    // Import/reset responses carry the fresh {dataset, enrichment} body.
    const applyStatus = useCallback((body) => {
        setStatus(body);
        setError(null);
    }, []);

    const value = useMemo(
        () => ({
            dataset: status?.dataset ?? null,
            enrichment: status?.enrichment ?? null,
            datasetVersion: status?.dataset?.version ?? 0,
            enrichmentActive,
            serverDown: Boolean(error?.isNetwork),
            refreshStatus,
            applyStatus,
        }),
        [status, enrichmentActive, error, refreshStatus, applyStatus],
    );

    return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
    const ctx = useContext(DatasetContext);
    if (!ctx) throw new Error("useDataset must be used inside DatasetProvider");
    return ctx;
}
