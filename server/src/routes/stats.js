import { Router } from "express";

import * as agg from "../aggregate.js";
import * as job from "../enrichment/job.js";
import { ApiError, asyncHandler } from "../errors.js";
import { parsePaging, parseRange } from "../rangeParams.js";
import { sidOf } from "../session.js";
import * as store from "../store.js";

const router = Router();

// Resolve the caller's dataset (their session upload, else the site
// default), the shared from/to/tz params, and pre-filter plays once.
function withRange(req) {
    const { fromMs, toMs, tz } = parseRange(req.query);
    const state = store.getState(sidOf(req));
    return {
        state,
        tz,
        fromMs,
        toMs,
        plays: agg.filterByRange(state.plays, fromMs, toMs),
    };
}

router.get("/health", (req, res) => {
    res.json({ ok: true });
});

router.get("/status", (req, res) => {
    const state = store.getState(sidOf(req));
    res.json({
        dataset: state.dataset,
        enrichment: job.getStatus(state),
    });
});

router.get(
    "/overview",
    asyncHandler(async (req, res) => {
        const { state, tz, fromMs, toMs, plays } = withRange(req);
        res.json(agg.computeOverview(plays, state.catalog, tz, { fromMs, toMs }));
    }),
);

router.get(
    "/top/artists",
    asyncHandler(async (req, res) => {
        const { state, plays } = withRange(req);
        res.json(agg.computeTopArtists(plays, state.catalog, parsePaging(req.query)));
    }),
);

router.get(
    "/top/songs",
    asyncHandler(async (req, res) => {
        const { state, plays } = withRange(req);
        res.json(agg.computeTopSongs(plays, state.catalog, parsePaging(req.query)));
    }),
);

router.get(
    "/top/albums",
    asyncHandler(async (req, res) => {
        const { state, plays } = withRange(req);
        res.json(agg.computeTopAlbums(plays, state.catalog, parsePaging(req.query)));
    }),
);

router.get(
    "/trends",
    asyncHandler(async (req, res) => {
        const bucket = req.query.bucket || "month";
        if (!["day", "week", "month"].includes(bucket)) {
            throw new ApiError(400, "BAD_BUCKET", "bucket must be day, week, or month.");
        }
        const { state, tz, plays } = withRange(req);
        res.json(agg.computeTrends(plays, state.catalog, tz, bucket));
    }),
);

router.get(
    "/patterns",
    asyncHandler(async (req, res) => {
        const { tz, plays } = withRange(req);
        res.json(agg.computePatterns(plays, tz));
    }),
);

router.get(
    "/streaks",
    asyncHandler(async (req, res) => {
        const { state, tz, plays } = withRange(req);
        res.json(agg.computeStreaks(plays, state.catalog, tz));
    }),
);

router.get(
    "/recent",
    asyncHandler(async (req, res) => {
        // Opaque index cursor from a previous response's nextCursor.
        const beforeIdx = req.query.before ? Number(req.query.before) : null;
        if (beforeIdx !== null && (!Number.isInteger(beforeIdx) || beforeIdx < 0)) {
            throw new ApiError(400, "BAD_CURSOR", "`before` must be a cursor from nextCursor.");
        }
        const { limit } = parsePaging(req.query, { defaultLimit: 50, maxLimit: 200 });
        res.json(agg.computeRecent(store.getState(sidOf(req)).plays, { beforeIdx, limit }));
    }),
);

router.get(
    "/search",
    asyncHandler(async (req, res) => {
        const q = String(req.query.q ?? "").trim();
        if (q.length < 2) {
            throw new ApiError(400, "QUERY_TOO_SHORT", "Search needs at least 2 characters.");
        }
        res.json(agg.searchCatalog(store.getState(sidOf(req)).catalog, q));
    }),
);

export default router;
