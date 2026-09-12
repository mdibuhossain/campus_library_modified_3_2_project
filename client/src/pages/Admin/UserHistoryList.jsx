import React from "react";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import {
  Alert, Avatar, Chip, Skeleton, Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import PageLayout from "../../Layout/PageLayout";
import { useAuth } from "../../Hooks/useAuth";
import { GET_USERS } from "../../queries/query";
import UserRowActions from "../../components/Admin/UserRowActions";
import UserFilters from "../../components/Admin/UserFilters";
import useUserFilters from "../../Hooks/useUserFilters";
import useDocumentMeta from "../../Hooks/useDocumentMeta";

const UserHistoryList = () => {
  const { token } = useAuth();
  const [actionError, setActionError] = React.useState("");

  useDocumentMeta({ title: "User history | Campus Classroom" });

  const { data, loading, error } = useQuery(GET_USERS, {
    variables: { token },
    skip: !token,
    fetchPolicy: "cache-and-network",
  });

  const users = data?.getUsers || [];

  const filterState = useUserFilters(users);
  const { result: shown, isFiltered } = filterState;

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
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError("")}>
            {actionError}
          </Alert>
        )}

        <UserFilters state={filterState} className="mb-4" />

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
            {isFiltered ? "No user matches these filters." : "No users."}
          </Typography>
        ) : (
          <>
            <div className="space-y-2">
              {shown.map((u) => (
                <div
                  key={u._id}
                  className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-violet-300 transition-colors"
                >
                  <Link
                    to={`/history/${u._id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                  >
                    <Avatar src={u.photoURL || undefined} sx={{ width: 40, height: 40, fontSize: 14 }}>
                      {(u.displayName || u.email)?.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{u.displayName || u.email}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.department && (
                      <span className="text-[10px] text-gray-400 uppercase hidden sm:block">{u.department}</span>
                    )}
                    <Chip
                      size="small"
                      label={u.role || "—"}
                      sx={{ height: 20, fontSize: 11, textTransform: "capitalize" }}
                    />
                    {/* history is what the row itself already does, so only the
                        message action earns a button here */}
                    <UserRowActions
                      target={u}
                      onError={setActionError}
                      dense
                      showHistory={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default UserHistoryList;
