import { Router } from "express";

import * as job from "../enrichment/job.js";
import { ApiError, asyncHandler } from "../errors.js";

const router = Router();

router.get("/enrichment/status", (req, res) => {
    res.json(job.getStatus());
});

router.post(
    "/enrichment/start",
    asyncHandler(async (req, res) => {
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
        job.pause();
        res.json(job.getStatus());
    }),
);

export default router;
