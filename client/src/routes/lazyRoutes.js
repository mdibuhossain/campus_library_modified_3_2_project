import lazyWithPreload from "../utility/lazyWithPreload";

/* Route components live here rather than in App.jsx so the path -> chunk map
 * below sits next to the definitions it refers to. A new route that forgets its
 * entry in the map still works -- it just loads on click instead of on hover. */

export const Home = lazyWithPreload(() => import("../pages/Home/Home"));
export const Department = lazyWithPreload(() => import("../pages/Department"));
export const Search = lazyWithPreload(() => import("../pages/Search/Search"));
export const Request = lazyWithPreload(() => import("../pages/Request/Request"));
export const Login = lazyWithPreload(() => import("../pages/Login/Login"));
export const Register = lazyWithPreload(() => import("../pages/Register/Register"));
export const ForgotPassword = lazyWithPreload(() => import("../pages/ForgotPassword/ForgotPassword"));
export const CompleteProfile = lazyWithPreload(() => import("../pages/CompleteProfile/CompleteProfile"));
export const MakeAdmin = lazyWithPreload(() => import("../pages/MakeAdmin/MakeAdmin"));
export const RoleManagement = lazyWithPreload(() => import("../pages/RoleManagement/RoleManagement"));
export const Messages = lazyWithPreload(() => import("../pages/Messages/Messages"));
export const EditContent = lazyWithPreload(() => import("../pages/EditContent/EditContent"));
export const ChangeDP = lazyWithPreload(() => import("../pages/ChangeDP/ChangeDP"));
export const Classroom = lazyWithPreload(() => import("../pages/Classroom/Classroom"));
export const ClassroomDetails = lazyWithPreload(() => import("../pages/Classroom/ClassroomDetails"));
export const ContentViewer = lazyWithPreload(() => import("../pages/ContentViewer/ContentViewer"));
export const ContentManagement = lazyWithPreload(() => import("../pages/ContentManagement/ContentManagement"));
export const Test = lazyWithPreload(() => import("../pages/Test/Test"));

// route guards -- a guarded page needs both chunks before it can paint
export const RequireAuth = lazyWithPreload(() => import("../PrivateRoute/RequireAuth"));
export const AdminRoute = lazyWithPreload(() => import("../PrivateRoute/AdminRoute"));

const EXACT = {
  "": [Home],
  "/": [Home],
  "/search": [Search],
  "/request": [Request],
  "/login": [Login],
  "/signup": [Register],
  "/forgot-password": [ForgotPassword],
  "/test": [Test],
  "/classroom": [RequireAuth, Classroom],
  "/settings": [RequireAuth, ChangeDP],
  "/pending": [RequireAuth, ContentManagement],
  "/mycontent": [RequireAuth, ContentManagement],
  "/manage": [AdminRoute, ContentManagement],
  "/makeadmin": [AdminRoute, MakeAdmin],
  "/roles": [AdminRoute, RoleManagement],
  "/messages": [RequireAuth, Messages],
  "/complete-profile": [RequireAuth, CompleteProfile],
};

// checked in order, longest-first, only when no exact match applies
const PREFIX = [
  ["/department/", [Department]],
  ["/classroom/", [RequireAuth, ClassroomDetails]],
  ["/messages/", [RequireAuth, Messages]],
  ["/content/", [ContentViewer]],
  ["/edit/", [RequireAuth, EditContent]],
];

/**
 * Start downloading the chunks a path needs. Safe to call with anything --
 * unknown paths, external URLs and hashes are simply ignored.
 */
export const preloadRoute = (path) => {
  if (typeof path !== "string" || !path.startsWith("/")) return;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const targets =
    EXACT[clean] || PREFIX.find(([prefix]) => clean.startsWith(prefix))?.[1];
  targets?.forEach((c) => {
    // a chunk that fails to prefetch must not surface as an unhandled rejection;
    // the real render will request it again and report the error properly then
    try { c.preload?.()?.catch?.(() => {}); } catch { /* ignore */ }
  });
};
