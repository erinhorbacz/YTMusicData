import { useState } from "react";

import { Alert, Box, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { useSearchParams } from "react-router-dom";

import { useApi } from "../../api/hooks";
import { useRangeParams } from "../../context/TimeRangeContext";
import { CHART_COLORS } from "../../theme";
import { formatNumber } from "../../utils/format";
import EmptyState from "../components/EmptyState";
import { ChartSkeleton, ListSkeleton } from "../components/LoadingSkeletons";
import SectionCard from "../components/SectionCard";
import TimeRangeSelector from "../components/TimeRangeSelector";
import TopList from "../components/TopList";

const TABS = [
    { id: "songs", label: "Songs", endpoint: "/top/songs", type: "song" },
    { id: "artists", label: "Artists", endpoint: "/top/artists", type: "artist" },
    { id: "albums", label: "Albums", endpoint: "/top/albums", type: "album" },
];

const PAGE_SIZE = 50;

function TopCharts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabId = TABS.some((t) => t.id === searchParams.get("tab"))
        ? searchParams.get("tab")
        : "songs";
    const tab = TABS.find((t) => t.id === tabId);
    const rangeParams = useRangeParams();
    const [limit, setLimit] = useState(PAGE_SIZE);

    const { data, loading } = useApi(tab.endpoint, { ...rangeParams, limit });

    const top10 = data?.items.slice(0, 10) ?? [];
    // Rank prefix keeps band-scale categories unique — two songs named
    // "Intro" would otherwise collapse into one bar.
    const chartLabel = (item) =>
        `${item.rank}. ${tab.type === "artist" ? item.name : tab.type === "song" ? item.title : item.album}`;

    const albumCoverageLow =
        tab.id === "albums" &&
        data?.coverage &&
        data.coverage.totalSongs > 0 &&
        data.coverage.songsWithAlbum / data.coverage.totalSongs < 0.5;

    return (
        <Stack spacing={3}>
            <Typography variant="h4">Top charts</Typography>
            <TimeRangeSelector />
            <Tabs
                value={tabId}
                onChange={(event, next) => {
                    setLimit(PAGE_SIZE);
                    setSearchParams({ tab: next });
                }}
                textColor="inherit"
                sx={{ "& .MuiTabs-indicator": { bgcolor: "primary.light" } }}
            >
                {TABS.map((t) => (
                    <Tab key={t.id} value={t.id} label={t.label} sx={{ textTransform: "none" }} />
                ))}
            </Tabs>

            {albumCoverageLow && (
                <Alert severity="info" variant="outlined">
                    Album data covers {formatNumber(data.coverage.songsWithAlbum)} of{" "}
                    {formatNumber(data.coverage.totalSongs)} songs so far — this chart fills in as
                    enrichment runs.
                </Alert>
            )}

            {loading && !data ? (
                <>
                    <ChartSkeleton height={380} />
                    <ListSkeleton rows={8} />
                </>
            ) : !data || data.items.length === 0 ? (
                <EmptyState
                    title={`No ${tab.label.toLowerCase()} in this range`}
                    message={
                        tab.id === "albums"
                            ? "Album stats appear once enrichment has looked up your songs. Check the Import page for enrichment status."
                            : "Try a wider time range."
                    }
                />
            ) : (
                <>
                    <SectionCard title={`Top 10 by plays`}>
                        <BarChart
                            height={Math.max(280, top10.length * 38)}
                            layout="horizontal"
                            yAxis={[
                                {
                                    data: top10.map(chartLabel),
                                    scaleType: "band",
                                    tickLabelStyle: { fontSize: 12 },
                                },
                            ]}
                            xAxis={[{ tickLabelStyle: { fontSize: 11 } }]}
                            series={[
                                {
                                    data: top10.map((item) => item.plays),
                                    label: "Plays",
                                    color: CHART_COLORS[0],
                                },
                            ]}
                            slotProps={{ legend: { hidden: true } }}
                            grid={{ vertical: true }}
                            margin={{ left: 170, right: 20 }}
                            borderRadius={4}
                        />
                    </SectionCard>

                    <SectionCard
                        title={`All ${tab.label.toLowerCase()}`}
                        subheader={`${formatNumber(data.total)} total`}
                        disablePadding
                    >
                        <TopList items={data.items} type={tab.type} />
                        {data.items.length < data.total && (
                            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                                <Button
                                    variant="outlined"
                                    endIcon={<ExpandMoreRoundedIcon />}
                                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                                    disabled={loading}
                                >
                                    Load more
                                </Button>
                            </Box>
                        )}
                    </SectionCard>
                </>
            )}
        </Stack>
    );
}

export default TopCharts;
