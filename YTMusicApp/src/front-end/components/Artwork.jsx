import { useEffect, useState } from "react";

import { Avatar } from "@mui/material";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AlbumRoundedIcon from "@mui/icons-material/AlbumRounded";

const FALLBACK_ICONS = {
    song: MusicNoteRoundedIcon,
    artist: PersonRoundedIcon,
    album: AlbumRoundedIcon,
};

// Square thumbnail (i.ytimg.com hqdefault) with a themed icon fallback.
function Artwork({ src, alt, size = 56, type = "song", circular = false }) {
    const [errored, setErrored] = useState(false);
    // Reused rows get new srcs — a previous load failure must not stick.
    useEffect(() => setErrored(false), [src]);
    const Icon = FALLBACK_ICONS[type] ?? MusicNoteRoundedIcon;
    const showImage = src && !errored;
    return (
        <Avatar
            variant={circular ? "circular" : "rounded"}
            src={showImage ? src : undefined}
            alt={alt}
            imgProps={{ onError: () => setErrored(true), loading: "lazy" }}
            sx={{
                width: size,
                height: size,
                borderRadius: circular ? "50%" : 2,
                bgcolor: "rgba(139, 92, 246, 0.12)",
                color: "primary.light",
            }}
        >
            <Icon sx={{ fontSize: size * 0.5 }} />
        </Avatar>
    );
}

export default Artwork;
