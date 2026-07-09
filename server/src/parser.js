import { normalizeText, songKeyOf } from "./normalize.js";

const WATCHED_PREFIX = "Watched ";
const TOPIC_SUFFIX = " - Topic";

export const UNKNOWN_ARTIST = "Unknown Artist";

// Ports fix_title: every Takeout title is "Watched <song>".
export function stripWatched(title) {
    const t = String(title ?? "").trim();
    return t.startsWith(WATCHED_PREFIX) ? t.slice(WATCHED_PREFIX.length).trim() : t;
}

// Ports fix_artist_name: auto-generated artist channels are "<Artist> - Topic";
// anything else (VEVO/user uploads) keeps the raw channel name.
export function artistFromSubtitles(subtitles) {
    const name = subtitles?.[0]?.name;
    if (!name) return UNKNOWN_ARTIST;
    const trimmed = String(name).trim();
    return trimmed.endsWith(TOPIC_SUFFIX)
        ? trimmed.slice(0, -TOPIC_SUFFIX.length).trim()
        : trimmed;
}

export function videoIdFromUrl(url) {
    if (!url) return null;
    const match = /[?&]v=([^&#]+)/.exec(url);
    return match ? match[1] : null;
}

// Ports the notebook's header === "YouTube Music" filter + field extraction.
// Returns plays sorted ascending by time.
export function parseWatchHistory(rawEntries) {
    const plays = [];
    let skippedNoUrl = 0;
    let unknownArtistPlays = 0;

    for (const entry of rawEntries) {
        if (entry?.header !== "YouTube Music") continue;

        const videoId = videoIdFromUrl(entry.titleUrl);
        const time = Date.parse(entry.time);
        if (!videoId || !Number.isFinite(time)) {
            skippedNoUrl += 1;
            continue;
        }

        const title = stripWatched(entry.title);
        const artist = artistFromSubtitles(entry.subtitles);
        if (artist === UNKNOWN_ARTIST) unknownArtistPlays += 1;

        const artistKey = normalizeText(artist);
        plays.push({
            videoId,
            title,
            artist,
            artistKey,
            songKey: songKeyOf(title, artistKey),
            time,
        });
    }

    plays.sort((a, b) => a.time - b.time);
    return {
        plays,
        totalEntries: rawEntries.length,
        skippedNoUrl,
        unknownArtistPlays,
    };
}
