import { useEffect } from "react";
import { preloadRoute } from "../routes/lazyRoutes";

/**
 * Download a route's chunk when the pointer or keyboard focus reaches a link
 * that points at it, so the code is already in memory by the time it is clicked.
 *
 * Implemented as two delegated listeners on `document` rather than props on each
 * NavLink. Internal links live in the navbar, the department grid, the home page
 * cards, search results and the classroom lists; delegation covers all of them
 * at once, including any added later, without editing those files.
 *
 * `touchstart` is here because a tap fires no mouseover beforehand -- on a phone
 * this is the only chance to start the fetch before the navigation.
 */
const useRoutePrefetch = () => {
  useEffect(() => {
    // one attempt per path per session; the module registry would dedupe anyway,
    // but this keeps the hot mouseover path from doing string work every event
    const seen = new Set();

    const onIntent = (event) => {
      const link = event.target?.closest?.("a[href]");
      if (!link) return;
      // getAttribute, not .href: the property resolves to an absolute URL and
      // would make every internal link look external
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || seen.has(href)) return;
      seen.add(href);
      preloadRoute(href);
    };

    const opts = { passive: true, capture: true };
    document.addEventListener("mouseover", onIntent, opts);
    document.addEventListener("touchstart", onIntent, opts);
    document.addEventListener("focusin", onIntent, { capture: true });
    return () => {
      document.removeEventListener("mouseover", onIntent, opts);
      document.removeEventListener("touchstart", onIntent, opts);
      document.removeEventListener("focusin", onIntent, { capture: true });
    };
  }, []);
};

export default useRoutePrefetch;
