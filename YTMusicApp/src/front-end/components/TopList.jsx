import { Box, Chip, List, ListItem, ListItemButton, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import { formatNumber } from "../../utils/format";
import Artwork from "./Artwork";
import RankBadge from "./RankBadge";

function detailRoute(type, item) {
    if (type === "artist") return `/artist/${encodeURIComponent(item.artistKey)}`;
    if (type === "song") return `/song/${item.videoId}`;
    return item.albumKey ? `/album/${encodeURIComponent(item.albumKey)}` : null;
}

function primaryText(type, item) {
    if (type === "artist") return item.name;
    if (type === "song") return item.title;
    return item.album;
}

function secondaryText(type, item) {
    if (type === "artist") {
        const songs = `${formatNumber(item.uniqueSongs)} song${item.uniqueSongs === 1 ? "" : "s"}`;
        return item.topSongTitle ? `${songs} · top: ${item.topSongTitle}` : songs;
    }
    if (type === "song") return item.album ? `${item.artist} · ${item.album}` : item.artist;
    return `${item.artist} · ${formatNumber(item.songCount)} song${item.songCount === 1 ? "" : "s"}`;
}

function RowContent({ type, item }) {
    return (
        <>
            <RankBadge rank={item.rank} />
            <Artwork
                src={type === "album" ? item.artUrl : item.thumbnail}
                alt={primaryText(type, item)}
                type={type}
                circular={type === "artist"}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap>{primaryText(type, item)}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                    {secondaryText(type, item)}
                </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
                <Chip
                    size="small"
                    label={`${formatNumber(item.plays)} plays`}
                    sx={{ bgcolor: "rgba(139, 92, 246, 0.15)", color: "primary.light", fontWeight: 600 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {formatNumber(item.minutes)} min{item.estimated ? " (est.)" : ""}
                </Typography>
            </Box>
        </>
    );
}

// Ranked list used for top artists/songs/albums and artist-page song lists.
function TopList({ items, type }) {
    return (
        <List disablePadding>
            {items.map((item) => {
                const route = detailRoute(type, item);
                const rowSx = { display: "flex", alignItems: "center", gap: 2, px: 1.5, py: 1, borderRadius: 2 };
                return route ? (
                    <ListItemButton key={item.rank} component={Link} to={route} sx={rowSx}>
                        <RowContent type={type} item={item} />
                    </ListItemButton>
                ) : (
                    <ListItem key={item.rank} sx={rowSx}>
                        <RowContent type={type} item={item} />
                    </ListItem>
                );
            })}
        </List>
    );
}

export default TopList;
