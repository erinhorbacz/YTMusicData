import { Router } from "express";

import * as agg from "../aggregate.js";
import { ApiError, asyncHandler } from "../errors.js";
import { parseRange } from "../rangeParams.js";
import * as store from "../store.js";

const router = Router();

router.get(
    "/artist/:artistKey",
    asyncHandler(async (req, res) => {
        const { fromMs, toMs, tz } = parseRange(req.query);
        const state = store.getState();
        const rangePlays = agg.filterByRange(state.plays, fromMs, toMs);
        const detail = agg.computeArtistDetail(rangePlays, state.catalog, req.params.artistKey, tz);
        if (!detail) {
            throw new ApiError(404, "ARTIST_NOT_FOUND", "No such artist in this listening history.");
        }
        res.json(detail);
    }),
);

router.get(
    "/album/:albumKey",
    asyncHandler(async (req, res) => {
        const { fromMs, toMs, tz } = parseRange(req.query);
        const state = store.getState();
        const rangePlays = agg.filterByRange(state.plays, fromMs, toMs);
        const detail = agg.computeAlbumDetail(rangePlays, state.catalog, req.params.albumKey, tz);
        if (!detail) {
            throw new ApiError(
                404,
                "ALBUM_NOT_FOUND",
                "No such album in this listening history (or it hasn't been enriched yet).",
            );
        }
        res.json(detail);
    }),
);

router.get(
    "/song/:videoId",
    asyncHandler(async (req, res) => {
        const { fromMs, toMs, tz } = parseRange(req.query);
        const state = store.getState();
        const rangePlays = agg.filterByRange(state.plays, fromMs, toMs);
        const detail = agg.computeSongDetail(rangePlays, state.catalog, req.params.videoId, tz);
        if (!detail) {
            throw new ApiError(404, "SONG_NOT_FOUND", "No such song in this listening history.");
        }
        res.json(detail);
    }),
);

export default router;
