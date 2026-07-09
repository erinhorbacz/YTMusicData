import { Box, Chip, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import AlbumRoundedIcon from "@mui/icons-material/AlbumRounded";
import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import { BarChart } from "@mui/x-charts/BarChart";
import { Link, useParams } from "react-router-dom";

import { useApi } from "../../api/hooks";
import { useRangeParams } from "../../context/TimeRangeContext";
import { CHART_COLORS } from "../../theme";
import { formatDate, formatNumber, formatTrackLength, fromNow } from "../../utils/format";
import Artwork from "../components/Artwork";
import EmptyState from "../components/EmptyState";
import { PageSkeleton } from "../components/LoadingSkeletons";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import TimeRangeSelector from "../components/TimeRangeSelector";

function SongDetail() {
    const { videoId } = useParams();
    const rangeParams = useRangeParams();
    const { data, loading, error } = useApi(`/song/${videoId}`, rangeParams);

    if (loading && !data) return <PageSkeleton />;
    if (error) {
        return error.status === 404 ? (
            <EmptyState
                title="Song not found"
                message="This song doesn't appear in the loaded listening history."
            />
        ) : (
            <EmptyState title="Couldn't load this song" message={error.message} />
        );
    }
    if (!data) return <PageSkeleton />;

    const trackLength = formatTrackLength(data.durationSec);

    return (
        <Stack spacing={3}>
            <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
                <Artwork src={data.thumbnail} alt={data.title} size={120} />
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Typography variant="h4">{data.title}</Typography>
                    <Typography
                        component={Link}
                        to={`/artist/${encodeURIComponent(data.artistKey)}`}
                        variant="h6"
                        sx={{ color: "primary.light", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                    >
                        {data.artist}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                        {data.rank && (
                            <Chip
                                icon={<TagRoundedIcon />}
                                label={`#${data.rank} song in range`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        {data.album && (
                            <Chip icon={<AlbumRoundedIcon />} label={data.album} size="small" variant="outlined" />
                        )}
                        {trackLength && (
                            <Chip icon={<ScheduleRoundedIcon />} label={trackLength} size="small" variant="outlined" />
                        )}
                    </Box>
                </Box>
            </Box>

            <TimeRangeSelector />

            {data.plays === 0 ? (
                <EmptyState
                    title="No plays in this range"
                    message="You didn't play this song in the selected period — try Lifetime."
                />
            ) : (
                <>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                        }}
                    >
                        <StatCard icon={PlayArrowRoundedIcon} label="Plays" value={formatNumber(data.plays)} />
                        <StatCard
                            icon={HeadphonesRoundedIcon}
                            label="Minutes"
                            value={formatNumber(data.minutes)}
                            estimated={data.estimated}
                        />
                        <StatCard
                            icon={ScheduleRoundedIcon}
                            label="First played"
                            value={formatDate(data.firstPlayed)}
                        />
                        <StatCard
                            icon={ScheduleRoundedIcon}
                            label="Last played"
                            value={formatDate(data.lastPlayed)}
                        />
                    </Box>

                    {data.timeline.length > 1 && (
                        <SectionCard title="Plays per month">
                            <BarChart
                                height={260}
                                xAxis={[
                                    {
                                        data: data.timeline.map((p) => p.label),
                                        scaleType: "band",
                                        tickLabelStyle: { fontSize: 11 },
                                    },
                                ]}
                                series={[
                                    {
                                        data: data.timeline.map((p) => p.plays),
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
                    )}

                    <SectionCard title="Recent plays" disablePadding>
                        <List dense>
                            {data.recentPlays.map((play, i) => (
                                <ListItem key={`${play.time}-${i}`}>
                                    <ListItemText
                                        primary={formatDate(play.time)}
                                        secondary={fromNow(play.time)}
                                        primaryTypographyProps={{ variant: "body2" }}
                                        secondaryTypographyProps={{ variant: "caption" }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </SectionCard>
                </>
            )}
        </Stack>
    );
}

export default SongDetail;
