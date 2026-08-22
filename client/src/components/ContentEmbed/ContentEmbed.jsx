import React, { useState } from "react";
import { Button, Paper, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import LinearLoadin from "../Linear_Loading/LinearLoadin";
import { parseContentLink } from "../../utility/driveLink";

const ContentEmbed = ({ link, title }) => {
  const [loaded, setLoaded] = useState(false);
  const { kind, embedUrl, openUrl } = parseContentLink(link);

  if (!embedUrl) {
    return (
      <div className="flex h-full items-center justify-center p-5">
        <Paper sx={{ p: 4, maxWidth: "32rem", textAlign: "center" }}>
          <LinkOffIcon sx={{ fontSize: 48, color: "rgba(0, 0, 0, 0.3)" }} />
          <Typography sx={{ mt: 1, fontWeight: 600 }}>
            This link can&apos;t be previewed here
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "rgba(0, 0, 0, 0.6)" }}>
            {openUrl
              ? "It isn't a Google Drive file, so it has to be opened at its own site."
              : "No download link was saved for this content."}
          </Typography>
          {openUrl && (
            <Button
              variant="contained"
              endIcon={<OpenInNewIcon />}
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              sx={{ mt: 3 }}
            >
              Open in new tab
            </Button>
          )}
        </Paper>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {!loaded && (
        <div className="absolute inset-x-0 top-0 z-10">
          <LinearLoadin />
        </div>
      )}
      {kind === "drive-folder" && (
        <Typography
          variant="body2"
          sx={{ px: 2, py: 1, color: "rgba(0, 0, 0, 0.6)" }}
        >
          This link points to a folder — pick a file from the listing below.
        </Typography>
      )}
      <iframe
        src={embedUrl}
        title={title || "Content preview"}
        className="w-full flex-1 border-0"
        allow="autoplay"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default ContentEmbed;
