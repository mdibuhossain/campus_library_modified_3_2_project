/* Firebase Cloud Messaging service worker.
 *
 * Lives at the site root (/firebase-messaging-sw.js) so its scope covers the
 * whole app -- that is why it sits in public/ rather than src/.
 *
 * Service workers cannot read Vite's import.meta.env, and public/ files are not
 * processed by the bundler. Rather than hardcoding the config (which would then
 * silently drift from .env.local), the app registers this worker with the config
 * in the query string and we read it back here. None of these values are secret
 * -- they already ship in the client bundle.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const params = new URL(self.location).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Fires when a push arrives and no tab is focused.
messaging.onBackgroundMessage((payload) => {
  const { title, body, link } = payload?.data || {};
  self.registration.showNotification(title || "Campus Classroom", {
    body: body || "",
    icon: "/assets/images/logo.webp",
    badge: "/assets/images/logo.webp",
    data: { link: link || "/" },
  });
});

// Clicking focuses an existing tab rather than piling up duplicates.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.link || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const client of all) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
