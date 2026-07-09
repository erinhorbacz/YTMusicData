import { createTheme } from "@mui/material/styles";

// Brand gradients (violet -> rose)
export const BRAND_GRADIENT = "linear-gradient(120deg, #6D28D9 0%, #BE123C 100%)";
export const TEXT_GRADIENT = "linear-gradient(90deg, #A78BFA, #FB7185)";

// Chart series palette — validated against surface #1E1429 (dark lightness
// band, chroma floor, CVD separation, >=3:1 contrast). Assign in this fixed
// order, never cycled; most charts here are single-series (#8B5CF6 only).
export const CHART_COLORS = ["#8B5CF6", "#F43F5E", "#D97706", "#059669"];

// Sequential single-hue violet ramp for the day x hour heatmap (low values
// recede toward the surface; zero cells wear background.paper).
export const HEATMAP_RAMP = [
    "#2A1B3F",
    "#3D2566",
    "#50308D",
    "#6340B4",
    "#7B55D9",
    "#9573F2",
    "#B79CFA",
];

export const gradientTextSx = {
    background: TEXT_GRADIENT,
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
};

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#8B5CF6", light: "#A78BFA", dark: "#6D28D9" },
        secondary: { main: "#F43F5E", light: "#FB7185", dark: "#BE123C" },
        background: { default: "#120B1D", paper: "#1E1429" },
        text: { primary: "#F4F1FA", secondary: "#A99EC2" },
        divider: "rgba(167, 139, 250, 0.12)",
        success: { main: "#059669" },
        error: { main: "#DC2626" },
    },
    breakpoints: {
        values: { xs: 0, sm: 640, md: 960, lg: 1200, xl: 1536 },
    },
    shape: { borderRadius: 12 },
    typography: {
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    border: "1px solid rgba(167, 139, 250, 0.15)",
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: { backgroundImage: "none" },
            },
        },
    },
});

export default theme;
