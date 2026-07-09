// Ports get_video_duration to the YouTube Data API v3, batched: one
// videos.list call covers up to 50 IDs and costs 1 quota unit.
const API_URL = "https://www.googleapis.com/youtube/v3/videos";

export function parseIsoDuration(iso) {
    const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso ?? "");
    if (!match) return null;
    const days = Number(match[1] ?? 0);
    const hours = Number(match[2] ?? 0);
    const minutes = Number(match[3] ?? 0);
    const seconds = Number(match[4] ?? 0);
    const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
}

// Returns Map<videoId, durationSec>. IDs missing from the response are
// deleted/private videos.
export async function fetchDurationsBatch(videoIds, apiKey) {
    const params = new URLSearchParams({
        part: "contentDetails",
        id: videoIds.join(","),
        key: apiKey,
        maxResults: "50",
    });
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube API ${response.status}: ${body.slice(0, 300)}`);
    }
    const json = await response.json();
    const durations = new Map();
    for (const item of json.items ?? []) {
        const seconds = parseIsoDuration(item.contentDetails?.duration);
        if (seconds) durations.set(item.id, seconds);
    }
    return durations;
}
