import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { UPLOADS_DIR } from "../config.js";
import * as job from "../enrichment/job.js";
import { ApiError, asyncHandler } from "../errors.js";
import * as store from "../store.js";

const router = Router();

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
            cb(null, `watch-history-${Date.now()}.json`);
        },
    }),
    limits: { fileSize: 200 * 1024 * 1024 },
});

// Keep the newest few uploads so the active dataset survives restarts but old
// files don't pile up.
function pruneUploads(keepPath) {
    try {
        const files = fs
            .readdirSync(UPLOADS_DIR)
            .map((name) => path.join(UPLOADS_DIR, name))
            .filter((p) => p !== keepPath)
            .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        for (const file of files.slice(2)) fs.rmSync(file, { force: true });
    } catch {
        // best-effort cleanup only
    }
}

const VALIDATION_CODES = new Set(["INVALID_JSON", "NOT_TAKEOUT_FORMAT", "NO_MUSIC_ENTRIES"]);

router.post(
    "/import",
    upload.single("file"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new ApiError(400, "NO_FILE", 'No file uploaded (expected multipart field "file").');
        }
        try {
            const dataset = store.activateUpload(req.file.path, req.file.originalname);
            pruneUploads(req.file.path);
            job.onDatasetChanged();
            res.json({ dataset, enrichment: job.getStatus() });
        } catch (err) {
            fs.rmSync(req.file.path, { force: true });
            if (VALIDATION_CODES.has(err.code)) {
                throw new ApiError(422, err.code, err.message);
            }
            throw err;
        }
    }),
);

router.post(
    "/import/reset",
    asyncHandler(async (req, res) => {
        const dataset = store.resetToDefault();
        job.onDatasetChanged();
        res.json({ dataset, enrichment: job.getStatus() });
    }),
);

export default router;
