import { useContext } from "react";
import { ChatDockContext } from "../context/ChatDockProvider";

const noop = () => {};
const FALLBACK = {
  entries: [],
  openChat: noop,
  closeChat: noop,
  closeAll: noop,
  setMinimized: noop,
  toggleMinimized: noop,
};

const useChatDock = () => useContext(ChatDockContext) || FALLBACK;

export default useChatDock;
