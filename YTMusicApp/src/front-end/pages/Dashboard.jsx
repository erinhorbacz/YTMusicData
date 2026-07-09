import { Box, Fade, Stack, Typography } from "@mui/material";
import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { LineChart } from "@mui/x-charts/LineChart";
import { Link } from "react-router-dom";

import { useApi } from "../../api/hooks";
import { useDataset } from "../../context/DatasetContext";
import { useRangeParams } from "../../context/TimeRangeContext";
import { CHART_COLORS, gradientTextSx } from "../../theme";
import { formatDate, formatNumber, fromNow, humanizeMinutes } from "../../utils/format";
import Artwork from "../components/Artwork";
import EmptyState from "../components/EmptyState";
import { ListSkeleton, PageSkeleton } from "../components/LoadingSkeletons";
import SearchBox from "../components/SearchBox";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import TimeRangeSelector from "../components/TimeRangeSelector";
import TopList from "../components/TopList";

function TopPreview({ title, type, endpoint, seeAllTo, rangeParams }) {
    const { data, loading } = useApi(endpoint, { ...rangeParams, limit: 5 });
    return (
        <SectionCard title={title} seeAllTo={seeAllTo} disablePadding>
            {loading || !data ? (
                <ListSkeleton rows={5} />
            ) : data.items.length === 0 ? (
                <EmptyState
                    title="Nothing here yet"
                    message={
                        type === "album"
                            ? "Albums appear as enrichment fills in album data."
                            : "No plays in this time range."
                    }
                />
            ) : (
                <TopList items={data.items} type={type} />
            )}
        </SectionCard>
    );
}

function Dashboard() {
    const rangeParams = useRangeParams();
    const { dataset } = useDataset();
    const { data: overview, loading } = useApi("/overview", rangeParams);
    const { data: trends } = useApi("/trends", { ...rangeParams, bucket: "month" });
    const { data: recent } = useApi("/recent", { limit: 5 });

    return (
        <Stack spacing={3}>
            <Box sx={{ textAlign: "center", pt: 2 }}>
                <Typography variant="h3" sx={{ ...gradientTextSx, display: "inline-block" }}>
                    Your YT Music, decoded
                </Typography>
                {dataset && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {formatNumber(dataset.musicPlays)} plays · {formatDate(dataset.firstPlay)} –{" "}
                        {formatDate(dataset.lastPlay)}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                    <SearchBox />
                </Box>
            </Box>

            <TimeRangeSelector />

            {loading || !overview ? (
                <PageSkeleton />
            ) : overview.plays === 0 ? (
                <EmptyState
                    title="No plays in this range"
                    message="Try a wider time range, or import a watch-history.json on the Import page."
                />
            ) : (
                <Fade in timeout={{ enter: 800 }}>
                    <Stack spacing={3}>
                        <Box
                            sx={{
                                display: "grid",
                                gap: 2,
                                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                            }}
                        >
                            <StatCard
                                icon={HeadphonesRoundedIcon}
                                label="Minutes listened"
                                value={formatNumber(overview.minutes)}
                                subValue={`≈ ${humanizeMinutes(overview.minutes)} of music`}
                                estimated={overview.estimated}
                                spark={overview.sparkline.map((p) => p.plays)}
                            />
                            <StatCard
                                icon={PlayArrowRoundedIcon}
                                label="Total plays"
                                value={formatNumber(overview.plays)}
                                subValue={`${formatNumber(overview.activeDays)} active days`}
                            />
                            <StatCard
                                icon={PeopleAltRoundedIcon}
                                label="Unique artists"
                                value={formatNumber(overview.uniqueArtists)}
                                subValue={
                                    overview.topArtist ? `#1: ${overview.topArtist.name}` : undefined
                                }
                            />
                            <StatCard
                                icon={LibraryMusicRoundedIcon}
                                label="Unique songs"
                                value={formatNumber(overview.uniqueSongs)}
                                subValue={overview.topSong ? `#1: ${overview.topSong.title}` : undefined}
                            />
                        </Box>

                        <Box
                            sx={{
                                display: "grid",
                                gap: 2,
                                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                            }}
                        >
                            <TopPreview
                                title="Top artists"
                                type="artist"
                                endpoint="/top/artists"
                                seeAllTo="/top?tab=artists"
                                rangeParams={rangeParams}
                            />
                            <TopPreview
                                title="Top songs"
                                type="song"
                                endpoint="/top/songs"
                                seeAllTo="/top?tab=songs"
                                rangeParams={rangeParams}
                            />
                            <TopPreview
                                title="Top albums"
                                type="album"
                                endpoint="/top/albums"
                                seeAllTo="/top?tab=albums"
                                rangeParams={rangeParams}
                            />
                        </Box>

                        {trends && trends.points.length > 1 && (
                            <SectionCard title="Listening over time" seeAllTo="/trends">
                                <LineChart
                                    height={280}
                                    xAxis={[
                                        {
                                            data: trends.points.map((p) => p.label),
                                            scaleType: "point",
                                            tickLabelStyle: { fontSize: 11 },
                                        },
                                    ]}
                                    series={[
                                        {
                                            data: trends.points.map((p) => p.plays),
                                            label: "Plays",
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

                        {recent && recent.items.length > 0 && (
                            <SectionCard title="Recently played" seeAllTo="/history" disablePadding>
                                <Stack sx={{ px: 1, pb: 1 }}>
                                    {recent.items.map((item, i) => (
                                        <Box
                                            key={`${item.time}-${i}`}
                                            component={Link}
                                            to={`/song/${item.videoId}`}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                                p: 1,
                                                borderRadius: 2,
                                                textDecoration: "none",
                                                color: "inherit",
                                                "&:hover": { bgcolor: "rgba(139, 92, 246, 0.08)" },
                                            }}
                                        >
                                            <Artwork src={item.thumbnail} alt={item.title} size={44} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" noWrap>
                                                    {item.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {item.artist}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {fromNow(item.time)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </SectionCard>
                        )}
                    </Stack>
                </Fade>
            )}
        </Stack>
    );
}

export default Dashboard;
