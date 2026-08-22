const DRIVE_HOSTS = ["drive.google.com", "docs.google.com"];

const sanitizeLink = (raw) => {
  const trimmed = raw?.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  // Cut at a second scheme, but not one that is the value of a query parameter
  // (`?url=https://...`) — that is a legitimate single URL, not a double paste.
  const second = withScheme.search(/(?!^)https?:\/\//i);
  if (second > 0 && !"=&?".includes(withScheme[second - 1])) {
    return withScheme.slice(0, second);
  }
  return withScheme;
};

const driveFileId = (url) => {
  const byPath = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (byPath) return byPath[1];
  const byPathAlt = url.pathname.match(/\/d\/([^/]+)/);
  if (byPathAlt) return byPathAlt[1];
  return url.searchParams.get("id");
};

const driveFolderId = (url) => {
  const match = url.pathname.match(/\/folders\/([^/]+)/);
  return match ? match[1] : null;
};

const unsupported = (openUrl) => ({
  kind: "unsupported",
  embedUrl: null,
  openUrl: openUrl || null,
  downloadUrl: null,
  fileId: null,
});

// -> { kind, embedUrl, openUrl, downloadUrl, fileId }
// kind: 'drive-file' | 'drive-folder' | 'direct-pdf' | 'unsupported'
const parseContentLink = (raw) => {
  const link = sanitizeLink(raw);
  if (!link) return unsupported(null);

  let url;
  try {
    url = new URL(link);
  } catch {
    return unsupported(link);
  }

  if (DRIVE_HOSTS.includes(url.hostname)) {
    const folderId = driveFolderId(url);
    if (folderId) {
      return {
        kind: "drive-folder",
        embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
        openUrl: `https://drive.google.com/drive/folders/${folderId}`,
        downloadUrl: null,
        fileId: folderId,
      };
    }
    const fileId = driveFileId(url);
    if (fileId) {
      return {
        kind: "drive-file",
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        openUrl: `https://drive.google.com/file/d/${fileId}/view`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        fileId,
      };
    }
    return unsupported(link);
  }

  if (/\.pdf$/i.test(url.pathname) || url.hostname === "firebasestorage.googleapis.com") {
    return {
      kind: "direct-pdf",
      embedUrl: link,
      openUrl: link,
      downloadUrl: link,
      fileId: null,
    };
  }

  return unsupported(link);
};

export { sanitizeLink, parseContentLink };
