import { getYoutubeApiKey } from "../config.js";
import * as store from "../store.js";
import * as cache from "./cache.js";
import { seedFromArtistHistory } from "./seed.js";
import { fetchDurationsBatch } from "./youtube.js";
import { lookupAlbum } from "./ytmusic.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DURATION_BATCH = 50;
const DURATION_PACING_MS = 250;
const ALBUM_PACING_MS = 600;
const CIRCUIT_BREAKER = 20;

// Transient failures (network hiccups, throttling) only skip a video for the
// rest of THIS run; definitive outcomes (deleted video, no album found) are
// persisted as noVideo/noAlbum marks in the cache.
const sessionSkips = new Set();

const status = {
    state: "idle", // idle | seeding | durations | albums | paused | done | error
    processed: 0,
    total: 0,
    startedAt: null,
    lastError: null,
};

let running = false;
let pauseRequested = false;
let datasetChanged = false;

// Fraction of plays whose song has a real cached duration — computed for the
// caller's dataset (session or default) against the shared cache.
function computeCoverage(state = store.getDefaultState()) {
    const { plays, catalog } = state;
    if (plays.length === 0) return 0;
    let covered = 0;
    for (const song of catalog.songs.values()) {
        if (cache.durationFor(song.videoIds) != null) covered += song.playCount;
    }
    return Math.round((covered / plays.length) * 1000) / 1000;
}

export function getStatus(state = store.getDefaultState()) {
    const cacheStats = cache.stats();
    return {
        state: status.state,
        hasApiKey: Boolean(getYoutubeApiKey()),
        processed: status.processed,
        total: status.total,
        enriched: cacheStats.videos,
        withDuration: cacheStats.withDuration,
        withAlbum: cacheStats.withAlbum,
        failed: cacheStats.failures,
        coverage: computeCoverage(state),
        startedAt: status.startedAt,
        lastError: status.lastError,
    };
}

// Every videoId lacking a duration, ordered by song play count so the top of
// the charts gets real numbers first.
// The scraper only works the SITE DEFAULT dataset — session uploads read the
// shared cache but never enqueue lookups (abuse control on the public host).
function uncachedDurationIds() {
    const { catalog } = store.getDefaultState();
    const songs = [...catalog.songs.values()].sort((a, b) => b.playCount - a.playCount);
    const ids = [];
    const seen = new Set();
    for (const song of songs) {
        for (const id of song.videoIds) {
            if (seen.has(id)) continue;
            seen.add(id);
            if (cache.get(id)?.durationSec) continue;
            if (cache.hasNoVideo(id)) continue; // deleted/private on YouTube
            ids.push(id);
        }
    }
    return ids;
}

function songsNeedingAlbum() {
    const { catalog } = store.getDefaultState();
    return [...catalog.songs.values()]
        .filter(
            (song) =>
                !cache.albumFor(song.videoIds) &&
                !cache.hasNoAlbum(song.primaryVideoId) &&
                !sessionSkips.has(song.primaryVideoId),
        )
        .sort((a, b) => b.playCount - a.playCount);
}

async function runDurationsPhase() {
    const apiKey = getYoutubeApiKey();
    if (!apiKey) return;

    const ids = uncachedDurationIds();
    status.state = "durations";
    status.total = ids.length;
    status.processed = 0;

    for (let i = 0; i < ids.length; i += DURATION_BATCH) {
        if (pauseRequested || datasetChanged) return;
        const batch = ids.slice(i, i + DURATION_BATCH);
        try {
            const durations = await fetchDurationsBatch(batch, apiKey);
            for (const [id, seconds] of durations) {
                const existing = cache.get(id);
                cache.setVideo(id, {
                    ...existing,
                    durationSec: seconds,
                    source: existing?.source ?? "youtube",
                });
            }
            for (const id of batch) {
                // Missing from a successful response = deleted/private video.
                if (!durations.has(id)) cache.markNoVideo(id);
            }
        } catch (err) {
            // Bad key / quota exhausted — skip the rest of this phase, albums
            // can still run.
            status.lastError = err.message;
            console.error(`[enrich] durations phase stopped: ${err.message}`);
            break;
        }
        status.processed = Math.min(i + DURATION_BATCH, ids.length);
        await sleep(DURATION_PACING_MS);
    }
    cache.save({ force: true });
}

async function runAlbumsPhase() {
    const queue = songsNeedingAlbum();
    status.state = "albums";
    status.total = queue.length;
    status.processed = 0;

    let consecutiveFailures = 0;
    for (const song of queue) {
        if (pauseRequested || datasetChanged) return;
        const videoId = song.primaryVideoId;
        try {
            const result = await lookupAlbum(videoId, song.title, song.artist);
            if (result.album || result.durationSec) {
                const existing = cache.get(videoId);
                cache.setVideo(videoId, {
                    album: result.album ?? existing?.album ?? null,
                    albumArt: result.albumArt ?? existing?.albumArt ?? null,
                    // A real YouTube-API duration wins over a search match.
                    durationSec: existing?.durationSec ?? result.durationSec ?? null,
                    source: existing?.source ?? "ytmusic",
                });
            }
            // The search succeeded but found no album — a definitive answer,
            // don't re-scrape this song on every future run.
            if (!result.album) cache.markNoAlbum(videoId);
            consecutiveFailures = 0;
        } catch (err) {
            // Transient (network/throttle): skip for this run only.
            sessionSkips.add(videoId);
            cache.recordFailure(videoId, err.message);
            consecutiveFailures += 1;
            if (consecutiveFailures >= CIRCUIT_BREAKER) {
                throw new Error(
                    `circuit breaker: ${CIRCUIT_BREAKER} consecutive YT Music failures (${err.message})`,
                );
            }
        }
        status.processed += 1;
        await sleep(ALBUM_PACING_MS);
    }
    cache.save({ force: true });
}

async function runLoop() {
    do {
        datasetChanged = false;

        if (cache.size() === 0) {
            status.state = "seeding";
            const seeded = seedFromArtistHistory();
            console.log(`[enrich] seeded ${seeded} videos from artist_history/`);
        }

        await runDurationsPhase();
        if (!pauseRequested && !datasetChanged) await runAlbumsPhase();
    } while (datasetChanged && !pauseRequested);

    status.state = pauseRequested ? "paused" : "done";
    console.log(`[enrich] ${status.state} — coverage ${Math.round(computeCoverage() * 100)}%`);
}

export function start() {
    if (running) return false;
    running = true;
    pauseRequested = false;
    sessionSkips.clear(); // a fresh run retries transient failures
    status.startedAt = new Date().toISOString();
    status.lastError = null;

    runLoop()
        .catch((err) => {
            status.state = "error";
            status.lastError = err.message;
            console.error(`[enrich] job failed: ${err.message}`);
        })
        .finally(() => {
            running = false;
            cache.save({ force: true });
        });
    return true;
}

export function pause() {
    pauseRequested = true;
}

export function isRunning() {
    return running;
}

// Called after an import/reset: restart the queue against the new catalog.
export function onDatasetChanged() {
    datasetChanged = true;
    if (!running) start();
}
