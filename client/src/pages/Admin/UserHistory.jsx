import React from "react";
import { useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import {
  Alert, Avatar, Button, Chip, Skeleton, Tab, Tabs, Tooltip, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PageLayout from "../../Layout/PageLayout";
import { useAuth } from "../../Hooks/useAuth";
import { GET_USER_HISTORY } from "../../queries/query";
import useDocumentMeta from "../../Hooks/useDocumentMeta";

/* One member's complete record. Superadmin only, enforced server-side by
 * requireSuperadmin -- the route guard here is convenience, not the boundary.
 *
 * Organised as tabs rather than one long page because the sections answer
 * different questions ("what have they contributed" vs "what have they said"
 * vs "who changed their role"), and because a chatty user's message list would
 * otherwise bury everything below it.
 */
const when = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const KINDS = {
  book: { label: "Book", color: "#0369a1", bg: "#e0f2fe" },
  question: { label: "Question", color: "#7c2d12", bg: "#ffedd5" },
  syllabus: { label: "Syllabus", color: "#3f6212", bg: "#ecfccb" },
};

// A readable sentence per audit action, instead of showing the raw key.
const ACTIONS = {
  "content.create": "uploaded",
  "content.edit": "edited",
  "content.delete": "deleted",
  "content.approve": "approved",
  "content.hide": "hid",
  "role.assign": "changed a role",
  "role.create": "created a role",
  "role.update": "changed a role's permissions",
  "role.delete": "deleted a role",
};

const Stat = ({ label, value, hint }) => (
  <Tooltip title={hint || ""} arrow disableHoverListener={!hint}>
    <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-center">
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  </Tooltip>
);

const Empty = ({ children }) => (
  <Typography variant="body2" sx={{ color: "text.secondary", py: 5, textAlign: "center" }}>
    {children}
  </Typography>
);

const Row = ({ children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-3">{children}</div>
);

/* Renders an audit row's `details`, which arrives as a JSON string because the
 * underlying meta is free-form per action. Unparseable input is shown raw
 * rather than swallowed -- a history view that silently hides data it did not
 * expect is worse than an ugly one. */
const Details = ({ details }) => {
  if (!details) return null;
  let meta;
  try { meta = JSON.parse(details); } catch { return <span className="text-xs text-gray-400">{details}</span>; }
  const bits = [];
  if (meta.fields) bits.push(`fields: ${meta.fields.join(", ")}`);
  if (meta.from || meta.to) bits.push(`${meta.from || "—"} → ${meta.to || "—"}`);
  if (meta.department) bits.push(meta.department);
  if (meta.wasApproved !== undefined) bits.push(meta.wasApproved ? "was approved" : "was pending");
  if (meta.permissionsBefore || meta.permissionsAfter) {
    const before = meta.permissionsBefore || [];
    const after = meta.permissionsAfter || [];
    const added = after.filter((k) => !before.includes(k));
    const removed = before.filter((k) => !after.includes(k));
    if (added.length) bits.push(`+${added.join(", +")}`);
    if (removed.length) bits.push(`-${removed.join(", -")}`);
  }
  if (meta.permissions && !meta.permissionsAfter) bits.push(meta.permissions.join(", "));
  if (!bits.length) return null;
  return <span className="text-xs text-gray-500">{bits.join(" · ")}</span>;
};

/* Per-channel message view: pick a correspondent, read that thread.
 *
 * Master/detail rather than one list, because chat is per-channel by nature --
 * a single time-ordered stream interleaves every correspondent, so a reply sits
 * nowhere near the message it answers.
 *
 * Which side a bubble sits on is the thing most likely to be misread in an
 * audit view, so it is stated twice: the header names both parties, and each
 * bubble carries the sender's name. Right and tinted is always the person whose
 * history this is.
 */
const dayOf = (iso) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toDateString();
};

const ChannelView = ({ conversations, subjectName }) => {
  // default to the first channel that actually has messages -- an empty thread
  // is a conversation that was opened and never used, and opening on it looks
  // like the page failed to load
  const firstUsed = conversations.find((cv) => (cv.messages || []).length > 0);
  const [activeId, setActiveId] = React.useState(
    (firstUsed || conversations[0])?._id
  );
  const active = conversations.find((cv) => cv._id === activeId) || conversations[0];
  const thread = active?.messages || [];

  return (
    <div className="grid md:grid-cols-3 gap-3 items-start">
      {/* ---- channels ---- */}
      <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <p className="px-3 pt-2.5 pb-1.5 text-xs uppercase tracking-wider text-gray-500">
          {conversations.length} channel{conversations.length === 1 ? "" : "s"}
        </p>
        <div className="divide-y divide-gray-100 max-h-[26rem] overflow-y-auto">
          {conversations.map((cv) => {
            const on = cv._id === active?._id;
            return (
              <button
                key={cv._id}
                type="button"
                onClick={() => setActiveId(cv._id)}
                className={`w-full text-left flex items-center gap-2.5 p-2.5 transition-colors ${
                  on ? "bg-violet-50" : "hover:bg-gray-50"
                }`}
              >
                <Avatar
                  src={cv.counterpartPhoto || undefined}
                  sx={{ width: 34, height: 34, fontSize: 13 }}
                >
                  {(cv.counterpartName || cv.counterpartEmail)?.slice(0, 2).toUpperCase()}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {cv.counterpartName || cv.counterpartEmail}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {cv.lastMessage || "no messages yet"}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{cv.messageCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- thread ---- */}
      <div className="md:col-span-2 bg-white rounded-xl border border-gray-200">
        {!active ? (
          <Empty>Pick a channel.</Empty>
        ) : (
          <>
            <div className="flex items-center gap-2.5 p-3 border-b border-gray-100">
              <Avatar
                src={active.counterpartPhoto || undefined}
                sx={{ width: 36, height: 36, fontSize: 13 }}
              >
                {(active.counterpartName || active.counterpartEmail)?.slice(0, 2).toUpperCase()}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {subjectName}
                  <span className="text-gray-400 font-normal"> &harr; </span>
                  {active.counterpartName || active.counterpartEmail}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {[
                    active.counterpartEmail,
                    active.counterpartDesignation,
                    active.counterpartDepartment?.toUpperCase(),
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {active.shownCount === active.messageCount
                  ? `${active.messageCount} message${active.messageCount === 1 ? "" : "s"}`
                  : `${active.shownCount} of ${active.messageCount}`}
              </span>
            </div>

            {active.shownCount < active.messageCount && (
              <p className="px-3 pt-2 text-xs text-amber-700 bg-amber-50">
                Showing the most recent {active.shownCount} of {active.messageCount} messages
                in this channel.
              </p>
            )}

            {thread.length === 0 ? (
              <Empty>This channel was opened but nothing was ever sent.</Empty>
            ) : (
              <div className="p-3 space-y-2 max-h-[26rem] overflow-y-auto">
                {thread.map((m, i) => {
                  // a date bar only when the day changes, not on every message
                  const newDay = i === 0 || dayOf(m.iat) !== dayOf(thread[i - 1].iat);
                  return (
                    <React.Fragment key={m._id}>
                      {newDay && (
                        <p className="text-center text-[11px] text-gray-400 py-1">
                          {dayOf(m.iat)}
                        </p>
                      )}
                      <div className={`flex ${m.outgoing ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[85%]">
                          <p
                            className={`text-[10px] text-gray-400 mb-0.5 ${
                              m.outgoing ? "text-right" : "text-left"
                            }`}
                          >
                            {m.outgoing ? subjectName : m.counterpartName || m.counterpartEmail}
                          </p>
                          <div
                            className={`rounded-2xl px-3 py-2 ${
                              m.outgoing
                                ? "bg-violet-100 text-gray-900 rounded-br-md"
                                : "bg-gray-100 text-gray-800 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          </div>
                          <p
                            className={`text-[10px] text-gray-400 mt-0.5 ${
                              m.outgoing ? "text-right" : "text-left"
                            }`}
                          >
                            {when(m.iat)}
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const UserHistory = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [tab, setTab] = React.useState(0);

  const { data, loading, error } = useQuery(GET_USER_HISTORY, {
    variables: { _id: id, token, limit: 300 },
    skip: !token || !id,
    fetchPolicy: "cache-and-network",
  });

  const h = data?.getUserHistory;
  useDocumentMeta({
    title: h ? `${h.displayName || h.email} — history | Campus Classroom` : "User history",
  });

  const c = h?.counts || {};
  const TABS = [
    { label: `Uploads (${c.books + c.questions + c.syllabus || 0})`, key: "uploads" },
    { label: `Messages (${c.messages || 0})`, key: "messages" },
    { label: `Classroom (${(c.roomsOwned || 0) + (c.roomsJoined || 0) + (c.submissions || 0)})`, key: "classroom" },
    { label: `Audit (${(c.actions || 0) + (c.receivedActions || 0)})`, key: "audit" },
    { label: `Notifications (${c.notifications || 0})`, key: "notifications" },
  ];

  return (
    <PageLayout>
      <div className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-6">
        <Button
          component={Link}
          to="/history"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none", mb: 2 }}
        >
          All users
        </Button>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

        {loading && !h ? (
          <>
            <Skeleton variant="rounded" height={110} sx={{ mb: 2, borderRadius: 3 }} />
            <Skeleton variant="rounded" height={72} sx={{ mb: 2, borderRadius: 3 }} />
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
          </>
        ) : !h ? (
          !error && <Empty>No such user.</Empty>
        ) : (
          <>
            {/* identity + everything on the user document worth showing */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 mb-4">
              <div className="flex items-start gap-4">
                <Avatar src={h.photoURL || undefined} sx={{ width: 64, height: 64, fontSize: 22 }}>
                  {(h.displayName || h.email)?.slice(0, 2).toUpperCase()}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {h.displayName || "(no name)"}
                    </Typography>
                    <Chip
                      size="small"
                      label={h.role || "—"}
                      sx={{ height: 21, fontSize: 11, textTransform: "capitalize", bgcolor: "#ede9fe", color: "#5b21b6" }}
                    />
                    {!h.isProfileComplete && (
                      <Chip size="small" color="warning" label="incomplete profile" sx={{ height: 21, fontSize: 11 }} />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-all">{h.email}</p>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
                    {[
                      ["Designation", h.designation],
                      ["Department", h.department?.toUpperCase()],
                      ["Semester", h.semester],
                      ["Sign-in", h.authType],
                      ["Devices", h.deviceCount],
                      ["Joined", when(h.joinedAt)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-gray-400 uppercase tracking-wide">{k}</dt>
                        <dd className="text-gray-800">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  {h.roleDescription && (
                    <p className="text-xs text-gray-500 mt-2">{h.roleDescription}</p>
                  )}
                  {h.permissions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {h.permissions.map((k) => (
                        <span key={k} className="text-[10px] font-mono bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              <Stat label="Uploads" value={c.books + c.questions + c.syllabus || 0} />
              <Stat label="Pending" value={c.pending || 0} hint="Uploads still awaiting approval" />
              <Stat label="Messages" value={c.messages || 0} />
              <Stat label="Rooms" value={(c.roomsOwned || 0) + (c.roomsJoined || 0)} />
              <Stat label="Submitted" value={c.submissions || 0} />
              <Stat label="Actions" value={c.actions || 0} hint="Recorded changes this user made" />
            </div>

            <Tabs
              value={tab}
              onChange={(e, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, minHeight: 40 }}
            >
              {TABS.map((t) => (
                <Tab key={t.key} label={t.label} sx={{ textTransform: "none", minHeight: 40, fontSize: 13 }} />
              ))}
            </Tabs>

            {/* ---------------- uploads ---------------- */}
            {TABS[tab].key === "uploads" && (
              h.uploads.length === 0 ? <Empty>Nothing uploaded.</Empty> : (
                <div className="space-y-2">
                  {h.uploads.map((u) => {
                    const k = KINDS[u.kind] || { label: u.kind, color: "#374151", bg: "#f3f4f6" };
                    return (
                      <Row key={u._id}>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-semibold rounded px-1.5 py-0.5 shrink-0"
                            style={{ color: k.color, background: k.bg }}
                          >
                            {k.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{u.title}</p>
                            <p className="text-xs text-gray-500">
                              {[u.department?.toUpperCase(), u.subCategory, when(u.createdAt)]
                                .filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <Chip
                            size="small"
                            label={u.status ? "approved" : "pending"}
                            color={u.status ? "success" : "warning"}
                            variant="outlined"
                            sx={{ height: 20, fontSize: 10 }}
                          />
                        </div>
                      </Row>
                    );
                  })}
                </div>
              )
            )}

            {/* ---------------- messages ---------------- */}
            {TABS[tab].key === "messages" && (
              (h.conversations || []).length === 0 ? <Empty>No conversations.</Empty> : (
                <ChannelView
                  conversations={h.conversations}
                  subjectName={h.displayName || h.email}
                />
              )
            )}

            {/* ---------------- classroom ---------------- */}
            {TABS[tab].key === "classroom" && (
              (h.roomsOwned.length + h.roomsJoined.length + h.tasks.length + h.submissions.length) === 0
                ? <Empty>No classroom activity.</Empty> : (
                <div className="space-y-4">
                  {[["Rooms owned", h.roomsOwned], ["Rooms joined", h.roomsJoined]].map(([label, list]) =>
                    list.length > 0 && (
                      <div key={label}>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">{label}</p>
                        <div className="space-y-2">
                          {list.map((r) => (
                            <Row key={r._id}>
                              <div className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{r.name || "(unnamed)"}</p>
                                  <p className="text-xs text-gray-500">
                                    {r.memberCount} member(s) · {when(r.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </Row>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  {h.tasks.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Tasks set</p>
                      <div className="space-y-2">
                        {h.tasks.map((t) => (
                          <Row key={t._id}>
                            <p className="text-sm font-medium truncate">{t.title || "(untitled)"}</p>
                            <p className="text-xs text-gray-500">
                              {[t.roomName, `due ${when(t.deadline)}`, `set ${when(t.createdAt)}`]
                                .filter(Boolean).join(" · ")}
                            </p>
                          </Row>
                        ))}
                      </div>
                    </div>
                  )}
                  {h.submissions.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Submissions</p>
                      <div className="space-y-2">
                        {h.submissions.map((sub) => (
                          <Row key={sub._id}>
                            <p className="text-sm font-medium truncate">{sub.taskTitle || "(task removed)"}</p>
                            <p className="text-xs text-gray-500">
                              {[sub.roomName, sub.filename, when(sub.submittedAt)]
                                .filter(Boolean).join(" · ")}
                            </p>
                          </Row>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ---------------- audit ---------------- */}
            {TABS[tab].key === "audit" && (
              <div className="space-y-4">
                {/* Stated up front, because an empty list here otherwise reads
                    as "this user has done nothing". */}
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  The audit trail records changes from the moment this feature was
                  deployed. Edits made before that were never recorded anywhere, so
                  they cannot be shown.
                </Alert>
                {[["Changes they made", h.actions], ["Changes made to them", h.receivedActions]].map(
                  ([label, list]) => (
                    <div key={label}>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">{label}</p>
                      {list.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                          Nothing recorded yet.
                        </Typography>
                      ) : (
                        <div className="space-y-2">
                          {list.map((a) => (
                            <Row key={a._id}>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-sm">
                                  <span className="font-medium">{a.actor}</span>{" "}
                                  {ACTIONS[a.action] || a.action}
                                  {a.targetLabel && (
                                    <> <span className="font-medium">“{a.targetLabel}”</span></>
                                  )}
                                  {a.targetType && (
                                    <span className="text-gray-400"> ({a.targetType})</span>
                                  )}
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">{when(a.iat)}</span>
                              </div>
                              <Details details={a.details} />
                            </Row>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* ---------------- notifications ---------------- */}
            {TABS[tab].key === "notifications" && (
              h.notifications.length === 0 ? <Empty>No notifications.</Empty> : (
                <div className="space-y-2">
                  {h.notifications.map((n) => (
                    <Row key={n._id}>
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        {!n.read && (
                          <Chip size="small" color="error" label="unread" sx={{ height: 17, fontSize: 9 }} />
                        )}
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{when(n.iat)}</span>
                      </div>
                      {n.body && <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>}
                      <span className="text-[10px] text-gray-400 uppercase">{n.kind}</span>
                    </Row>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default UserHistory;
