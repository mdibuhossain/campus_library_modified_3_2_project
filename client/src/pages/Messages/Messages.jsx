import React from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Badge, Button, Chip, CircularProgress, IconButton, TextField, Tooltip, Typography,
} from "@mui/material";
import AddCommentIcon from "@mui/icons-material/AddComment";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ForumIcon from "@mui/icons-material/Forum";
import PageLayout from "../../Layout/PageLayout";
import { useAuth } from "../../Hooks/useAuth";
import UserSearch from "./UserSearch";
import {
  GET_CONVERSATIONS, GET_MESSAGES, SEND_MESSAGE, MARK_CONVERSATION_READ,
} from "../../queries/query";

// Safety net only. A new message normally arrives via the FCM push, which
// refetches immediately; this covers a denied/unsupported push permission and
// runs only while a conversation is actually open.
const POLL_MS = 4000;

const ago = (iso) => {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
};

const Messages = () => {
  const { cid } = useParams();
  const navigate = useNavigate();
  const { user, token, refetchNotifications } = useAuth();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [error, setError] = React.useState("");
  const bottomRef = React.useRef(null);
  // the id of the newest message we hold, used as the fetch cursor
  const cursorRef = React.useRef(null);

  const { data: convoData, refetch: refetchConversations } = useQuery(GET_CONVERSATIONS, {
    variables: { token },
    skip: !token,
    fetchPolicy: "cache-and-network",
  });
  const conversations = convoData?.getConversations || [];
  const active = conversations.find((c) => c._id === cid);

  const [fetchMessages] = useLazyQuery(GET_MESSAGES, { fetchPolicy: "network-only" });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_CONVERSATION_READ);

  const scrollToBottom = () => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
  };

  // Full load when the conversation changes, then cursor-based top-ups. Asking
  // only for what arrived after the newest id we hold keeps each poll tiny and
  // avoids re-rendering the whole thread.
  const loadMessages = React.useCallback(
    async (mode) => {
      if (!cid || !token) return;
      try {
        const after = mode === "since" ? cursorRef.current : null;
        const { data } = await fetchMessages({
          variables: { conversationId: cid, after, limit: 100, token },
        });
        const rows = data?.getMessages || [];
        if (!rows.length) return;
        cursorRef.current = rows[rows.length - 1]._id;
        setMessages((prev) => {
          if (mode !== "since") return rows;
          const seen = new Set(prev.map((m) => m._id));
          return [...prev, ...rows.filter((m) => !seen.has(m._id))];
        });
        scrollToBottom();
      } catch (err) {
        setError(err?.graphQLErrors?.[0]?.message || err.message);
      }
    },
    [cid, token, fetchMessages]
  );

  React.useEffect(() => {
    cursorRef.current = null;
    setMessages([]);
    setError("");
    if (!cid || !token) return;
    loadMessages("all");
    markRead({ variables: { conversationId: cid, token } })
      .then(() => { refetchConversations(); refetchNotifications?.(); })
      .catch(() => { });
  }, [cid, token]);

  React.useEffect(() => {
    if (!cid || !token) return;
    const id = setInterval(() => loadMessages("since"), POLL_MS);
    return () => clearInterval(id);
  }, [cid, token, loadMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !cid) return;
    setError("");
    setDraft("");
    sendMessage({ variables: { conversationId: cid, body, token } })
      .then(({ data }) => {
        const sent = data?.sendMessage;
        if (!sent) return;
        cursorRef.current = sent._id;
        setMessages((prev) => [...prev, sent]);
        scrollToBottom();
        refetchConversations();
      })
      .catch((err) => {
        setError(err?.graphQLErrors?.[0]?.message || err.message);
        setDraft(body); // give the text back rather than losing it
      });
  };

  const openConversation = (convo) => navigate(`/messages/${convo._id}`);

  return (
    <PageLayout>
      <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Messages</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Direct messages with other members.
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddCommentIcon />}
            onClick={() => setSearchOpen(true)}
            sx={{ borderRadius: 7, textTransform: "none" }}
          >
            New
          </Button>
        </div>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <div className="grid md:grid-cols-3 gap-4 items-start">
          {/* conversation list -- hidden on mobile while a thread is open */}
          <div className={`md:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden ${cid ? "hidden md:block" : ""}`}>
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <ForumIcon sx={{ fontSize: 40, color: "action.disabled" }} />
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  No conversations yet.
                </Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => setSearchOpen(true)}>
                  find someone
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                {conversations.map((convo) => (
                  <button
                    key={convo._id}
                    type="button"
                    onClick={() => openConversation(convo)}
                    className={`w-full text-left flex items-center gap-3 p-3 transition-colors ${
                      convo._id === cid ? "bg-sky-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Badge
                      color="error"
                      badgeContent={convo.unread}
                      overlap="circular"
                      anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      <Avatar src={convo.other?.photoURL || undefined} sx={{ width: 40, height: 40, fontSize: 14 }}>
                        {convo.other?.displayName?.slice(0, 2).toUpperCase()}
                      </Avatar>
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm truncate ${convo.unread ? "font-semibold" : "font-medium"}`}>
                          {convo.other?.displayName || convo.other?.email}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {convo.lastMessageAt && ago(convo.lastMessageAt)}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${convo.unread ? "text-gray-800" : "text-gray-500"}`}>
                        {convo.lastMessageFrom === user?.email && "You: "}
                        {convo.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* thread */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col min-h-[60vh] max-h-[75vh]">
            {!cid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ForumIcon sx={{ fontSize: 52, color: "action.disabled" }} />
                <Typography variant="body1" sx={{ color: "text.secondary", mt: 1.5 }}>
                  Pick a conversation, or start a new one.
                </Typography>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                  <IconButton
                    size="small"
                    className="md:hidden"
                    onClick={() => navigate("/messages")}
                    aria-label="back to conversations"
                    sx={{ display: { md: "none" } }}
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Avatar src={active?.other?.photoURL || undefined} sx={{ width: 34, height: 34, fontSize: 13 }}>
                    {active?.other?.displayName?.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {active?.other?.displayName || active?.other?.email || "Conversation"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{active?.other?.email}</p>
                  </div>
                  {active?.other?.department && (
                    <Chip
                      size="small" variant="outlined"
                      label={active.other.department.toUpperCase()}
                      sx={{ height: 20, fontSize: 10, ml: "auto" }}
                    />
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-gray-50/50">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Say hello.
                      </Typography>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div key={m._id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                            m.mine
                              ? "bg-sky-600 text-white rounded-br-md"
                              : "bg-white border border-gray-200 rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`text-[10px] mt-0.5 ${m.mine ? "text-sky-100" : "text-gray-400"}`}>
                            {new Date(m.iat).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSend} className="flex items-end gap-2 p-3 border-t border-gray-100">
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    maxRows={4}
                    placeholder="Write a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter makes a new line
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <Tooltip title="Send" arrow>
                    <span>
                      <IconButton
                        type="submit"
                        color="primary"
                        disabled={!draft.trim() || sending}
                        sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "action.disabledBackground" } }}
                      >
                        {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <UserSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpened={(convo) => { refetchConversations(); openConversation(convo); }}
      />
    </PageLayout>
  );
};

export default Messages;
