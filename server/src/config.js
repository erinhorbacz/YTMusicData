import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_ROOT = path.resolve(__dirname, "..");
export const REPO_ROOT = path.resolve(SERVER_ROOT, "..");

export const DATA_DIR = path.join(SERVER_ROOT, "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const CACHE_FILE = path.join(SERVER_ROOT, "data-seed", "enrichment.json");
export const ACTIVE_FILE = path.join(DATA_DIR, "active.json");

export const DEFAULT_DATASET = path.join(REPO_ROOT, "watch-history.json");
export const CLIENT_BUILD_DIR = path.join(REPO_ROOT, "YTMusicApp", "build");

// Fallback track length when no real duration is cached yet (3m45s).
export const DEFAULT_TRACK_SECONDS = 225;

// Read env lazily so dotenv (loaded first in index.js) always wins.
export const getPort = () => Number(process.env.PORT) || 5001;
// Either name works: YOUTUBE_API_KEY or YT_DATA_API_KEY.
export const getYoutubeApiKey = () =>
    (process.env.YOUTUBE_API_KEY || process.env.YT_DATA_API_KEY || "").trim();
export const enrichOnBoot = () =>
    (process.env.ENRICH_ON_BOOT ?? "true").toLowerCase() !== "false";
// When set, replacing the SITE default dataset (and controlling the
// enrichment job) requires this token; visitors' uploads are unaffected.
export const getAdminToken = () => (process.env.ADMIN_TOKEN || "").trim();
