# YT Music Stats

Your YouTube Music listening habits, decoded — a personal [stats.fm](https://stats.fm)-style
dashboard for the `watch-history.json` you can download from Google Takeout.

- **Dashboard** — minutes listened, total plays, unique artists/songs, top-5 previews, listening-over-time chart, recent plays
- **Top charts** — ranked artists / songs / albums with play counts and minutes, for any time range (4 weeks / 6 months / 1 year / lifetime / custom)
- **Trends** — daily/weekly/monthly listening curve, day×hour heatmap of *when* you listen, weekday chart, streaks (longest run of consecutive listening days, most active day)
- **Detail pages** — every artist and song is clickable: rank, first/last listened, per-month timeline, per-song breakdown
- **History** — infinite-scroll feed of every play
- **Import** — drop in any `watch-history.json` to analyze it; reset back to the default dataset anytime

## Architecture

```
server/      Express API (Node 18+). Parses watch-history.json into memory,
             serves aggregate stats, and runs a background "enrichment" job
             that fills in real track durations + album names.
YTMusicApp/  React (CRA) + MUI dark purple/red UI. Talks to the API via the
             CRA dev proxy (dev) or same-origin (production build).
```

The data pipeline is a JavaScript port of the original Jupyter notebooks
(`extractData.ipynb`, `getArtist.ipynb`), with the notebook's
group-by-title-only aggregation bug fixed (songs are keyed by
normalized title + artist).

## Setup

```bash
npm install        # root dev tooling (concurrently)
npm run setup      # installs server/ and YTMusicApp/ dependencies
npm run dev        # starts the API (:5001) and the React app (:3000)
```

Open http://localhost:3000. The server preloads `watch-history.json` from the
repo root if present; otherwise use the **Import** page.

### Getting your data

1. Go to [Google Takeout](https://takeout.google.com) → deselect all → select **YouTube and YouTube Music**
2. Under "All YouTube data included", keep only **history**; set the format for history to **JSON**
3. Export, download, and unzip — your file is at `Takeout/YouTube and YouTube Music/history/watch-history.json`
4. Drop it on the app's Import page (it never leaves your machine)

## Enrichment (durations & albums)

Watch history has no track lengths or album names, so minutes listened start
as estimates (3m45s per play). A background job — visible and controllable on
the Import page — fills in real data:

1. **Seed** — imports the durations/albums already collected in `artist_history/` by the original notebooks
2. **Durations** — batch lookups via the YouTube Data API v3 (only if `YOUTUBE_API_KEY` is set; ~200 quota units for a full library, well within the free 10k/day)
3. **Albums** — YT Music search via the unofficial `ytmusic-api` package (no key needed; also returns durations, so the app improves even without an API key)

Everything is cached per-video in `server/data/cache/enrichment.json`, so each
song is looked up once ever, and uploads reuse the same cache. The job is
resumable — pause it, restart the server, it picks up where it left off.

```bash
cp server/.env.example server/.env   # then optionally add YOUTUBE_API_KEY
```

## Production mode (single machine)

```bash
npm run build   # builds the React app
npm start       # Express serves the API and the built app on :5001
```

## Web deployment (GitHub Pages + Render)

The public deployment splits the app: **GitHub Pages** serves the static
frontend (rebuilt by `.github/workflows/deploy-pages.yml` on every push) and
**Render** runs the Express API (defined in `render.yaml`, auto-deploys on
push). The frontend finds the API through the repo's `API_URL` Actions
variable, and the server's CORS layer allows the Pages origin.

The deployed API is **multi-tenant**: visitors see the committed
`watch-history.json` as the site default, and anyone can upload their own
Takeout file — uploads are scoped to a per-browser session id (the
`X-Dataset-Id` header), held in memory with TTL/LRU eviction, and never
affect other visitors. The committed `server/data-seed/enrichment.json`
snapshot seeds durations/albums on Render's ephemeral disk; session uploads
reuse that shared cache but never drive the scraper.

Owner-only actions (replacing the site default dataset, running enrichment)
require the `ADMIN_TOKEN` set in Render's dashboard — enter the same token
in the app's Import page to unlock them.

## Notes

- **Rotate old keys**: earlier commits of this repo contained a YouTube API key
  and a Firebase config in plaintext. If you forked/cloned before the cleanup,
  treat those as compromised — rotate the YouTube key in Google Cloud Console
  and disable the Firebase project's web key.
- The minutes model counts every history entry as one full play of the track
  (Takeout doesn't record partial listens or skips).
- `watch-history.json`, `listening_data.csv`, and `server/data/` are gitignored —
  your listening data stays local.
- Node 18+ required (the server uses global `fetch`). Tested on Node 24.
