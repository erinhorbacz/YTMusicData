import { Box, LinearProgress, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import { useDataset } from "../../context/DatasetContext";
import { formatNumber } from "../../utils/format";

const PHASE_LABELS = {
    durations: "Fetching track durations",
    albums: "Looking up albums",
};

// Slim progress strip under the navbar while the enrichment job runs.
function EnrichmentBanner() {
    const { enrichment, enrichmentActive } = useDataset();
    if (!enrichmentActive || !enrichment) return null;

    const { state, processed, total } = enrichment;
    const determinate = total > 0;
    const label = PHASE_LABELS[state] ?? "Enriching";

    return (
        <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    maxWidth: 1200,
                    mx: "auto",
                }}
            >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: "primary.light" }} />
                <Typography variant="caption" color="text.secondary">
                    {label}
                    {determinate && ` — ${formatNumber(processed)} / ${formatNumber(total)}`}
                </Typography>
            </Box>
            <LinearProgress
                variant={determinate ? "determinate" : "indeterminate"}
                value={determinate ? (processed / total) * 100 : undefined}
                sx={{ height: 2 }}
            />
        </Box>
    );
}

export default EnrichmentBanner;
