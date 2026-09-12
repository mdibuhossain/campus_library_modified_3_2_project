import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { useQuery } from "@apollo/client";
import { NavLink } from "react-router-dom";
import { Avatar, CircularProgress, Tooltip } from "@mui/material";
import { ChatAlt2Icon } from "@heroicons/react/outline";
import { useAuth } from "../../Hooks/useAuth";
import useChatDock from "../../Hooks/useChatDock";
import { GET_CONVERSATIONS } from "../../queries/query";

const ago = (iso) => {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
};

const MessagesMenu = ({ count = 0, iconClass, badge }) => {
  const { token } = useAuth();
  const { openChat } = useChatDock();

  const { data, loading, refetch } = useQuery(GET_CONVERSATIONS, {
    variables: { token },
    skip: !token,
    fetchPolicy: "cache-and-network",
  });
  const conversations = data?.getConversations || [];

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Tooltip title="Messages" arrow>
            <Menu.Button
              aria-label="Messages"
              className={iconClass(open)}
              onClick={() => refetch?.()}
            >
              <ChatAlt2Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              {badge}
            </Menu.Button>
          </Tooltip>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-100"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="origin-top-right absolute right-0 z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-white/10 py-1.5 focus:outline-none">
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-sm font-semibold text-white">Messages</p>
                <NavLink to="/messages" className="text-xs text-sky-300 hover:text-sky-200">
                  See all
                </NavLink>
              </div>

              {loading && conversations.length === 0 ? (
                <div className="flex justify-center py-6"><CircularProgress size={20} /></div>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 px-4">
                  No conversations yet.
                </p>
              ) : (
                conversations.map((c) => (
                  <Menu.Item key={c._id}>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={() =>
                          openChat({
                            _id: c._id,
                            counterpartName: c.other?.displayName,
                            counterpartEmail: c.other?.email,
                            counterpartPhoto: c.other?.photoURL,
                          })
                        }
                        className={`w-full text-left flex items-center gap-2.5 px-4 py-2 transition-colors ${
                          active ? "bg-white/10" : ""
                        }`}
                      >
                        <Avatar src={c.other?.photoURL || undefined} sx={{ width: 36, height: 36, fontSize: 13 }}>
                          {(c.other?.displayName || c.other?.email)?.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`text-sm truncate ${c.unread ? "text-white font-semibold" : "text-gray-200"}`}>
                              {c.other?.displayName || c.other?.email}
                            </span>
                            <span className="text-[10px] text-gray-500 ml-auto shrink-0">
                              {ago(c.lastMessageAt)}
                            </span>
                          </span>
                          <span className={`block text-xs truncate ${c.unread ? "text-gray-200" : "text-gray-400"}`}>
                            {c.lastMessage || "No messages yet"}
                          </span>
                        </span>
                        {c.unread > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </button>
                    )}
                  </Menu.Item>
                ))
              )}
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default MessagesMenu;
