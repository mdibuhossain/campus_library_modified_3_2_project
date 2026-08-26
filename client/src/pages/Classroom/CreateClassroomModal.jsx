import React from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation } from "@apollo/client";
import { CREATE_CLASSROOM } from "../../queries/query";
import { useAuth } from '../../Hooks/useAuth';

const emptyForm = { roomName: "", courseTitle: "", courseCode: "" };

const CreateClassroomModal = ({ setMyRoom }) => {
    const { token, can } = useAuth();
    const [createClassroom, { loading }] = useMutation(CREATE_CLASSROOM);
    const [open, setOpen] = React.useState(false);
    const [form, setForm] = React.useState(emptyForm);
    const [error, setError] = React.useState('');

    const close = () => {
        setOpen(false);
        setError('');
    };

    const set = (name) => (e) => {
        setError('');
        setForm((prev) => ({ ...prev, [name]: e.target.value }));
    };

    const canSubmit =
        form.roomName.trim() && form.courseTitle.trim() && form.courseCode.trim();

    const handleCreateClassroom = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        createClassroom({
            variables: {
                roomName: form.roomName.trim(),
                courseTitle: form.courseTitle.trim(),
                courseCode: form.courseCode.trim(),
                token,
            },
        })
            .then(({ data }) => {
                if (!data?.createClassroom) return;
                setMyRoom((pre) => [...pre, data.createClassroom]);
                // the old version left the dialog open with the same values
                // still filled in, so pressing Create again made a duplicate
                setForm(emptyForm);
                close();
            })
            // was only console.log, so a failure looked like nothing happened
            .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
    };

    return (
        <>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpen(true)}
                sx={{ borderRadius: 7, textTransform: 'none' }}
                // the server requires classroom.create; without the permission
                // the button would open a form that always fails
                disabled={!can('classroom.create')}
            >
                Create classroom
            </Button>

            {/* Dialog rather than a bare Modal: the old <Modal open={open}> had no
                onClose, so Escape and backdrop clicks did nothing and the only way
                out was the Close button. */}
            <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <span>Create classroom</span>
                    <IconButton onClick={close} size="small" aria-label="close">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <Box component="form" onSubmit={handleCreateClassroom}>
                    <DialogContent sx={{ pt: 0 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                            You will be the admin of this classroom and can add members and
                            assignments once it exists.
                        </Typography>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        <div className="flex flex-col gap-4">
                            <TextField
                                id="classroom-name"
                                label="Classroom name"
                                size="small"
                                value={form.roomName}
                                onChange={set('roomName')}
                                required
                                autoFocus
                                fullWidth
                                helperText="e.g. CSE 3rd year — Section A"
                            />
                            <TextField
                                id="classroom-course-title"
                                label="Course title"
                                size="small"
                                value={form.courseTitle}
                                onChange={set('courseTitle')}
                                required
                                fullWidth
                            />
                            <TextField
                                id="classroom-course-code"
                                label="Course code"
                                size="small"
                                value={form.courseCode}
                                onChange={set('courseCode')}
                                required
                                fullWidth
                                helperText="Matching library material shows up inside the classroom"
                            />
                        </div>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2.5 }}>
                        {/* the old buttons carried className="w-0", literally zero width */}
                        <Button onClick={close} disabled={loading}>Cancel</Button>
                        <LoadingButton
                            type="submit"
                            variant="contained"
                            loading={loading}
                            disabled={!canSubmit}
                        >
                            create
                        </LoadingButton>
                    </DialogActions>
                </Box>
            </Dialog>
        </>
    );
};

export default CreateClassroomModal;
