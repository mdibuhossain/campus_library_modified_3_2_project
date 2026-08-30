import { Fragment, useMemo, useState } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { MenuIcon, XIcon, ChevronDownIcon, SearchIcon as SearchOutline } from "@heroicons/react/outline";
import { NavLink, useNavigate } from "react-router-dom";
import { Badge, Chip, CircularProgress, Tooltip } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import { useAuth } from "../Hooks/useAuth";
import useUtility from "../Hooks/useUtility";
import DownloadButtonWithAnimate from "./Download_Button/DownloadButtonWithAnimate";
import NotificationBell from "./NotificationBell";

const AVATAR_FALLBACK = "/assets/images/avator.webp";
const APP_LINK =
  "https://drive.google.com/file/d/10jLrS9NrfMze-qSXVp_dLvU-ZJa0ZeoA/view?usp=sharing";

/* Account routes.
 *
 * `permission` is a key from server/permissions.js; entries without one are
 * visible to every signed-in user. `badge` names a counter resolved at render
 * time, so a reviewer sees how much is waiting without having to go looking. */
const profileRoutes = [
  { name: "My profile", to: "/settings" },
  { name: "My content", to: "/mycontent" },
  { name: "Pending requests", to: "/pending", badge: "pending" },
  { name: "Manage content", to: "/manage", permission: "content.approve", badge: "pending" },
  { name: "User roles", to: "/makeadmin", permission: "user.role.assign" },
  { name: "Roles & permissions", to: "/roles", permission: "role.manage" },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const itemClass = ({ isActive }) =>
  classNames(
    isActive ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
    "px-3 py-1.5 rounded-full text-sm font-medium block text-center transition-colors duration-150 whitespace-nowrap"
  );

const panelClass =
  "bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl ring-1 ring-white/10 py-1.5 focus:outline-none";

const menuItemClass = (active, isActive) =>
  classNames(
    active ? "bg-white/10" : "",
    isActive ? "text-white font-semibold" : "text-gray-300",
    "flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors"
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
        className="w-full bg-white/10 hover:bg-white/[0.15] focus:bg-white/[0.18] text-sm text-gray-100 placeholder:text-gray-400 rounded-full pl-9 pr-3 py-1.5 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/60 transition-colors"
      />
    </form>
  );
};

