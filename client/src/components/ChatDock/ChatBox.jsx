import React from "react";
import { useLazyQuery, useMutation } from "@apollo/client";
import { Avatar, CircularProgress, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import SendIcon from "@mui/icons-material/Send";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Hooks/useAuth";
import useChatDock from "../../Hooks/useChatDock";
import { GET_MESSAGES, SEND_MESSAGE, MARK_CONVERSATION_READ } from "../../queries/query";

const POLL_MS = 5000;

const ChatBox = ({ entry }) => {
  const { token, refetchUnreadMessages } = useAuth();
  const { closeChat, toggleMinimized } = useChatDock();
  const navigate = useNavigate();

  const [messages, setMessages] = React.useState([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const cursorRef = React.useRef(null);
  const bottomRef = React.useRef(null);

  const [fetchMessages] = useLazyQuery(GET_MESSAGES, { fetchPolicy: "network-only" });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_CONVERSATION_READ);

  const load = React.useCallback(
    async (mode) => {
      if (!token || !entry.id) return;
      try {
        const after = mode === "since" ? cursorRef.current : null;
        const { data } = await fetchMessages({
          variables: { conversationId: entry.id, after, limit: 60, token },
        });
        const rows = data?.getMessages || [];
        if (rows.length) cursorRef.current = rows[rows.length - 1]._id;
        setMessages((prev) => (mode === "since" ? [...prev, ...rows] : rows));
      } catch (err) {
        setError(err?.graphQLErrors?.[0]?.message || err.message);
      } finally {
        setLoading(false);
      }
    },
    [entry.id, token, fetchMessages]
  );

  React.useEffect(() => {
    cursorRef.current = null;
    setMessages([]);
    setLoading(true);
    load("all");
  }, [entry.id, token]);

  React.useEffect(() => {
    if (entry.minimized) return;
    const id = setInterval(() => load("since"), POLL_MS);
    return () => clearInterval(id);
  }, [entry.minimized, load]);

  React.useEffect(() => {
    if (entry.minimized || !messages.length || !token) return;
    markRead({ variables: { conversationId: entry.id, token } })
      .then(() => refetchUnreadMessages?.())
      .catch(() => { });
  }, [entry.id, entry.minimized, messages.length, token]);

  React.useEffect(() => {
    if (!entry.minimized) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, entry.minimized]);

  const send = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    setError("");
    sendMessage({ variables: { conversationId: entry.id, body, token } })
      .then(({ data }) => {
        if (data?.sendMessage) {
          cursorRef.current = data.sendMessage._id;
          setMessages((prev) => [...prev, data.sendMessage]);
        }
      })
      .catch((err) => {
        setDraft(body);
        setError(err?.graphQLErrors?.[0]?.message || err.message);
      });
  };

  if (entry.minimized) {
    return (
      <Tooltip title={entry.name || entry.email} placement="left" arrow>
        <button
          type="button"
          onClick={() => toggleMinimized(entry.id)}
          className="relative rounded-full shadow-lg ring-2 ring-white hover:scale-105 transition-transform focus:outline-none focus:ring-sky-400"
          aria-label={`Open chat with ${entry.name || entry.email}`}
        >
          <Avatar src={entry.photo || undefined} sx={{ width: 52, height: 52, fontSize: 18 }}>
            {(entry.name || entry.email)?.slice(0, 2).toUpperCase()}
          </Avatar>
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="w-[19rem] sm:w-[20.5rem] bg-white rounded-t-xl shadow-2xl border border-gray-200 border-b-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-900 text-white">
        <Avatar src={entry.photo || undefined} sx={{ width: 30, height: 30, fontSize: 12 }}>
          {(entry.name || entry.email)?.slice(0, 2).toUpperCase()}
        </Avatar>
        <button
          type="button"
          onClick={() => navigate(`/messages/${entry.id}`)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold truncate leading-tight">{entry.name || entry.email}</p>
          <p className="text-[10px] text-gray-300 truncate">{entry.email}</p>
        </button>
        <Tooltip title="Open in Messages" arrow>
          <IconButton size="small" sx={{ color: "#cbd5e1" }} onClick={() => navigate(`/messages/${entry.id}`)}>
            <OpenInFullIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" sx={{ color: "#cbd5e1" }} onClick={() => toggleMinimized(entry.id)} aria-label="Minimise">
          <RemoveIcon sx={{ fontSize: 17 }} />
        </IconButton>
        <IconButton size="small" sx={{ color: "#cbd5e1" }} onClick={() => closeChat(entry.id)} aria-label="Close">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </div>

      <div className="h-64 overflow-y-auto px-2.5 py-2 space-y-1.5 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-8"><CircularProgress size={20} /></div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap break-words ${
                  m.mine ? "bg-sky-600 text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                }`}
              >
                {m.body}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-[11px] text-red-600 px-2.5 py-1 bg-red-50">{error}</p>}

      <form onSubmit={send} className="flex items-center gap-1 p-1.5 border-t border-gray-200 bg-white">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          aria-label={`Message ${entry.name || entry.email}`}
          className="flex-1 min-w-0 text-sm px-3 py-2 rounded-full bg-gray-100 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-sky-200"
        />
        <IconButton type="submit" size="small" color="primary" disabled={!draft.trim() || sending} aria-label="Send">
          {sending ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
        </IconButton>
      </form>
    </div>
  );
};

export default ChatBox;
