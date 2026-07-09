import { Box, Typography } from "@mui/material";
import MusicOffRoundedIcon from "@mui/icons-material/MusicOffRounded";

function EmptyState({ icon, title, message, action }) {
    const Icon = icon ?? MusicOffRoundedIcon;
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                py: 6,
                px: 2,
                textAlign: "center",
            }}
        >
            <Icon sx={{ fontSize: 48, color: "text.secondary", opacity: 0.6 }} />
            <Typography variant="h6">{title}</Typography>
            {message && (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                    {message}
                </Typography>
            )}
            {action}
        </Box>
    );
}

export default EmptyState;
