import { Box } from "@mui/material";

import { BRAND_GRADIENT } from "../../theme";

// Circle badge; the podium (1-3) wears the brand gradient.
function RankBadge({ rank, size = 28 }) {
    const podium = rank <= 3;
    return (
        <Box
            sx={{
                width: size,
                height: size,
                minWidth: size,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: rank >= 100 ? 10 : 12,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: podium ? "#fff" : "text.secondary",
                background: podium ? BRAND_GRADIENT : "transparent",
                border: podium ? "none" : "1px solid",
                borderColor: "divider",
            }}
        >
            {rank}
        </Box>
    );
}

export default RankBadge;
