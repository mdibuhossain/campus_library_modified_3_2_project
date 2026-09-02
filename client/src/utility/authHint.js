/**
 * A synchronously-readable memory of whether this browser was signed in last
 * time it left the app.
 *
 * The navbar has to decide what to draw on its very first render, but Firebase
 * cannot answer "is someone signed in?" that early: its default persistence is
 * IndexedDB, so `onAuthStateChanged` only fires after an async read completes.
 * Until then `user` is `{}` -- indistinguishable from a genuine visitor, which
 * is why a returning user used to watch "Log in / Sign up" paint and then be
 * replaced by their own avatar.
 *
 * localStorage is synchronous, so a one-bit hint written on the way out is
 * available before the first paint. That turns the bootstrap render from a
 * guess into an informed prediction:
 *
 *   hint set    -> draw the account chrome as a skeleton; it resolves into the
 *                  real avatar with no layout shift and no wrong content
 *   hint absent -> draw Log in / Sign up immediately, which is already correct
 *                  for a first-time visitor -- no spinner for the common case
 *
 * The hint is a *prediction*, never authorisation. Everything that actually
 * matters -- route guards, permissions, queries -- keeps waiting for the real
 * token, so a stale hint can at worst cost one skeleton frame. It goes stale
 * only when a session expires while the tab is closed; the user then sees the
 * skeleton settle to the signed-out state, which is the same single transition
 * they get today, just in the rarer direction.
 */
const KEY = "campus-classroom:signed-in";

export const readAuthHint = () => {
  // Safari private mode throws on access rather than returning null
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const writeAuthHint = (signedIn) => {
  try {
    if (signedIn) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* no storage: every load just falls back to the signed-out first paint */
  }
};
