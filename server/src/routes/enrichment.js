import { Router } from "express";

import * as job from "../enrichment/job.js";
import { ApiError, asyncHandler } from "../errors.js";
import { isAdmin, sidOf } from "../session.js";
import * as store from "../store.js";

const router = Router();

router.get("/enrichment/status", (req, res) => {
    res.json(job.getStatus(store.getState(sidOf(req))));
});

// Driving the scraper is admin-only once an ADMIN_TOKEN is configured
// (visitors on the public deployment shouldn't control outbound traffic).
router.post(
    "/enrichment/start",
    asyncHandler(async (req, res) => {
        if (!isAdmin(req)) {
            throw new ApiError(401, "ADMIN_ONLY", "Enrichment is controlled by the site owner.");
        }
        const started = job.start();
        if (!started) {
            throw new ApiError(409, "ALREADY_RUNNING", "Enrichment is already running.");
        }
        res.json(job.getStatus());
    }),
);

router.post(
    "/enrichment/pause",
    asyncHandler(async (req, res) => {
        if (!isAdmin(req)) {
            throw new ApiError(401, "ADMIN_ONLY", "Enrichment is controlled by the site owner.");
        }
        job.pause();
        res.json(job.getStatus());
    }),
);

export default router;
