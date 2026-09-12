import React from "react";
import { useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useAuth } from "../../Hooks/useAuth";
import { START_CONVERSATION } from "../../queries/query";

const UserRowActions = ({ target, onError, dense = false, showHistory = true, showMessage = true }) => {
  const navigate = useNavigate();
  const { user, token, isSuperadmin } = useAuth();
  const [startConversation] = useMutation(START_CONVERSATION);
  const [opening, setOpening] = React.useState(false);

  if (!isSuperadmin || !target?._id) return null;

  const isSelf = target?.email && target.email === user?.email;
  const size = dense ? "small" : "medium";

  const message = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onError?.("");
    setOpening(true);
    startConversation({ variables: { email: target.email, token } })
      .then(({ data }) => {
        const id = data?.startConversation?._id;
        if (id) navigate(`/messages/${id}`);
      })
      .catch((err) =>
        onError?.(err?.graphQLErrors?.[0]?.message || err.message)
      )
      .finally(() => setOpening(false));
  };

  const history = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/history/${target._id}`);
  };

  return (
    <span
      className="inline-flex items-center gap-0.5 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {showHistory && (
      <Tooltip title="View full history" arrow>
        <IconButton size={size} onClick={history} aria-label={`View history for ${target.displayName || target.email}`}>
          <HistoryIcon fontSize={dense ? "small" : "medium"} />
        </IconButton>
      </Tooltip>
      )}
      {showMessage && (
      <Tooltip title={isSelf ? "You cannot message yourself" : "Send a message"} arrow>
        <span>
          <IconButton
            size={size}
            onClick={message}
            disabled={isSelf || opening}
            aria-label={`Message ${target.displayName || target.email}`}
          >
            {opening ? (
              <CircularProgress size={dense ? 16 : 20} />
            ) : (
              <ChatBubbleOutlineIcon fontSize={dense ? "small" : "medium"} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      )}
    </span>
  );
};

export default UserRowActions;
