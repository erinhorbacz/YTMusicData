import { Button, Card, CardContent, CardHeader } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Link } from "react-router-dom";

// Card wrapper for every dashboard section: title + optional "See all" link.
function SectionCard({ title, subheader, seeAllTo, action, children, disablePadding = false }) {
    return (
        <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardHeader
                title={title}
                subheader={subheader}
                titleTypographyProps={{ variant: "h6" }}
                subheaderTypographyProps={{ variant: "caption" }}
                action={
                    action ??
                    (seeAllTo && (
                        <Button
                            component={Link}
                            to={seeAllTo}
                            size="small"
                            endIcon={<ArrowForwardRoundedIcon />}
                            sx={{ color: "primary.light" }}
                        >
                            See all
                        </Button>
                    ))
                }
                sx={{ pb: 0 }}
            />
            <CardContent sx={{ flex: 1, ...(disablePadding ? { p: 0, "&:last-child": { pb: 0 } } : {}) }}>
                {children}
            </CardContent>
        </Card>
    );
}

export default SectionCard;
