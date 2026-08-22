import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Chip, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import CircularLoading from "../../components/Circular_Loading/CircularLoading";
import ContentEmbed from "../../components/ContentEmbed/ContentEmbed";
import useUtility from "../../Hooks/useUtility";
import { parseContentLink } from "../../utility/driveLink";

const ContentViewer = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { books, questions, syllabus, dataLoading } = useUtility();
  const embedRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const item =
    state?._id === id
      ? state
      : [...books, ...questions, ...syllabus].find((data) => data?._id === id);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      embedRef.current?.requestFullscreen();
    }
  };

  if (!item) {
    if (dataLoading) return <CircularLoading />;
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10">
        <Typography sx={{ fontWeight: 600 }}>
          This content could not be found.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Go back
        </Button>
      </div>
    );
  }

  const { openUrl, downloadUrl } = parseContentLink(item?.download_link);
  const tags = [
    item?.sub_categories,
    item?.categories,
    item?.course_code,
    ...(item?.semester || []),
  ].filter(Boolean);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <Paper
        square
        elevation={1}
        className="flex shrink-0 flex-row items-center gap-2 px-2 py-2"
      >
        <Tooltip title="Back">
          <IconButton aria-label="back" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <Typography noWrap sx={{ fontWeight: 600 }}>
            {item?.book_name} {item?.edition ? item?.edition + "E" : ""}
            {item?.author ? " - " + item?.author : ""}
          </Typography>
          <div className="flex flex-row flex-wrap gap-1 pt-1">
            {tags.map((tag, index) => (
              <Chip key={`${tag}-${index}`} label={tag?.toUpperCase()} size="small" />
            ))}
          </div>
        </div>
        {downloadUrl && (
          <Tooltip title="Download">
            <IconButton
              aria-label="download"
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        )}
        {openUrl && (
          <Tooltip title="Open in new tab">
            <IconButton
              aria-label="open in new tab"
              href={openUrl}
              target="_blank"
              rel="noreferrer"
            >
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          <IconButton aria-label="fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Paper>
      <div ref={embedRef} className="min-h-0 flex-1 bg-neutral-100">
        <ContentEmbed
          key={item?._id}
          link={item?.download_link}
          title={item?.book_name}
        />
      </div>
    </div>
  );
};

export default ContentViewer;
