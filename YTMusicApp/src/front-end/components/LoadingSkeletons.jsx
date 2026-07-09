import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material";

// Skeleton variants shown while a page loads its first data (the reveal
// pattern carried over from the original FakeLanding component).

export function StatRowSkeleton({ count = 4 }) {
    return (
        <Box
            sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${count}, 1fr)` },
            }}
        >
            {Array.from({ length: count }, (_, i) => (
                <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            ))}
        </Box>
    );
}

export function ListSkeleton({ rows = 5 }) {
    return (
        <Stack spacing={1.5} sx={{ p: 1 }}>
            {Array.from({ length: rows }, (_, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="rounded" width={56} height={56} sx={{ borderRadius: 2 }} />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton width="60%" />
                        <Skeleton width="35%" />
                    </Box>
                </Box>
            ))}
        </Stack>
    );
}

export function ChartSkeleton({ height = 300 }) {
    return <Skeleton variant="rounded" height={height} sx={{ borderRadius: 3 }} />;
}

export function CardSkeleton({ height = 300 }) {
    return (
        <Card>
            <CardContent>
                <Skeleton width="40%" sx={{ mb: 2 }} />
                <ChartSkeleton height={height - 80} />
            </CardContent>
        </Card>
    );
}

export function PageSkeleton() {
    return (
        <Stack spacing={3}>
            <Skeleton variant="rounded" height={48} width="50%" sx={{ borderRadius: 3 }} />
            <StatRowSkeleton />
            <ChartSkeleton />
        </Stack>
    );
}
