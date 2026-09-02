import React from "react";
import { Alert, AlertTitle, Button, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../Hooks/useAuth";

/**
 * Says, on the Messages page, when background message alerts will not arrive.
 *
 * The chat is not broken without push -- an open thread polls every few seconds,
 * so messages still land while you are looking at the page. What is actually
 * lost is being told about a message when this tab is closed, and the copy here
 * is careful to claim only that. Overstating it ("messaging is disabled") would
 * be false and would push people to re-enable something they may not want.
 *
 * The notification bell offers the same switch, but somebody reading a thread is
 * not looking at the bell, and "why did nobody tell me they replied?" is asked
 * here. Hence "as well" rather than "instead".
 *
 * Deliberately keyed off `pushCapable` (a synchronous native check) rather than
 * `pushSupported` (resolved asynchronously by Firebase), so the first frame
 * cannot flash a wrong "your browser cannot do this".
 */
const DISMISS_KEY = "campus-classroom:push-notice-dismissed";

const readDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) || "";
  } catch {
    return "";
  }
};

const PushNotice = () => {
  const {
    permission, pushCapable, pushConfigured, pushError, enablePush,
  } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(readDismissed);

  /* State is part of the key, so dismissing the "turn these on" prompt does not
   * also silence the different message you get after being blocked -- and a
   * change in browser permission brings the notice back exactly once. */
  const state = !pushConfigured
    ? "unconfigured"
    : !pushCapable
      ? "unsupported"
      : permission === "granted"
        ? "granted"
        : permission === "denied"
          ? "denied"
          : "offer";

  if (state === "granted") return null;
  if (dismissed === state) return null;

  const hide = () => {
    setDismissed(state);
    try { window.localStorage.setItem(DISMISS_KEY, state); } catch { /* no storage */ }
  };

  const turnOn = async () => {
    setBusy(true);
    try { await enablePush(); } finally { setBusy(false); }
  };

  const COPY = {
    offer: {
      severity: "info",
      title: "Turn on new-message alerts",
      body: "Messages arrive here while this page is open. To hear about a reply when the tab is closed, allow notifications.",
    },
    denied: {
      severity: "warning",
      title: "Message alerts are blocked",
      body: "This browser is blocking notifications for the site, so nothing will reach you while the tab is closed. Messages still arrive normally while you have this page open. To change it, allow notifications for this site in your browser settings and reload.",
    },
    unsupported: {
      severity: "info",
      title: "This browser cannot show message alerts",
      body: "Messages still arrive while this page is open. For alerts when the tab is closed, use this site in a browser that supports web notifications, or install the app.",
    },
    unconfigured: {
      severity: "info",
      title: "Background message alerts are not set up",
      body: "Messages arrive while this page is open, but the site has no push key configured, so nothing can be delivered when the tab is closed.",
    },
  }[state];

  return (
    <Alert
      severity={COPY.severity}
      onClose={hide}
      sx={{ mb: 2, borderRadius: 2, alignItems: "flex-start" }}
      /* MUI drops its own close button as soon as `action` is set, so the
       * dismiss has to be rebuilt by hand here -- otherwise the one state that
       * has a button (the prompt everybody sees) is the one state nobody can
       * get rid of, which is exactly the nagging this is meant to avoid. */
      action={
        state === "offer" ? (
          <span className="flex items-center gap-0.5">
            <Button
              size="small"
              onClick={turnOn}
              disabled={busy}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              {busy ? <CircularProgress size={16} /> : "Allow"}
            </Button>
            <IconButton size="small" onClick={hide} aria-label="Dismiss">
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        ) : null
      }
    >
      <AlertTitle sx={{ mb: 0.25, fontSize: 14 }}>{COPY.title}</AlertTitle>
      <span className="text-[13px] leading-snug">{COPY.body}</span>
      {pushError && (
        <span className="block text-[12px] mt-1 opacity-80">{pushError}</span>
      )}
    </Alert>
  );
};

export default PushNotice;
