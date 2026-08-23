import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Alert, FormControl, InputLabel, ListSubheader, MenuItem, Select, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useAuth } from '../../Hooks/useAuth';
import useUtility from '../../Hooks/useUtility';
import PageLayout from '../../Layout/PageLayout';
import { tagTitle } from '../../utility/tagTitle';
import { semesterList } from '../../utility/semesterList';

const CompleteProfile = () => {
    const {
        user, userDesignation, userDepartment, userSemester,
        completeProfile, profileError, profileLoading, setProfileError,
    } = useAuth();
    const { getDepartments, deptLoading } = useUtility();

    // prefill from whatever is already on the record, so this page doubles as a
    // way to fix a partially filled profile
    const [designation, setDesignation] = React.useState(userDesignation || '');
    const [department, setDepartment] = React.useState(userDepartment || '');
    const [semester, setSemester] = React.useState(userSemester || '');

    React.useEffect(() => { setProfileError('') }, [])

    // same rule the server enforces in completeProfile
    const needsSemester = designation === 'student';
    const canSubmit = designation && department && (!needsSemester || semester);

    const handleSubmit = (event) => {
        event.preventDefault();
        canSubmit && completeProfile({
            designation,
            department,
            semester: needsSemester ? semester : '',
        })
    };

    return (
        <PageLayout>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: '#9C27B0' }}>
                        <BadgeOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        COMPLETE YOUR PROFILE
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                        We need a few more details before you can continue.
                    </Typography>
                    {user?.email &&
                        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                            Signed in as {user.email}
                        </Typography>
                    }
                    {profileError &&
                        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{profileError}</Alert>
                    }
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                        <FormControl fullWidth sx={{ mt: 2 }} required>
                            <InputLabel id="user_designation">Designation</InputLabel>
                            <Select
                                labelId="user_designation"
                                name="designation"
                                label="Designation"
                                value={designation}
                                onChange={(e) => {
                                    setDesignation(e.target.value)
                                    // a teacher carries no semester
                                    e.target.value !== 'student' && setSemester('')
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
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            >
                                {!deptLoading && getDepartments.map((item, index) => (
                                    item &&
                                    <MenuItem key={index} value={item}>
                                        <Tooltip title={tagTitle[item] || ''} placement="top-start" arrow>
                                            <div className="w-full">{item.toUpperCase()}</div>
                                        </Tooltip>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {needsSemester &&
                            <FormControl fullWidth sx={{ mt: 2 }} required>
                                <InputLabel id="semester-select">Semester</InputLabel>
                                <Select
                                    labelId="semester-select"
                                    id="semester-select"
                                    name="semester"
                                    label="Semester"
                                    value={semester}
                                    onChange={(e) => setSemester(e.target.value)}
                                >
                                    {semesterList.map((sem) => {
                                        if (sem?.title) {
                                            return (
                                                <ListSubheader key={sem.title} sx={{ fontWeight: "700" }}>{sem.title}</ListSubheader>
                                            )
                                        }
                                        return (
                                            <MenuItem key={sem} value={sem} sx={{ ml: 1 }}>{sem}</MenuItem>
                                        )
                                    })}
                                </Select>
                            </FormControl>
                        }
                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            loading={profileLoading}
                            disabled={!canSubmit}
                        >
                            save and continue
                        </LoadingButton>
                    </Box>
                </Box>
            </Container>
        </PageLayout>
    );
}

export default CompleteProfile;
