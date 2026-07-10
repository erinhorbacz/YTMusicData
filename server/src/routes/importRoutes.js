import fs from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { UPLOADS_DIR } from "../config.js";
import * as job from "../enrichment/job.js";
import { ApiError, asyncHandler } from "../errors.js";
import { isAdmin, sidOf } from "../session.js";
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

// Uploads with a valid admin token replace the SITE default dataset that
// every visitor sees; everything else becomes a private session dataset
// scoped to the caller's X-Dataset-Id.
router.post(
    "/import",
    upload.single("file"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new ApiError(400, "NO_FILE", 'No file uploaded (expected multipart field "file").');
        }
        const adminUpload = Boolean(req.get("X-Admin-Token")) && isAdmin(req);
        if (req.get("X-Admin-Token") && !adminUpload) {
            fs.rmSync(req.file.path, { force: true });
            throw new ApiError(401, "BAD_ADMIN_TOKEN", "Invalid admin token.");
        }
        const sid = sidOf(req);
        if (!adminUpload && !sid) {
            fs.rmSync(req.file.path, { force: true });
            throw new ApiError(400, "NO_SESSION", "Missing X-Dataset-Id header.");
        }
        try {
            let dataset;
            if (adminUpload) {
                dataset = store.activateDefaultUpload(req.file.path, req.file.originalname);
                pruneUploads(req.file.path);
                job.onDatasetChanged();
            } else {
                // Session uploads reuse the shared enrichment cache but do
                // not drive the scraper (a hostile file could otherwise make
                // this host hammer YouTube with garbage lookups).
                dataset = store.activateSessionUpload(sid, req.file.path, req.file.originalname);
            }
            res.json({ dataset, enrichment: job.getStatus(store.getState(adminUpload ? null : sid)) });
        } catch (err) {
            fs.rmSync(req.file.path, { force: true });
            if (VALIDATION_CODES.has(err.code)) {
                throw new ApiError(422, err.code, err.message);
            }
            throw err;
        }
    }),
);

// A visitor's reset drops their session (back to the site default); an
// admin-token reset restores the committed default dataset for everyone.
router.post(
    "/import/reset",
    asyncHandler(async (req, res) => {
        let dataset;
        if (req.get("X-Admin-Token")) {
            if (!isAdmin(req)) throw new ApiError(401, "BAD_ADMIN_TOKEN", "Invalid admin token.");
            dataset = store.resetToDefault();
            job.onDatasetChanged();
        } else {
            dataset = store.resetSession(sidOf(req));
        }
        res.json({ dataset, enrichment: job.getStatus() });
    }),
);

export default router;
