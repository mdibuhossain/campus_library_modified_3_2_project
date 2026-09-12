import React from "react";
import { useLocation } from "react-router-dom";
import { Avatar, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../../Hooks/useAuth";
import useChatDock from "../../Hooks/useChatDock";
import ChatBox from "./ChatBox";

const BOX_WIDTH = 344;
const HEAD_LANE = 76;

const maxBoxesFor = (width) => {
  if (width < 640) return 1;
  return Math.max(1, Math.min(3, Math.floor((width - HEAD_LANE - 24) / BOX_WIDTH)));
};

const ChatDock = () => {
  const { user } = useAuth();
  const { entries, closeChat, toggleMinimized } = useChatDock();
  const { pathname } = useLocation();
  const [maxBoxes, setMaxBoxes] = React.useState(() =>
    maxBoxesFor(typeof window === "undefined" ? 1280 : window.innerWidth)
  );

  React.useEffect(() => {
    const onResize = () => setMaxBoxes(maxBoxesFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onMessagesPage = pathname.startsWith("/messages");
  if (!user?.email || onMessagesPage || entries.length === 0) return null;

  const expanded = entries.filter((e) => !e.minimized);
  const shown = expanded.slice(0, maxBoxes);
  const overflow = [...expanded.slice(maxBoxes), ...entries.filter((e) => e.minimized)];

  return (
    <div className="fixed bottom-0 right-0 z-[60] flex items-end gap-2 pr-2 sm:pr-3 pointer-events-none">
      <div className="flex items-end gap-2 pointer-events-auto">
        {shown.map((entry) => (
          <ChatBox key={entry.id} entry={entry} />
        ))}
      </div>

      {overflow.length > 0 && (
        <div className="flex flex-col-reverse gap-2 pb-3 pointer-events-auto">
          {overflow.map((entry) => (
            <div key={entry.id} className="group relative">
              <Tooltip title={entry.name || entry.email} placement="left" arrow>
                <button
                  type="button"
                  onClick={() => toggleMinimized(entry.id)}
                  className="rounded-full shadow-lg ring-2 ring-white hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-sky-400"
                  aria-label={`Open chat with ${entry.name || entry.email}`}
                >
                  <Avatar src={entry.photo || undefined} sx={{ width: 52, height: 52, fontSize: 18 }}>
                    {(entry.name || entry.email)?.slice(0, 2).toUpperCase()}
                  </Avatar>
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => closeChat(entry.id)}
                aria-label={`Close chat with ${entry.name || entry.email}`}
                className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-gray-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatDock;
