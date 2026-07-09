import { useEffect, useMemo, useRef, useState } from "react";

import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useNavigate } from "react-router-dom";

import client from "../../api/client";
import { formatNumber } from "../../utils/format";
import Artwork from "./Artwork";

// Debounced /api/search autocomplete; picking a result navigates to the
// artist or song detail page (replaces the original dead Search button).
function SearchBox({ compact = false }) {
    const navigate = useNavigate();
    const [input, setInput] = useState("");
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        clearTimeout(debounceRef.current);
        const q = input.trim();
        if (q.length < 2) {
            setOptions([]);
            setLoading(false);
            return undefined;
        }
        setLoading(true);
        const controller = new AbortController();
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await client.get("/search", { params: { q }, signal: controller.signal });
                if (controller.signal.aborted) return;
                setOptions([
                    ...res.data.artists.map((a) => ({ ...a, type: "artist" })),
                    ...res.data.songs.map((s) => ({ ...s, type: "song" })),
                    ...(res.data.albums ?? []).map((al) => ({ ...al, type: "album" })),
                ]);
                setLoading(false);
            } catch {
                // An aborted request must not clobber the next search's state.
                if (controller.signal.aborted) return;
                setOptions([]);
                setLoading(false);
            }
        }, 250);
        return () => {
            clearTimeout(debounceRef.current);
            controller.abort();
        };
    }, [input]);

    const width = useMemo(
        () => (compact ? 260 : { xs: 300, sm: 500, md: 620 }),
        [compact],
    );

    return (
        <Autocomplete
            size={compact ? "small" : "medium"}
            options={options}
            filterOptions={(x) => x} // server already filtered
            loading={loading}
            groupBy={(option) =>
                option.type === "artist" ? "Artists" : option.type === "song" ? "Songs" : "Albums"
            }
            getOptionLabel={(option) => option.name ?? option.title ?? option.album ?? ""}
            isOptionEqualToValue={(option, value) =>
                option.type === value.type &&
                (option.type === "artist"
                    ? option.artistKey === value.artistKey
                    : option.type === "album"
                      ? option.albumKey === value.albumKey
                      : option.videoId === value.videoId)
            }
            noOptionsText={input.trim().length < 2 ? "Type to search your library" : "No matches in your history"}
            onInputChange={(event, value) => setInput(value)}
            onChange={(event, option) => {
                if (!option) return;
                navigate(
                    option.type === "artist"
                        ? `/artist/${encodeURIComponent(option.artistKey)}`
                        : option.type === "album"
                          ? `/album/${encodeURIComponent(option.albumKey)}`
                          : `/song/${option.videoId}`,
                );
            }}
            renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <Artwork
                        src={option.thumbnail ?? option.artUrl}
                        alt=""
                        size={36}
                        type={option.type}
                        circular={option.type === "artist"}
                    />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                            {option.name ?? option.title ?? option.album}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {option.type === "artist"
                                ? `${formatNumber(option.plays)} plays`
                                : `${option.artist} · ${formatNumber(option.plays)} plays`}
                        </Typography>
                    </Box>
                </Box>
            )}
            sx={{ width }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Search artists, songs & albums"
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <SearchRoundedIcon sx={{ color: "text.secondary", mr: 0.5, fontSize: 20 }} />
                        ),
                    }}
                />
            )}
        />
    );
}

export default SearchBox;
