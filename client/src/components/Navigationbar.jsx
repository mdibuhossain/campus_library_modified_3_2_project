import { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { MenuIcon, XIcon, ChevronDownIcon } from "@heroicons/react/outline";
import { NavLink } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import { useAuth } from "../Hooks/useAuth";
import { CircularProgress } from "@mui/material";
import DownloadButtonWithAnimate from "./Download_Button/DownloadButtonWithAnimate";
import useUtility from "../Hooks/useUtility";
import NotificationBell from "./NotificationBell";

const AVATAR_FALLBACK = "/assets/images/avator.webp";

// One list instead of an admin/user fork. `permission` is a key from
// server/permissions.js; entries without one are visible to every signed-in
// user. Adding a role no longer means touching this file.
const profileRoutes = [
  { name: "Settings", to: "/settings" },
  { name: "Pending Request", to: "/pending" },
  { name: "My Content", to: "/mycontent" },
  { name: "Manage Content", to: "/manage", permission: "content.approve" },
  { name: "User Roles", to: "/makeadmin", permission: "user.role.assign" },
  { name: "Manage Roles", to: "/roles", permission: "role.manage" },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Pill-shaped links with a translucent hover, rather than the old square
// rounded-md blocks sitting on a flat slab.
const itemClass = ({ isActive }) =>
  classNames(
    isActive
      ? "bg-white/15 text-white"
      : "text-gray-300 hover:bg-white/10 hover:text-white",
    "px-3.5 py-1.5 rounded-full text-sm font-medium block text-center transition-colors duration-150"
  );

const panelClass =
  "bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl ring-1 ring-white/10 py-1.5 focus:outline-none";

const menuItemClass = (active, isActive) =>
  classNames(
    active ? "bg-white/10" : "",
    isActive ? "text-white font-semibold" : "text-gray-300",
    "block px-4 py-2 text-sm transition-colors"
  );

/* A real component, not a function call.
 *
 * It used to be invoked as `{isLoading ? <Spinner/> : ProfileButton()}`, which
 * ran the useAuth() inside it conditionally. That only worked by luck: useContext
 * does not occupy a hook slot, so React never noticed the count changing. The
 * moment anyone added useState or useEffect here it would have started throwing
 * "Rendered more hooks than during the previous render".
 */
const ProfileButton = () => {
  const { user, logOut, can } = useAuth();
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
        <span className="font-medium text-gray-100 text-sm max-w-[7rem] truncate hidden sm:block">
          {user?.displayName?.split(" ")[0]}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-400 hidden sm:block" aria-hidden="true" />
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
        <Menu.Items className={`origin-top-right absolute right-0 mt-2 w-56 ${panelClass}`}>
          <div className="px-4 py-2.5 border-b border-white/10">
            <p className="text-sm text-white font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          {visibleRoutes.map((route) => (
            <Menu.Item key={route.name}>
              {({ active }) => (
                <NavLink
                  to={route.to}
                  className={({ isActive }) => menuItemClass(active, isActive)}
                >
                  {route.name}
                </NavLink>
              )}
            </Menu.Item>
          ))}
          <div className="border-t border-white/10 mt-1 pt-1">
            <Menu.Item>
              {({ active }) => (
                // was a NavLink to="#", which pushed a history entry and left a
                // stray hash in the URL. Signing out is an action, not a link.
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

// Desktop link: a plain anchor. The mobile variant wraps it in Disclosure.Button
// so tapping it also closes the menu -- previously a <Disclosure.Button> (a
// <button>) was nested *inside* the <NavLink> (an <a>), which is invalid HTML.
const LinkTitle = ({ name, to, icon, onNavigate }) => (
  <NavLink to={to} onClick={onNavigate} className={itemClass}>
    <span className="inline-flex items-center justify-center gap-1.5">
      {name}
      {icon || null}
    </span>
  </NavLink>
);

/* Mobile department list.
 *
 * The desktop version below is a floating Menu dropdown. Reusing that on mobile
 * was the problem: it is an absolutely positioned panel nested inside the mobile
 * menu, which has `overflow-y-auto` -- and an overflow container CLIPS absolute
 * children, so a 384px scrollable box of 33 departments got cut off inside
 * another scroll area. A menu floating over a menu, with nested scrollbars.
 *
 * Mobile navigation should expand inline instead, pushing the rest of the menu
 * down. Two columns because 33 single-column rows is a lot of thumb travel.
 */
const MobileDeptList = ({ name, list, onNavigate }) => (
  <Disclosure>
    {({ open }) => (
      <>
        <Disclosure.Button
          className={classNames(
            open ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white",
            "w-full px-3.5 py-1.5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1 transition-colors duration-150"
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
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-gray-400 hover:bg-white/10 hover:text-white",
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

const DrowdownList = ({ name, list }) => (
  <Menu as="div" className="relative">
    {({ open }) => (
      <>
        <Menu.Button
          className={classNames(
            open
              ? "bg-white/15 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white",
            "px-3.5 py-1.5 rounded-full text-sm font-medium w-full inline-flex items-center justify-center gap-1 transition-colors duration-150"
          )}
        >
          {name}
          {/* a real chevron that rotates, instead of a literal down-arrow
              character baked into the label text */}
          <ChevronDownIcon
            className={classNames(
              open ? "rotate-180" : "",
              "h-4 w-4 transition-transform duration-200"
            )}
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
          {/* A wide multi-column panel rather than a 224px single column with
              its own scrollbar: 33 departments in one narrow scrolling strip
              wastes the space a large screen actually has. Three or four
              columns fits them all with no inner scroll. */}
          <Menu.Items
            className={`origin-top-right absolute right-0 z-50 mt-2 w-[min(46rem,calc(100vw-3rem))] p-2 ${panelClass}`}
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
                      className={({ isActive }) =>
                        classNames(
                          active ? "bg-white/10" : "",
                          isActive
                            ? "bg-white/15 text-white font-semibold"
                            : "text-gray-300 hover:text-white",
                          "block px-2.5 py-2 rounded-lg text-xs font-medium truncate transition-colors"
                        )
                      }
                      title={item.name}
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
  const { user, isLoading, can } = useAuth();
  const { deptNavList, deptLoading } = useUtility();

  const navigation = [
    { key: "home", name: "Home", to: "/" },
    // /classroom is behind RequireAuth, so only offer it once signed in
    ...(user?.email ? [{ key: "classroom", name: "Classroom", to: "/classroom" }] : []),
    { key: "dept", name: "Department", list: deptNavList },
    { key: "upload", name: "Upload", to: "/request" },
    // `key` is explicit because this item's name is empty (icon only), which
    // would otherwise have been used as the React key
    { key: "search", name: "", icon: <SearchIcon sx={{ fontSize: 20 }} />, to: "/search" },
  ];

  // `onNavigate` closes the mobile panel after a tap; undefined on desktop
  const renderNav = (mobile, onNavigate) =>
    // `key` is pulled out of the object before spreading: React 18 warns when a
    // spread object contains a "key", even if an explicit key= is also given
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
    // sticky: the bar used to scroll away, and these pages are long.
    // Translucent + blur instead of the old flat slab.
    <div className="w-full sticky top-0 z-50">
      <Disclosure as="nav" className="bg-gray-900/85 backdrop-blur-xl border-b border-white/10">
        {({ open, close }) => (
          <>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="relative flex items-center h-16 gap-2">
                {/* brand */}
                <NavLink
                  to="/"
                  className="flex flex-row items-center gap-2.5 text-[#a8ff01] font-rubik_doodle text-xl sm:text-2xl flex-shrink-0 rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <img className="w-11 sm:w-14" src="/assets/images/logo.webp" alt="Campus Classroom" />
                  <span className="hidden lg:block whitespace-nowrap">CAMPUS CLASSROOM</span>
                </NavLink>

                {/* The download button was centred on mobile before and that read
                    well, so it is centred again. Only when signed out: otherwise
                    the bell and avatar sit on the right and a 150px pill in the
                    middle collides on a phone. Signed-in users get it at the
                    bottom of the mobile menu instead. */}
                {!user?.email && (
                  <div className="md:hidden absolute left-1/2 -translate-x-1/2">
                    <DownloadButtonWithAnimate />
                  </div>
                )}

                {/* desktop nav */}
                <div className="hidden md:flex items-center gap-1 ml-auto">
                  {renderNav(false)}
                  {!user?.email && <LinkTitle name="Login" to="/login" />}
                  <div className="w-px h-6 bg-white/15 mx-1.5" aria-hidden="true" />
                  <NotificationBell />
                  {isLoading ? <CircularProgress color="info" size={28} /> : <ProfileButton />}
                  <div className="ml-1.5">
                    <DownloadButtonWithAnimate />
                  </div>
                </div>

                {/* mobile controls */}
                <div className="flex items-center gap-0.5 md:hidden ml-auto">
                  <NotificationBell />
                  {isLoading ? <CircularProgress color="info" size={24} /> : <ProfileButton />}
                  <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile Panel */}
            <Transition
              enter="transition duration-150 ease-out"
              enterFrom="transform -translate-y-2 opacity-0"
              enterTo="transform translate-y-0 opacity-100"
              leave="transition duration-100 ease-in"
              leaveFrom="transform translate-y-0 opacity-100"
              leaveTo="transform -translate-y-2 opacity-0"
            >
              <Disclosure.Panel className="md:hidden border-t border-white/10 max-h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="px-3 pt-3 pb-2 space-y-1">
                  {renderNav(true, close)}
                  {!user?.email && (
                    <LinkTitle name="Login" to="/login" onNavigate={close} />
                  )}
                </div>
                {/* the account pages were previously reachable only through the
                    avatar dropdown, so the mobile menu looked incomplete */}
                {user?.email && (
                  <div className="px-3 pb-2 pt-2 space-y-1 border-t border-white/10">
                    <p className="px-3.5 pb-1 text-xs uppercase tracking-wider text-gray-500">
                      Account
                    </p>
                    {mobileProfileRoutes.map((route) => (
                      <NavLink
                        key={route.name}
                        to={route.to}
                        onClick={close}
                        className={itemClass}
                      >
                        {route.name}
                      </NavLink>
                    ))}
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
