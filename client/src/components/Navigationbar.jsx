import { Fragment, useMemo, useState } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import {
  MenuIcon, XIcon, ChevronDownIcon, SearchIcon as SearchOutline,
  ViewGridIcon, UploadIcon, ChatAlt2Icon, AcademicCapIcon,
  ClipboardCheckIcon, UserGroupIcon, ShieldCheckIcon, DownloadIcon, LogoutIcon,
  SupportIcon, ClockIcon,
  CollectionIcon, UserCircleIcon, InboxInIcon,
} from "@heroicons/react/outline";
import { NavLink, useNavigate } from "react-router-dom";
import { Badge, Chip, Tooltip } from "@mui/material";
import { useAuth } from "../Hooks/useAuth";
import useUtility from "../Hooks/useUtility";
import DownloadButtonWithAnimate from "./Download_Button/DownloadButtonWithAnimate";
import NotificationBell from "./NotificationBell";

const AVATAR_FALLBACK = "/assets/images/avator.webp";
const APP_LINK =
  "https://drive.google.com/file/d/10jLrS9NrfMze-qSXVp_dLvU-ZJa0ZeoA/view?usp=sharing";

/* The bar holds only what a reader uses constantly -- search, departments, and
 * the one action that feeds the library (Upload). Everything else is sorted
 * into one of two menus by *who it belongs to*:
 *
 *   toolRoutes    -- places in the app.      Behind the apps grid.
 *   profileRoutes -- things that are yours.  Behind your avatar.
 *
 * That split is the whole point: "where do I go?" and "what is mine?" stop
 * competing for the same row. `permission` is a key from server/permissions.js;
 * entries without one are visible to every signed-in user. `badge` names a
 * counter resolved at render time, so a reviewer sees the queue without
 * opening the page.
 */
const toolRoutes = [
  { name: "Classroom", to: "/classroom", icon: AcademicCapIcon, desc: "Rooms, tasks, submissions" },
  // no permission: reaching the team is the one tool everybody needs
  { name: "Talk to admin", to: "/support", icon: SupportIcon, desc: "Ask the library's admins" },
  { name: "Manage content", to: "/manage", icon: ClipboardCheckIcon, permission: "content.approve", badge: "pending", desc: "Approve or hide uploads" },
  { name: "User roles", to: "/makeadmin", icon: UserGroupIcon, permission: "user.role.assign", desc: "Assign a role to a user" },
  { name: "Roles & permissions", to: "/roles", icon: ShieldCheckIcon, permission: "role.manage", desc: "Create and edit roles" },
  // `superadmin`, not a permission: this reads other people's private messages,
  // and a permission key could be self-granted by anyone with role.manage
  { name: "User history", to: "/history", icon: ClockIcon, superadmin: true, desc: "Full record of any member" },
];