const ProfileButton = ({ badges }) => {
  const { user, logOut, can, userRole } = useAuth();
  const visibleRoutes = profileRoutes.filter(
    (route) => !route.permission || can(route.permission)
  );
  if (!user?.email) return null;

  return (
    <Menu as="div" className="relative z-50">
      <Menu.Button className="flex items-center gap-2 rounded-full p-1 sm:pr-2 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">
        <img
          className="h-8 w-8 rounded-full object-cover bg-gray-700 ring-2 ring-white/20"
          src={user?.photoURL || AVATAR_FALLBACK}
          onError={(e) => { e.currentTarget.src = AVATAR_FALLBACK; }}
          alt=""
        />
        <span className="font-medium text-gray-100 text-sm max-w-[7rem] truncate hidden lg:block">
          {user?.displayName?.split(" ")[0]}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-400 hidden lg:block" aria-hidden="true" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className={`origin-top-right absolute right-0 mt-2 w-64 ${panelClass}`}>
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm text-white font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            {/* your role, so "why can I not see X" is answerable in one look */}
            {userRole && (
              <Chip
                size="small"
                label={userRole}
                sx={{
                  mt: 1, height: 19, fontSize: 10, textTransform: "capitalize",
                  bgcolor: "rgba(255,255,255,0.12)", color: "#e5e7eb",
                }}
              />
            )}
          </div>
          {visibleRoutes.map((route) => (
            <Menu.Item key={route.name}>
              {({ active }) => (
                <NavLink
                  to={route.to}
                  className={({ isActive }) => menuItemClass(active, isActive)}
                >
                  <span>{route.name}</span>
                  {badges[route.badge] > 0 && (
                    <span className="min-w-[20px] text-center text-[11px] font-semibold rounded-full bg-amber-500/90 text-gray-900 px-1.5 py-0.5">
                      {badges[route.badge]}
                    </span>
                  )}
                </NavLink>
              )}
            </Menu.Item>
          ))}
          <div className="border-t border-white/10 mt-1 pt-1">
            <a
              href={APP_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors lg:hidden"
            >
              <GetAppIcon sx={{ fontSize: 16 }} /> Download app
            </a>
            <Menu.Item>
              {({ active }) => (
                <button
                  type="button"
                  onClick={logOut}
                  className={classNames(
                    active ? "bg-white/10" : "",
                    "block w-full text-left px-4 py-2 text-sm text-red-300 transition-colors"
                  )}
                >
                  Sign out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

const LinkTitle = ({ name, to, onNavigate, badge }) => (
  <NavLink to={to} onClick={onNavigate} className={itemClass}>
    <span className="inline-flex items-center justify-center gap-1.5">
      {badge ? (
        <Badge badgeContent={badge} color="error" max={99} sx={{ "& .MuiBadge-badge": { right: -12, top: 0 } }}>
          {name}
        </Badge>
      ) : (
        name
      )}
    </span>
  </NavLink>
);

/* Mobile department list: expands inline rather than floating.
 * The mobile panel has overflow-y-auto, and an overflow container clips
 * absolutely-positioned children -- a floating dropdown nested inside it got
 * cut off. Two columns because 33 single-column rows is a lot of thumb travel. */
const MobileDeptList = ({ name, list, onNavigate }) => (
  <Disclosure>
    {({ open }) => (
      <>
        <Disclosure.Button
          className={classNames(
            open ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
            "w-full px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1 transition-colors duration-150"
          )}
        >
          {name}
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

// Desktop: a wide multi-column panel. 33 departments in a 224px scrolling strip
// wasted the space a large screen has.
const DrowdownList = ({ name, list }) => (
  <Menu as="div" className="relative">
    {({ open }) => (
      <>
        <Menu.Button
          className={classNames(
            open ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
            "px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1 transition-colors duration-150 whitespace-nowrap"
          )}
        >
          {name}
          <ChevronDownIcon
            className={classNames(open ? "rotate-180" : "", "h-4 w-4 transition-transform duration-200")}
            aria-hidden="true"
          />
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-150"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-100"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            className={`origin-top-left absolute left-0 z-50 mt-2 w-[min(46rem,calc(100vw-3rem))] p-2 ${panelClass}`}
          >
            <p className="px-2 pt-1 pb-2 text-xs uppercase tracking-wider text-gray-500">
              {list?.length} departments
            </p>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1">
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

export default function Navigation() {
  const { user, isLoading, can, unreadMessages } = useAuth();
  const { deptNavList, deptLoading, books, questions, syllabus } = useUtility();

  /* How much is waiting for review. The data is already in the client for the
   * library pages, so surfacing it in the nav costs nothing -- and a reviewer
   * no longer has to open the page to discover there is nothing to do. */
  const pendingCount = useMemo(() => {
    if (!can("content.approve")) return 0;
    const all = [...(books || []), ...(questions || []), ...(syllabus || [])];
    return all.filter((item) => !item?.status).length;
  }, [books, questions, syllabus, can]);

  const badges = { pending: pendingCount };

  const navigation = [
    { key: "home", name: "Home", to: "/" },
    { key: "dept", name: "Departments", list: deptNavList },
    { key: "upload", name: "Upload", to: "/request" },
    // signed-in only: these routes are behind RequireAuth
    ...(user?.email
      ? [
        { key: "classroom", name: "Classroom", to: "/classroom" },
        { key: "messages", name: "Messages", to: "/messages", badge: unreadMessages },
      ]
      : []),
  ];

  const renderNav = (mobile, onNavigate) =>
    navigation.map(({ key, ...item }) =>
      item.list?.length
        ? !deptLoading
          ? mobile
            ? <MobileDeptList key={key} {...item} onNavigate={onNavigate} />
            : <DrowdownList key={key} {...item} />
          : null
        : <LinkTitle key={key} {...item} onNavigate={onNavigate} />
    );

  const mobileProfileRoutes = profileRoutes.filter(
    (route) => !route.permission || can(route.permission)
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
              <div className="relative flex items-center h-16 gap-2">
                <NavLink
                  to="/"
                  className="flex flex-row items-center gap-2.5 text-[#a8ff01] font-rubik_doodle text-xl xl:text-2xl flex-shrink-0 rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <img className="w-10 sm:w-12" src="/assets/images/logo.webp" alt="Campus Classroom" />
                  <span className="hidden xl:block whitespace-nowrap">CAMPUS CLASSROOM</span>
                </NavLink>

                {/* primary nav */}
                <div className="hidden md:flex items-center gap-0.5 ml-2">
                  {renderNav(false)}
                </div>

                {/* search takes the slack in the middle, so it grows on wide
                    screens and shrinks before the nav items do */}
                <div className="hidden md:block flex-1 max-w-md mx-2">
                  <NavSearch />
                </div>

                {/* mobile: centred download for signed-out visitors, as before */}
                {!user?.email && (
                  <div className="md:hidden absolute left-1/2 -translate-x-1/2">
                    <DownloadButtonWithAnimate />
                  </div>
                )}

                {/* right cluster */}
                <div className="hidden md:flex items-center gap-1.5 ml-auto">
                  {user?.email ? (
                    <>
                      <NotificationBell />
                      {isLoading
                        ? <CircularProgress color="info" size={26} />
                        : <ProfileButton badges={badges} />}
                      {/* the 150px pill only at xl; a compact icon below that,
                          so it stops competing with actual navigation */}
                      <div className="hidden xl:block ml-1">
                        <DownloadButtonWithAnimate />
                      </div>
                      <Tooltip title="Download the app" arrow>
                        <a
                          href={APP_LINK}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Download the app"
                          className="xl:hidden p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <GetAppIcon fontSize="small" />
                        </a>
                      </Tooltip>
                    </>
                  ) : (
                    // a visitor gets a clear primary action, not just "Login"
                    <>
                      <NavLink to="/login" className={itemClass}>Log in</NavLink>
                      <NavLink
                        to="/signup"
                        className="px-3.5 py-1.5 rounded-full text-sm font-semibold bg-[#a8ff01] text-gray-900 hover:brightness-95 transition whitespace-nowrap"
                      >
                        Sign up
                      </NavLink>
                      <div className="hidden xl:block ml-1">
                        <DownloadButtonWithAnimate />
                      </div>
                    </>
                  )}
                </div>

                {/* mobile controls */}
                <div className="flex items-center gap-0.5 md:hidden ml-auto">
                  {user?.email && <NotificationBell />}
                  {user?.email && (isLoading
                    ? <CircularProgress color="info" size={22} />
                    : <ProfileButton badges={badges} />)}
                  <Disclosure.Button className="relative inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">
                    <span className="sr-only">Open main menu</span>
                    {open ? <XIcon className="block h-6 w-6" aria-hidden="true" />
                      : <MenuIcon className="block h-6 w-6" aria-hidden="true" />}
                    {/* something needing attention is visible without opening the menu */}
                    {!open && (unreadMessages > 0 || pendingCount > 0) && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
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
                {/* search first: it is the most common reason to open this menu */}
                <div className="px-3 pt-3 pb-1">
                  <NavSearch onDone={close} />
                </div>
                <div className="px-3 pt-2 pb-2 space-y-1">
                  {renderNav(true, close)}
                </div>

                {user?.email ? (
                  <div className="px-3 pb-2 pt-2 space-y-1 border-t border-white/10">
                    <p className="px-3 pb-1 text-xs uppercase tracking-wider text-gray-500">Account</p>
                    {mobileProfileRoutes.map((route) => (
                      <NavLink
                        key={route.name}
                        to={route.to}
                        onClick={close}
                        className={({ isActive }) =>
                          classNames(
                            isActive ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
                            "flex items-center justify-between px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                          )
                        }
                      >
                        <span>{route.name}</span>
                        {badges[route.badge] > 0 && (
                          <span className="min-w-[20px] text-center text-[11px] font-semibold rounded-full bg-amber-500/90 text-gray-900 px-1.5 py-0.5">
                            {badges[route.badge]}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-2 border-t border-white/10">
                    <NavLink to="/login" onClick={close} className={itemClass}>Log in</NavLink>
                    <NavLink
                      to="/signup"
                      onClick={close}
                      className="px-3.5 py-1.5 rounded-full text-sm font-semibold bg-[#a8ff01] text-gray-900 text-center"
                    >
                      Sign up
                    </NavLink>
                  </div>
                )}

                {user?.email && (
                  <div className="flex justify-center py-4 border-t border-white/10">
                    <DownloadButtonWithAnimate />
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
