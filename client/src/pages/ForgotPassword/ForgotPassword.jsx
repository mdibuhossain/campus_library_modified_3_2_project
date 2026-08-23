import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../Hooks/useAuth';
import { Alert, CircularProgress } from '@mui/material';
import PageLayout from '../../Layout/PageLayout';

const ForgotPassword = () => {
    // local state so typing here does not touch the shared login/register email
    const [resetEmail, setResetEmail] = React.useState('');
    const { sendResetEmail, passwordError, passwordMessage, passwordLoading, setPasswordError, setPasswordMessage } = useAuth();

    React.useEffect(() => {
        setPasswordError('')
        setPasswordMessage('')
    }, [])

    const isValidEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(resetEmail);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const sent = await sendResetEmail(resetEmail);
        sent && setResetEmail('')
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
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        RESET PASSWORD
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                        Enter the email address of your account and we will send you a link to set a new password.
                    </Typography>
                    {
                        passwordError &&
                        <Typography variant="caption" sx={{ mt: 2, background: 'rgb(234, 56, 56)', color: 'white', px: '1.12rem', py: '0.2rem', borderRadius: 10 }}>
                            {passwordError}
                        </Typography>
                    }
                    {
                        passwordMessage &&
                        <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
                            {passwordMessage}
                        </Alert>
                    }
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            error={resetEmail.length > 0 && !isValidEmail}
                            helperText={(resetEmail.length > 0 && !isValidEmail) ? 'invalid email address' : ' '}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 2, mb: 2 }}
                            disabled={!isValidEmail || passwordLoading}
                        >
                            {passwordLoading ? <CircularProgress disableShrink={true} size={25} color="inherit" /> : 'Send Reset Link'}
                        </Button>
                        <hr />
                        <Grid container sx={{ mt: 2 }}>
                            <Grid item xs>
                                <NavLink to="/login">
                                    <Typography variant="body2" sx={{ "textDecoration": "none", color: "rgb(104, 104, 255)" }}>
                                        Back to Sign In
                                    </Typography>
                                </NavLink>
                            </Grid>
                            <Grid item>
                                <NavLink to="/signup">
                                    <Typography variant="body2" sx={{ "textDecoration": "none", color: "rgb(104, 104, 255)" }}>
                                        Sign Up
                                    </Typography>
                                </NavLink>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>
            </Container>
        </PageLayout>
    );
}

export default ForgotPassword;
