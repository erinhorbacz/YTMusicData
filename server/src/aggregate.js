import { DEFAULT_TRACK_SECONDS } from "./config.js";
import { normalizeText, SONG_KEY_SEP } from "./normalize.js";
import { thumbUrl } from "./catalog.js";
import { UNKNOWN_ARTIST } from "./parser.js";
import * as cache from "./enrichment/cache.js";
import { localParts, dayKey, monthKey, weekKey } from "./tz.js";

const DAY_MS = 86400000;
const UNKNOWN_ARTIST_KEY = normalizeText(UNKNOWN_ARTIST);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------------------
// Range filtering (ports get_date_range's filter half). Plays are time-sorted,
// so bounds are found by binary search.

function lowerBound(plays, ms) {
    let lo = 0;
    let hi = plays.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (plays[mid].time < ms) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

export function filterByRange(plays, fromMs, toMs) {
    const start = fromMs != null ? lowerBound(plays, fromMs) : 0;
    const end = toMs != null ? lowerBound(plays, toMs + 1) : plays.length;
    return plays.slice(start, end);
}

// ---------------------------------------------------------------------------
// Minutes model (ports get_video_duration's role): every play counts as one
// full listen of the track. Falls back to DEFAULT_TRACK_SECONDS (flagged
// `estimated`) until enrichment caches the real duration.

export function songSeconds(videoIds) {
    const seconds = cache.durationFor(videoIds);
    return seconds != null
        ? { seconds, estimated: false }
        : { seconds: DEFAULT_TRACK_SECONDS, estimated: true };
}

// Albums are identified by normalized album name + artist, mirroring songKey.
export function albumKeyOf(albumName, artistKey) {
    return normalizeText(albumName) + SONG_KEY_SEP + artistKey;
}

// Ports collapse(): plays -> per-song aggregates, keyed by songKey
// (normalized title+artist — see normalize.js for why not title alone).
export function collapsePlays(plays) {
    const map = new Map();
    for (const play of plays) {
        let agg = map.get(play.songKey);
        if (!agg) {
            agg = { songKey: play.songKey, plays: 0, firstPlayed: play.time, lastPlayed: play.time };
            map.set(play.songKey, agg);
        }
        agg.plays += 1;
        agg.lastPlayed = play.time;
    }
    return map;
}

// ---------------------------------------------------------------------------
// Overview (extends totals_row to the whole range)

export function computeOverview(plays, catalog, tz, { fromMs, toMs } = {}) {
    const collapsed = collapsePlays(plays);

    let minutes = 0;
    let estimated = false;
    const artistPlays = new Map();
    const albumKeys = new Set();
    let topSongAgg = null;

    for (const agg of collapsed.values()) {
        const song = catalog.songs.get(agg.songKey);
        const s = songSeconds(song.videoIds);
        const songMinutes = (agg.plays * s.seconds) / 60;
        minutes += songMinutes;
        if (s.estimated) estimated = true;
        const artistEntry = artistPlays.get(song.artistKey) ?? { plays: 0, minutes: 0 };
        artistEntry.plays += agg.plays;
        artistEntry.minutes += songMinutes;
        artistPlays.set(song.artistKey, artistEntry);
        const albumInfo = cache.albumFor(song.videoIds);
        if (albumInfo) albumKeys.add(normalizeText(albumInfo.album) + SONG_KEY_SEP + song.artistKey);
        // Same tiebreak as computeTopSongs (plays desc, then most recent).
        if (
            !topSongAgg ||
            agg.plays > topSongAgg.plays ||
            (agg.plays === topSongAgg.plays && agg.lastPlayed > topSongAgg.lastPlayed)
        ) {
            topSongAgg = agg;
        }
    }

    // Same tiebreak as computeTopArtists (plays desc, then minutes desc), so
    // the dashboard's #1 always matches the Top Charts page.
    let topArtist = null;
    for (const [key, entry] of artistPlays) {
        if (key === UNKNOWN_ARTIST_KEY) continue;
        if (
            !topArtist ||
            entry.plays > topArtist.plays ||
            (entry.plays === topArtist.plays && entry.minutes > topArtist.minutes)
        ) {
            topArtist = {
                artistKey: key,
                name: catalog.artists.get(key).name,
                plays: entry.plays,
                minutes: entry.minutes,
            };
        }
    }
    if (topArtist) topArtist = { artistKey: topArtist.artistKey, name: topArtist.name, plays: topArtist.plays };

    const activeDaySet = new Set();
    const monthly = new Map();
    for (const play of plays) {
        const parts = localParts(tz, play.time);
        activeDaySet.add(parts.dayNumber);
        const mk = monthKey(parts);
        monthly.set(mk, (monthly.get(mk) ?? 0) + 1);
    }
    // Zero-filled so listening gaps show as dips, then the last 12 months.
    let sparkline = [];
    if (monthly.size > 0) {
        const monthKeysSorted = [...monthly.keys()].sort();
        for (const key of bucketRange("month", monthKeysSorted[0], monthKeysSorted[monthKeysSorted.length - 1])) {
            sparkline.push({ bucket: key, plays: monthly.get(key) ?? 0 });
        }
        sparkline = sparkline.slice(-12);
    }

    const startMs = fromMs ?? plays[0]?.time ?? null;
    const endMs = toMs ?? plays[plays.length - 1]?.time ?? null;
    const spanDays =
        startMs != null && endMs != null ? Math.max(1, Math.ceil((endMs - startMs) / DAY_MS)) : 1;

    let topSong = null;
    if (topSongAgg) {
        const song = catalog.songs.get(topSongAgg.songKey);
        topSong = {
            songKey: song.songKey,
            videoId: song.primaryVideoId,
            title: song.title,
            artist: song.artist,
            plays: topSongAgg.plays,
            thumbnail: thumbUrl(song.primaryVideoId),
        };
    }

    return {
        plays: plays.length,
        minutes: Math.round(minutes),
        estimated,
        uniqueSongs: collapsed.size,
        uniqueArtists: artistPlays.size - (artistPlays.has(UNKNOWN_ARTIST_KEY) ? 1 : 0),
        uniqueAlbums: albumKeys.size,
        activeDays: activeDaySet.size,
        topArtist,
        topSong,
        dailyAverageMinutes: Math.round(minutes / spanDays),
        sparkline,
    };
}

// ---------------------------------------------------------------------------
// Top charts

export function computeTopArtists(plays, catalog, { limit = 50, offset = 0 } = {}) {
    const collapsed = collapsePlays(plays);
    const byArtist = new Map();

    for (const agg of collapsed.values()) {
        const song = catalog.songs.get(agg.songKey);
        if (song.artistKey === UNKNOWN_ARTIST_KEY) continue;
        let entry = byArtist.get(song.artistKey);
        if (!entry) {
            entry = { plays: 0, minutes: 0, estimated: false, uniqueSongs: 0, top: null };
            byArtist.set(song.artistKey, entry);
        }
        const s = songSeconds(song.videoIds);
        entry.plays += agg.plays;
        entry.minutes += (agg.plays * s.seconds) / 60;
        entry.estimated ||= s.estimated;
        entry.uniqueSongs += 1;
        if (!entry.top || agg.plays > entry.top.plays) entry.top = { plays: agg.plays, song };
    }

    const sorted = [...byArtist.entries()].sort(
        (a, b) => b[1].plays - a[1].plays || b[1].minutes - a[1].minutes,
    );
    const items = sorted.slice(offset, offset + limit).map(([key, entry], i) => ({
        rank: offset + i + 1,
        artistKey: key,
        name: catalog.artists.get(key).name,
        plays: entry.plays,
        minutes: Math.round(entry.minutes),
        estimated: entry.estimated,
        uniqueSongs: entry.uniqueSongs,
        topSongTitle: entry.top.song.title,
        thumbnail: thumbUrl(entry.top.song.primaryVideoId),
    }));
    return { total: sorted.length, items };
}

export function computeTopSongs(plays, catalog, { limit = 50, offset = 0 } = {}) {
    const collapsed = collapsePlays(plays);
    const sorted = [...collapsed.values()].sort(
        (a, b) => b.plays - a.plays || b.lastPlayed - a.lastPlayed,
    );
    const items = sorted.slice(offset, offset + limit).map((agg, i) => {
        const song = catalog.songs.get(agg.songKey);
        const s = songSeconds(song.videoIds);
        const albumInfo = cache.albumFor(song.videoIds);
        return {
            rank: offset + i + 1,
            songKey: song.songKey,
            videoId: song.primaryVideoId,
            title: song.title,
            artist: song.artist,
            artistKey: song.artistKey,
            plays: agg.plays,
            minutes: Math.round((agg.plays * s.seconds) / 60),
            estimated: s.estimated,
            album: albumInfo?.album ?? null,
            thumbnail: thumbUrl(song.primaryVideoId),
        };
    });
    return { total: sorted.length, items };
}

export function computeTopAlbums(plays, catalog, { limit = 50, offset = 0 } = {}) {
    const collapsed = collapsePlays(plays);
    const byAlbum = new Map();
    let songsWithAlbum = 0;

    for (const agg of collapsed.values()) {
        const song = catalog.songs.get(agg.songKey);
        const albumInfo = cache.albumFor(song.videoIds);
        if (!albumInfo) continue;
        songsWithAlbum += 1;
        const key = albumKeyOf(albumInfo.album, song.artistKey);
        let entry = byAlbum.get(key);
        if (!entry) {
            entry = {
                albumKey: key,
                album: albumInfo.album,
                artist: song.artist,
                artistKey: song.artistKey,
                plays: 0,
                minutes: 0,
                estimated: false,
                songCount: 0,
                artUrl: albumInfo.albumArt ?? thumbUrl(song.primaryVideoId),
            };
            byAlbum.set(key, entry);
        }
        const s = songSeconds(song.videoIds);
        entry.plays += agg.plays;
        entry.minutes += (agg.plays * s.seconds) / 60;
        entry.estimated ||= s.estimated;
        entry.songCount += 1;
    }

    const sorted = [...byAlbum.values()].sort((a, b) => b.plays - a.plays || b.minutes - a.minutes);
    const items = sorted.slice(offset, offset + limit).map((entry, i) => ({
        rank: offset + i + 1,
        ...entry,
        minutes: Math.round(entry.minutes),
    }));
    return {
        total: sorted.length,
        coverage: { songsWithAlbum, totalSongs: collapsed.size },
        items,
    };
}

// ---------------------------------------------------------------------------
// Trends over time (zero-filled buckets)

function bucketLabel(bucket, key) {
    if (bucket === "month") {
        const [y, m] = key.split("-").map(Number);
        return `${MONTH_NAMES[m - 1]} ${y}`;
    }
    // Include the year: labels are used as x-axis categories, and duplicate
    // "Nov 30"s from different years would collapse into one point.
    const [y, m, d] = key.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${d} '${String(y).slice(2)}`;
}

function* bucketRange(bucket, firstKey, lastKey) {
    if (bucket === "month") {
        let [y, m] = firstKey.split("-").map(Number);
        const [ly, lm] = lastKey.split("-").map(Number);
        while (y < ly || (y === ly && m <= lm)) {
            yield `${y}-${String(m).padStart(2, "0")}`;
            m += 1;
            if (m > 12) {
                m = 1;
                y += 1;
            }
        }
        return;
    }
    const step = bucket === "week" ? 7 * DAY_MS : DAY_MS;
    const [fy, fm, fd] = firstKey.split("-").map(Number);
    const [ly, lm, ld] = lastKey.split("-").map(Number);
    const end = Date.UTC(ly, lm - 1, ld);
    for (let t = Date.UTC(fy, fm - 1, fd); t <= end; t += step) {
        const date = new Date(t);
        yield `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    }
}

export function computeTrends(plays, catalog, tz, bucket = "month") {
    const keyFn = bucket === "day" ? dayKey : bucket === "week" ? weekKey : monthKey;
    const buckets = new Map();

    for (const play of plays) {
        const key = keyFn(localParts(tz, play.time));
        let entry = buckets.get(key);
        if (!entry) {
            entry = { plays: 0, minutes: 0, estimated: false, songs: new Set() };
            buckets.set(key, entry);
        }
        const song = catalog.songs.get(play.songKey);
        const s = songSeconds(song.videoIds);
        entry.plays += 1;
        entry.minutes += s.seconds / 60;
        entry.estimated ||= s.estimated;
        entry.songs.add(play.songKey);
    }

    if (buckets.size === 0) return { bucket, points: [] };

    const keys = [...buckets.keys()].sort();
    const points = [];
    for (const key of bucketRange(bucket, keys[0], keys[keys.length - 1])) {
        const entry = buckets.get(key);
        points.push({
            bucket: key,
            label: bucketLabel(bucket, key),
            plays: entry?.plays ?? 0,
            minutes: Math.round(entry?.minutes ?? 0),
            uniqueSongs: entry?.songs.size ?? 0,
            estimated: entry?.estimated ?? false,
        });
    }
    return { bucket, points };
}

// ---------------------------------------------------------------------------
// Hour-of-day / day-of-week patterns (Monday = index 0)

export function computePatterns(plays, tz) {
    const hourOfDay = Array(24).fill(0);
    const dayOfWeek = Array(7).fill(0);
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const play of plays) {
        const parts = localParts(tz, play.time);
        hourOfDay[parts.hour] += 1;
        dayOfWeek[parts.dayOfWeek] += 1;
        matrix[parts.dayOfWeek][parts.hour] += 1;
    }

    const argmax = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
    return {
        hourOfDay,
        dayOfWeek,
        matrix,
        peakHour: plays.length ? argmax(hourOfDay) : null,
        peakDay: plays.length ? argmax(dayOfWeek) : null,
    };
}

// ---------------------------------------------------------------------------
// Streaks (consecutive local days with at least one play)

export function computeStreaks(plays, catalog, tz) {
    const byDay = new Map(); // dayNumber -> {date, plays, minutes}
    for (const play of plays) {
        const parts = localParts(tz, play.time);
        let entry = byDay.get(parts.dayNumber);
        if (!entry) {
            entry = { date: dayKey(parts), plays: 0, minutes: 0 };
            byDay.set(parts.dayNumber, entry);
        }
        const song = catalog.songs.get(play.songKey);
        entry.plays += 1;
        entry.minutes += songSeconds(song.videoIds).seconds / 60;
    }

    const dayNumbers = [...byDay.keys()].sort((a, b) => a - b);
    if (dayNumbers.length === 0) {
        return { longest: null, current: null, mostActiveDay: null, activeDays: 0, totalDays: 0 };
    }

    let longest = { days: 1, start: dayNumbers[0], end: dayNumbers[0] };
    let runStart = dayNumbers[0];
    for (let i = 1; i < dayNumbers.length; i++) {
        if (dayNumbers[i] !== dayNumbers[i - 1] + 1) runStart = dayNumbers[i];
        const runDays = dayNumbers[i] - runStart + 1;
        if (runDays > longest.days) longest = { days: runDays, start: runStart, end: dayNumbers[i] };
    }
    // Streak still running at the last listened day.
    const lastDay = dayNumbers[dayNumbers.length - 1];
    const current = { days: lastDay - runStart + 1, start: runStart, end: lastDay };

    let mostActive = null;
    for (const entry of byDay.values()) {
        if (!mostActive || entry.plays > mostActive.plays) mostActive = entry;
    }

    const toDate = (dayNumber) => byDay.get(dayNumber)?.date ?? null;
    return {
        longest: { days: longest.days, start: toDate(longest.start), end: toDate(longest.end) },
        current: { days: current.days, start: toDate(current.start), end: toDate(current.end) },
        mostActiveDay: {
            date: mostActive.date,
            plays: mostActive.plays,
            minutes: Math.round(mostActive.minutes),
        },
        activeDays: dayNumbers.length,
        totalDays: lastDay - dayNumbers[0] + 1,
    };
}

// ---------------------------------------------------------------------------
// Detail pages

function monthlyTimeline(plays, tz) {
    const monthly = new Map();
    for (const play of plays) {
        const mk = monthKey(localParts(tz, play.time));
        monthly.set(mk, (monthly.get(mk) ?? 0) + 1);
    }
    if (monthly.size === 0) return [];
    const keys = [...monthly.keys()].sort();
    const points = [];
    for (const key of bucketRange("month", keys[0], keys[keys.length - 1])) {
        points.push({ bucket: key, label: bucketLabel("month", key), plays: monthly.get(key) ?? 0 });
    }
    return points;
}

// Ports filter_by_artist (normalize -> filter -> collapse -> enrich -> totals);
// the per-artist CSV cache is replaced by the videoId enrichment cache.
export function computeArtistDetail(rangePlays, catalog, artistKey, tz) {
    const artist = catalog.artists.get(artistKey);
    if (!artist) return null;

    const plays = rangePlays.filter((p) => p.artistKey === artistKey);
    const collapsed = collapsePlays(plays);

    let minutes = 0;
    let estimated = false;
    const songs = [...collapsed.values()]
        .sort((a, b) => b.plays - a.plays || b.lastPlayed - a.lastPlayed)
        .map((agg) => {
            const song = catalog.songs.get(agg.songKey);
            const s = songSeconds(song.videoIds);
            const albumInfo = cache.albumFor(song.videoIds);
            minutes += (agg.plays * s.seconds) / 60;
            estimated ||= s.estimated;
            return {
                songKey: song.songKey,
                videoId: song.primaryVideoId,
                title: song.title,
                plays: agg.plays,
                minutes: Math.round((agg.plays * s.seconds) / 60),
                estimated: s.estimated,
                album: albumInfo?.album ?? null,
                thumbnail: thumbUrl(song.primaryVideoId),
                firstPlayed: agg.firstPlayed,
                lastPlayed: agg.lastPlayed,
            };
        });

    // Top albums for this artist within the range (songs lacking cached
    // album metadata are simply absent — the list grows as enrichment runs).
    const albumMap = new Map();
    for (const agg of collapsed.values()) {
        const song = catalog.songs.get(agg.songKey);
        const albumInfo = cache.albumFor(song.videoIds);
        if (!albumInfo) continue;
        const key = albumKeyOf(albumInfo.album, song.artistKey);
        let entry = albumMap.get(key);
        if (!entry) {
            entry = {
                albumKey: key,
                album: albumInfo.album,
                artist: song.artist,
                artistKey: song.artistKey,
                plays: 0,
                minutes: 0,
                estimated: false,
                songCount: 0,
                artUrl: albumInfo.albumArt ?? thumbUrl(song.primaryVideoId),
            };
            albumMap.set(key, entry);
        }
        const s = songSeconds(song.videoIds);
        entry.plays += agg.plays;
        entry.minutes += (agg.plays * s.seconds) / 60;
        entry.estimated ||= s.estimated;
        entry.songCount += 1;
    }
    const albums = [...albumMap.values()]
        .sort((a, b) => b.plays - a.plays || b.minutes - a.minutes)
        .map((entry, i) => ({ ...entry, rank: i + 1, minutes: Math.round(entry.minutes) }));

    // Rank among all artists within the range.
    const artistPlayCounts = new Map();
    for (const p of rangePlays) {
        if (p.artistKey === UNKNOWN_ARTIST_KEY) continue;
        artistPlayCounts.set(p.artistKey, (artistPlayCounts.get(p.artistKey) ?? 0) + 1);
    }
    let rank = null;
    if (plays.length > 0) {
        rank = 1;
        for (const count of artistPlayCounts.values()) {
            if (count > plays.length) rank += 1;
        }
    }

    return {
        artistKey,
        name: artist.name,
        image: thumbUrl(artist.topVideoId),
        plays: plays.length,
        minutes: Math.round(minutes),
        estimated,
        rank,
        uniqueSongs: collapsed.size,
        firstPlayed: artist.firstPlayed,
        lastPlayed: artist.lastPlayed,
        timeline: monthlyTimeline(plays, tz),
        albums,
        songs,
    };
}

// Album detail: streams/minutes/top songs for one album (identified by
// normalized album name + artist). Song membership comes from the enrichment
// cache, so the page fills in as enrichment discovers more of the album.
export function computeAlbumDetail(rangePlays, catalog, albumKey, tz) {
    const songKeys = new Set();
    let album = null;
    let artistName = null;
    let artistKey = null;
    let artUrl = null;
    let firstPlayed = null;
    let lastPlayed = null;

    for (const song of catalog.songs.values()) {
        const albumInfo = cache.albumFor(song.videoIds);
        if (!albumInfo || albumKeyOf(albumInfo.album, song.artistKey) !== albumKey) continue;
        songKeys.add(song.songKey);
        if (!album) {
            album = albumInfo.album;
            artistName = song.artist;
            artistKey = song.artistKey;
            artUrl = albumInfo.albumArt ?? thumbUrl(song.primaryVideoId);
        }
        if (firstPlayed === null || song.firstPlayed < firstPlayed) firstPlayed = song.firstPlayed;
        if (lastPlayed === null || song.lastPlayed > lastPlayed) lastPlayed = song.lastPlayed;
    }
    if (songKeys.size === 0) return null;

    const plays = rangePlays.filter((p) => songKeys.has(p.songKey));
    const collapsed = collapsePlays(plays);

    let minutes = 0;
    let estimated = false;
    const songs = [...collapsed.values()]
        .sort((a, b) => b.plays - a.plays || b.lastPlayed - a.lastPlayed)
        .map((agg) => {
            const song = catalog.songs.get(agg.songKey);
            const s = songSeconds(song.videoIds);
            minutes += (agg.plays * s.seconds) / 60;
            estimated ||= s.estimated;
            return {
                songKey: song.songKey,
                videoId: song.primaryVideoId,
                title: song.title,
                artist: song.artist,
                plays: agg.plays,
                minutes: Math.round((agg.plays * s.seconds) / 60),
                estimated: s.estimated,
                thumbnail: thumbUrl(song.primaryVideoId),
                firstPlayed: agg.firstPlayed,
                lastPlayed: agg.lastPlayed,
            };
        });

    // Rank among all albums within the range.
    const albumPlayCounts = new Map();
    for (const agg of collapsePlays(rangePlays).values()) {
        const song = catalog.songs.get(agg.songKey);
        const albumInfo = cache.albumFor(song.videoIds);
        if (!albumInfo) continue;
        const key = albumKeyOf(albumInfo.album, song.artistKey);
        albumPlayCounts.set(key, (albumPlayCounts.get(key) ?? 0) + agg.plays);
    }
    let rank = null;
    if (plays.length > 0) {
        rank = 1;
        for (const count of albumPlayCounts.values()) {
            if (count > plays.length) rank += 1;
        }
    }

    return {
        albumKey,
        album,
        artist: artistName,
        artistKey,
        artUrl,
        plays: plays.length,
        minutes: Math.round(minutes),
        estimated,
        rank,
        songCount: songKeys.size,
        songsInRange: collapsed.size,
        firstPlayed,
        lastPlayed,
        timeline: monthlyTimeline(plays, tz),
        songs,
    };
}

export function computeSongDetail(rangePlays, catalog, videoId, tz) {
    const songKey = catalog.videoToSong.get(videoId);
    if (!songKey) return null;
    const song = catalog.songs.get(songKey);

    const plays = rangePlays.filter((p) => p.songKey === songKey);
    const s = songSeconds(song.videoIds);
    const albumInfo = cache.albumFor(song.videoIds);

    // Rank among all songs within the range.
    let rank = null;
    if (plays.length > 0) {
        rank = 1;
        for (const agg of collapsePlays(rangePlays).values()) {
            if (agg.plays > plays.length) rank += 1;
        }
    }

    return {
        songKey,
        videoId: song.primaryVideoId,
        title: song.title,
        artist: song.artist,
        artistKey: song.artistKey,
        album: albumInfo?.album ?? null,
        durationSec: s.estimated ? null : s.seconds,
        estimated: s.estimated,
        plays: plays.length,
        minutes: Math.round((plays.length * s.seconds) / 60),
        firstPlayed: song.firstPlayed,
        lastPlayed: song.lastPlayed,
        rank,
        thumbnail: thumbUrl(song.primaryVideoId),
        timeline: monthlyTimeline(plays, tz),
        recentPlays: plays
            .slice(-20)
            .reverse()
            .map((p) => ({ time: p.time })),
    };
}

// ---------------------------------------------------------------------------
// Recent plays (cursor pagination, newest first). The cursor is an index into
// the time-sorted plays array — a timestamp cursor would silently drop plays
// sharing the boundary millisecond (the real dataset has 45 such groups). The
// array only changes on dataset swap, and the client resets its cursor then.

export function computeRecent(plays, { beforeIdx = null, limit = 50 } = {}) {
    const end =
        beforeIdx != null ? Math.min(Math.max(beforeIdx, 0), plays.length) : plays.length;
    const items = [];
    for (let i = end - 1; i >= 0 && items.length < limit; i--) {
        const p = plays[i];
        items.push({
            time: p.time,
            videoId: p.videoId,
            title: p.title,
            artist: p.artist,
            artistKey: p.artistKey,
            songKey: p.songKey,
            thumbnail: thumbUrl(p.videoId),
        });
    }
    const nextEnd = end - items.length;
    return { items, nextCursor: items.length > 0 && nextEnd > 0 ? nextEnd : null };
}

// ---------------------------------------------------------------------------
// Search (songKey/artistKey already hold normalized text)

export function searchCatalog(catalog, q, { limit = 8 } = {}) {
    const nq = normalizeText(q);
    if (!nq) return { artists: [], songs: [], albums: [] };

    const artists = [];
    for (const artist of catalog.artists.values()) {
        if (artist.artistKey === UNKNOWN_ARTIST_KEY) continue;
        if (artist.artistKey.includes(nq)) artists.push(artist);
    }
    artists.sort((a, b) => b.playCount - a.playCount);

    const songs = [];
    for (const song of catalog.songs.values()) {
        if (song.songKey.includes(nq)) songs.push(song);
    }
    songs.sort((a, b) => b.playCount - a.playCount);

    // Albums live in the enrichment cache, not the catalog — group matching
    // songs' cached albums on the fly (lifetime play counts).
    const albumMap = new Map();
    for (const song of catalog.songs.values()) {
        const albumInfo = cache.albumFor(song.videoIds);
        if (!albumInfo) continue;
        const key = albumKeyOf(albumInfo.album, song.artistKey);
        let entry = albumMap.get(key);
        if (!entry) {
            entry = {
                albumKey: key,
                album: albumInfo.album,
                artist: song.artist,
                artistKey: song.artistKey,
                plays: 0,
                artUrl: albumInfo.albumArt ?? thumbUrl(song.primaryVideoId),
            };
            albumMap.set(key, entry);
        }
        entry.plays += song.playCount;
    }
    const albums = [...albumMap.values()]
        .filter((a) => a.albumKey.includes(nq))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, limit);

    return {
        albums,
        artists: artists.slice(0, limit).map((a) => ({
            artistKey: a.artistKey,
            name: a.name,
            plays: a.playCount,
            thumbnail: thumbUrl(a.topVideoId),
        })),
        songs: songs.slice(0, limit).map((s) => ({
            songKey: s.songKey,
            videoId: s.primaryVideoId,
            title: s.title,
            artist: s.artist,
            artistKey: s.artistKey,
            plays: s.playCount,
            thumbnail: thumbUrl(s.primaryVideoId),
        })),
    };
}
