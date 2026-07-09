import { Box, Tooltip, Typography } from "@mui/material";

import { HEATMAP_RAMP } from "../../theme";
import { WEEKDAY_LABELS, formatNumber, hourLabel } from "../../utils/format";

// Day x hour heatmap as a plain CSS grid (the x-charts Heatmap is pro-only).
// Sequential single-hue ramp; zero cells recede to the card surface.
function HeatmapGrid({ matrix }) {
    const max = Math.max(1, ...matrix.flat());

    const cellColor = (value) => {
        if (value === 0) return "background.paper";
        const idx = Math.min(
            HEATMAP_RAMP.length - 1,
            Math.floor((value / max) * HEATMAP_RAMP.length),
        );
        return HEATMAP_RAMP[idx];
    };

    return (
        <Box sx={{ overflowX: "auto" }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "auto repeat(24, minmax(14px, 1fr))",
                    gap: "2px",
                    minWidth: 520,
                    alignItems: "center",
                }}
            >
                {matrix.map((row, day) => (
                    <Box key={day} sx={{ display: "contents" }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ pr: 1, lineHeight: 1 }}
                        >
                            {WEEKDAY_LABELS[day]}
                        </Typography>
                        {row.map((value, hour) => (
                            <Tooltip
                                key={hour}
                                title={`${WEEKDAY_LABELS[day]} ${hourLabel(hour)} — ${formatNumber(value)} plays`}
                                disableInteractive
                            >
                                <Box
                                    sx={{
                                        aspectRatio: "1 / 1",
                                        borderRadius: "3px",
                                        bgcolor: cellColor(value),
                                        border: value === 0 ? "1px solid" : "none",
                                        borderColor: "divider",
                                        cursor: "default",
                                        "&:hover": { outline: "1px solid", outlineColor: "primary.light" },
                                    }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                ))}
                {/* hour labels every 3 hours */}
                <Box />
                {Array.from({ length: 24 }, (_, hour) => (
                    <Typography
                        key={hour}
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: 10, textAlign: "center", lineHeight: 1.4 }}
                    >
                        {hour % 3 === 0 ? hourLabel(hour).replace(" ", "") : ""}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
}

export default HeatmapGrid;
