import { useState } from "react";

import {
    Box,
    Button,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Typography,
} from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import HeadphonesRoundedIcon from "@mui/icons-material/HeadphonesRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MenuIcon from "@mui/icons-material/Menu";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import { Link, useLocation } from "react-router-dom";

import { BRAND_GRADIENT } from "../../theme";
import SearchBox from "./SearchBox";

const PAGES = [
    { label: "Dashboard", to: "/", icon: SpaceDashboardRoundedIcon },
    { label: "Top", to: "/top", icon: EmojiEventsRoundedIcon },
    { label: "Trends", to: "/trends", icon: BarChartRoundedIcon },
    { label: "History", to: "/history", icon: HistoryRoundedIcon },
    { label: "Import", to: "/import", icon: FileUploadRoundedIcon },
];

function isActive(pathname, to) {
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

const Navbar = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const { pathname } = useLocation();

    const brand = (
        <Box
            component={Link}
            to="/"
            sx={{ display: "flex", alignItems: "center", gap: 1, textDecoration: "none", color: "#fff" }}
        >
            <HeadphonesRoundedIcon />
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
                YT Music Stats
            </Typography>
        </Box>
    );

    return (
        <Box>
            {/* Desktop */}
            <Box
                sx={{
                    display: { sm: "flex", xs: "none" },
                    gap: 1,
                    px: 3,
                    py: 1.5,
                    alignItems: "center",
                    background: BRAND_GRADIENT,
                }}
            >
                {brand}
                <Box sx={{ display: "flex", gap: 0.5, ml: 3, flex: 1 }}>
                    {PAGES.map(({ label, to }) => (
                        <Button
                            key={to}
                            component={Link}
                            to={to}
                            sx={{
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: isActive(pathname, to) ? 700 : 400,
                                borderRadius: 999,
                                px: 1.5,
                                py: 0.5,
                                bgcolor: isActive(pathname, to) ? "rgba(255,255,255,0.18)" : "transparent",
                                "&:hover": {
                                    bgcolor: isActive(pathname, to)
                                        ? "rgba(255,255,255,0.24)"
                                        : "rgba(255,255,255,0.08)",
                                },
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Box>
                <Box sx={{ display: { md: "block", xs: "none" } }}>
                    <SearchBox compact />
                </Box>
            </Box>

            {/* Mobile */}
            <Box
                sx={{
                    display: { sm: "none", xs: "flex" },
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    background: BRAND_GRADIENT,
                }}
            >
                <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ color: "#fff" }}>
                    <MenuIcon />
                </IconButton>
                {brand}
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    {PAGES.map(({ label, to, icon: Icon }) => (
                        <MenuItem
                            key={to}
                            component={Link}
                            to={to}
                            selected={isActive(pathname, to)}
                            onClick={() => setAnchorEl(null)}
                        >
                            <ListItemIcon>
                                <Icon fontSize="small" />
                            </ListItemIcon>
                            <Typography variant="body2">{label}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
            </Box>
        </Box>
    );
};

export default Navbar;
