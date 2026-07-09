// Ports get_album_from_song via the ytmusic-api npm package (unofficial
// InnerTube client — Node-only, browsers are blocked by CORS).
import YTMusicModule from "ytmusic-api";

const YTMusic = YTMusicModule.default ?? YTMusicModule;

let clientPromise = null;
function getClient() {
    if (!clientPromise) {
        clientPromise = (async () => {
            const yt = new YTMusic();
            await yt.initialize();
            return yt;
        })();
        // Failed init shouldn't poison every later lookup.
        clientPromise.catch(() => {
            clientPromise = null;
        });
    }
    return clientPromise;
}

function largestThumb(thumbnails) {
    if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
    return thumbnails.reduce((best, t) => ((t?.width ?? 0) > (best?.width ?? 0) ? t : best)).url ?? null;
}

// getSong(videoId) for the canonical title, then searchSongs and take the
// first result carrying an album. Also returns the track duration YT Music
// reports — a free fallback when no YouTube API key is configured.
export async function lookupAlbum(videoId, fallbackTitle, fallbackArtist) {
    const yt = await getClient();

    let title = fallbackTitle;
    let artist = fallbackArtist;
    let durationSec = null;
    try {
        const song = await yt.getSong(videoId);
        if (song?.name) title = song.name;
        if (song?.artist?.name) artist = song.artist.name;
        if (Number.isFinite(song?.duration) && song.duration > 0) durationSec = song.duration;
    } catch {
        // fall back to the history metadata for the search
    }

    const results = await yt.searchSongs(`${title} ${artist}`.trim());
    const match = results?.find((r) => r?.album?.name) ?? results?.[0] ?? null;
    const matchDuration =
        Number.isFinite(match?.duration) && match.duration > 0 ? match.duration : null;

    return {
        album: match?.album?.name ?? null,
        albumArt: largestThumb(match?.thumbnails),
        durationSec: durationSec ?? matchDuration,
    };
}
