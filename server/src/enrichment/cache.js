import fs from "node:fs";
import path from "node:path";

import { CACHE_FILE } from "../config.js";

// Persistent per-videoId enrichment cache. Keyed by videoId, so it is
// dataset-independent — uploads reuse everything already fetched.
// Shape: { version, videos: {<id>: {durationSec, album, albumArt, source,
// fetchedAt}}, failures: {<id>: {attempts, lastError, lastTriedAt}} }
const data = { version: 1, videos: {}, failures: {} };

let dirtyWrites = 0;
const SAVE_EVERY = 25;

export function load() {
    try {
        const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
        if (parsed && typeof parsed === "object") {
            data.videos = parsed.videos ?? {};
            data.failures = parsed.failures ?? {};
        }
        console.log(
            `[cache] loaded ${Object.keys(data.videos).length} enriched videos, ` +
                `${Object.keys(data.failures).length} failures`,
        );
    } catch {
        console.log("[cache] no enrichment cache yet — starting empty");
    }
}

export function save({ force = false } = {}) {
    if (!force && dirtyWrites === 0) return;
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, CACHE_FILE); // atomic swap — never a half-written cache
    dirtyWrites = 0;
}

export function get(videoId) {
    return data.videos[videoId];
}

export function size() {
    return Object.keys(data.videos).length;
}

export function setVideo(videoId, patch) {
    const existing = data.videos[videoId] ?? {};
    data.videos[videoId] = {
        ...existing,
        ...patch,
        fetchedAt: new Date().toISOString(),
    };
    // A full success (album found) clears failure marks; a duration-only
    // update must NOT clear a definitive "this song has no album" mark, or
    // the job would re-scrape it on every run.
    if (patch.album) delete data.failures[videoId];
    dirtyWrites += 1;
    if (dirtyWrites >= SAVE_EVERY) save({ force: true });
}

// Transient failure (network error, throttle) — bookkeeping only; the job
// decides per-run whether to retry, so an offline evening never permanently
// blacklists songs.
export function recordFailure(videoId, message) {
    const existing = data.failures[videoId] ?? { attempts: 0 };
    data.failures[videoId] = {
        ...existing,
        attempts: (existing.attempts ?? 0) + 1,
        lastError: String(message).slice(0, 300),
        lastTriedAt: new Date().toISOString(),
    };
    dirtyWrites += 1;
}

// Definitive outcomes (persisted): the video no longer exists on YouTube /
// YT Music search found no album for this song.
export function markNoVideo(videoId) {
    data.failures[videoId] = {
        ...(data.failures[videoId] ?? {}),
        noVideo: true,
        lastTriedAt: new Date().toISOString(),
    };
    dirtyWrites += 1;
}

export function markNoAlbum(videoId) {
    data.failures[videoId] = {
        ...(data.failures[videoId] ?? {}),
        noAlbum: true,
        lastTriedAt: new Date().toISOString(),
    };
    dirtyWrites += 1;
}

export function hasNoVideo(videoId) {
    return Boolean(data.failures[videoId]?.noVideo);
}

export function hasNoAlbum(videoId) {
    return Boolean(data.failures[videoId]?.noAlbum);
}

// First cached duration across a song's videoIds (most-played first).
export function durationFor(videoIds) {
    for (const id of videoIds) {
        const sec = data.videos[id]?.durationSec;
        if (Number.isFinite(sec) && sec > 0) return sec;
    }
    return null;
}

// First cached album across a song's videoIds.
export function albumFor(videoIds) {
    for (const id of videoIds) {
        const entry = data.videos[id];
        if (entry?.album) return { album: entry.album, albumArt: entry.albumArt ?? null };
    }
    return null;
}

export function stats() {
    let withDuration = 0;
    let withAlbum = 0;
    for (const entry of Object.values(data.videos)) {
        if (Number.isFinite(entry.durationSec) && entry.durationSec > 0) withDuration += 1;
        if (entry.album) withAlbum += 1;
    }
    return {
        videos: Object.keys(data.videos).length,
        withDuration,
        withAlbum,
        failures: Object.keys(data.failures).length,
    };
}
