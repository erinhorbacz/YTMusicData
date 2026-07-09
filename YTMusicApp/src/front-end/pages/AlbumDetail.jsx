import { Box, Chip, Stack, Typography } from "@mui/material";
import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import { LineChart } from "@mui/x-charts/LineChart";
import { Link, useParams } from "react-router-dom";

import { useApi } from "../../api/hooks";
import { useRangeParams } from "../../context/TimeRangeContext";
import { CHART_COLORS } from "../../theme";
import { formatDate, formatNumber } from "../../utils/format";
import Artwork from "../components/Artwork";
import EmptyState from "../components/EmptyState";
import { PageSkeleton } from "../components/LoadingSkeletons";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import TimeRangeSelector from "../components/TimeRangeSelector";
import TopList from "../components/TopList";

function AlbumDetail() {
    const { albumKey } = useParams();
    const rangeParams = useRangeParams();
    const { data, loading, error } = useApi(`/album/${encodeURIComponent(albumKey)}`, rangeParams);

    if (loading && !data) return <PageSkeleton />;
    if (error) {
        return error.status === 404 ? (
            <EmptyState
                title="Album not found"
                message="This album isn't in the loaded history — or enrichment hasn't discovered it yet (check the Import page for progress)."
            />
        ) : (
            <EmptyState title="Couldn't load this album" message={error.message} />
        );
    }
    if (!data) return <PageSkeleton />;

    const songs = data.songs.map((song, i) => ({ ...song, rank: i + 1, album: null }));

    return (
        <Stack spacing={3}>
            <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
                <Artwork src={data.artUrl} alt={data.album} size={120} type="album" />
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Typography variant="h3">{data.album}</Typography>
                    <Typography
                        component={Link}
                        to={`/artist/${encodeURIComponent(data.artistKey)}`}
                        variant="h6"
                        sx={{
                            color: "primary.light",
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                        }}
                    >
                        {data.artist}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                        {data.rank && (
                            <Chip
                                icon={<TagRoundedIcon />}
                                label={`#${data.rank} album in range`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        <Chip
                            label={`${formatNumber(data.songCount)} song${data.songCount === 1 ? "" : "s"} in your history`}
                            size="small"
                            variant="outlined"
                        />
                        <Chip
                            label={`First listened ${formatDate(data.firstPlayed)}`}
                            size="small"
                            variant="outlined"
                        />
                        <Chip
                            label={`Last listened ${formatDate(data.lastPlayed)}`}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                </Box>
            </Box>

            <TimeRangeSelector />

            {data.plays === 0 ? (
                <EmptyState
                    title="No plays in this range"
                    message={`You didn't listen to ${data.album} in the selected period — try Lifetime.`}
                />
            ) : (
                <>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                        }}
                    >
                        <StatCard
                            icon={PlayArrowRoundedIcon}
                            label="Streams"
                            value={formatNumber(data.plays)}
                        />
                        <StatCard
                            icon={HeadphonesRoundedIcon}
                            label="Minutes listened"
                            value={formatNumber(data.minutes)}
                            estimated={data.estimated}
                        />
                        <StatCard
                            icon={LibraryMusicRoundedIcon}
                            label="Songs played"
                            value={formatNumber(data.songsInRange)}
                            subValue={`of ${formatNumber(data.songCount)} in your history`}
                        />
                    </Box>

                    {data.timeline.length > 1 && (
                        <SectionCard title="Streams per month">
                            <LineChart
                                height={260}
                                xAxis={[
                                    {
                                        data: data.timeline.map((p) => p.label),
                                        scaleType: "point",
                                        tickLabelStyle: { fontSize: 11 },
                                    },
                                ]}
                                series={[
                                    {
                                        data: data.timeline.map((p) => p.plays),
                                        label: "Streams",
                                        color: CHART_COLORS[0],
                                        area: true,
                                        showMark: false,
                                        curve: "monotoneX",
                                    },
                                ]}
                                slotProps={{ legend: { hidden: true } }}
                                grid={{ horizontal: true }}
                                sx={{ ".MuiAreaElement-root": { opacity: 0.2 } }}
                                margin={{ left: 55, right: 20 }}
                            />
                        </SectionCard>
                    )}

                    <SectionCard
                        title="Top songs from this album"
                        subheader={`${formatNumber(songs.length)} song${songs.length === 1 ? "" : "s"} played in range`}
                        disablePadding
                    >
                        <TopList items={songs} type="song" />
                    </SectionCard>
                </>
            )}
        </Stack>
    );
}

export default AlbumDetail;
