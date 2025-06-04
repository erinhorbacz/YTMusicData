import React, {useState} from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { Box, Fade } from '@mui/material';
import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
import { LocalizationProvider } from '@mui/x-date-pickers-pro/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import IconButton from '@mui/material/IconButton';
import DateRangeIcon from '@mui/icons-material/DateRange';
import Tooltip from '@mui/material/Tooltip';


const Charts = () => {
    const [sortBy, setSortBy] = useState('Songs');
    const [dateRange, setDateRange] = useState();


    const sortByOptions = ['Songs', 'Artists', 'Albums']
    const handleChangeSort = (event) => {
        setSortBy(event?.target)
    }
    const handleChangeDateRange = () => {

    }
    return (
    <Fade in = {true} timeout={{ enter: 1500 }}>
        <Box sx = {{
            display: "flex", 
            flexDirection: "row", 
            alignItems: "left",
            gap: 3,
            pb: 16,
            paddingLeft: '15px'
        }}>
    <FormControl sx={{ m: 1, minWidth: 120 }}>
    <FormHelperText>See top listened to...</FormHelperText>
        <Select
        value={sortBy}
        onChange={handleChangeSort}
        displayEmpty
        inputProps={{ 'aria-label': 'Without label' }}
        >
            {sortByOptions?.map(option => (<MenuItem value={option}>{option}</MenuItem>))}
        </Select>
        </FormControl>
    <Tooltip title="Delete">
    <IconButton aria-label="select-date-range">
        <DateRangeIcon />
      </IconButton>
      </Tooltip>

    {dateRange && <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DemoContainer components={['DateRangePicker']}>
            <DemoItem component="DateRangePicker">
            <DateRangePicker localeText={{ start: 'Start', end: 'End' }} onChange={handleChangeDateRange} />
            </DemoItem>
        </DemoContainer>
        </LocalizationProvider>}

    </Box>
    </Fade>
    )
}

export default Charts;