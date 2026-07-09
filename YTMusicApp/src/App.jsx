import { Alert, Box, Container } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Navigate, Route, Routes } from "react-router-dom";

import { DatasetProvider, useDataset } from "./context/DatasetContext";
import { TimeRangeProvider } from "./context/TimeRangeContext";
import EnrichmentBanner from "./front-end/components/EnrichmentBanner";
import Navbar from "./front-end/components/Navbar";
import AlbumDetail from "./front-end/pages/AlbumDetail";
import ArtistDetail from "./front-end/pages/ArtistDetail";
import Dashboard from "./front-end/pages/Dashboard";
import History from "./front-end/pages/History";
import Import from "./front-end/pages/Import";
import SongDetail from "./front-end/pages/SongDetail";
import TopCharts from "./front-end/pages/TopCharts";
import Trends from "./front-end/pages/Trends";
import theme from "./theme";

function ServerDownAlert() {
    const { serverDown } = useDataset();
    if (!serverDown) return null;
    return (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
            Can't reach the stats server — start it with <code>npm run dev</code> (it listens on
            port 5001).
        </Alert>
    );
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatasetProvider>
                    <TimeRangeProvider>
                        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
                            <Navbar />
                            <EnrichmentBanner />
                            <ServerDownAlert />
                            <Container maxWidth="lg" sx={{ py: 3 }}>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/top" element={<TopCharts />} />
                                    <Route path="/trends" element={<Trends />} />
                                    <Route path="/history" element={<History />} />
                                    <Route path="/artist/:artistKey" element={<ArtistDetail />} />
                                    <Route path="/album/:albumKey" element={<AlbumDetail />} />
                                    <Route path="/song/:videoId" element={<SongDetail />} />
                                    <Route path="/import" element={<Import />} />
                                    {/* old bookmarks */}
                                    <Route path="/Charts" element={<Navigate to="/top" replace />} />
                                    <Route path="/Stats" element={<Navigate to="/trends" replace />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Container>
                        </Box>
                    </TimeRangeProvider>
                </DatasetProvider>
            </LocalizationProvider>
        </ThemeProvider>
    );
}

export default App;
