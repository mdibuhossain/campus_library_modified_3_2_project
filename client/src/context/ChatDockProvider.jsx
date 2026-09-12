import React from "react";

const ChatDockContext = React.createContext(null);

const STORE_KEY = "campus-classroom:chat-dock";
const MAX_TRACKED = 8;

const read = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((e) => e && e.id).slice(0, MAX_TRACKED) : [];
  } catch {
    return [];
  }
};

const write = (entries) => {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(entries.slice(0, MAX_TRACKED)));
  } catch {
    /* private mode */
  }
};

const ChatDockProvider = ({ children }) => {
  const [entries, setEntries] = React.useState(read);

  React.useEffect(() => {
    write(entries);
  }, [entries]);

  const openChat = React.useCallback((conversation) => {
    if (!conversation?._id) return;
    setEntries((prev) => {
      const id = String(conversation._id);
      const rest = prev.filter((e) => e.id !== id);
      const entry = {
        id,
        name: conversation.counterpartName || conversation.other?.displayName || conversation.name || "",
        email: conversation.counterpartEmail || conversation.other?.email || conversation.email || "",
        photo: conversation.counterpartPhoto || conversation.other?.photoURL || conversation.photo || "",
        minimized: false,
      };
      return [entry, ...rest];
    });
  }, []);

  const closeChat = React.useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== String(id)));
  }, []);

  const closeAll = React.useCallback(() => setEntries([]), []);

  const setMinimized = React.useCallback((id, minimized) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === String(id) ? { ...e, minimized } : e))
    );
  }, []);

  const toggleMinimized = React.useCallback((id) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === String(id));
      if (!target) return prev;
      if (target.minimized) {
        const rest = prev.filter((e) => e.id !== String(id));
        return [{ ...target, minimized: false }, ...rest];
      }
      return prev.map((e) => (e.id === String(id) ? { ...e, minimized: true } : e));
    });
  }, []);

  const value = React.useMemo(
    () => ({ entries, openChat, closeChat, closeAll, setMinimized, toggleMinimized }),
    [entries, openChat, closeChat, closeAll, setMinimized, toggleMinimized]
  );

  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
};

export { ChatDockProvider, ChatDockContext };
