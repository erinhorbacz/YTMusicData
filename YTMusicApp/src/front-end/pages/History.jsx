import { useCallback, useEffect, useRef, useState } from "react";

import {
    Box,
    Card,
    CircularProgress,
    List,
    ListItemButton,
    ListSubheader,
    Stack,
    Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

import client from "../../api/client";
import { useDataset } from "../../context/DatasetContext";
import { dayHeading, fromNow } from "../../utils/format";
import Artwork from "../components/Artwork";
import EmptyState from "../components/EmptyState";
import { ListSkeleton } from "../components/LoadingSkeletons";

const PAGE_SIZE = 50;

// Infinite feed of every play, newest first, grouped under sticky day headers.
function History() {
    const { datasetVersion } = useDataset();
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(undefined); // undefined = start, null = exhausted
    const [loading, setLoading] = useState(false);

    // Refs mirror the fetch state so loadMore is stable, and a generation
    // counter discards responses that were in flight when the dataset swapped
    // (otherwise the old dataset's first page gets appended to the new feed).
    const fetchRef = useRef({ cursor: undefined, busy: false, generation: 0 });
    const observerRef = useRef(null);

    const loadMore = useCallback(async () => {
        const state = fetchRef.current;
        if (state.busy || state.cursor === null) return;
        const generation = state.generation;
        state.busy = true;
        setLoading(true);
        try {
            const params = { limit: PAGE_SIZE };
            if (state.cursor !== undefined) params.before = state.cursor;
            const res = await client.get("/recent", { params });
            if (fetchRef.current.generation !== generation) return; // stale
            fetchRef.current.cursor = res.data.nextCursor;
            setItems((prev) => [...prev, ...res.data.items]);
            setCursor(res.data.nextCursor);
        } catch {
            // leave the feed as-is; the sentinel retries on next intersection
        } finally {
            if (fetchRef.current.generation === generation) {
                fetchRef.current.busy = false;
                setLoading(false);
            }
        }
    }, []);

    // (Re)start the feed on mount and whenever the dataset is swapped.
    useEffect(() => {
        fetchRef.current = {
            cursor: undefined,
            busy: false,
            generation: fetchRef.current.generation + 1,
        };
        setItems([]);
        setCursor(undefined);
        setLoading(false);
        loadMore();
    }, [datasetVersion, loadMore]);

    // Callback ref: the sentinel only exists once items render, so a
    // mount-time effect would never see it — attach when the node appears.
    const sentinelRef = useCallback(
        (node) => {
            observerRef.current?.disconnect();
            observerRef.current = null;
            if (!node) return;
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) loadMore();
                },
                { rootMargin: "400px" },
            );
            observer.observe(node);
            observerRef.current = observer;
        },
        [loadMore],
    );
    useEffect(() => () => observerRef.current?.disconnect(), []);

    // Group into day sections (items arrive newest-first).
    const sections = [];
    for (const item of items) {
        const heading = dayHeading(item.time);
        if (sections.length === 0 || sections[sections.length - 1].heading !== heading) {
            sections.push({ heading, rows: [] });
        }
        sections[sections.length - 1].rows.push(item);
    }

    return (
        <Stack spacing={3}>
            <Typography variant="h4">Listening history</Typography>

            {items.length === 0 && loading ? (
                <Card>
                    <ListSkeleton rows={10} />
                </Card>
            ) : items.length === 0 ? (
                <EmptyState title="No listening history" message="Import a watch-history.json to get started." />
            ) : (
                <Card>
                    <List disablePadding sx={{ position: "relative" }}>
                        {sections.map((section) => (
                            <Box key={section.heading}>
                                <ListSubheader
                                    sx={{
                                        bgcolor: "background.paper",
                                        color: "primary.light",
                                        fontWeight: 700,
                                        top: 0,
                                    }}
                                >
                                    {section.heading}
                                </ListSubheader>
                                {section.rows.map((item, i) => (
                                    <ListItemButton
                                        key={`${item.time}-${item.videoId}-${i}`}
                                        component={Link}
                                        to={`/song/${item.videoId}`}
                                        sx={{ display: "flex", gap: 2, alignItems: "center" }}
                                    >
                                        <Artwork src={item.thumbnail} alt={item.title} size={44} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" noWrap>
                                                {item.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {item.artist}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                            {fromNow(item.time)}
                                        </Typography>
                                    </ListItemButton>
                                ))}
                            </Box>
                        ))}
                    </List>
                    <Box
                        ref={sentinelRef}
                        sx={{ display: "flex", justifyContent: "center", py: 2, minHeight: 48 }}
                    >
                        {loading && <CircularProgress size={24} />}
                        {cursor === null && (
                            <Typography variant="caption" color="text.secondary">
                                That's everything — {items.length.toLocaleString()} plays loaded.
                            </Typography>
                        )}
                    </Box>
                </Card>
            )}
        </Stack>
    );
}

export default History;