const profileRoutes = [
  { name: "My profile", to: "/settings", icon: UserCircleIcon },
  { name: "My content", to: "/mycontent", icon: CollectionIcon },
  { name: "Pending requests", to: "/pending", icon: InboxInIcon, badge: "pending" },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const panelClass =
  "bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/10 focus:outline-none";

/* Fully opaque variant, for the departments mega-menu.
 *
 * The 95% panel above is fine on a small dropdown -- the 5% that shows through
 * is a few pixels of blurred nothing. This panel is the full width of the bar
 * and ~500px tall, and it opens directly over the department cards, which are
 * photographs. At that size the same 5% reads as ghosting rather than depth,
 * and it does not depend on backdrop-filter to look right: a browser that does
 * not composite backdrop-filter (or a user with it disabled) gets the page
 * showing through crisply instead of blurred. Opaque removes the variable. */
const solidPanelClass =
  "bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-white/10 focus:outline-none";

/* Circular icon control, the unit the whole right cluster is built from.
 *
 * Facebook's bar works because every control in it is the same size and shape,
 * so the row reads as one object rather than a queue of mismatched buttons.
 * 40px is the tap target; `active` is the filled state a route gets when you
 * are on it. */
const ICON_BTN =
  "relative inline-flex items-center justify-center h-10 w-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40";
const iconBtnClass = (on) =>
  classNames(
    ICON_BTN,
    on ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
  );

/* A count that must not be missed sits on the icon; anything else would need a
 * label, and a label is what we just removed.
 *
 * Two tones, because three red badges in a row all shouting equally is just
 * noise. Red is reserved for things a person is waiting on you for -- a message,
 * a notification. Amber is a work queue that will still be there in an hour. */
const CountBadge = ({ count, tone = "urgent" }) =>
  count > 0 ? (
    <span
      className={classNames(
        "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-gray-900",
        tone === "queue" ? "bg-amber-500 text-gray-900" : "bg-red-500 text-white"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const IconNavLink = ({ to, label, icon: Icon, count = 0 }) => (
  /* The span is load-bearing. MUI's Tooltip clones its child and merges the
   * className with clsx(), and clsx silently ignores a *function* -- while
   * NavLink's className is a function precisely so it can style its own active
   * state. Handing NavLink straight to Tooltip therefore replaced every class
   * with "", including `relative`, so the absolutely-positioned unread badge
   * escaped to the sticky bar and rendered in the far corner of the page.
   * Wrapping keeps Tooltip's ref on the span and NavLink's classes intact. */
  <Tooltip title={label} arrow>
    <span className="inline-flex">
      <NavLink to={to} aria-label={label} className={({ isActive }) => iconBtnClass(isActive)}>
        <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
        <CountBadge count={count} />
      </NavLink>
    </span>
  </Tooltip>
);

/* Search from anywhere, instead of an icon that navigates to a page where you
 * then have to type. Hands off to /search?q=, so a search is also a shareable
 * URL rather than transient page state. */
const NavSearch = ({ onDone, autoFocus }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const value = q.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
    setQ("");
    onDone?.();
  };
  return (
    <form onSubmit={submit} className="relative w-full">
      <SearchOutline
        className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search books, questions, syllabus…"
        aria-label="Search the library"
        className="w-full bg-white/10 hover:bg-white/[0.15] focus:bg-white/[0.18] text-sm text-gray-100 placeholder:text-gray-400 rounded-full pl-9 pr-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/60 transition-colors"
      />
    </form>
  );
};

const menuTransition = {
  as: Fragment,
  enter: "transition ease-out duration-150",
  enterFrom: "transform opacity-0 scale-95",
  enterTo: "transform opacity-100 scale-100",
  leave: "transition ease-in duration-100",
  leaveFrom: "transform opacity-100 scale-100",
  leaveTo: "transform opacity-0 scale-95",
};

/* The apps grid -- Google's waffle, holding places rather than settings.
 *
 * Tiles, not a list: each entry gets an icon and a line of explanation, which a
 * text row in the old bar had no room for. "Roles & permissions" next to "User
 * roles" was genuinely ambiguous before. */
const ToolsMenu = ({ routes, badges }) => (
  <Menu as="div" className="relative">
    {({ open }) => (
      <>
        <Tooltip title="Tools" arrow>
          <Menu.Button aria-label="Tools" className={iconBtnClass(open)}>
            <ViewGridIcon className="h-[22px] w-[22px]" aria-hidden="true" />
            {/* rolled up from the tiles inside: a collapsed menu must still be
                able to say that there is something behind it */}
            <CountBadge tone="queue" count={routes.reduce((n, r) => n + (badges[r.badge] || 0), 0)} />
          </Menu.Button>
        </Tooltip>
        <Transition {...menuTransition}>
          <Menu.Items
            className={`origin-top-right absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] p-2 ${panelClass}`}
          >
            <p className="px-2 pt-1 pb-2 text-xs uppercase tracking-wider text-gray-500">Tools</p>
            <div className="grid grid-cols-2 gap-1">
              {routes.map((route) => (
                <Menu.Item key={route.name}>
                  {({ active }) => (
                    <NavLink
                      to={route.to}
                      className={({ isActive }) =>
                        classNames(
                          active ? "bg-white/10" : "",
                          isActive ? "bg-white/15 ring-1 ring-white/15" : "",
                          "relative flex flex-col gap-1 p-3 rounded-xl transition-colors"
                        )
                      }
                    >
                      <route.icon className="h-6 w-6 text-sky-300" aria-hidden="true" />
                      <span className="text-sm font-medium text-white leading-tight">{route.name}</span>
                      <span className="text-[11px] text-gray-400 leading-tight">{route.desc}</span>
                      {badges[route.badge] > 0 && (
                        <span className="absolute top-2 right-2 min-w-[18px] text-center text-[10px] font-bold rounded-full bg-amber-500 text-gray-900 px-1">
                          {badges[route.badge]}
                        </span>
                      )}
                    </NavLink>
                  )}
                </Menu.Item>
              ))}
            </div>
            <div className="border-t border-white/10 mt-1.5 pt-1.5">
              <a
                href={APP_LINK}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                <DownloadIcon className="h-5 w-5" aria-hidden="true" /> Download the app
              </a>
            </div>
          </Menu.Items>
        </Transition>
      </>
    )}
  </Menu>
);

/* Your account: who you are, your things, and the way out. Nothing that is a
 * *place* in the app belongs here -- that is what the apps grid is for. */
const ProfileMenu = ({ badges }) => {
  const { user, logOut, userRole } = useAuth();
  if (!user?.email) return null;

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Tooltip title="Your account" arrow>
            <Menu.Button
              aria-label="Your account"
              className={classNames(
                "relative flex items-center justify-center h-10 w-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40",
                open ? "ring-2 ring-white/40" : "hover:brightness-110"
              )}
            >
              <img
                className="h-9 w-9 rounded-full object-cover bg-gray-700 ring-1 ring-white/20"
                src={user?.photoURL || AVATAR_FALLBACK}
                onError={(e) => { e.currentTarget.src = AVATAR_FALLBACK; }}
                alt=""
              />
            </Menu.Button>
          </Tooltip>
          <Transition {...menuTransition}>
            <Menu.Items className={`origin-top-right absolute right-0 mt-2 w-72 p-2 ${panelClass}`}>
              {/* the identity card doubles as the link to your own profile */}
              <Menu.Item>
                {({ active }) => (
                  <NavLink
                    to="/settings"
                    className={classNames(
                      active ? "bg-white/10" : "",
                      "flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                    )}
                  >
                    <img
                      className="h-11 w-11 rounded-full object-cover bg-gray-700 ring-1 ring-white/20"
                      src={user?.photoURL || AVATAR_FALLBACK}
                      onError={(e) => { e.currentTarget.src = AVATAR_FALLBACK; }}
                      alt=""
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-white font-semibold truncate">
                        {user?.displayName || "Your profile"}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">{user?.email}</span>
                      {/* your role, so "why can I not see X" is answerable in one look */}
                      {userRole && (
                        <Chip
                          size="small"
                          label={userRole}
                          sx={{
                            mt: 0.5, height: 18, fontSize: 10, textTransform: "capitalize",
                            bgcolor: "rgba(255,255,255,0.12)", color: "#e5e7eb",
                          }}
                        />
                      )}
                    </span>
                  </NavLink>
                )}
              </Menu.Item>
              <div className="border-t border-white/10 my-1.5" />
              {profileRoutes.map((route) => (
                <Menu.Item key={route.name}>
                  {({ active }) => (
                    <NavLink
                      to={route.to}
                      className={({ isActive }) =>
                        classNames(
                          active ? "bg-white/10" : "",
                          isActive ? "text-white" : "text-gray-300",
                          "flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition-colors"
                        )
                      }
                    >
                      <route.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span className="flex-1">{route.name}</span>
                      {badges[route.badge] > 0 && (
                        <span className="min-w-[20px] text-center text-[11px] font-semibold rounded-full bg-amber-500/90 text-gray-900 px-1.5 py-0.5">
                          {badges[route.badge]}
                        </span>
                      )}
                    </NavLink>
                  )}
                </Menu.Item>
              ))}
              <div className="border-t border-white/10 my-1.5" />
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={logOut}
                    className={classNames(
                      active ? "bg-white/10" : "",
                      "w-full text-left px-2.5 py-2 rounded-xl text-sm text-red-300 transition-colors"
                    )}
                  >
                    Sign out
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

// Desktop departments: a wide multi-column panel. 33 departments in a 224px
// scrolling strip wasted the space a large screen has.
const DepartmentsMenu = ({ list }) => (
  /* No `relative` here on purpose. With it, the panel anchored to the BUTTON,
   * which sits mid-bar just after the search box -- so a 46rem panel opened at
   * roughly x=470 on a 768px screen ran ~420px past the right edge. Capping the
   * width with min(46rem, 100vw-3rem) limited how wide it got but not where it
   * started, so it overflowed anyway.
   *
   * Without it the panel resolves against the nav row instead (which is
   * `relative`), so `left-0 right-0` makes it exactly the width of the content
   * container at every breakpoint. It cannot overflow, because it is measured
   * from the same box as everything else in the bar. */
  <Menu as="div">
    {({ open }) => (
      <>
        <Menu.Button
          className={classNames(
            open ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
            "px-3.5 py-2 rounded-full text-sm font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/40"
          )}
        >
          Departments
          <ChevronDownIcon
            className={classNames(open ? "rotate-180" : "", "h-4 w-4 transition-transform duration-200")}
            aria-hidden="true"
          />
        </Menu.Button>
        <Transition {...menuTransition}>
          <Menu.Items
            className={`origin-top absolute left-0 right-0 top-full z-50 mt-2 p-2 max-h-[70vh] overflow-y-auto ${solidPanelClass}`}
          >
            <p className="px-2 pt-1 pb-2 text-xs uppercase tracking-wider text-gray-500">
              {list?.length} departments
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
              {list?.map((item) => (
                <Menu.Item key={item?.name}>
                  {({ active }) => (
                    <NavLink
                      to={item.to}
                      title={item.name}
                      className={({ isActive }) =>
                        classNames(
                          active ? "bg-white/10" : "",
                          isActive ? "bg-white/15 text-white font-semibold" : "text-gray-300 hover:text-white",
                          "block px-2.5 py-2 rounded-lg text-xs font-medium truncate transition-colors"
                        )
                      }
                    >
                      {item.name}
                    </NavLink>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </>
    )}
  </Menu>
);

/* Mobile department list: expands inline rather than floating.
 * The mobile panel has overflow-y-auto, and an overflow container clips
 * absolutely-positioned children -- a floating dropdown nested inside it got
 * cut off. Two columns because 33 single-column rows is a lot of thumb travel. */
const MobileDeptList = ({ list, onNavigate }) => (
  <Disclosure>
    {({ open }) => (
      <>
        <Disclosure.Button
          className={classNames(
            open ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
            "w-full px-3 py-2 rounded-xl text-sm font-medium inline-flex items-center justify-between gap-1 transition-colors"
          )}
        >
          <span className="inline-flex items-center gap-3">
            <CollectionIcon className="h-5 w-5" aria-hidden="true" />
            Departments
          </span>
          <ChevronDownIcon
            className={classNames(open ? "rotate-180" : "", "h-4 w-4 transition-transform duration-200")}
            aria-hidden="true"
          />
        </Disclosure.Button>
        <Transition
          enter="transition duration-150 ease-out"
          enterFrom="transform -translate-y-1 opacity-0"
          enterTo="transform translate-y-0 opacity-100"
          leave="transition duration-100 ease-in"
          leaveFrom="transform translate-y-0 opacity-100"
          leaveTo="transform -translate-y-1 opacity-0"
        >
          <Disclosure.Panel className="mt-1.5 mb-1 grid grid-cols-2 gap-1">
            {list?.map((item) => (
              <NavLink
                key={item?.name}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  classNames(
                    isActive ? "bg-white/15 text-white" : "text-gray-400 hover:bg-white/10 hover:text-white",
                    "px-2 py-2 rounded-lg text-xs font-medium text-center truncate transition-colors"
                  )
                }
              >
                {item.name}
              </NavLink>
            ))}
          </Disclosure.Panel>
        </Transition>
      </>
    )}
  </Disclosure>
);

/* On a phone the avatar is not in the bar -- messages, notifications and the
 * menu button already fill it -- so the identity that the desktop avatar menu
 * shows has to live here instead, at the head of the Account section. */
const MobileIdentity = () => {
  const { user, userRole } = useAuth();
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <img
        className="h-10 w-10 rounded-full object-cover bg-gray-700 ring-1 ring-white/20"
        src={user?.photoURL || AVATAR_FALLBACK}
        onError={(e) => { e.currentTarget.src = AVATAR_FALLBACK; }}
        alt=""
      />
      <div className="min-w-0">
        <p className="text-sm text-white font-semibold truncate">{user?.displayName}</p>
        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
      </div>
      {userRole && (
        <Chip
          size="small"
          label={userRole}
          sx={{
            ml: "auto", height: 18, fontSize: 10, textTransform: "capitalize",
            bgcolor: "rgba(255,255,255,0.12)", color: "#e5e7eb",
          }}
        />
      )}
    </div>
  );
};

/* Sign out used to hang off the avatar menu, which on mobile sat in the bar.
 * Moving account links into the panel took the avatar out of the bar, and this
 * with it -- leaving a phone user no way to sign out at all. */
const MobileSignOut = () => {
  const { logOut } = useAuth();
  return (
    <button
      type="button"
      onClick={logOut}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-300 hover:bg-white/10 transition-colors"
    >
      <LogoutIcon className="h-5 w-5" aria-hidden="true" /> Sign out
    </button>
  );
};

const mobileRowClass = ({ isActive }) =>
  classNames(
    isActive ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
  );

/* Placeholder for the account cluster during auth bootstrap.
 *
 * Sized to match the messages + notifications + avatar trio exactly, so when
 * the real controls replace it nothing moves -- the avatar simply resolves in
 * place. A spinner was the other option, but a spinner reads as "something is
 * wrong / slow", whereas a skeleton at the final dimensions reads as "this is
 * loading", and it is what the user actually sees on every refresh. */
const AccountSkeleton = ({ count = 3 }) => (
  <div className="flex items-center gap-1 animate-pulse motion-reduce:animate-none" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-10 w-10 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full bg-white/10" />
      </div>
    ))}
  </div>
);

export default function Navigation() {
  const { user, isLoading, authHint, can, unreadMessages, isSuperadmin } = useAuth();
  const { deptNavList, deptLoading, books, questions, syllabus } = useUtility();

  /* Three states, not two.
   *
   * This used to be a plain `user?.email ? account : guest`, with the isLoading
   * check nested *inside* the account branch -- where it could never run during
   * bootstrap. So while Firebase was still reading its IndexedDB session,
   * `user` was `{}` and the navbar confidently painted "Log in / Sign up" at a
   * returning user, then swapped in their avatar a few hundred ms later.
   *
   * `authPending` is that third state. During it we draw neither branch as
   * fact: `authHint` (see utility/authHint) says which way the load is going to
   * resolve, so the skeleton stands in for the account chrome only when there
   * is genuinely an account coming. A first-time visitor still gets Log in /
   * Sign up on the first paint, with no spinner. */
  const signedIn = !!(user?.email || user?.displayName);
  const authPending = isLoading && !signedIn;
  const expectAccount = signedIn || (authPending && authHint);
  /* No hint is itself a prediction -- of "signed out" -- so the guest actions
   * paint on the first frame for a first-time visitor. Only a load that expects
   * an account has anything to wait for. */
  const showGuestActions = !expectAccount;

  /* How much is waiting for review. The data is already in the client for the
   * library pages, so surfacing it in the nav costs nothing -- and a reviewer
   * no longer has to open the page to discover there is nothing to do. */
  const pendingCount = useMemo(() => {
    if (!can("content.approve")) return 0;
    const all = [...(books || []), ...(questions || []), ...(syllabus || [])];
    return all.filter((item) => !item?.status).length;
  }, [books, questions, syllabus, can]);

  const badges = { pending: pendingCount };
  const visibleTools = toolRoutes.filter((r) =>
    r.superadmin ? isSuperadmin : !r.permission || can(r.permission)
  );

  return (
    <div className="w-full sticky top-0 z-50">
      {/* first focusable element: lets keyboard users jump the whole bar */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-gray-900 focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-lg text-sm font-medium"
      >
        Skip to content
      </a>
      <Disclosure as="nav" className="bg-gray-900/85 backdrop-blur-xl border-b border-white/10">
        {({ open, close }) => (
          <>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              {/* `relative`: the departments panel anchors to this row, not to
                  its button -- see DepartmentsMenu */}
              <div className="relative flex items-center h-16 gap-2">
                {/* Home lives on the logo, the way it does on every site people
                    already know -- which is what freed the row for search. */}
                <NavLink
                  to="/"
                  aria-label="Campus Classroom — home"
                  className="flex items-center gap-2.5 text-[#a8ff01] font-rubik_doodle text-xl xl:text-2xl flex-shrink-0 rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <img className="w-10 sm:w-11" src="/assets/images/logo.webp" alt="" />
                  <span className="hidden xl:block whitespace-nowrap">CAMPUS CLASSROOM</span>
                </NavLink>

                {/* search first: the primary way into 63 books and counting */}
                <div className="hidden md:block flex-1 max-w-sm lg:max-w-md">
                  <NavSearch />
                </div>
                <div className="hidden md:block flex-shrink-0">
                  {!deptLoading && <DepartmentsMenu list={deptNavList} />}
                </div>

                {/* mobile: centred download for signed-out visitors, as before.
                    Held back until auth resolves -- it used to flash in and out
                    for signed-in users on every refresh. */}
                {showGuestActions && (
                  <div className="md:hidden mx-auto">
                    <DownloadButtonWithAnimate />
                  </div>
                )}

                {/* right cluster: one row of same-sized circles */}
                <div className="hidden md:flex items-center gap-1 ml-auto flex-shrink-0">
                  {/* Upload keeps its label. It is the action that feeds the
                      library, so it is the one thing here that should not have
                      to be recognised from an icon alone. */}
                  <NavLink
                    to="/request"
                    className={({ isActive }) =>
                      classNames(
                        "inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 whitespace-nowrap mr-1",
                        isActive
                          ? "bg-[#a8ff01] text-gray-900"
                          : "bg-white/10 text-white hover:bg-white/[0.18]"
                      )
                    }
                  >
                    <UploadIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                    <span className="hidden lg:block">Upload</span>
                  </NavLink>

                  {expectAccount ? (
                    authPending ? (
                      <AccountSkeleton />
                    ) : (
                      <>
                        {visibleTools.length > 0 && (
                          <ToolsMenu routes={visibleTools} badges={badges} />
                        )}
                        <IconNavLink
                          to="/messages"
                          label="Messages"
                          icon={ChatAlt2Icon}
                          count={unreadMessages}
                        />
                        <NotificationBell />
                        <ProfileMenu badges={badges} />
                      </>
                    )
                  ) : (
                    // a visitor gets a clear primary action, not just "Login"
                    <>
                      <NavLink
                        to="/login"
                        className="px-3.5 py-2 rounded-full text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                      >
                        Log in
                      </NavLink>
                      <NavLink
                        to="/signup"
                        className="px-3.5 py-2 rounded-full text-sm font-semibold bg-[#a8ff01] text-gray-900 hover:brightness-95 transition whitespace-nowrap"
                      >
                        Sign up
                      </NavLink>
                      <div className="hidden xl:block ml-1">
                        <DownloadButtonWithAnimate />
                      </div>
                    </>
                  )}
                </div>

                {/* mobile controls: the two live counters stay reachable
                    without opening the menu; everything else is inside it */}
                <div className="flex items-center gap-0.5 md:hidden ml-auto">
                  {expectAccount && authPending && <AccountSkeleton count={2} />}
                  {signedIn && (
                    <IconNavLink
                      to="/messages"
                      label="Messages"
                      icon={ChatAlt2Icon}
                      count={unreadMessages}
                    />
                  )}
                  {signedIn && <NotificationBell />}
                  <Disclosure.Button className="relative inline-flex items-center justify-center h-10 w-10 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">
                    <span className="sr-only">Open main menu</span>
                    {open ? <XIcon className="h-6 w-6" aria-hidden="true" />
                      : <MenuIcon className="h-6 w-6" aria-hidden="true" />}
                    {/* something needing attention is visible without opening the menu */}
                    {!open && pendingCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Transition
              enter="transition duration-150 ease-out"
              enterFrom="transform -translate-y-2 opacity-0"
              enterTo="transform translate-y-0 opacity-100"
              leave="transition duration-100 ease-in"
              leaveFrom="transform translate-y-0 opacity-100"
              leaveTo="transform -translate-y-2 opacity-0"
            >
              <Disclosure.Panel className="md:hidden border-t border-white/10 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {/* the mobile panel mirrors the desktop split: search, then
                    places, then your account -- in that order */}
                <div className="px-3 pt-3 pb-1">
                  <NavSearch onDone={close} />
                </div>

                <div className="px-3 pt-2 pb-2 space-y-1">
                  <NavLink to="/request" onClick={close} className={mobileRowClass}>
                    <UploadIcon className="h-5 w-5" aria-hidden="true" /> Upload
                  </NavLink>
                  {!deptLoading && <MobileDeptList list={deptNavList} onNavigate={close} />}
                </div>

                {expectAccount && visibleTools.length > 0 && (
                  <div className="px-3 pb-2 pt-2 space-y-1 border-t border-white/10">
                    <p className="px-3 pb-1 text-xs uppercase tracking-wider text-gray-500">Tools</p>
                    {visibleTools.map((route) => (
                      <NavLink key={route.name} to={route.to} onClick={close} className={mobileRowClass}>
                        <route.icon className="h-5 w-5" aria-hidden="true" />
                        <span className="flex-1">{route.name}</span>
                        {badges[route.badge] > 0 && (
                          <span className="min-w-[20px] text-center text-[11px] font-semibold rounded-full bg-amber-500/90 text-gray-900 px-1.5 py-0.5">
                            {badges[route.badge]}
                          </span>
                        )}
                      </NavLink>
                    ))}
                    <a
                      href={APP_LINK}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-colors"
                    >
                      <DownloadIcon className="h-5 w-5" aria-hidden="true" /> Download the app
                    </a>
                  </div>
                )}

                {expectAccount ? (
                  <div className="px-3 pb-2 pt-2 space-y-1 border-t border-white/10">
                    <p className="px-3 pb-1 text-xs uppercase tracking-wider text-gray-500">Account</p>
                    <MobileIdentity />
                    {profileRoutes.map((route) => (
                      <NavLink key={route.name} to={route.to} onClick={close} className={mobileRowClass}>
                        <route.icon className="h-5 w-5" aria-hidden="true" />
                        <span className="flex-1">{route.name}</span>
                        {badges[route.badge] > 0 && (
                          <span className="min-w-[20px] text-center text-[11px] font-semibold rounded-full bg-amber-500/90 text-gray-900 px-1.5 py-0.5">
                            {badges[route.badge]}
                          </span>
                        )}
                      </NavLink>
                    ))}
                    <MobileSignOut />
                  </div>
                ) : (
                  <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-2 border-t border-white/10">
                    <NavLink
                      to="/login"
                      onClick={close}
                      className="px-3.5 py-2 rounded-full text-sm font-medium text-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Log in
                    </NavLink>
                    <NavLink
                      to="/signup"
                      onClick={close}
                      className="px-3.5 py-2 rounded-full text-sm font-semibold bg-[#a8ff01] text-gray-900 text-center"
                    >
                      Sign up
                    </NavLink>
                  </div>
                )}
              </Disclosure.Panel>
            </Transition>
          </>
        )}
      </Disclosure>
    </div>
  );
}
