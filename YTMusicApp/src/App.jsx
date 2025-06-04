import Navbar from "./front-end/components/Navbar";
import Home from "./front-end/pages/Home";
import Charts from "./front-end/pages/Charts";
import Stats from "./front-end/pages/Stats";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Route, Routes } from "react-router-dom";

function App() {
  const darkTheme = createTheme({
    palette: {
      mode: "light",
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 640,
        md: 960,
        lg: 1200,
        xl: 1536,
      },
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Charts" element={<Charts />} />
        <Route path="/Stats" element={<Stats />} />
      </Routes>
      {/* </Box> */}
      {/* </Fade> */}
    </ThemeProvider>
  );
}

export default App;
