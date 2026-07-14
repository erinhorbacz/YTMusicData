import { useRef, useState } from "react";

import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import client, { getAdminToken, setAdminToken } from "../../api/client";
import { useDataset } from "../../context/DatasetContext";
import { formatDate, formatNumber } from "../../utils/format";
import SectionCard from "../components/SectionCard";

// Attach the site-owner token when one is stored (unlocks admin actions on
// the deployed API; harmless locally where no ADMIN_TOKEN is configured).
function adminHeaders() {
    const token = getAdminToken();
    return token ? { "X-Admin-Token": token } : {};
}

const ENRICHMENT_LABELS = {
    idle: "Not started",
    durations: "Fetching track durations…",
    albums: "Looking up albums…",
    paused: "Paused",
    done: "Complete",
    error: "Stopped on an error",
};

function DatasetCard() {
    const { dataset, applyStatus } = useDataset();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [error, setError] = useState(null);

    const reset = async () => {
        setResetting(true);
        setError(null);
        try {
            const res = await client.post("/import/reset");
            applyStatus(res.data);
            setConfirmOpen(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setResetting(false);
        }
    };

    if (!dataset) return null;
    const isSession = dataset.source === "session";
    return (
        <SectionCard
            title="Current dataset"
            action={
                isSession && (
                    <Button
                        size="small"
                        startIcon={<RestartAltRoundedIcon />}
                        onClick={() => setConfirmOpen(true)}
                    >
                        Reset to site default
                    </Button>
                )
            }
        >
            <Stack spacing={1}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                        label={isSession ? "Your uploaded data (this browser only)" : "Site default dataset"}
                        color={isSession ? "secondary" : "primary"}
                        variant="outlined"
                        size="small"
                    />
                    {dataset.fileName && <Chip label={dataset.fileName} size="small" variant="outlined" />}
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {formatNumber(dataset.musicPlays)} music plays ·{" "}
                    {formatNumber(dataset.uniqueSongs)} songs · {formatNumber(dataset.uniqueArtists)}{" "}
                    artists
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {formatDate(dataset.firstPlay)} – {formatDate(dataset.lastPlay)}
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
            </Stack>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Reset to the site default?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Your uploaded watch-history will be dropped and you'll see the site's default
                        dataset again. Enrichment data is kept — it's shared across datasets.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={reset} disabled={resetting} variant="contained" color="secondary">
                        Reset
                    </Button>
                </DialogActions>
            </Dialog>
        </SectionCard>
    );
}

function UploadCard() {
    const { applyStatus } = useDataset();
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [phase, setPhase] = useState("idle"); // idle | uploading | processing | success | error
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState(null);
    const [adminToken, setAdminTokenState] = useState(getAdminToken());

    const uploadFile = async (file) => {
        if (!file) return;
        setPhase("uploading");
        setProgress(0);
        setMessage(null);
        const form = new FormData();
        form.append("file", file);
        try {
            const res = await client.post("/import", form, {
                headers: adminHeaders(),
                onUploadProgress: (event) => {
                    const pct = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
                    setProgress(pct);
                    if (pct >= 100) setPhase("processing");
                },
            });
            applyStatus(res.data);
            setPhase("success");
            setMessage(
                `Imported ${formatNumber(res.data.dataset.musicPlays)} music plays from ${res.data.dataset.fileName}` +
                    (res.data.dataset.source === "default"
                        ? " — set as the site default everyone sees."
                        : " — visible only in this browser."),
            );
        } catch (err) {
            setPhase("error");
            setMessage(err.message ?? "Upload failed.");
        }
    };

    const busy = phase === "uploading" || phase === "processing";

    return (
        <SectionCard title="Import a watch-history.json">
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                    Get your file from{" "}
                    <Box component="span" sx={{ color: "primary.light" }}>
                        Google Takeout → YouTube and YouTube Music → history → watch-history.json
                    </Box>
                    . Your upload is private to this browser — it never replaces what other visitors
                    see (unless you're the site owner and enter the admin token below).
                </Typography>

                <Box
                    onClick={() => !busy && inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        if (!busy) uploadFile(e.dataTransfer.files?.[0]);
                    }}
                    sx={{
                        border: "2px dashed",
                        borderColor: dragOver ? "primary.light" : "divider",
                        borderRadius: 3,
                        p: 5,
                        textAlign: "center",
                        cursor: busy ? "default" : "pointer",
                        bgcolor: dragOver ? "rgba(139, 92, 246, 0.08)" : "transparent",
                        transition: "all 150ms ease",
                    }}
                >
                    <CloudUploadRoundedIcon sx={{ fontSize: 48, color: "primary.light", mb: 1 }} />
                    <Typography>
                        {busy ? "Working…" : "Drop your watch-history.json here, or click to browse"}
                    </Typography>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={(e) => {
                            uploadFile(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                </Box>

                {phase === "uploading" && (
                    <Box>
                        <LinearProgress variant="determinate" value={progress} />
                        <Typography variant="caption" color="text.secondary">
                            Uploading… {progress}%
                        </Typography>
                    </Box>
                )}
                {phase === "processing" && (
                    <Box>
                        <LinearProgress />
                        <Typography variant="caption" color="text.secondary">
                            Crunching your history…
                        </Typography>
                    </Box>
                )}
                {phase === "success" && <Alert severity="success">{message}</Alert>}
                {phase === "error" && <Alert severity="error">{message}</Alert>}

                <TextField
                    label="Site admin token (owner only)"
                    type="password"
                    size="small"
                    value={adminToken}
                    onChange={(e) => {
                        setAdminTokenState(e.target.value);
                        setAdminToken(e.target.value.trim());
                    }}
                    helperText="With a valid token, your upload replaces the site's default dataset and enrichment controls unlock."
                    sx={{ maxWidth: 420 }}
                />
            </Stack>
        </SectionCard>
    );
}

function EnrichmentCard() {
    const { enrichment, refreshStatus } = useDataset();
    const [error, setError] = useState(null);

    const act = async (action) => {
        setError(null);
        try {
            await client.post(`/enrichment/${action}`, null, { headers: adminHeaders() });
            refreshStatus();
        } catch (err) {
            if (err.code !== "ALREADY_RUNNING") setError(err.message);
        }
    };

    if (!enrichment) return null;
    const active = ["durations", "albums"].includes(enrichment.state);
    const pct =
        enrichment.total > 0 ? Math.round((enrichment.processed / enrichment.total) * 100) : null;

    return (
        <SectionCard
            title="Enrichment"
            subheader="Fills in real track durations and album names"
            action={
                active ? (
                    <Button size="small" startIcon={<PauseRoundedIcon />} onClick={() => act("pause")}>
                        Pause
                    </Button>
                ) : (
                    <Button
                        size="small"
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={() => act("start")}
                        disabled={enrichment.state === "done" && enrichment.coverage >= 0.999}
                    >
                        {enrichment.state === "paused" ? "Resume" : "Start"}
                    </Button>
                )
            }
        >
            <Stack spacing={1.5}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AutoAwesomeRoundedIcon sx={{ color: "primary.light", fontSize: 18 }} />
                    <Typography variant="body2">
                        {ENRICHMENT_LABELS[enrichment.state] ?? enrichment.state}
                        {active && pct != null && ` — ${formatNumber(enrichment.processed)} / ${formatNumber(enrichment.total)}`}
                    </Typography>
                </Box>
                {active && (
                    <LinearProgress
                        variant={pct != null ? "determinate" : "indeterminate"}
                        value={pct ?? undefined}
                    />
                )}
                <Typography variant="body2" color="text.secondary">
                    {Math.round((enrichment.coverage ?? 0) * 100)}% of plays have real durations ·{" "}
                    {formatNumber(enrichment.withAlbum)} songs with albums ·{" "}
                    {formatNumber(enrichment.enriched)} videos cached
                </Typography>
                {!enrichment.hasApiKey && (
                    <Alert severity="info" variant="outlined">
                        No YouTube API key configured (server/.env) — durations come from YT Music
                        search results and estimates. Album lookups work either way.
                    </Alert>
                )}
                {enrichment.lastError && (
                    <Alert severity="warning" variant="outlined">
                        {enrichment.lastError}
                    </Alert>
                )}
                {error && <Alert severity="error">{error}</Alert>}
            </Stack>
        </SectionCard>
    );
}

function Import() {
    return (
        <Stack spacing={3}>
            <Typography variant="h4">Import & data</Typography>
            <DatasetCard />
            <UploadCard />
            <EnrichmentCard />
        </Stack>
    );
}

export default Import;
