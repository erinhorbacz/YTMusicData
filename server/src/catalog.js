// Builds lookup structures over the parsed plays:
//   songs:       Map<songKey, song>    one entry per unique title+artist
//   artists:     Map<artistKey, artist>
//   videoToSong: Map<videoId, songKey> (a song can span several video IDs —
//                album audio vs music video — merged by songKey)
export function buildCatalog(plays) {
    const songs = new Map();
    const artists = new Map();
    const videoToSong = new Map();

    for (const play of plays) {
        let song = songs.get(play.songKey);
        if (!song) {
            song = {
                songKey: play.songKey,
                title: play.title,
                artist: play.artist,
                artistKey: play.artistKey,
                playCount: 0,
                firstPlayed: play.time,
                lastPlayed: play.time,
                videoCounts: new Map(),
            };
            songs.set(play.songKey, song);
        }
        song.playCount += 1;
        song.lastPlayed = play.time; // plays are time-sorted ascending
        song.videoCounts.set(play.videoId, (song.videoCounts.get(play.videoId) ?? 0) + 1);
        videoToSong.set(play.videoId, play.songKey);

        let artist = artists.get(play.artistKey);
        if (!artist) {
            artist = {
                artistKey: play.artistKey,
                name: play.artist,
                playCount: 0,
                firstPlayed: play.time,
                lastPlayed: play.time,
                songKeys: new Set(),
            };
            artists.set(play.artistKey, artist);
        }
        artist.playCount += 1;
        artist.lastPlayed = play.time;
        artist.songKeys.add(play.songKey);
    }

    // Finalize: order each song's video IDs by play count (most-played first).
    for (const song of songs.values()) {
        song.videoIds = [...song.videoCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);
        song.primaryVideoId = song.videoIds[0];
        delete song.videoCounts;
    }

    // Finalize: artist thumbnail = primary video of their most-played song.
    for (const artist of artists.values()) {
        artist.songKeys = [...artist.songKeys];
        artist.uniqueSongs = artist.songKeys.length;
        let top = null;
        for (const key of artist.songKeys) {
            const song = songs.get(key);
            if (!top || song.playCount > top.playCount) top = song;
        }
        artist.topVideoId = top?.primaryVideoId ?? null;
        artist.topSongTitle = top?.title ?? null;
    }

    return { songs, artists, videoToSong };
}

export function thumbUrl(videoId) {
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}
