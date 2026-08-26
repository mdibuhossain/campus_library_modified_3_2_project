import { LoadingButton } from '@mui/lab';
import { Alert, Chip, Divider, TextField, Tooltip, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import GoogleIcon from '@mui/icons-material/Google';
import KeyIcon from '@mui/icons-material/Key';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import AvatarEditor from 'react-avatar-editor';
import { useAuth } from '../../Hooks/useAuth';
import PageLayout from '../../Layout/PageLayout';
import { GET_PERMISSION_KEYS } from '../../queries/query';

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

// a titled white card -- the whole page is built from these so the sections
// read as distinct blocks instead of one long centred column
const Section = ({ title, subtitle, children, className = '' }) => (
    <div className={`bg-white rounded-lg shadow-lg p-5 ${className}`}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        {subtitle &&
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {subtitle}
            </Typography>}
        <Divider sx={{ my: 2 }} />
        {children}
    </div>
);

// label / value row used throughout the status sections
const Field = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
        <span className="text-gray-500 shrink-0">{label}</span>
        <span className="text-right font-medium break-words">{children}</span>
    </div>
);

const NOT_SET = <span className="text-gray-400 font-normal italic">not set</span>;

const formatDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d) ? null : d.toLocaleString();
};

const ChangeDP = () => {
    const {
        user, token, isLoading, uploadAvatar, updateProfileSettings, updateProfileLoading,
        changeUserPassword, passwordError, passwordMessage, passwordLoading,
        setPasswordError, setPasswordMessage,
        resendVerification, verifyError, verifyMessage, verifyLoading,
        userRole, userPermissions, userDesignation, userDepartment, userSemester,
        profileComplete, userStatusLoading,
    } = useAuth();
    const [selectedImg, setSelectedImg] = React.useState(null);
    const [showModal, setShowModal] = React.useState(false);
    const [scale, setScale] = React.useState(1);
    const [rotate, setRotate] = React.useState(0);
    const [updateData, setUpdateData] = React.useState({ displayName: user?.displayName });
    const [passwordForm, setPasswordForm] = React.useState(emptyPasswordForm);
    const EditorRef = React.useRef(null);

    // descriptions for the permission list; the key vocabulary is readable by
    // any signed-in user
    const { data: { getPermissionKeys: permissionKeys = [] } = {} } =
        useQuery(GET_PERMISSION_KEYS, { variables: { token }, skip: !token });
    const describe = new Map(permissionKeys.map((p) => [p.key, p.description]));

    // Google accounts have no password to change. Check every linked provider
    // rather than providerData[0] -- an account can have both Google and
    // password linked, in either order.
    const providers = (user?.providerData || []).map(({ providerId }) => providerId);
    const isPasswordAccount = providers.includes('password');
    const isGoogleAccount = providers.includes('google.com');

    React.useEffect(() => {
        setPasswordError('')
        setPasswordMessage('')
    }, [])

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const tooShort = newPassword.length > 0 && newPassword.length < 6;
    const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const sameAsCurrent = newPassword.length > 0 && newPassword === currentPassword;
    const canSubmitPassword = currentPassword && newPassword && confirmPassword
        && !tooShort && !mismatch && !sameAsCurrent;

    const passwordHandler = (e) => {
        setPasswordError('')
        setPasswordMessage('')
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value })
    }

    const submitPassword = async () => {
        if (!canSubmitPassword) return
        const changed = await changeUserPassword(currentPassword, newPassword)
        changed && setPasswordForm(emptyPasswordForm)
    }

    const updateHandler = (e) => {
        const tmpData = updateData
        tmpData[e.target.name] = e.target.value
        setUpdateData(tmpData)
    }
    const handleModalClose = () => {
        setShowModal(false)
        setSelectedImg(null)
        setScale(1)
        setRotate(0)
    }
    const handleSelectImg = (e) => {
        const img = e.target.files[0]
        if (img !== null) {
            setSelectedImg(img)
            setShowModal(true)
        }
    }
    function handleWhileSelectImg(e) {
        e.target.value = null
    }

    const showCroppedImage = async () => {
        if (EditorRef.current) {
            const img = EditorRef.current.getImage().toDataURL();
            uploadAvatar(img);
            handleModalClose()
        }
    }

    const created = formatDate(user?.metadata?.creationTime);
    const lastSignIn = formatDate(user?.metadata?.lastSignInTime);

    return (
        <PageLayout>
            <div className="2xl:w-8/12 xl:w-9/12 lg:w-10/12 w-11/12 mx-auto pb-16">
                <Typography variant='h5' sx={{ fontWeight: 600, textAlign: 'center', my: 4 }}>
                    My profile
                </Typography>

                {/* headline status strip -- the answers people actually come here for */}
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {userStatusLoading
                        ? <Chip label="loading status…" size="small" />
                        : <>
                            <Chip
                                label={`role: ${userRole || 'none'}`}
                                color={userRole ? 'primary' : 'default'}
                                size="small"
                            />
                            <Chip
                                label={userDesignation ? `designation: ${userDesignation}` : 'designation: not set'}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                icon={profileComplete ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                                label={profileComplete ? 'profile complete' : 'profile incomplete'}
                                color={profileComplete ? 'success' : 'warning'}
                                size="small"
                            />
                            <Chip
                                icon={user?.emailVerified ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                                label={user?.emailVerified ? 'email verified' : 'email not verified'}
                                color={user?.emailVerified ? 'success' : 'warning'}
                                size="small"
                            />
                        </>}
                </div>

                <div className="grid lg:grid-cols-2 grid-cols-1 gap-5 items-start">

                    {/* ---------- 1. identity ---------- */}
                    <Section title="Identity" subtitle="Your name and picture as other members see them">
                        <div className="flex justify-center mb-4">
                            <div className="relative p-0">
                                {(isLoading || updateProfileLoading) ?
                                    <div className="flex items-center justify-center space-x-2 animate-pulse">
                                        <div className="w-32 h-32 bg-gray-400 rounded-full"></div>
                                    </div> :
                                    <>
                                        <img
                                            className="w-32 h-32 object-cover rounded-full border"
                                            src={user?.photoURL || '/assets/images/avator.webp'}
                                            alt="profile"
                                        />
                                        {/* Firebase upload quota exceeded */}
                                        {/* <div className="flex space-x-2 justify-center absolute right-0 bottom-4">
                                            <div>
                                                <label htmlFor='avatarSelect' className="flex rounded-full bg-gray-500 text-white leading-normal uppercase shadow-md hover:bg-gray-600 hover:shadow-lg focus:bg-gray-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-800 active:shadow-lg transition duration-150 ease-in-out w-9 h-9">
                                                    <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="download"
                                                        className="w-5 mx-auto" role="img" xmlns="http://www.w3.org/2000/svg"
                                                        fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                                                        <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
                                                    </svg>
                                                    <input onChange={handleSelectImg} onClick={handleWhileSelectImg} accept="image/*" type="file" id="avatarSelect" className="hidden" />
                                                </label>
                                            </div>
                                        </div> */}
                                    </>
                                }
                            </div>
                        </div>
                        <Stack spacing={2}>
                            <TextField
                                label="Full Name"
                                name="displayName"
                                size="small"
                                variant="outlined"
                                defaultValue={user?.displayName}
                                onChange={updateHandler}
                            />
                            <LoadingButton
                                loading={updateProfileLoading}
                                onClick={() => { updateData && updateProfileSettings(updateData) }}
                                variant="contained"
                            >
                                update name
                            </LoadingButton>
                        </Stack>
                    </Section>

                    {/* ---------- 2. account ---------- */}
                    <Section title="Account" subtitle="How you sign in">
                        <Field label="Email">{user?.email || NOT_SET}</Field>
                        <Field label="Verified">
                            {user?.emailVerified
                                ? <Chip label="yes" color="success" size="small" />
                                : <Chip label="no" color="warning" size="small" />}
                        </Field>
                        <Field label="Sign-in method">
                            <span className="flex gap-1 justify-end flex-wrap">
                                {isPasswordAccount &&
                                    <Chip icon={<KeyIcon />} label="password" size="small" variant="outlined" />}
                                {isGoogleAccount &&
                                    <Chip icon={<GoogleIcon />} label="Google" size="small" variant="outlined" />}
                                {!providers.length && NOT_SET}
                            </span>
                        </Field>
                        {created && <Field label="Account created">{created}</Field>}
                        {lastSignIn && <Field label="Last sign-in">{lastSignIn}</Field>}
                    </Section>

                    {/* ---------- 3. academic profile ---------- */}
                    <Section
                        title="Academic profile"
                        subtitle="Used to enrol you in classrooms and to match course material"
                    >
                        <Field label="Designation">{userDesignation || NOT_SET}</Field>
                        <Field label="Department">
                            {userDepartment ? userDepartment.toUpperCase() : NOT_SET}
                        </Field>
                        <Field label="Semester">
                            {userDesignation === 'teacher'
                                ? <span className="text-gray-400 font-normal italic">not applicable</span>
                                : (userSemester || NOT_SET)}
                        </Field>
                        <Divider sx={{ my: 2 }} />
                        {profileComplete
                            ? <Alert severity="success" sx={{ mb: 2 }}>
                                Your academic profile is complete.
                            </Alert>
                            : <Alert severity="warning" sx={{ mb: 2 }}>
                                Some details are missing. Classroom enrolment matches students on
                                department and semester, so you may be skipped until this is filled in.
                            </Alert>}
                        <NavLink to="/complete-profile">
                            <LoadingButton variant="outlined" size="small" fullWidth>
                                {profileComplete ? 'change these details' : 'complete my profile'}
                            </LoadingButton>
                        </NavLink>
                    </Section>

                    {/* ---------- 4. access ---------- */}
                    <Section title="Access" subtitle="What your role lets you do">
                        <Field label="Role">
                            {userRole
                                ? <Chip label={userRole} color="primary" size="small" />
                                : NOT_SET}
                        </Field>
                        <Field label="Permissions">
                            {userPermissions?.length || 0}
                        </Field>
                        <Divider sx={{ my: 2 }} />
                        {userStatusLoading
                            ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>loading…</Typography>
                            : userPermissions?.length
                                ? <div className="flex flex-col gap-1.5">
                                    {userPermissions.map((key) => (
                                        <Tooltip key={key} title={key} placement="top-start" arrow>
                                            <div className="flex items-start gap-2 text-sm">
                                                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mt: '2px' }} />
                                                <span>{describe.get(key) || key}</span>
                                            </div>
                                        </Tooltip>
                                    ))}
                                </div>
                                : <Alert severity="info">
                                    Your role grants no special permissions yet. An administrator can
                                    change your role.
                                </Alert>}
                    </Section>

                    {/* ---------- 5. security ---------- */}
                    <Section title="Security" subtitle="Password and email verification" className="lg:col-span-2">
                        {isPasswordAccount && user?.emailVerified === false &&
                            <div className="mb-5">
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                    Your email is not verified yet. Until you verify it, signing in with
                                    Google using this address would replace your password.
                                </Alert>
                                {verifyError && <Alert severity="error" sx={{ mb: 1 }}>{verifyError}</Alert>}
                                {verifyMessage && <Alert severity="success" sx={{ mb: 1 }}>{verifyMessage}</Alert>}
                                <LoadingButton
                                    loading={verifyLoading}
                                    onClick={resendVerification}
                                    variant="outlined"
                                    size="small"
                                >
                                    resend verification email
                                </LoadingButton>
                            </div>
                        }

                        {isPasswordAccount
                            ? <Stack spacing={2} sx={{ maxWidth: 360 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Change password
                                </Typography>
                                {passwordError && <Alert severity="error">{passwordError}</Alert>}
                                {passwordMessage && <Alert severity="success">{passwordMessage}</Alert>}
                                <TextField
                                    label="Current Password" name="currentPassword" type="password"
                                    size="small" variant="outlined" autoComplete="current-password"
                                    value={currentPassword} onChange={passwordHandler}
                                />
                                <TextField
                                    label="New Password" name="newPassword" type="password"
                                    size="small" variant="outlined" autoComplete="new-password"
                                    value={newPassword} onChange={passwordHandler}
                                    error={tooShort || sameAsCurrent}
                                    helperText={
                                        tooShort ? 'At least 6 characters'
                                            : sameAsCurrent ? 'New password must differ from the current one'
                                                : ' '
                                    }
                                />
                                <TextField
                                    label="Confirm New Password" name="confirmPassword" type="password"
                                    size="small" variant="outlined" autoComplete="new-password"
                                    value={confirmPassword} onChange={passwordHandler}
                                    error={mismatch}
                                    helperText={mismatch ? 'Passwords do not match' : ' '}
                                />
                                <LoadingButton
                                    loading={passwordLoading}
                                    disabled={!canSubmitPassword}
                                    onClick={submitPassword}
                                    variant="contained"
                                >
                                    update password
                                </LoadingButton>
                            </Stack>
                            : <Alert severity="info">
                                You signed in with Google, so your password is managed by your Google
                                account. You can add a password by using
                                {' '}<NavLink to="/forgot-password" className="underline">forgot password</NavLink>.
                            </Alert>
                        }
                    </Section>
                </div>

                {/* Avatar crop modal */}
                {showModal ? (
                    <>
                        <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
                            <div className="relative w-auto my-6 mx-auto max-w-sm">
                                <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
                                    <div className="flex items-center justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                                        <h3 className="text-2xl font-semibold">Update Avatar</h3>
                                        <button
                                            className="p-1 ml-auto bg-transparent border-0 text-black float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                                            onClick={handleModalClose}
                                        >
                                            <span className="grid content-center bg-transparent text-black opacity-30 h-6 w-6 outline-none focus:outline-none">
                                                ×
                                            </span>
                                        </button>
                                    </div>
                                    <AvatarEditor
                                        ref={EditorRef}
                                        image={selectedImg}
                                        width={250}
                                        height={250}
                                        border={35}
                                        borderRadius={200}
                                        rotate={rotate}
                                        scale={scale}
                                        color={[89, 72, 72, 0.8]}
                                    />
                                    <div className="mx-2">
                                        <div className="relative pt-1 flex">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                            </svg>
                                            <input
                                                type="range"
                                                className="form-range w-full h-6 mx-2 bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
                                                min="1" max="10" defaultValue={1} step="0.01" id="customRange3"
                                                onChange={(e) => setScale(Number(e.target.value))}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                            </svg>
                                        </div>
                                        <div className="flex relative pt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                            </svg>
                                            <input
                                                type="range"
                                                className="form-range w-full h-6 mx-2 bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
                                                min="0" max="360" defaultValue={0} step="0.5" id="customRange3"
                                                onChange={(e) => setRotate(Number(e.target.value))}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: 'scaleX(-1)' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">
                                        <button
                                            className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                                            type="button"
                                            onClick={handleModalClose}
                                        >
                                            Close
                                        </button>
                                        <button
                                            className="bg-emerald-500 text-gray-700 active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                                            type="button"
                                            onClick={showCroppedImage}
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
                    </>
                ) : null}
            </div>
        </PageLayout>
    );
};

export default ChangeDP;
