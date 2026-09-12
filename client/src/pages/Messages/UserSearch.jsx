import React from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import {
  Alert, Avatar, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  IconButton, InputAdornment, TextField, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { GET_USERS, SEARCH_USERS, START_CONVERSATION } from "../../queries/query";
import { useAuth } from "../../Hooks/useAuth";

const MIN_QUERY = 2;

const UserSearch = ({ open, onClose, onOpened }) => {
  const { user, token, isSuperadmin } = useAuth();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState("");
  const [runSearch, { data, loading: searching }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "network-only",
  });
  const { data: directory, loading: listing } = useQuery(GET_USERS, {
    variables: { token },
    // only a superadmin browses, and only while the dialog is actually open
    skip: !token || !isSuperadmin || !open,
    fetchPolicy: "cache-and-network",
  });
  const [startConversation, { loading: starting }] = useMutation(START_CONVERSATION);

  const query = text.trim();
  const browse = !!isSuperadmin;

  React.useEffect(() => {
    if (browse || query.length < MIN_QUERY || !token) return;
    const id = setTimeout(() => {
      runSearch({ variables: { query, token, limit: 15 } });
    }, 300);
    return () => clearTimeout(id);
  }, [browse, query, token, runSearch]);

  const results = React.useMemo(() => {
    if (!browse) return data?.searchUsers || [];
    const all = (directory?.getUsers || []).filter((p) => p?.email !== user?.email);
    const needle = query.toLowerCase();
    const matched = needle
      ? all.filter((p) =>
          [p.displayName, p.email, p.department, p.designation, p.role].some((f) =>
            String(f || "").toLowerCase().includes(needle)
          )
        )
      : all;
    return [...matched].sort((a, b) =>
      String(a.displayName || a.email).localeCompare(String(b.displayName || b.email))
    );
  }, [browse, data, directory, query, user?.email]);

  const loading = browse ? listing && results.length === 0 : searching;

  const pick = (person) => {
    setError("");
    startConversation({ variables: { email: person.email, token } })
      .then(({ data: d }) => {
        if (!d?.startConversation) return;
        onOpened(d.startConversation);
        setText("");
        onClose();
      })
      .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <span>New message</span>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <TextField
          fullWidth
          size="small"
          autoFocus
          placeholder={browse ? "Filter by name, email, department or role…" : "Search by name or email…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (loading || starting) ? <CircularProgress size={16} /> : null,
          }}
        />

        <div className="mt-3">
          {browse && (
            <p className="text-xs uppercase tracking-wider text-gray-500 px-1 pb-1">
              {results.length} {results.length === 1 ? "person" : "people"}
              {query ? " matching" : " you can message"}
            </p>
          )}
          {!browse && query.length < MIN_QUERY ? (
            <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>
              Type at least {MIN_QUERY} characters to search.
            </Typography>
          ) : loading ? (
            <div className="flex justify-center py-6"><CircularProgress size={22} /></div>
          ) : results.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>
              {query ? `Nobody matches “${query}”.` : "There is nobody else to message yet."}
            </Typography>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 max-h-[52vh] overflow-y-auto">
              {results.map((person) => (
                <button
                  key={person._id}
                  type="button"
                  onClick={() => pick(person)}
                  disabled={starting}
                  className="flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors disabled:opacity-50"
                >
                  <Avatar src={person.photoURL || undefined} sx={{ width: 36, height: 36, fontSize: 14 }}>
                    {person.displayName?.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{person.displayName || person.email}</p>
                    <p className="text-xs text-gray-500 truncate">{person.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {browse && person.role ? (
                      <Chip
                        size="small"
                        label={person.role}
                        sx={{ height: 18, fontSize: 10, textTransform: "capitalize", bgcolor: "#ede9fe", color: "#5b21b6" }}
                      />
                    ) : person.designation ? (
                      <Chip size="small" label={person.designation} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                    ) : null}
                    {person.department && (
                      <span className="text-[10px] text-gray-400 uppercase">{person.department}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSearch;
