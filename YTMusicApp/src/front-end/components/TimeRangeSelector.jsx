import { useState } from "react";

import { Box, Button, Popover, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

import { useDataset } from "../../context/DatasetContext";
import { PRESETS, useTimeRange } from "../../context/TimeRangeContext";

// Preset toggle row; "Custom" opens a popover with two free DatePickers
// (replaces the paid-tier DateRangePicker).
function TimeRangeSelector() {
    const { preset, custom, setPreset, setCustom, from, to } = useTimeRange();
    const { dataset } = useDataset();
    const [anchorEl, setAnchorEl] = useState(null);
    const [draftFrom, setDraftFrom] = useState(null);
    const [draftTo, setDraftTo] = useState(null);

    const openCustom = (event) => {
        setDraftFrom(custom.from ? dayjs(custom.from) : null);
        setDraftTo(custom.to ? dayjs(custom.to) : null);
        setAnchorEl(event.currentTarget);
    };

    const applyCustom = () => {
        setCustom(
            draftFrom ? draftFrom.format("YYYY-MM-DD") : null,
            draftTo ? draftTo.format("YYYY-MM-DD") : null,
        );
        setAnchorEl(null);
    };

    const minDate = dataset?.firstPlay ? dayjs(dataset.firstPlay) : undefined;
    const maxDate = dataset?.lastPlay ? dayjs(dataset.lastPlay) : undefined;

    const rangeCaption =
        preset === "life"
            ? "All time"
            : `${from ? dayjs(from).format("MMM D, YYYY") : "…"} – ${
                  to ? dayjs(to).format("MMM D, YYYY") : "latest play"
              }`;

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <ToggleButtonGroup
                value={preset}
                exclusive
                size="small"
                onChange={(event, next) => {
                    if (!next) return;
                    if (next === "custom") openCustom(event);
                    else setPreset(next);
                }}
                sx={{
                    "& .MuiToggleButton-root": { px: 1.5, textTransform: "none" },
                    "& .Mui-selected": { color: "primary.light" },
                }}
            >
                {PRESETS.map((p) => (
                    <ToggleButton key={p.id} value={p.id}>
                        {p.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
                {rangeCaption}
            </Typography>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <Stack spacing={2} sx={{ p: 2, width: 280 }}>
                    <DatePicker
                        label="From"
                        value={draftFrom}
                        onChange={setDraftFrom}
                        minDate={minDate}
                        maxDate={draftTo ?? maxDate}
                        slotProps={{ textField: { size: "small" } }}
                    />
                    <DatePicker
                        label="To"
                        value={draftTo}
                        onChange={setDraftTo}
                        minDate={draftFrom ?? minDate}
                        maxDate={maxDate}
                        slotProps={{ textField: { size: "small" } }}
                    />
                    <Button variant="contained" onClick={applyCustom} disabled={!draftFrom && !draftTo}>
                        Apply
                    </Button>
                </Stack>
            </Popover>
        </Box>
    );
}

export default TimeRangeSelector;
