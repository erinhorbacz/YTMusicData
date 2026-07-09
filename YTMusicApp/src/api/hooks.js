import { useCallback, useEffect, useRef, useState } from "react";

import { useDataset } from "../context/DatasetContext";
import client from "./client";

// Fetch a GET endpoint, refetching when params change or the dataset is
// swapped (datasetVersion bumps after an import/reset). Param-only changes
// (e.g. a new time range) keep the old data visible while reloading; a PATH
// change (e.g. switching Top tabs) drops it — stale data under a different
// endpoint renders as broken rows.
export function useApi(path, params = {}, { enabled = true } = {}) {
    const { datasetVersion } = useDataset();
    const [state, setState] = useState({ data: null, loading: enabled, error: null });
    const [tick, setTick] = useState(0);
    const paramsKey = JSON.stringify(params);
    const lastPathRef = useRef(path);

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();
        const pathChanged = lastPathRef.current !== path;
        lastPathRef.current = path;
        setState((s) => ({ data: pathChanged ? null : s.data, loading: true, error: null }));
        client
            .get(path, { params: JSON.parse(paramsKey), signal: controller.signal })
            .then((res) => setState({ data: res.data, loading: false, error: null }))
            .catch((err) => {
                if (controller.signal.aborted) return;
                setState({ data: null, loading: false, error: err });
            });
        return () => controller.abort();
    }, [path, paramsKey, datasetVersion, tick, enabled]);

    const refetch = useCallback(() => setTick((t) => t + 1), []);
    return { ...state, refetch };
}
