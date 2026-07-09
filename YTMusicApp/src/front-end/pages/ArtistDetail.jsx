import { Box, Chip, Stack, Typography } from "@mui/material";
import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import { LineChart } from "@mui/x-charts/LineChart";
import { useParams } from "react-router-dom";

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

function ArtistDetail() {
    const { artistKey } = useParams();
    const rangeParams = useRangeParams();
    const { data, loading, error } = useApi(
        `/artist/${encodeURIComponent(artistKey)}`,
        rangeParams,
    );

    if (loading && !data) return <PageSkeleton />;
    if (error) {
        return error.status === 404 ? (
            <EmptyState
                title="Artist not found"
                message="This artist doesn't appear in the loaded listening history."
            />
        ) : (
            <EmptyState title="Couldn't load this artist" message={error.message} />
        );
    }
    if (!data) return <PageSkeleton />;

    // Song list already carries rank-relevant ordering; add ranks for TopList.
    const songs = data.songs.map((song, i) => ({ ...song, rank: i + 1, artist: data.name }));

    return (
        <Stack spacing={3}>
            <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
                <Artwork src={data.image} alt={data.name} size={120} type="artist" circular />
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Typography variant="h3">{data.name}</Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                        {data.rank && (
                            <Chip
                                icon={<TagRoundedIcon />}
                                label={`#${data.rank} artist in range`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
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
                    message={`You didn't listen to ${data.name} in the selected period — try Lifetime.`}
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
                            label="Plays"
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
                            value={formatNumber(data.uniqueSongs)}
                        />
                    </Box>

                    {data.albums.length > 0 && (
                        <SectionCard
                            title="Top albums"
                            subheader={`${formatNumber(data.albums.length)} album${data.albums.length === 1 ? "" : "s"} in range`}
                            disablePadding
                        >
                            <TopList items={data.albums} type="album" />
                        </SectionCard>
                    )}

                    {data.timeline.length > 1 && (
                        <SectionCard title="Plays per month">
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
                                margin={{ left: 55, right: 20 }}
                            />
                        </SectionCard>
                    )}

                    <SectionCard title="Songs" subheader={`${formatNumber(songs.length)} songs in range`} disablePadding>
                        <TopList items={songs} type="song" />
                    </SectionCard>
                </>
            )}
        </Stack>
    );
}

export default ArtistDetail;
