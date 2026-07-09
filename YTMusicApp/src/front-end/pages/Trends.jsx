import { useState } from "react";

import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";

import { useApi } from "../../api/hooks";
import { useRangeParams } from "../../context/TimeRangeContext";
import { CHART_COLORS } from "../../theme";
import { WEEKDAY_LABELS, formatDate, formatNumber, hourLabel } from "../../utils/format";
import EmptyState from "../components/EmptyState";
import HeatmapGrid from "../components/HeatmapGrid";
import { CardSkeleton, StatRowSkeleton } from "../components/LoadingSkeletons";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import TimeRangeSelector from "../components/TimeRangeSelector";

function Trends() {
    const rangeParams = useRangeParams();
    const [bucket, setBucket] = useState("month");
    const [metric, setMetric] = useState("plays");

    const { data: trends, loading: trendsLoading } = useApi("/trends", { ...rangeParams, bucket });
    const { data: patterns, loading: patternsLoading } = useApi("/patterns", rangeParams);
    const { data: streaks, loading: streaksLoading } = useApi("/streaks", rangeParams);

    const hasData = trends && trends.points.some((p) => p.plays > 0);

    return (
        <Stack spacing={3}>
            <Typography variant="h4">Trends & patterns</Typography>
            <TimeRangeSelector />

            {/* Listening over time */}
            {trendsLoading && !trends ? (
                <CardSkeleton height={380} />
            ) : !hasData ? (
                <EmptyState title="No plays in this range" message="Try a wider time range." />
            ) : (
                <SectionCard
                    title="Listening over time"
                    action={
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <ToggleButtonGroup
                                value={metric}
                                exclusive
                                size="small"
                                onChange={(e, v) => v && setMetric(v)}
                                sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.5 } }}
                            >
                                <ToggleButton value="plays">Plays</ToggleButton>
                                <ToggleButton value="minutes">Minutes</ToggleButton>
                            </ToggleButtonGroup>
                            <ToggleButtonGroup
                                value={bucket}
                                exclusive
                                size="small"
                                onChange={(e, v) => v && setBucket(v)}
                                sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.5 } }}
                            >
                                <ToggleButton value="day">Day</ToggleButton>
                                <ToggleButton value="week">Week</ToggleButton>
                                <ToggleButton value="month">Month</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    }
                >
                    <LineChart
                        height={320}
                        xAxis={[
                            {
                                data: trends.points.map((p) => p.label),
                                scaleType: "point",
                                tickLabelStyle: { fontSize: 11 },
                            },
                        ]}
                        series={[
                            {
                                data: trends.points.map((p) => p[metric]),
                                label: metric === "plays" ? "Plays" : "Minutes",
                                color: CHART_COLORS[0],
                                area: true,
                                showMark: false,
                                curve: "monotoneX",
                            },
                        ]}
                        slotProps={{ legend: { hidden: true } }}
                        grid={{ horizontal: true }}
                        sx={{ ".MuiAreaElement-root": { opacity: 0.2 } }}
                        margin={{ left: 60, right: 20 }}
                    />
                </SectionCard>
            )}

            {/* When you listen */}
            {patternsLoading && !patterns ? (
                <CardSkeleton height={320} />
            ) : (
                patterns &&
                hasData && (
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" },
                        }}
                    >
                        <SectionCard
                            title="When you listen"
                            subheader={
                                patterns.peakHour != null
                                    ? `Peak: ${WEEKDAY_LABELS[patterns.peakDay]}s around ${hourLabel(patterns.peakHour)}`
                                    : undefined
                            }
                        >
                            <HeatmapGrid matrix={patterns.matrix} />
                        </SectionCard>
                        <SectionCard title="Plays by weekday">
                            <BarChart
                                height={260}
                                xAxis={[{ data: WEEKDAY_LABELS, scaleType: "band" }]}
                                series={[
                                    {
                                        data: patterns.dayOfWeek,
                                        label: "Plays",
                                        color: CHART_COLORS[0],
                                    },
                                ]}
                                slotProps={{ legend: { hidden: true } }}
                                grid={{ horizontal: true }}
                                borderRadius={4}
                                margin={{ left: 55 }}
                            />
                        </SectionCard>
                    </Box>
                )
            )}

            {/* Streaks */}
            {streaksLoading && !streaks ? (
                <StatRowSkeleton />
            ) : (
                streaks &&
                streaks.activeDays > 0 && (
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                        }}
                    >
                        <StatCard
                            icon={LocalFireDepartmentRoundedIcon}
                            label="Longest streak"
                            value={`${formatNumber(streaks.longest.days)} days`}
                            subValue={`${formatDate(streaks.longest.start)} – ${formatDate(streaks.longest.end)}`}
                        />
                        <StatCard
                            icon={BoltRoundedIcon}
                            label="Latest streak"
                            value={`${formatNumber(streaks.current.days)} days`}
                            subValue={`ended ${formatDate(streaks.current.end)}`}
                        />
                        <StatCard
                            icon={EmojiEventsRoundedIcon}
                            label="Most active day"
                            value={`${formatNumber(streaks.mostActiveDay.plays)} plays`}
                            subValue={formatDate(streaks.mostActiveDay.date)}
                        />
                        <StatCard
                            icon={CalendarMonthRoundedIcon}
                            label="Active days"
                            value={formatNumber(streaks.activeDays)}
                            subValue={`of ${formatNumber(streaks.totalDays)} in range`}
                        />
                    </Box>
                )
            )}
        </Stack>
    );
}

export default Trends;
