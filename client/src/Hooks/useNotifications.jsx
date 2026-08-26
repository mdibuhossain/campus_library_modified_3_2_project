import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import {
    GET_NOTIFICATIONS, REGISTER_DEVICE, UNREGISTER_DEVICE, MARK_NOTIFICATIONS_READ,
} from "../queries/query";

const VAPID_KEY = import.meta.env.VITE_APP_VAPID_KEY;
const LOCAL_TOKEN_KEY = "fcmToken";

// The service worker lives in public/ so the bundler never sees it, and a worker
// cannot read import.meta.env. Pass the config through the registration URL so
// it can never drift from .env.local.
const swUrl = () => {
    const cfg = new URLSearchParams({
        apiKey: import.meta.env.VITE_APP_API_KEY || "",
        authDomain: import.meta.env.VITE_APP_AUTH_DOMAIN || "",
        projectId: import.meta.env.VITE_APP_PROJECT_ID || "",
        storageBucket: import.meta.env.VITE_APP_STORAGE_BUCKET || "",
        messagingSenderId: import.meta.env.VITE_APP_MESSAGING_SENDER_ID || "",
        appId: import.meta.env.VITE_APP_APP_ID || "",
    });
    return `/firebase-messaging-sw.js?${cfg.toString()}`;
};

/**
 * In-app notification feed plus FCM push registration.
 *
 * Push is entirely optional: if the browser lacks support, the user denies
 * permission, or VITE_APP_VAPID_KEY is unset, the feed still works — it is
 * backed by MongoDB, not by the push channel.
 */
const useNotifications = (token) => {
    const [permission, setPermission] = useState(
        typeof Notification === "undefined" ? "unsupported" : Notification.permission
    );
    const [pushError, setPushError] = useState("");
    const [supported, setSupported] = useState(false);
    const messagingRef = useRef(null);

    const { data, refetch } = useQuery(GET_NOTIFICATIONS, {
        variables: { token, limit: 20 },
        skip: !token,
        // a missed push must not mean a permanently stale bell
        pollInterval: token ? 120000 : 0,
        fetchPolicy: "cache-and-network",
    });

    const [registerDevice] = useMutation(REGISTER_DEVICE);
    const [unregisterDevice] = useMutation(UNREGISTER_DEVICE);
    const [markRead] = useMutation(MARK_NOTIFICATIONS_READ);

    const items = data?.getNotifications?.items || [];
    const unread = data?.getNotifications?.unread || 0;

    useEffect(() => {
        isSupported().then(setSupported).catch(() => setSupported(false));
    }, []);

    const getMessagingSafe = useCallback(async () => {
        if (messagingRef.current) return messagingRef.current;
        if (!(await isSupported())) return null;
        messagingRef.current = getMessaging();
        return messagingRef.current;
    }, []);

    // Ask for permission and hand the device token to the server. Called from a
    // click -- browsers ignore permission requests that are not user-initiated.
    const enablePush = useCallback(async () => {
        setPushError("");
        try {
            if (!VAPID_KEY) {
                setPushError("Push is not configured yet (VITE_APP_VAPID_KEY is missing).");
                return false;
            }
            if (!(await isSupported())) {
                setPushError("This browser does not support push notifications.");
                return false;
            }
            const granted = await Notification.requestPermission();
            setPermission(granted);
            if (granted !== "granted") {
                setPushError("Notification permission was not granted.");
                return false;
            }
            const registration = await navigator.serviceWorker.register(swUrl());
            const messaging = await getMessagingSafe();
            const fcmToken = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });
            if (!fcmToken) {
                setPushError("Could not obtain a device token.");
                return false;
            }
            await registerDevice({ variables: { fcmToken, token } });
            localStorage.setItem(LOCAL_TOKEN_KEY, fcmToken);
            return true;
        } catch (e) {
            setPushError(e?.message || "Could not enable push notifications.");
            return false;
        }
    }, [token, registerDevice, getMessagingSafe]);

    const disablePush = useCallback(async () => {
        const fcmToken = localStorage.getItem(LOCAL_TOKEN_KEY);
        if (!fcmToken) return;
        try {
            await unregisterDevice({ variables: { fcmToken, token } });
            localStorage.removeItem(LOCAL_TOKEN_KEY);
        } catch { /* best effort */ }
    }, [token, unregisterDevice]);

    // Foreground pushes do not raise an OS notification, so refresh the feed and
    // let the bell badge be the signal.
    useEffect(() => {
        if (!token || !supported || permission !== "granted") return;
        let unsubscribe = () => { };
        (async () => {
            const messaging = await getMessagingSafe();
            if (!messaging) return;
            unsubscribe = onMessage(messaging, () => { refetch(); });
        })();
        return () => unsubscribe();
    }, [token, supported, permission, refetch, getMessagingSafe]);

    const markAllRead = useCallback(async () => {
        if (!unread) return;
        await markRead({ variables: { token } });
        refetch();
    }, [unread, markRead, token, refetch]);

    const markOneRead = useCallback(async (_id) => {
        await markRead({ variables: { _id, token } });
        refetch();
    }, [markRead, token, refetch]);

    return {
        items, unread, refetchNotifications: refetch,
        permission, pushSupported: supported, pushConfigured: !!VAPID_KEY, pushError,
        enablePush, disablePush, markAllRead, markOneRead,
    };
};

export default useNotifications;
