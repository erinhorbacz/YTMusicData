// Ports normalize_text from getArtist.ipynb (NFKD -> strip accents -> lowercase).
// Unlike the Python version (ASCII-ignore), non-Latin characters are kept so
// CJK/Cyrillic artists don't all collapse to an empty key.
export function normalizeText(text) {
    return String(text ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Unit separator keeps title/artist unambiguous inside one string key.
export const SONG_KEY_SEP = "\u001f";

// Intentionally diverges from the notebook's collapse() (which grouped by
// title alone): keying on title+artist stops two artists' identically-titled
// songs from merging, while still merging one song's multiple video IDs.
export function songKeyOf(title, artistKey) {
    return normalizeText(title) + SONG_KEY_SEP + artistKey;
}
