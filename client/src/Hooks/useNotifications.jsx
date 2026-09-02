import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
    GET_NOTIFICATIONS, REGISTER_DEVICE, UNREGISTER_DEVICE, MARK_NOTIFICATIONS_READ,
    GET_UNREAD_MESSAGE_COUNT,
} from "../queries/query";

/* firebase/messaging used to be imported at the top of this file, which put the
 * entire Messaging SDK in the entry chunk -- downloaded by every anonymous
 * visitor just to render the home page. Nothing here is reachable without the
 * notification bell, and the bell only renders for a signed-in user.
 *
 * The import promise is memoised at module scope so concurrent callers share a
 * single request and a single module instance. */
let messagingModule;
const loadMessaging = () => {
    if (!messagingModule) messagingModule = import("firebase/messaging");
    return messagingModule;
};

/* Cheap native probe. If the browser is missing these APIs then Firebase's own
 * isSupported() would return false too, so we can answer without loading it. */
const browserCouldSupportPush = () =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined";

const VAPID_KEY = import.meta.env.VITE_APP_VAPID_KEY;
const LOCAL_TOKEN_KEY = "fcmToken";

// The service worker lives in public/ so the bundler never sees it, and a worker
// cannot read import.meta.env. Pass the config through the registration URL so
// it can never drift from .env.local.
/**
 * navigator.serviceWorker.register() resolves as soon as the *registration*
 * exists -- on a first install the worker is still "installing". FCM's getToken()
 * calls PushManager.subscribe() internally, which requires an ACTIVE worker, so
 * calling it too early fails with:
 *   "Failed to execute 'subscribe' on 'PushManager': Subscription failed -
 *    no active Service Worker"
 * Wait for activation explicitly rather than hoping the race goes our way.
 */
const waitForActiveWorker = (registration, timeoutMs = 15000) =>
    new Promise((resolve, reject) => {
        if (registration.active) return resolve(registration);
        const worker = registration.installing || registration.waiting;
        if (!worker) {
            return reject(new Error("The service worker registered but produced no worker."));
        }
        const timer = setTimeout(() => {
            worker.removeEventListener("statechange", onChange);
            reject(new Error("The service worker took too long to activate."));
        }, timeoutMs);
        const done = (fn, arg) => {
            clearTimeout(timer);
            worker.removeEventListener("statechange", onChange);
            fn(arg);
        };
        function onChange() {
            if (worker.state === "activated") done(resolve, registration);
            // redundant means install failed -- usually the worker script threw,
            // e.g. its importScripts could not be fetched
            else if (worker.state === "redundant") {
                done(reject, new Error("The service worker failed to install."));
            }
        }
        worker.addEventListener("statechange", onChange);
    });

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

    // drives the badge on the nav's Messages entry
    const { data: unreadMsgData, refetch: refetchUnreadMessages } = useQuery(
        GET_UNREAD_MESSAGE_COUNT,
        {
            variables: { token },
            skip: !token,
            pollInterval: token ? 60000 : 0,
            fetchPolicy: "cache-and-network",
        }
    );

    const [registerDevice] = useMutation(REGISTER_DEVICE);
    const [unregisterDevice] = useMutation(UNREGISTER_DEVICE);
    const [markRead] = useMutation(MARK_NOTIFICATIONS_READ);

    const items = data?.getNotifications?.items || [];
    const unread = data?.getNotifications?.unread || 0;

    // Gated on `token`: a signed-out visitor has no bell, so there is nothing to
    // report support for and no reason to fetch the SDK.
    useEffect(() => {
        if (!token || !browserCouldSupportPush()) {
            setSupported(false);
            return;
        }
        let cancelled = false;
        loadMessaging()
            .then(({ isSupported }) => isSupported())
            .then((ok) => { if (!cancelled) setSupported(ok); })
            .catch(() => { if (!cancelled) setSupported(false); });
        return () => { cancelled = true; };
    }, [token]);

    const getMessagingSafe = useCallback(async () => {
        if (messagingRef.current) return messagingRef.current;
        const { getMessaging, isSupported } = await loadMessaging();
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
            const { isSupported, getToken } = await loadMessaging();
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
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setPushError("This browser cannot receive web push notifications.");
                return false;
            }
            const url = swUrl();
            // reuse an existing registration for this exact URL instead of
            // stacking a new one on every click
            const existing = await navigator.serviceWorker.getRegistration("/");
            const registration =
                existing && existing.active?.scriptURL?.includes("firebase-messaging-sw.js")
                    ? existing
                    : await navigator.serviceWorker.register(url);
            // the fix: do not ask FCM for a token until the worker is active
            await waitForActiveWorker(registration);
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
            const [{ onMessage }, messaging] = await Promise.all([
                loadMessaging(),
                getMessagingSafe(),
            ]);
            if (!messaging) return;
            unsubscribe = onMessage(messaging, () => {
                refetch();
                // a chat push must move the Messages badge as well as the bell
                refetchUnreadMessages();
            });
        })();
        return () => unsubscribe();
    }, [token, supported, permission, refetch, refetchUnreadMessages, getMessagingSafe]);

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
        unreadMessages: unreadMsgData?.getUnreadMessageCount || 0,
        refetchUnreadMessages,
        permission, pushSupported: supported, pushConfigured: !!VAPID_KEY, pushError,
        /* `pushSupported` starts false and only turns true once Firebase's
         * async isSupported() resolves, so UI that keys off it would briefly
         * claim the browser cannot do push at all. `pushCapable` is the
         * synchronous native check -- false here means definitely unsupported,
         * which is a safe thing to render on the first frame. */
        pushCapable: browserCouldSupportPush(),
        enablePush, disablePush, markAllRead, markOneRead,
    };
};

export default useNotifications;
