import React from "react";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import {
  Alert, Avatar, Chip, InputAdornment, Skeleton, TextField, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import PageLayout from "../../Layout/PageLayout";
import { useAuth } from "../../Hooks/useAuth";
import { GET_USERS } from "../../queries/query";
import useDocumentMeta from "../../Hooks/useDocumentMeta";

/* Pick a user, then read everything recorded about them.
 *
 * Filtered in the browser rather than through searchUsers: this list is only
 * ever shown to a superadmin, who is entitled to see every row anyway, and the
 * whole point of the page is to browse rather than to know a name in advance.
 */
const UserHistoryList = () => {
  const { token } = useAuth();
  const [q, setQ] = React.useState("");

  useDocumentMeta({ title: "User history | Campus Classroom" });

  const { data, loading, error } = useQuery(GET_USERS, {
    variables: { token },
    skip: !token,
    fetchPolicy: "cache-and-network",
  });

  const users = data?.getUsers || [];
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? users.filter((u) =>
        [u.displayName, u.email, u.department, u.role]
          .some((f) => String(f || "").toLowerCase().includes(needle))
      )
    : users;

  return (
    <PageLayout>
      <div className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-8">
        <div className="flex items-start gap-3 mb-2">
          <span className="hidden sm:flex h-12 w-12 rounded-full bg-violet-50 text-violet-600 items-center justify-center shrink-0">
            <HistoryIcon />
          </span>
          <div>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>User history</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Everything recorded about a member: profile, role, uploads,
              messages, classroom activity and the audit trail.
            </Typography>
          </div>
        </div>

        {/* Said plainly, because it is easy to open this page without thinking
            about what it contains. */}
        <Alert severity="info" sx={{ my: 3, borderRadius: 2 }}>
          These pages include members' private messages. Visible to the
          superadmin role only.
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

        <TextField
          fullWidth
          size="small"
          placeholder="Filter by name, email, department or role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          }}
        />

        {loading && users.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1">
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="65%" height={14} />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 6, textAlign: "center" }}>
            {needle ? `Nobody matches “${q}”.` : "No users."}
          </Typography>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {shown.length} of {users.length} users
            </p>
            <div className="space-y-2">
              {shown.map((u) => (
                <Link
                  key={u._id}
                  to={`/history/${u._id}`}
                  className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-violet-300 transition-colors block"
                >
                  <Avatar src={u.photoURL || undefined} sx={{ width: 40, height: 40, fontSize: 14 }}>
                    {(u.displayName || u.email)?.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{u.displayName || u.email}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.department && (
                      <span className="text-[10px] text-gray-400 uppercase hidden sm:block">{u.department}</span>
                    )}
                    <Chip
                      size="small"
                      label={u.role || "—"}
                      sx={{ height: 20, fontSize: 11, textTransform: "capitalize" }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default UserHistoryList;
