import { Avatar, Box, Card, CardContent, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

import { BRAND_GRADIENT, CHART_COLORS } from "../../theme";

// Big-number tile: gradient icon, tabular-nums value, optional sparkline and
// "estimated" info marker (shown until enrichment caches real durations).
function StatCard({ icon: Icon, label, value, subValue, estimated = false, spark = null }) {
    return (
        <Card>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ background: BRAND_GRADIENT, width: 40, height: 40 }}>
                        <Icon sx={{ fontSize: 22 }} />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {label}
                    </Typography>
                    {estimated && (
                        <Tooltip title="Estimated — track durations are still being enriched">
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        </Tooltip>
                    )}
                </Box>
                <Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                    {value}
                </Typography>
                {subValue && (
                    <Typography variant="caption" color="text.secondary">
                        {subValue}
                    </Typography>
                )}
                {spark && spark.length > 1 && (
                    <Box sx={{ mx: -1, mb: -1 }}>
                        <SparkLineChart
                            data={spark}
                            height={44}
                            colors={[CHART_COLORS[0]]}
                            area
                            curve="monotoneX"
                            sx={{ ".MuiAreaElement-root": { opacity: 0.25 } }}
                        />
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}

export default StatCard;
