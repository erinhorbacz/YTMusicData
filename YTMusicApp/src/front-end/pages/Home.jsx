import { useEffect, useState } from "react";
import { text } from "d3-request";
import { csvParseRows } from "d3";
import FakeLanding from "../components/FakeLanding";
import listeningData from "../../back-end/data/listening_data.csv";
import {
  Typography,
  Autocomplete,
  TextField,
  Button,
  Box,
  Skeleton,
  Fade,
} from "@mui/material";

function Home() {
  const [disabledBtn, setDisabledBtn] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [cantConnect, setCantConnect] = useState(false);

  const [musicData, setMusicData] = useState([]);
  const [appLoaded, setAppLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resultsLoaded, setResultsLoaded] = useState(false);

  function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
  }

  useEffect(() => {
    text(listeningData, function (data) {
      // song data
      //   var songData = csvParseRows(data).map(
      //     (entry) => `${entry[1]} - ${entry[4]}`,
      //   );
      //   var mappedSongData = songData.filter(onlyUnique);
      var artistData = csvParseRows(data).map((entry) => entry[4]);
      var mappedArtistData = artistData.filter(onlyUnique);
      //   var mappedData = [...mappedSongData, ...mappedArtistData];
      setMusicData(mappedArtistData);
      setAppLoaded(true);
    });
  }, []);

  async function btnClick() {
    // const idx = musicData.indexOf(inputValue);
    // var hc = await HandleClick(idx, setLoading, setResultsLoaded, setPlaylistData);
    // if(hc === -1){
    //     // Handle spotify api error
    //     setLoading(false);
    //     setCantConnect(true);
    // }
  }

  return (
    <>
      <Box sx={{ display: appLoaded ? "none" : "block" }}>
        <FakeLanding />
      </Box>
      <Fade in={appLoaded} timeout={{ enter: 1500 }}>
        <Box
          sx={{
            display: appLoaded ? "block" : "none",
          }}
        >
          <Typography
            align="center"
            sx={{ p: 3, typography: { md: "h1", sm: "h2", xs: "h3" } }}
          >
            Erin's YT Music Data
          </Typography>
        </Box>
      </Fade>
      <Fade in={appLoaded} timeout={{ enter: 1500 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            pb: 16,
          }}
        >
          <Autocomplete
            // disableClearable
            freeSolo
            open={open}
            onClose={() => setOpen(false)}
            onChange={(event, value) => {
              setInputValue(value);
              setDisabledBtn(false);
            }}
            onInputChange={(event, value) => {
              if (value.length > 2) {
                setOpen(true);
              } else {
                setOpen(false);
              }
            }}
            options={musicData}
            sx={{ width: { md: 700, sm: 500, xs: 300 } }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Enter a song, album, or artist"
                variant="outlined"
              />
            )}
          />

          <Box>
            <Button
              variant="contained"
              disabled={disabledBtn || inputValue === null}
              onClick={btnClick}
            >
              Search
            </Button>
          </Box>

          <Fade in={cantConnect} timeout={{ enter: 1500 }}>
            <Typography
              variant="h5"
              align="center"
              sx={{
                width: { md: 700, sm: 500, xs: 300 },
                display: cantConnect ? "block" : "none",
              }}
            >
              Issues connecting to spotify backend. Try again later or contact
              me at terrenceshi@gmail.com if the issue persists.
            </Typography>
          </Fade>

          <Fade in={resultsLoaded} timeout={{ enter: 1500 }}>
            <Box
              sx={{
                display: resultsLoaded ? "flex" : "none",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Fade in={loading} timeout={{ enter: 1500 }}>
                <Skeleton
                  variant="rounded"
                  sx={{
                    display: loading ? "block" : "none",
                    borderRadius: 4,
                    height: 400,
                    width: { md: 700, sm: 500, xs: 300 },
                  }}
                />
              </Fade>
            </Box>
          </Fade>
        </Box>
      </Fade>
    </>
  );
}

export default Home;
