import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import express from "express";

import { CLIENT_BUILD_DIR, enrichOnBoot, getPort } from "./src/config.js";
import * as cache from "./src/enrichment/cache.js";
import * as job from "./src/enrichment/job.js";
import { errorMiddleware } from "./src/errors.js";
import detailRouter from "./src/routes/detail.js";
import enrichmentRouter from "./src/routes/enrichment.js";
import importRouter from "./src/routes/importRoutes.js";
import statsRouter from "./src/routes/stats.js";
import * as store from "./src/store.js";

cache.load();
store.load();

const app = express();
app.use(express.json());

app.use("/api", statsRouter);
app.use("/api", detailRouter);
app.use("/api", importRouter);
app.use("/api", enrichmentRouter);
app.use("/api", (req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Unknown API route." } });
});

// Production: serve the built React app from this same port.
if (fs.existsSync(CLIENT_BUILD_DIR)) {
    app.use(express.static(CLIENT_BUILD_DIR));
    app.get("*", (req, res) => {
        res.sendFile(path.join(CLIENT_BUILD_DIR, "index.html"));
    });
}

app.use(errorMiddleware);

const port = getPort();
app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
});

if (enrichOnBoot()) {
    setTimeout(() => job.start(), 5000);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        // Non-forced: only flushes unsaved enrichment writes, so a process
        // with a stale in-memory cache never clobbers the file on shutdown.
        cache.save();
        process.exit(0);
    });
}
