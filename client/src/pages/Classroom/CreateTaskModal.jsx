import React from 'react';
import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, TextField, Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation } from "@apollo/client";
import { CREATE_TASK } from "../../queries/query";
import "suneditor/dist/css/suneditor.min.css";
import Editor from "suneditor-react";
import { useAuth } from '../../Hooks/useAuth';

const EDITOR_BUTTONS = [[
    "undo", "redo", "bold", "underline", "italic", "strike",
    "subscript", "superscript", "blockquote", "align", "font", "fontColor",
    "fontSize", "hiliteColor", "horizontalRule", "lineHeight", "list",
    "paragraphStyle", "table", "textStyle",
]];

// value for a datetime-local input, in the browser's own timezone
const toLocalInput = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CreateTaskModal = ({ RoomInfo, setRoomInfo }) => {
    const { user, token } = useAuth();
    const [createTask, { loading }] = useMutation(CREATE_TASK);
    const editor = React.useRef();
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [deadline, setDeadline] = React.useState('');
    const [error, setError] = React.useState('');

    const getSunEditorInstance = (sunEditor) => {
        editor.current = sunEditor;
    };

    const close = () => {
        setOpen(false);
        setError('');
    };

    const reset = () => {
        setTitle('');
        setDeadline('');
        setError('');
    };

    /* The old version kept separate `date` and `time` inputs and recomputed the
     * deadline inside each onChange with
     *   new Date(date + ' ' + time).toUTCString()
     * which produced the literal string "Invalid Date" whenever only one of the
     * two had been filled in. One datetime-local field, converted once at submit
     * time, cannot get into that state. */
    const deadlineDate = deadline ? new Date(deadline) : null;
    const deadlineValid = deadlineDate && !isNaN(deadlineDate.getTime());
    const inPast = deadlineValid && deadlineDate.getTime() <= Date.now();
    const canSubmit = title.trim() && deadlineValid && !inPast;

    const handleCreateTask = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        createTask({
            variables: {
                title: title.trim(),
                description: editor.current?.getContents() || '',
                deadline: deadlineDate.toISOString(),
                roomid: RoomInfo?._id,
                token,
            },
        })
            .then(({ data }) => {
                if (!data?.createTask) return;
                setRoomInfo((pre) => ({
                    ...pre,
                    tasks: [data.createTask, ...(pre.tasks || [])],
                }));
                reset();
                close();
            })
            // was a window.alert on success and another on failure
            .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
    };

    if (RoomInfo?.admin?.email !== user?.email) return null;

    return (
        <>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ borderRadius: 7, mb: 2, textTransform: 'none' }}
                onClick={() => setOpen(true)}
            >
                New assignment
            </Button>

            {/* Dialog rather than a bare Modal: the old <Modal open={open}> had no
                onClose, so Escape and backdrop clicks did nothing. */}
            <Dialog open={open} onClose={close} fullWidth maxWidth="md" scroll="paper">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <span>New assignment</span>
                    <IconButton onClick={close} size="small" aria-label="close">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <Box component="form" onSubmit={handleCreateTask}>
                    <DialogContent sx={{ pt: 0 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                            Everyone in <strong>{RoomInfo?.roomName}</strong> is notified when you
                            post this.
                        </Typography>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <div className="flex flex-col gap-4">
                            <TextField
                                id="task-title"
                                label="Title"
                                size="small"
                                value={title}
                                onChange={(e) => { setError(''); setTitle(e.target.value); }}
                                required
                                autoFocus
                                fullWidth
                            />

                            <div>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                    Description
                                </Typography>
                                <Editor
                                    name="description"
                                    getSunEditorInstance={getSunEditorInstance}
                                    placeholder="What should students do?"
                                    height="200px"
                                    setOptions={{ buttonList: EDITOR_BUTTONS }}
                                />
                            </div>

                            <TextField
                                id="task-deadline"
                                label="Deadline"
                                type="datetime-local"
                                size="small"
                                value={deadline}
                                onChange={(e) => { setError(''); setDeadline(e.target.value); }}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: toLocalInput(new Date()) }}
                                error={inPast}
                                // a past deadline makes the task un-submittable the
                                // moment it is created, which nothing warned about
                                helperText={
                                    inPast
                                        ? 'That is in the past — nobody would be able to submit'
                                        : 'Students can submit until this moment'
                                }
                            />
                        </div>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2.5 }}>
                        <Button onClick={close} disabled={loading}>Cancel</Button>
                        <LoadingButton
                            type="submit"
                            variant="contained"
                            loading={loading}
                            disabled={!canSubmit}
                        >
                            post assignment
                        </LoadingButton>
                    </DialogActions>
                </Box>
            </Dialog>
        </>
    );
};

export default CreateTaskModal;
