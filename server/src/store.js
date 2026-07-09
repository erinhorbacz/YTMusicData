import fs from "node:fs";
import path from "node:path";

import { ACTIVE_FILE, DEFAULT_DATASET } from "./config.js";
import { buildCatalog } from "./catalog.js";
import { parseWatchHistory } from "./parser.js";

// In-memory dataset singleton. `version` bumps on every (re)load so the
// frontend and enrichment job can detect swaps.
const state = {
    plays: [],
    catalog: { songs: new Map(), artists: new Map(), videoToSong: new Map() },
    dataset: null,
    version: 0,
};

export function getState() {
    return state;
}

function readActivePointer() {
    try {
        return JSON.parse(fs.readFileSync(ACTIVE_FILE, "utf8"));
    } catch {
        return null;
    }
}

function writeActivePointer(pointer) {
    if (pointer === null) {
        fs.rmSync(ACTIVE_FILE, { force: true });
        return;
    }
    fs.mkdirSync(path.dirname(ACTIVE_FILE), { recursive: true });
    fs.writeFileSync(ACTIVE_FILE, JSON.stringify(pointer, null, 2));
}

// Parse + validate a Takeout file fully before touching current state, so a
// bad upload never clobbers a working dataset.
export function parseDatasetFile(filePath) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
        const e = new Error("File is not valid JSON.");
        e.code = "INVALID_JSON";
        throw e;
    }
    if (
        !Array.isArray(raw) ||
        raw.length === 0 ||
        !raw.some((entry) => entry && typeof entry === "object" && "header" in entry && "time" in entry)
    ) {
        const e = new Error(
            "File is not a Google Takeout watch-history.json (expected an array of entries with header/time fields).",
        );
        e.code = "NOT_TAKEOUT_FORMAT";
        throw e;
    }
    const parsed = parseWatchHistory(raw);
    if (parsed.plays.length === 0) {
        const e = new Error("No YouTube Music plays found in this file.");
        e.code = "NO_MUSIC_ENTRIES";
        throw e;
    }
    return parsed;
}

function applyDataset(parsed, meta) {
    state.plays = parsed.plays;
    state.catalog = buildCatalog(parsed.plays);
    state.version += 1;
    state.dataset = {
        ...meta,
        loadedAt: new Date().toISOString(),
        totalEntries: parsed.totalEntries,
        musicPlays: parsed.plays.length,
        skippedNoUrl: parsed.skippedNoUrl,
        unknownArtistPlays: parsed.unknownArtistPlays,
        uniqueSongs: state.catalog.songs.size,
        uniqueArtists: state.catalog.artists.size,
        firstPlay: parsed.plays[0]?.time ?? null,
        lastPlay: parsed.plays[parsed.plays.length - 1]?.time ?? null,
        version: state.version,
    };
    console.log(
        `[store] dataset loaded: ${state.dataset.musicPlays} music plays, ` +
            `${state.dataset.uniqueSongs} songs, ${state.dataset.uniqueArtists} artists (v${state.version})`,
    );
    return state.dataset;
}

// Boot load: the active pointer (surviving restarts) or the default dataset.
export function load() {
    const pointer = readActivePointer();
    if (pointer?.path && fs.existsSync(pointer.path)) {
        try {
            const parsed = parseDatasetFile(pointer.path);
            return applyDataset(parsed, {
                source: "upload",
                fileName: pointer.fileName ?? path.basename(pointer.path),
                path: pointer.path,
                uploadedAt: pointer.uploadedAt ?? null,
            });
        } catch (err) {
            console.error(`[store] active upload failed to load (${err.message}); falling back to default`);
        }
    }
    if (!fs.existsSync(DEFAULT_DATASET)) {
        console.warn(`[store] no default dataset at ${DEFAULT_DATASET} — starting empty`);
        return applyDataset(
            { plays: [], totalEntries: 0, skippedNoUrl: 0, unknownArtistPlays: 0 },
            { source: "none", fileName: null, path: null },
        );
    }
    console.time("[store] parse default dataset");
    const parsed = parseDatasetFile(DEFAULT_DATASET);
    console.timeEnd("[store] parse default dataset");
    return applyDataset(parsed, {
        source: "default",
        fileName: path.basename(DEFAULT_DATASET),
        path: DEFAULT_DATASET,
    });
}

// Swap in an uploaded file (already saved to disk by multer). Throws the
// parseDatasetFile validation errors; state is untouched on failure.
export function activateUpload(filePath, originalName) {
    const parsed = parseDatasetFile(filePath);
    const pointer = {
        path: filePath,
        fileName: originalName,
        uploadedAt: new Date().toISOString(),
    };
    writeActivePointer(pointer);
    return applyDataset(parsed, {
        source: "upload",
        fileName: originalName,
        path: filePath,
        uploadedAt: pointer.uploadedAt,
    });
}

export function resetToDefault() {
    // Validate the default dataset BEFORE dropping the active-upload pointer,
    // so a failed reset leaves the working upload in place.
    if (!fs.existsSync(DEFAULT_DATASET)) {
        const e = new Error("No default dataset available.");
        e.code = "NO_DEFAULT_DATASET";
        throw e;
    }
    const parsed = parseDatasetFile(DEFAULT_DATASET);
    writeActivePointer(null);
    return applyDataset(parsed, {
        source: "default",
        fileName: path.basename(DEFAULT_DATASET),
        path: DEFAULT_DATASET,
    });
}
