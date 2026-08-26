import React from "react";
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, Tooltip, Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import ClearIcon from "@mui/icons-material/Clear";
import AssignmentIcon from "@mui/icons-material/Assignment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useMutation } from "@apollo/client";
import dompurify from "dompurify";
import { useAuth } from "../../Hooks/useAuth";
import { SUBMIT_TASK, UNSUBMIT_TASK } from "../../queries/query";

const MS = { day: 8.64e7, hour: 3.6e6, minute: 6e4, second: 1e3 };
const pad = (n) => String(n).padStart(2, "0");

/* Break a positive millisecond span into d/h/m/s.
 *
 * The old code decomposed a value that could be negative and then inferred
 * "is the task still open" from whether any of the four parts was truthy --
 * so a small negative remainder (seconds = -5) read as OPEN. Openness is now
 * derived from the deadline itself and this only formats a clamped span. */
const breakdown = (ms) => {
  const t = Math.max(0, ms);
  return {
    days: Math.floor(t / MS.day),
    hours: Math.floor((t % MS.day) / MS.hour),
    minutes: Math.floor((t % MS.hour) / MS.minute),
    seconds: Math.floor((t % MS.minute) / MS.second),
  };
};

const fileUrl = (fileId) =>
  `${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/assignments/${fileId}`;

