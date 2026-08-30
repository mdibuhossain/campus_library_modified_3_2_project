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
import { CircularProgress, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PageLayout from '../../Layout/PageLayout';

const Login = () => {
    const { signWithGoogle, error, email, password, signInWithEmail, setEmail, setPassword,
        emailAuthLoading, googleAuthLoading } = useAuth();
    // one attempt at a time: the button that is working shows the spinner, the
    // other is disabled rather than also spinning
    const busy = emailAuthLoading || googleAuthLoading;

    const handleChange = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setEmail(data.get('email'))
        setPassword(data.get('password'))
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
                        SIGN IN
                    </Typography>
                    {
                        error &&
                        <Typography variant="caption" sx={{ mt: 1, background: 'rgb(234, 56, 56)', color: 'white', px: '1.12rem', py: '0.2rem', borderRadius: 10 }}>
                            {error}
                        </Typography>
                    }
                    <Box component="form" onChange={handleChange} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={!(email && password) || busy}
                            onClick={signInWithEmail}
                        >
                            {emailAuthLoading ? <CircularProgress disableShrink={true} size={25} color="inherit" /> : 'Sign In'}
                        </Button>
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>OR</Typography>
                        </Divider>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<GoogleIcon />}
                            sx={{ mb: 2, textTransform: 'none', color: 'text.primary', borderColor: 'rgba(0,0,0,0.23)' }}
                            onClick={signWithGoogle}
                            disabled={busy}
                        >
                            {googleAuthLoading ? <CircularProgress disableShrink={true} size={25} color="inherit" /> : 'Continue with Google'}
                        </Button>
                        <Grid container sx={{ mt: 2 }}>
                            <Grid item xs>
                                <NavLink to="/forgot-password">
                                    <Typography variant="body2" sx={{ "textDecoration": "none", color: "rgb(104, 104, 255)" }}>
                                        Forgot password?
                                    </Typography>
                                </NavLink>
                            </Grid>
                            <Grid item>
                                <NavLink to="/signup">
                                    <Typography variant="body2" sx={{ "textDecoration": "none", color: "rgb(104, 104, 255)" }}>
                                        Don't have an account? Sign Up
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

export default Login;