import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import {
    Alert, AlertTitle, Button, CircularProgress, FormControl, InputLabel,
    ListSubheader, MenuItem, Select, Tooltip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Hooks/useAuth';
import PageLayout from '../../Layout/PageLayout';
import { tagTitle } from '../../utility/tagTitle';
import { semesterList } from '../../utility/semesterList';

/* Department options come from tagTitle, the canonical list of 33 departments.
 *
 * They used to come from useUtility().getDepartments, which the server derives
 * from the categories of *approved content* -- only 7 of the 33. A user whose
 * department had no content yet (architecture, say) had a value that matched no
 * MenuItem, so their saved department rendered as blank and MUI logged an
 * out-of-range warning. Which departments exist is not the same question as
 * which departments have uploads. */
const DEPARTMENTS = Object.keys(tagTitle).sort();

const CompleteProfile = () => {
    const {
        user, userDesignation, userDepartment, userSemester,
        profileComplete, userStatusLoading,
        completeProfile, profileError, profileLoading, setProfileError,
    } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = React.useState(null);

    /* This page has two callers and they want different things:
     *   - the profile gate, when a signed-in user has no designation/department
     *   - the "change these details" link on /settings
     * `profileComplete` tells them apart without depending on router state. */
    const isEditing = profileComplete;

    /* Seed once the record has actually arrived.
     *
     * useState(userDesignation || '') only reads its argument on the first
     * render, and getUserStatus is still in flight then -- so the fields
     * initialised to "" and never picked the saved values up. Anyone opening
     * this page with a complete profile saw three empty selects. */
    React.useEffect(() => {
        if (userStatusLoading || form) return;
        setForm({
            designation: userDesignation || '',
            department: userDepartment || '',
            semester: userSemester || '',
        });
    }, [userStatusLoading, userDesignation, userDepartment, userSemester, form]);

    React.useEffect(() => { setProfileError('') }, []);

    if (userStatusLoading || !form) {
        return (
            <PageLayout>
                <div className="flex-1 flex items-center justify-center py-20">
                    <CircularProgress color="info" />
                </div>
            </PageLayout>
        );
    }

    const set = (name, value) => {
        setProfileError('');
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // same rule the server enforces in completeProfile
    const needsSemester = form.designation === 'student';
    const canSubmit = form.designation && form.department && (!needsSemester || form.semester);

    const unchanged =
        form.designation === (userDesignation || '') &&
        form.department === (userDepartment || '') &&
        form.semester === (userSemester || '');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        completeProfile(
            {
                designation: form.designation,
                department: form.department,
                semester: needsSemester ? form.semester : '',
            },
            // editing came from Settings, so go back there rather than to the
            // gate's intended destination
            isEditing ? { to: '/settings' } : {}
        );
    };

    return (
        <PageLayout>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box sx={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {isEditing && (
                        <Button
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/settings')}
                            sx={{ textTransform: 'none', alignSelf: 'flex-start', mb: 1 }}
                        >
                            Back to profile
                        </Button>
                    )}

                    <Avatar sx={{ m: 1, bgcolor: '#9C27B0' }}>
                        <BadgeOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5" sx={{ textAlign: 'center' }}>
                        {isEditing ? 'ACADEMIC DETAILS' : 'COMPLETE YOUR PROFILE'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                        {isEditing
                            ? 'Update your designation, department or semester.'
                            : 'We need a few more details before you can continue.'}
                    </Typography>
                    {user?.email && (
                        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                            Signed in as {user.email}
                        </Typography>
                    )}

                    {/* Only the gate flow needs to explain why this is compulsory.
                        Someone who came from Settings already has a profile. */}
                    {!isEditing && (
                        <Alert severity="info" sx={{ mt: 2, width: '100%' }}>
                            <AlertTitle sx={{ mb: 0 }}>Why this is needed</AlertTitle>
                            Classroom enrolment matches students on department and
                            semester, so you would be skipped without them.
                        </Alert>
                    )}

                    {profileError && (
                        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{profileError}</Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
                        <FormControl fullWidth sx={{ mt: 2 }} required>
                            <InputLabel id="user_designation">Designation</InputLabel>
                            <Select
                                labelId="user_designation"
                                name="designation"
                                label="Designation"
                                value={form.designation}
                                onChange={(e) => {
                                    set('designation', e.target.value);
                                    // a teacher carries no semester
                                    if (e.target.value !== 'student') set('semester', '');
                                }}
                            >
                                <MenuItem value="teacher">Teacher</MenuItem>
                                <MenuItem value="student">Student</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mt: 2 }} required>
                            <InputLabel id="user_department">Department</InputLabel>
                            <Select
                                labelId="user_department"
                                name="department"
                                label="Department"
                                value={form.department}
                                onChange={(e) => set('department', e.target.value)}
                                MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                            >
                                {DEPARTMENTS.map((item) => (
                                    <MenuItem key={item} value={item}>
                                        <Tooltip title={tagTitle[item] || ''} placement="top-start" arrow>
                                            <div className="w-full">{item.toUpperCase()}</div>
                                        </Tooltip>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {needsSemester && (
                            <FormControl fullWidth sx={{ mt: 2 }} required>
                                <InputLabel id="semester-select">Semester</InputLabel>
                                <Select
                                    labelId="semester-select"
                                    id="semester-select"
                                    name="semester"
                                    label="Semester"
                                    value={form.semester}
                                    onChange={(e) => set('semester', e.target.value)}
                                >
                                    {semesterList.map((sem) =>
                                        sem?.title ? (
                                            <ListSubheader key={sem.title} sx={{ fontWeight: '700' }}>
                                                {sem.title}
                                            </ListSubheader>
                                        ) : (
                                            <MenuItem key={sem} value={sem} sx={{ ml: 1 }}>{sem}</MenuItem>
                                        )
                                    )}
                                </Select>
                            </FormControl>
                        )}

                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: isEditing ? 1 : 2 }}
                            loading={profileLoading}
                            // in edit mode there is nothing to save until something changes
                            disabled={!canSubmit || (isEditing && unchanged)}
                        >
                            {isEditing ? 'save changes' : 'save and continue'}
                        </LoadingButton>

                        {isEditing && (
                            <Button
                                fullWidth
                                variant="text"
                                onClick={() => navigate('/settings')}
                                disabled={profileLoading}
                                sx={{ mb: 2 }}
                            >
                                cancel
                            </Button>
                        )}
                    </Box>
                </Box>
            </Container>
        </PageLayout>
    );
};

export default CompleteProfile;