const TaskDetailsModal = ({ task: propsTask, admin }) => {
  const { user, token } = useAuth();
  const sanitize = dompurify.sanitize;
  const [open, setOpen] = React.useState(false);
  const [task, setTask] = React.useState(propsTask);
  const [file, setFile] = React.useState(null);
  const [error, setError] = React.useState("");
  const [now, setNow] = React.useState(() => Date.now());

  const [submitTask, { loading: submitting }] = useMutation(SUBMIT_TASK);
  const [unsubmitTask, { loading: unsubmitting }] = useMutation(UNSUBMIT_TASK);

  const deadline = React.useMemo(() => new Date(task?.deadline).getTime(), [task?.deadline]);
  const remaining = deadline - now;
  // one source of truth, straight from the deadline
  const stillOpen = Number.isFinite(deadline) && remaining > 0;
  const { days, hours, minutes, seconds } = breakdown(remaining);

  /* Recompute from the clock each second instead of subtracting 1000 from a
   * stored value: the old interval drifted, ran forever once expired, and was
   * started only if the task happened to be open at mount. */
  React.useEffect(() => {
    if (!stillOpen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stillOpen]);

  const isTeacher = admin?.email === user?.email;
  const mySubmission = task?.submission?.[0];

  const close = () => { setOpen(false); setError(""); };

  const handleSubmittingWork = (e) => {
    e.preventDefault();
    setError("");
    if (!file) return setError("Choose a file first.");
    submitTask({ variables: { taskid: task?._id, file, token } })
      .then(({ data }) => {
        if (data?.submitTask) {
          setTask(data.submitTask);
          setFile(null);
        }
      })
      .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
  };

  const handleUnsubmittingWork = (id) => {
    if (!window.confirm("Remove your submission? You can turn in again before the deadline.")) return;
    setError("");
    unsubmitTask({ variables: { submissionid: id, token } })
      .then(({ data }) => { data?.unsubmitTask && setTask(data.unsubmitTask); })
      .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
  };

  const Countdown = () => (
    <div className="flex justify-center gap-1.5 font-mono">
      {[["days", days], ["hrs", hours], ["min", minutes], ["sec", seconds]].map(([label, value], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span className="text-gray-300 self-start pt-1">:</span>}
          <div className="flex flex-col items-center">
            <span className={`text-lg font-bold ${stillOpen ? "text-gray-800" : "text-gray-300"}`}>
              {pad(value)}
            </span>
            <span className="text-[10px] uppercase text-gray-400">{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <>
      {/* was a clickable <Box> (a div), unreachable by keyboard */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-left rounded-xl border p-3 mb-2 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 ${
          stillOpen ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar sx={{ bgcolor: stillOpen ? "primary.main" : "grey.400", width: 38, height: 38 }}>
            <AssignmentIcon fontSize="small" />
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{task?.title}</p>
            <p className="text-xs text-gray-500">
              Due {new Date(task?.deadline).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Chip
              size="small"
              label={stillOpen ? "open" : "closed"}
              color={stillOpen ? "success" : "default"}
              sx={{ height: 20, fontSize: 11 }}
            />
            {!isTeacher && mySubmission && (
              <Chip
                size="small" icon={<CheckCircleIcon sx={{ fontSize: 13 }} />} label="turned in"
                color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }}
              />
            )}
            {isTeacher && (
              <span className="text-xs text-gray-500">
                {task?.submission?.length || 0} submitted
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Dialog rather than a bare Modal: the old <Modal open={open}> had no
          onClose, so Escape and backdrop clicks did nothing. */}
      <Dialog open={open} onClose={close} fullWidth maxWidth="lg" scroll="paper">
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <div className="min-w-0">
            <span className="block truncate">{task?.title}</span>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Due {new Date(task?.deadline).toLocaleString()}
            </Typography>
          </div>
          <IconButton onClick={close} size="small" aria-label="close">
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

          <div className="grid lg:grid-cols-3 gap-5 items-start">
            {/* description */}
            <div className="lg:col-span-2">
              <Typography variant="overline" sx={{ color: "text.secondary" }}>Instructions</Typography>
              <div className="mt-1 border border-gray-200 rounded-lg p-4 max-h-[420px] overflow-auto prose prose-sm max-w-none">
                {task?.description ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitize(task.description) }} />
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No description was added.
                  </Typography>
                )}
              </div>
            </div>

            {/* countdown + submission */}
            <div className="border border-gray-200 rounded-lg p-4">
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                {stillOpen ? "Time remaining" : "Closed"}
              </Typography>
              <div className="mt-2 mb-1"><Countdown /></div>
              {!stillOpen && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  The deadline has passed.
                </Alert>
              )}

              {!isTeacher && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Your work</Typography>

                  {!mySubmission ? (
                    <form onSubmit={handleSubmittingWork} className="flex flex-col gap-2">
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadFileIcon />}
                        disabled={!stillOpen || submitting}
                        sx={{ textTransform: "none" }}
                      >
                        {/* the chosen filename was never shown before submitting */}
                        {file ? "Change file" : "Choose file"}
                        <input
                          type="file"
                          name="assignment"
                          hidden
                          onChange={(e) => { setError(""); setFile(e.target.files?.[0] || null); }}
                        />
                      </Button>
                      {file && (
                        <Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all" }}>
                          {file.name} · {(file.size / 1024).toFixed(0)} KB
                        </Typography>
                      )}
                      <LoadingButton
                        type="submit"
                        variant="contained"
                        loading={submitting}
                        disabled={!stillOpen || !file}
                      >
                        turn in
                      </LoadingButton>
                    </form>
                  ) : (
                    <div className="flex items-stretch gap-1">
                      <Tooltip title="Open your submitted file" arrow>
                        <a
                          className="flex-1 min-w-0"
                          target="_blank"
                          rel="noreferrer"
                          href={fileUrl(mySubmission.fileId)}
                        >
                          <div className="h-full flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                            <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
                            <span className="text-sm truncate">{mySubmission.originalFilename}</span>
                            <OpenInNewIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                          </div>
                        </a>
                      </Tooltip>
                      <Tooltip title={stillOpen ? "Unsubmit" : "Too late to unsubmit"} arrow>
                        <span>
                          <IconButton
                            color="error"
                            onClick={() => handleUnsubmittingWork(mySubmission._id)}
                            disabled={!stillOpen || unsubmitting}
                          >
                            <DeleteOutlineIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {isTeacher && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Student work ({task?.submission?.length || 0})
              </Typography>
              {!task?.submission?.length ? (
                <Alert severity="info">Nobody has turned in work yet.</Alert>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {task.submission.map((work) => (
                    <a
                      key={work._id}
                      target="_blank"
                      rel="noreferrer"
                      href={fileUrl(work.fileId)}
                      className="flex items-center gap-2.5 p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                    >
                      <Avatar src={work.user?.photoURL || undefined} sx={{ width: 36, height: 36 }}>
                        {work.user?.displayName?.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{work.user?.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{work.user?.email}</p>
                        {work.submittedAt && (
                          <p className="text-[11px] text-gray-400">
                            {new Date(work.submittedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <OpenInNewIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskDetailsModal;
