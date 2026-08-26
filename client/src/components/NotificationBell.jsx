import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Badge, Button, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Hooks/useAuth";

const ICONS = {
    content: <MenuBookIcon sx={{ fontSize: 16 }} />,
    classroom: <SchoolIcon sx={{ fontSize: 16 }} />,
    account: <PersonIcon sx={{ fontSize: 16 }} />,
};

// "3m ago", "2h ago", "5d ago"
const ago = (iso) => {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (secs < 60) return "just now";
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};

const NotificationBell = () => {
    const {
        user, items, unread, markAllRead, markOneRead,
        permission, pushSupported, pushConfigured, pushError, enablePush,
    } = useAuth();
    const history = useNavigate();

    if (!user?.email) return null;

    const canOfferPush = pushSupported && pushConfigured && permission !== "granted";

    const open = (item) => {
        !item.read && markOneRead(item._id);
        item.link && history(item.link);
    };

    return (
        <Menu as="div" className="relative z-50">
            <Menu.Button as="div">
                <Tooltip title="Notifications" arrow>
                    <IconButton size="small" sx={{ color: "rgb(209 213 219)" }}>
                        <Badge badgeContent={unread} color="error" max={99}>
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                </Tooltip>
            </Menu.Button>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="bg-white origin-top-right absolute md:right-0 -right-24 mt-2 w-80 max-h-[70vh] overflow-auto rounded-md shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="flex items-center justify-between px-4 py-2">
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Notifications {unread > 0 && `(${unread})`}
                        </Typography>
                        {unread > 0 &&
                            <Button size="small" onClick={markAllRead} sx={{ fontSize: 11 }}>
                                mark all read
                            </Button>}
                    </div>
                    <Divider />

                    {/* opt-in prompt: browsers only honour a permission request
                        that comes from a real click, so it has to live in the UI */}
                    {canOfferPush &&
                        <div className="px-4 py-3 bg-sky-50 border-b">
                            <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                                {permission === "denied"
                                    ? "Notifications are blocked in your browser settings."
                                    : "Get alerted even when this tab is closed."}
                            </Typography>
                            {permission !== "denied" &&
                                <Button size="small" variant="contained" onClick={enablePush}>
                                    enable push
                                </Button>}
                        </div>}
                    {pushSupported && !pushConfigured &&
                        <div className="px-4 py-2 bg-amber-50 border-b flex items-center gap-1">
                            <NotificationsOffIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption">
                                Push not configured — in-app only
                            </Typography>
                        </div>}
                    {pushError &&
                        <div className="px-4 py-2 bg-red-50 border-b">
                            <Typography variant="caption" color="error">{pushError}</Typography>
                        </div>}

                    {items.length === 0
                        ? <div className="px-4 py-8 text-center">
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Nothing here yet.
                            </Typography>
                        </div>
                        : items.map((item) => (
                            <Menu.Item key={item._id}>
                                {({ active }) => (
                                    <button
                                        onClick={() => open(item)}
                                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 flex gap-2 ${active ? "bg-gray-100" : ""} ${item.read ? "" : "bg-sky-50/60"}`}
                                    >
                                        <span className="text-gray-500 mt-0.5">
                                            {ICONS[item.kind] || ICONS.content}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block text-sm ${item.read ? "" : "font-semibold"}`}>
                                                {item.title}
                                            </span>
                                            {item.body &&
                                                <span className="block text-xs text-gray-600 break-words">
                                                    {item.body}
                                                </span>}
                                            <span className="block text-[11px] text-gray-400 mt-0.5">
                                                {ago(item.iat)}
                                            </span>
                                        </span>
                                        {!item.read &&
                                            <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}
                </Menu.Items>
            </Transition>
        </Menu>
    );
};

export default NotificationBell;
