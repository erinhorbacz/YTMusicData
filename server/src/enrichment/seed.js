import fs from "node:fs";
import path from "node:path";

import { ARTIST_HISTORY_DIR } from "../config.js";
import { videoIdFromUrl } from "../parser.js";
import * as cache from "./cache.js";

// Minimal RFC-4180 CSV parser (titles contain commas and quotes).
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ",") {
            row.push(field);
            field = "";
        } else if (c === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (c !== "\r") {
            field += c;
        }
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

// "MM:SS" where MM may exceed 59 (the notebooks never rolled minutes to hours).
function parseMMSS(value) {
    const match = /^(\d+):(\d{1,2})$/.exec(String(value ?? "").trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

const BAD_ALBUMS = new Set(["", "Album not found", "Song title not found"]);

// One-time seed from the notebooks' per-artist caches. The CSV Duration
// column is track length x play count, so divide by count to recover the
// single-track length.
export function seedFromArtistHistory() {
    if (!fs.existsSync(ARTIST_HISTORY_DIR)) return 0;
    let seeded = 0;

    for (const dirent of fs.readdirSync(ARTIST_HISTORY_DIR, { withFileTypes: true })) {
        if (!dirent.isDirectory()) continue;
        const file = path.join(ARTIST_HISTORY_DIR, dirent.name, "history.csv");
        if (!fs.existsSync(file)) continue;

        const rows = parseCsv(fs.readFileSync(file, "utf8"));
        if (rows.length < 2) continue;
        const header = rows[0];
        const iTitle = header.indexOf("title");
        const iCount = header.indexOf("count");
        const iUrl = header.indexOf("url");
        const iDuration = header.indexOf("Duration");
        const iAlbum = header.indexOf("Album");
        if (iUrl < 0) continue;

        for (const row of rows.slice(1)) {
            if ((row[iTitle] ?? "").trim() === "TOTALS") continue;
            const videoId = videoIdFromUrl(row[iUrl]);
            if (!videoId || cache.get(videoId)) continue;

            const count = Number(row[iCount]);
            const totalSeconds = parseMMSS(row[iDuration]);
            const durationSec =
                totalSeconds != null && Number.isFinite(count) && count > 0
                    ? Math.round(totalSeconds / count)
                    : null;

            const rawAlbum = (row[iAlbum] ?? "").trim();
            const album = BAD_ALBUMS.has(rawAlbum) ? null : rawAlbum;

            if (durationSec == null && !album) continue;
            cache.setVideo(videoId, { durationSec, album, albumArt: null, source: "artist_csv" });
            seeded += 1;
        }
    }

    cache.save({ force: true });
    return seeded;
}
