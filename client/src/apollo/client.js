import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createUploadLink } from "apollo-upload-client";
import { SynchronousCachePersistor, LocalStorageWrapper } from "apollo3-cache-persist";

/* Extracted from App.jsx so that useFirebase can reach `purgePersistedCache`
 * without importing App (which imports AuthProvider, which imports useFirebase
 * -- a cycle). */

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // these resolvers return the full list every time, so a merge that
        // concatenated would duplicate rows -- replace wholesale
        getBooks: { merge: (existing, incoming) => incoming },
        getQuestions: { merge: (existing, incoming) => incoming },
        getAllSyllabus: { merge: (existing, incoming) => incoming },
        getUsers: { merge: (existing, incoming) => incoming },
      },
    },
  },
});

/* Bump when a query's selection set changes shape. A cache written by an older
 * build can otherwise be restored into a newer one and satisfy a query with
 * fields that are no longer what the UI expects -- which reads as data that is
 * silently missing rather than as an error. */
const SCHEMA_VERSION = "1";
const SCHEMA_VERSION_KEY = "campus-classroom:cache-version";
const CACHE_KEY = "campus-classroom:apollo-cache";

const storageAvailable = () => {
  // Safari private mode and "block all cookies" both make localStorage throw on
  // write rather than simply be absent.
  try {
    const probe = "__probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

let persistor = null;

if (typeof window !== "undefined" && storageAvailable()) {
  persistor = new SynchronousCachePersistor({
    cache,
    storage: new LocalStorageWrapper(window.localStorage),
    key: CACHE_KEY,
    // localStorage is a ~5 MB budget shared with everything else on the origin;
    // past this the persistor drops the cache instead of throwing a quota error
    maxSize: 2 * 1024 * 1024,
  });

  if (window.localStorage.getItem(SCHEMA_VERSION_KEY) === SCHEMA_VERSION) {
    /* Synchronous on purpose. The async restore() resolves after the first
     * render, so the app would paint an empty loading state and only then swap
     * in the cached data -- exactly the flash this feature exists to remove. */
    persistor.restoreSync();
  } else {
    persistor.purge();
    window.localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
  }
}

const primaryServerEndpoint = import.meta.env.VITE_APP_BACKEND;
const backupServerEndpoint = import.meta.env.VITE_APP_BACKEND_BACKUP;

// backup server [if main server get failed] -------------
const errorLink = (uri, options) =>
  fetch(uri, options).catch(() => fetch(backupServerEndpoint, options));
// <---------------------------------

export const client = new ApolloClient({
  link: createUploadLink({ uri: primaryServerEndpoint, fetch: errorLink }),
  cache,
});

/**
 * Wipe both copies of the cache on sign-out.
 *
 * The persisted cache holds whatever the signed-in user read: their profile and
 * permissions, conversation list, message previews. That now lives in
 * localStorage, so on a shared machine the next person could read it out of
 * devtools. Purging the stored copy alone is not enough -- the persistor would
 * write the still-populated in-memory cache straight back out on the next
 * change -- so pause the writer, purge, clear memory, then resume.
 */
export const purgePersistedCache = async () => {
  try {
    persistor?.pause();
    await persistor?.purge();
    /* resetStore rather than clearStore: it refetches the still-active public
     * queries, so the department lists repopulate instead of going blank behind
     * the user as they land back on the home page. */
    await client.resetStore();
  } catch {
    /* resetStore rejects if any active query errors while refetching. The purge
     * above is the part that matters and has already happened. */
  } finally {
    persistor?.resume();
  }
};
