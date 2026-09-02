import { useMutation, useQuery } from '@apollo/client';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, getIdToken, sendPasswordResetEmail, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import initAuth from "../firebase/initAuth"
import { purgePersistedCache } from '../apollo/client';
import { readAuthHint, writeAuthHint } from '../utility/authHint';
import { POST_USER, GET_USER_STATUS, UPDATE_PROFILE, CHANGE_PASSWORD, COMPLETE_PROFILE, SYNC_PASSWORD, REQUEST_PASSWORD_RESET } from '../queries/query';



initAuth()

const useFirebase = () => {
    const [user, setUser] = useState({});
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [updateTrack, setUpdateTrack] = useState(0);
    const [error, setError] = useState();
    const [token, setToken] = useState('');
    /* `isLoading` is the auth *bootstrap* flag: true until onAuthStateChanged
     * first reports. RequireAuth, AdminRoute and the navbar avatar key off it.
     *
     * It used to double as the submit state for every auth action, so signing in
     * with email spun the Google button too, disabled it, AND made the route
     * guards render a full-page loader mid-attempt. Each action owns its own
     * flag now. */
    const [isLoading, setIsLoading] = useState(true);
    /* Read once, synchronously, before the first paint -- see utility/authHint.
     * Held in state rather than read inline so it stays stable for the whole
     * session: the navbar must not flip prediction mid-bootstrap if some other
     * code writes the hint while onAuthStateChanged is still pending. */
    const [authHint] = useState(readAuthHint);
    const [emailAuthLoading, setEmailAuthLoading] = useState(false);
    const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    // password flows keep their own state so they don't clobber the
    // `error`/`isLoading` shared by the login and registration forms
    const [passwordError, setPasswordError] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifyMessage, setVerifyMessage] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const auth = getAuth();

    const location = useLocation();
    const history = useNavigate();

    const clearUser = () => {
        setName('')
        setEmail('')
        setPassword('')
    }

    const redirect = () => {
        const { state } = location;
        (state?.from) ? history(state?.from?.pathname) : history('/')
    }

    // Change Profile photo
    const [changePhoto, { loading: updateProfileLoading }] = useMutation(UPDATE_PROFILE)

    // new user entry in DB
    const [saveUser, { loading: saveUserLoading }] = useMutation(POST_USER)

    // Password reset & change
    const [completeProfileMutation] = useMutation(COMPLETE_PROFILE)
    const [requestReset] = useMutation(REQUEST_PASSWORD_RESET)
    const [changePasswordMutation] = useMutation(CHANGE_PASSWORD)
    const [syncPasswordMutation] = useMutation(SYNC_PASSWORD)

    // Firebase errors read "Firebase: ... (auth/wrong-password)."
    const firebaseErrorCode = (e) => {
        const code = e?.code || e?.message?.split('(')[1]?.split(')')[0];
        return code || e?.message || 'Something went wrong';
    }

    // Check is User admin or Not
    const {
        data: {
            getUserStatus: {
                isAdmin: admin = false,
                designation: userDesignation = "",
                department: userDepartment = "",
                semester: userSemester = "",
                isProfileComplete: profileComplete = false,
                role: userRole = "",
                permissions: userPermissions = [],
                isSuperadmin = false,
            } = {}
        } = [],
        loading: userStatusLoading = true,
        refetch: refetchUserStatus
    } = useQuery(GET_USER_STATUS, {
        variables: { email: user?.email },
        // the query declares email as String!, so don't fire it signed out
        skip: !user?.email,
    })

    // Capability check. Replaces branching on `admin` -- a role can now hold
    // one permission without holding the others.
    const can = (key) => (userPermissions || []).includes(key);

    /* firebase/storage is loaded on demand. Changing an avatar is a rare,
     * deliberate action behind /settings, so there is no reason every visitor
     * downloads the Storage SDK before the home page can render. The extra
     * round trip lands while the user is already cropping their image.
     *
     * The try/finally is new: the old version had no error path, so a failed
     * upload left the spinner running forever. */
    const uploadAvatar = async (file) => {
        setAvatarLoading(true);
        try {
            const { getStorage, ref, uploadString, getDownloadURL } = await import('firebase/storage');
            const fileRef = ref(getStorage(), 'avatar/' + auth?.currentUser?.uid + '.png');
            await uploadString(fileRef, file, 'data_url');
            const photoURL = await getDownloadURL(fileRef);
            updateProfile(auth?.currentUser, { photoURL })
                .then(() => { })
                .catch(e => { })
                .finally(() => {
                    changePhoto({ variables: { token, photoURL } })
                    setUser({ ...user, photoURL })
                })
        } catch (e) {
            setError(e.message)
        } finally {
            setAvatarLoading(false);
        }
    }

    const updateProfileSettings = (updateData) => {
        updateProfile(auth?.currentUser, { displayName: updateData?.displayName })
            .then(() => {
                setUser({ ...user, displayName: updateData?.displayName })
                changePhoto({ variables: { token, ...user } })
            })
            .catch(e => { setError(e.message) })
    }

    const googleErrorMessage = (code) => {
        switch (code) {
            case 'auth/popup-closed-by-user':
            case 'auth/cancelled-popup-request':
                return ''   // user simply backed out, not worth an error banner
            case 'auth/popup-blocked':
                return 'Your browser blocked the sign-in popup. Please allow popups and try again.'
            case 'auth/account-exists-with-different-credential':
                return 'An account with this email already exists. Sign in with your email and password instead.'
            case 'auth/operation-not-allowed':
            case 'auth/operation-not-supported-in-this-environment':
                return 'Google sign-in is not enabled for this project yet.'
            case 'auth/unauthorized-domain':
                return 'This domain is not authorised for Google sign-in.'
            default:
                return code
        }
    }

    const signWithGoogle = async (e) => {
        e.preventDefault();
        setGoogleAuthLoading(true);
        setError('');
        try {
            const googleProvider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, googleProvider);
            setUser(result.user)
            // addUser is a no-op when the email already exists, so a returning
            // Google user keeps the designation/department/semester they set
            // earlier and only a first-time user gets a fresh row
            await saveUser({
                variables: {
                    email: result?.user?.email,
                    displayName: result?.user?.displayName,
                    photoURL: result?.user?.photoURL,
                    authType: result?.user?.providerData[0]?.providerId,
                }
            })
            // Google gives us no designation/department, so ask the server whether
            // this account still needs them before deciding where to land
            const { data } = await refetchUserStatus({ email: result?.user?.email })
            if (data?.getUserStatus?.isProfileComplete === false)
                history('/complete-profile', { state: location.state })
            else
                redirect()
        } catch (e) {
            setError(googleErrorMessage(firebaseErrorCode(e)))
        } finally {
            setGoogleAuthLoading(false)
        }
    }

    const signInWithEmail = (e) => {
        e.preventDefault();
        setEmailAuthLoading(true);
        setError('');
        const signedInWith = password;
        signInWithEmailAndPassword(auth, email, password)
            .then(result => {
                setUser(result.user)
                // A Firebase-hosted password reset never reaches our server, so the
                // DB mirror can be stale. Sign-in is the one point we hold the
                // plaintext again -- heal it here. Best-effort and fire-and-forget
                // so it never delays or fails the sign-in itself.
                getIdToken(result.user)
                    .then(idToken => syncPasswordMutation({
                        variables: { token: `Bearer ${idToken}`, password: signedInWith }
                    }))
                    .catch(() => { })
                clearUser()
                user && redirect();
            })
            .catch(error => setError(error.message.split('(')[1].split(')')[0]))
            .finally(() => setEmailAuthLoading(false))
    }

    const signUpWithEmail = (event) => {
        event.preventDefault();
        setEmailAuthLoading(true);
        setError('');
        createUserWithEmailAndPassword(auth, email, password)
            .then(result => {
                setUser(result.user)
                auth?.currentUser && (
                    updateProfile(auth?.currentUser, {
                        displayName: `${name && name}`,
                        photoURL: `${name && "/assets/images/avator.webp"}`
                    }).then(() => {
                        setUpdateTrack(updateTrack + 1)
                    }).catch(error => setError(error.message))
                )
                saveUser({
                    variables: {
                        email,
                        password,
                        displayName: name,
                        photoURL: result?.user?.photoURL,
                        authType: result?.user?.providerData[0]?.providerId
                    }
                })
                // Verify the address. Firebase replaces an *unverified* password
                // credential when the same person later signs in with Google --
                // once verified, the two providers coexist and the password keeps
                // working. Best-effort: a failed send must not fail the signup.
                sendEmailVerification(result.user).catch(() => { })
                // saveUser(email, password, name, result?.user?.photoURL, result?.user?.providerData[0]?.providerId, "POST");
                user && redirect();
            })
            .catch(error => setError(error.message.split('(')[1].split(')')[0]))
            .finally(() => setEmailAuthLoading(false))
    }

    // Supplies the fields Google could not give us. Mirrors what the email
    // signup form writes, so both paths leave the same row shape behind.
    const completeProfile = async ({ designation, department, semester }, options = {}) => {
        setProfileLoading(true);
        setProfileError('');
        try {
            const idToken = await getIdToken(auth?.currentUser)
            const { data } = await completeProfileMutation({
                variables: { token: `Bearer ${idToken}`, designation, department, semester }
            })
            if (!data?.completeProfile?.success) {
                setProfileError(data?.completeProfile?.message || 'Unable to save your details')
                return false
            }
            await refetchUserStatus()
            // the gate sends people here with an intended destination in
            // location.state; editing from Settings should go back to Settings
            if (options?.to) history(options.to);
            else redirect();
            return true
        } catch (e) {
            setProfileError(e?.message || 'Unable to save your details')
            return false
        } finally {
            setProfileLoading(false)
        }
    }

    // An unverified email/password account loses its password the moment the same
    // person signs in with Google, so make verifying it recoverable from the UI.
    const resendVerification = async () => {
        setVerifyLoading(true);
        setVerifyError('');
        setVerifyMessage('');
        try {
            await sendEmailVerification(auth?.currentUser)
            setVerifyMessage(`Verification email sent to ${auth?.currentUser?.email}. Please check your inbox.`)
            return true
        } catch (e) {
            setVerifyError(firebaseErrorCode(e))
            return false
        } finally {
            setVerifyLoading(false)
        }
    }

    // Forgot password: the server confirms the address belongs to an
    // email/password account, then Firebase sends its own reset email
    const sendResetEmail = async (targetEmail) => {
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordMessage('');
        try {
            const { data } = await requestReset({ variables: { email: targetEmail } })
            if (!data?.requestPasswordReset?.success) {
                setPasswordError(data?.requestPasswordReset?.message || 'Unable to send reset email')
                return false
            }
            await sendPasswordResetEmail(auth, targetEmail)
            setPasswordMessage(`A reset link has been sent to ${targetEmail}. Please check your inbox.`)
            return true
        } catch (e) {
            setPasswordError(firebaseErrorCode(e))
            return false
        } finally {
            setPasswordLoading(false);
        }
    }

    // Change password: reauthenticate here to prove the current password,
    // then let the server perform the update through firebase-admin
    const changeUserPassword = async (currentPassword, newPassword) => {
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordMessage('');
        try {
            const credential = EmailAuthProvider.credential(auth?.currentUser?.email, currentPassword)
            await reauthenticateWithCredential(auth?.currentUser, credential)
        } catch (e) {
            const code = firebaseErrorCode(e)
            setPasswordError(
                (code === 'auth/wrong-password' || code === 'auth/invalid-credential')
                    ? 'Current password is incorrect'
                    : code
            )
            setPasswordLoading(false);
            return false
        }
        try {
            const { data } = await changePasswordMutation({ variables: { token, newPassword } })
            if (!data?.changePassword?.success) {
                setPasswordError(data?.changePassword?.message || 'Unable to update password')
                return false
            }
            setPasswordMessage(data?.changePassword?.message)
            return true
        } catch (e) {
            setPasswordError(e?.message || 'Unable to update password')
            return false
        } finally {
            setPasswordLoading(false);
        }
    }

    const logOut = () => {
        setIsLoading(true);
        signOut(auth)
            .then(() => {
                setUser({})
                clearUser()
                /* The Apollo cache is persisted to localStorage now, and it
                 * holds whatever this user read: their profile and permissions,
                 * conversation list, message previews. On a shared browser the
                 * next person could otherwise read all of it out of devtools. */
                purgePersistedCache()
                // stop predicting an account that no longer exists
                writeAuthHint(false)
            })
        // .finally(() => setEmailAuthLoading(false))
        user && redirect();
    }

    useEffect(() => {
        refetchUserStatus();
    }, [saveUserLoading, saveUserLoading])

    // A Google user lands with no designation/department/semester, and the
    // classroom features match students on exactly those fields -- an incomplete
    // row is silently skipped by addBulkMember. So hold them on the completion
    // form until it is filled in, whichever route they try. Waiting on
    // userStatusLoading keeps this from firing before the answer is in.
    useEffect(() => {
        if (!user?.email || userStatusLoading || profileComplete) return;
        if (location.pathname === '/complete-profile') return;
        history('/complete-profile', {
            state: location.state?.from ? location.state : { from: location }
        });
    }, [user?.email, userStatusLoading, profileComplete, location.pathname])

    useEffect(() => {
        const unsubscribed = onAuthStateChanged(auth, user => {
            if (user) {
                setUser(user)
                getIdToken(user)
                    .then(idToken => setToken(`Bearer ${idToken}`))
                clearUser()
                if (location.pathname === '/login' || location.pathname === '/signup')
                    history('/');
            }
            else
                setUser({});
            /* Record the real answer for the next load, so the first paint after
             * a refresh predicts correctly instead of guessing "signed out". */
            writeAuthHint(!!user);
            setIsLoading(false);
        });
        return () => unsubscribed;
    }, [auth, history, location, updateTrack])

    return {
        user,
        name,
        email,
        token,
        error,
        admin,
        // was this browser signed in last time? only meaningful while isLoading
        authHint,
        logOut,
        setName,
        setEmail,
        setError,
        password,
        isLoading,
        emailAuthLoading,
        googleAuthLoading,
        avatarLoading,
        setPassword,
        userSemester,
        userDepartment,
        userDesignation,
        can,
        userRole,
        userPermissions,
        /* The protected/root role. Separate from `can()` on purpose: it is not
         * a permission, so it cannot be granted from the roles page -- which is
         * what makes it usable as the gate on reading other people's history. */
        isSuperadmin,
        userStatusLoading,
        uploadAvatar,
        signWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        updateProfileLoading,
        updateProfileSettings,
        sendResetEmail,
        resendVerification,
        verifyError,
        verifyMessage,
        verifyLoading,
        changeUserPassword,
        completeProfile,
        profileComplete,
        profileError,
        profileLoading,
        setProfileError,
        passwordError,
        passwordMessage,
        passwordLoading,
        setPasswordError,
        setPasswordMessage,
    }
}

export default useFirebase