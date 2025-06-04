import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';

import { Link } from "react-router-dom";

const pages = ['Home','Charts', 'Stats'];

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Box>
        <Box sx = {{
            display: {sm: 'flex', xs: 'none'}, 
            gap: 1, 
            p: 2,
            flexDirection: 'row',
            alignItems: 'center',
            background: 'linear-gradient(120deg, #3961bb, #9a3dbc)'
        }}>
            {pages.map((page) => (
            <Button
                variant="text"
                component = {Link}
                to = {page === 'Home' ? '/' : `/${page}`}
                key = {page}
                sx = {{color: 'white'}}
            >
                {page}
            </Button>
            ))}
        </Box>

        <Box 
            sx = {{display: {sm: 'none', xs: 'flex'}, 
            p: 2,
            background: 'linear-gradient(120deg, #3961bb, #9a3dbc)'
        }}>
            <IconButton onClick = {(event) => {setAnchorEl(event.currentTarget)}}>
                <MenuIcon/>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => {setAnchorEl(null)}}
                sx = {{".MuiMenu-list": { py: 0 }}}
            >

                {pages.map((page, idx) => (
                    <Link 
                        style = {{textDecoration: "none", color: "white"}} 
                        to = {page === 'Home' ? '/' : `/${page}`} 
                        key={page}
                    >
                        <Box 
                            sx = {{
                                pb: idx === pages.length - 1 ? 1 : 0,
                                pt: idx === 0 ? 1 : 0
                            }} 
                            onClick={() => setAnchorEl(null)}
                        >
                            <MenuItem>
                                <Typography variant = "body2">
                                    {page}
                                </Typography>
                            </MenuItem>
                        </Box>
                    </Link>
                ))}
            </Menu>
        </Box>
    </Box>
  );
};
export default Navbar;