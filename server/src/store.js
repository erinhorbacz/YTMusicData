import fs from "node:fs";
import path from "node:path";

import { ACTIVE_FILE, DEFAULT_DATASET } from "./config.js";
import { buildCatalog } from "./catalog.js";
import { parseWatchHistory } from "./parser.js";

// Multi-tenant dataset store:
//  - one DEFAULT dataset (the site owner's, loaded at boot) that everyone
//    sees until they upload their own file, and
//  - per-visitor SESSION datasets keyed by the browser-generated
//    X-Dataset-Id header, held in memory with TTL + LRU eviction so a free
//    512 MB host can't be filled up by uploads.
// `version` is a global counter so any dataset swap invalidates the
// frontend's fetch keys.

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // evict after 2h idle
const MAX_SESSIONS = 5;

let versionCounter = 0;

function emptyCatalog() {
    return { songs: new Map(), artists: new Map(), videoToSong: new Map() };
}

let defaultState = { plays: [], catalog: emptyCatalog(), dataset: null };
const sessions = new Map(); // sid -> {state, lastAccess}

function makeState(parsed, meta) {
    versionCounter += 1;
    const catalog = buildCatalog(parsed.plays);
    const state = {
        plays: parsed.plays,
        catalog,
        dataset: {
            ...meta,
            loadedAt: new Date().toISOString(),
            totalEntries: parsed.totalEntries,
            musicPlays: parsed.plays.length,
            skippedNoUrl: parsed.skippedNoUrl,
            unknownArtistPlays: parsed.unknownArtistPlays,
            uniqueSongs: catalog.songs.size,
            uniqueArtists: catalog.artists.size,
            firstPlay: parsed.plays[0]?.time ?? null,
            lastPlay: parsed.plays[parsed.plays.length - 1]?.time ?? null,
            version: versionCounter,
        },
    };
    console.log(
        `[store] dataset loaded (${meta.source}): ${state.dataset.musicPlays} music plays, ` +
            `${state.dataset.uniqueSongs} songs, ${state.dataset.uniqueArtists} artists (v${versionCounter})`,
    );
    return state;
}

// ---------------------------------------------------------------------------
// Lookup

export function getState(sid) {
    if (sid) {
        const entry = sessions.get(sid);
        if (entry) {
            entry.lastAccess = Date.now();
            return entry.state;
        }
    }
    return defaultState;
}

export function getDefaultState() {
    return defaultState;
}

// ---------------------------------------------------------------------------
// Parsing / validation

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

// ---------------------------------------------------------------------------
// Default dataset (site owner's)

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

// Boot load: an admin-uploaded pointer (if its file survived — disks are
// ephemeral on free hosts) or the repo's committed default dataset.
export function load() {
    const pointer = readActivePointer();
    if (pointer?.path && fs.existsSync(pointer.path)) {
        try {
            const parsed = parseDatasetFile(pointer.path);
            defaultState = makeState(parsed, {
                source: "default",
                fileName: pointer.fileName ?? path.basename(pointer.path),
                path: pointer.path,
                uploadedAt: pointer.uploadedAt ?? null,
            });
            return defaultState.dataset;
        } catch (err) {
            console.error(`[store] active upload failed to load (${err.message}); falling back to default`);
        }
    }
    if (!fs.existsSync(DEFAULT_DATASET)) {
        console.warn(`[store] no default dataset at ${DEFAULT_DATASET} — starting empty`);
        defaultState = {
            plays: [],
            catalog: emptyCatalog(),
            dataset: {
                source: "none",
                fileName: null,
                path: null,
                loadedAt: new Date().toISOString(),
                totalEntries: 0,
                musicPlays: 0,
                skippedNoUrl: 0,
                unknownArtistPlays: 0,
                uniqueSongs: 0,
                uniqueArtists: 0,
                firstPlay: null,
                lastPlay: null,
                version: ++versionCounter,
            },
        };
        return defaultState.dataset;
    }
    console.time("[store] parse default dataset");
    const parsed = parseDatasetFile(DEFAULT_DATASET);
    console.timeEnd("[store] parse default dataset");
    defaultState = makeState(parsed, {
        source: "default",
        fileName: path.basename(DEFAULT_DATASET),
        path: DEFAULT_DATASET,
    });
    return defaultState.dataset;
}

// Admin-token import: replaces the SITE default that every visitor sees.
export function activateDefaultUpload(filePath, originalName) {
    const parsed = parseDatasetFile(filePath);
    const pointer = {
        path: filePath,
        fileName: originalName,
        uploadedAt: new Date().toISOString(),
    };
    writeActivePointer(pointer);
    defaultState = makeState(parsed, {
        source: "default",
        fileName: originalName,
        path: filePath,
        uploadedAt: pointer.uploadedAt,
    });
    return defaultState.dataset;
}

export function resetToDefault() {
    // Validate the committed dataset BEFORE dropping the pointer, so a failed
    // reset leaves the working upload in place.
    if (!fs.existsSync(DEFAULT_DATASET)) {
        const e = new Error("No default dataset available.");
        e.code = "NO_DEFAULT_DATASET";
        throw e;
    }
    const parsed = parseDatasetFile(DEFAULT_DATASET);
    writeActivePointer(null);
    defaultState = makeState(parsed, {
        source: "default",
        fileName: path.basename(DEFAULT_DATASET),
        path: DEFAULT_DATASET,
    });
    return defaultState.dataset;
}

// ---------------------------------------------------------------------------
// Session datasets (visitors' uploads)

function evictSessions() {
    const now = Date.now();
    for (const [sid, entry] of sessions) {
        if (now - entry.lastAccess > SESSION_TTL_MS) sessions.delete(sid);
    }
    while (sessions.size >= MAX_SESSIONS) {
        let oldest = null;
        for (const [sid, entry] of sessions) {
            if (!oldest || entry.lastAccess < oldest.lastAccess) oldest = { sid, lastAccess: entry.lastAccess };
        }
        sessions.delete(oldest.sid);
    }
}

// A visitor's upload: lives in memory only, scoped to their X-Dataset-Id.
export function activateSessionUpload(sid, filePath, originalName) {
    const parsed = parseDatasetFile(filePath);
    fs.rmSync(filePath, { force: true }); // in-memory only; no point keeping the file
    evictSessions();
    const state = makeState(parsed, {
        source: "session",
        fileName: originalName,
        path: null,
        uploadedAt: new Date().toISOString(),
    });
    sessions.set(sid, { state, lastAccess: Date.now() });
    return state.dataset;
}

// Drop the visitor's session — they fall back to the site default.
export function resetSession(sid) {
    if (sid) sessions.delete(sid);
    return defaultState.dataset;
}

export function sessionCount() {
    return sessions.size;
}
