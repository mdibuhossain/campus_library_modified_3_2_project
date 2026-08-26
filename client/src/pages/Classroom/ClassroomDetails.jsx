import React, { lazy } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../Hooks/useAuth";
import { useLazyQuery, useMutation } from "@apollo/client";
import { GET_CLASSROOM, GET_MATERIAL, ADD_MEMBER, ADD_BULK_MEMBER } from "../../queries/query";
import {
  Alert, Avatar, AvatarGroup, Button, Chip, Dialog, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, ListSubheader, MenuItem, Select,
  Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PageLayout from "../../Layout/PageLayout";
import { semesterList } from "../../utility/semesterList";
import useUtility from "../../Hooks/useUtility";
import { tagTitle } from "../../utility/tagTitle";
import CreateTaskModal from "./CreateTaskModal";
import TaskDetailsModal from "./TaskDetailsModal";
import CircularLoading from "../../components/Circular_Loading/CircularLoading";
const Accordionlist = lazy(() => import("../../components/Accordionlist"));

const initials = (name) => (name || "?").slice(0, 2).toUpperCase();

const ClassroomDetails = () => {
  const { rid } = useParams();
  const { user, token } = useAuth();
  const [RoomInfo, setRoomInfo] = React.useState({});
  const [roomLoading, setRoomLoading] = React.useState(true);
  const [tabIndex, setTabIndex] = React.useState(0);

  const [fetchRoom] = useLazyQuery(GET_CLASSROOM, { fetchPolicy: "network-only" });

  React.useEffect(() => {
    if (!token) return;
    setRoomLoading(true);
    fetchRoom({ variables: { roomid: rid, token } })
      .then(({ data }) => setRoomInfo(data?.getClassroom || {}))
      .catch((err) => console.error(err.message))
      .finally(() => setRoomLoading(false));
  }, [token, rid]);

  if (roomLoading) return <CircularLoading />;
  /* The old code called history('/') from the render body -- a side effect
   * during render, which React warns about. It also rendered a Join/Leave
   * control for the !isJoined case that could never be reached, because this
   * very branch redirected first. Neither button had an onClick and there is no
   * join or leave mutation on the server, so that UI was dead either way. */
  if (!RoomInfo?.isJoined) return <Navigate to="/" replace />;

  const isAdmin = user?.email === RoomInfo?.admin?.email;

  return (
    <PageLayout>
      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-6">
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-lg">
          {/* header */}
          <div className="px-5 py-6 bg-gradient-to-r from-sky-700 to-sky-500">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white break-words">
              {RoomInfo?.roomName}
            </h1>
            <p className="text-sky-100 text-sm mt-1 break-words">
              {RoomInfo?.courseTitle}
              {RoomInfo?.courseCode && ` · ${RoomInfo.courseCode.toUpperCase()}`}
            </p>
          </div>

          <div className="px-5 py-3 bg-sky-50 flex flex-wrap items-center justify-between gap-2 border-b border-sky-100">
            <p className="text-xs text-gray-600">
              Created by {RoomInfo?.admin?.email}
              {isAdmin && " (you)"}
            </p>
            <div className="flex items-center gap-2">
              <Chip size="small" label={isAdmin ? "you are the admin" : "member"}
                color={isAdmin ? "primary" : "default"} sx={{ height: 22, fontSize: 11 }} />
              <Chip size="small" variant="outlined"
                label={`${RoomInfo?.members?.length || 0} member${RoomInfo?.members?.length === 1 ? "" : "s"}`}
                sx={{ height: 22, fontSize: 11 }} />
            </div>
          </div>

          <Tabs
            value={tabIndex}
            onChange={(e, next) => setTabIndex(next)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Stream" sx={{ fontWeight: 600, textTransform: "capitalize" }} />
            <Tab
              label={`Classwork (${RoomInfo?.tasks?.length || 0})`}
              sx={{ fontWeight: 600, textTransform: "capitalize" }}
            />
            <Tab label="People" sx={{ fontWeight: 600, textTransform: "capitalize" }} />
          </Tabs>

          <div className="p-4 sm:p-6">
            <TabViewPanel value={tabIndex} index={0}>
              {RoomInfo?.members?.length > 0 && <ShowMembers RoomInfo={RoomInfo} />}
              {isAdmin && <MemberAddingSection RoomInfo={RoomInfo} setRoomInfo={setRoomInfo} />}
              {RoomInfo?._id && <RelatedMaterial RoomInfo={RoomInfo} />}
            </TabViewPanel>
            <TabViewPanel value={tabIndex} index={1}>
              <Classwork RoomInfo={RoomInfo} setRoomInfo={setRoomInfo} />
            </TabViewPanel>
            <TabViewPanel value={tabIndex} index={2}>
              <MemberList RoomInfo={RoomInfo} user={user} />
            </TabViewPanel>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

const ShowMembers = ({ RoomInfo }) => {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-400"
        aria-label="Show all members"
      >
        {/* AvatarGroup handles the overflow count itself. The hand-rolled version
            showed three avatars and then claimed `length - 2` more, so a room of
            five advertised "+3" when only two were hidden. */}
        <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 34, height: 34, fontSize: 13 } }}>
          {RoomInfo?.members?.map((mem) => (
            <Tooltip key={mem.email} title={mem.displayName || mem.email} arrow>
              <Avatar src={mem.photoURL || undefined}>{initials(mem.displayName)}</Avatar>
            </Tooltip>
          ))}
        </AvatarGroup>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          People
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <MemberList RoomInfo={RoomInfo} user={user} />
        </DialogContent>
      </Dialog>
    </>
  );
};

const PersonRow = ({ person, isYou, badge }) => (
  <div className="flex items-center gap-3 py-2">
    <Avatar src={person?.photoURL || undefined} sx={{ width: 34, height: 34, fontSize: 13 }}>
      {initials(person?.displayName)}
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium truncate">
        {person?.displayName} {isYou && <span className="text-gray-400">(you)</span>}
      </p>
      <p className="text-xs text-gray-500 truncate">{person?.email}</p>
    </div>
    {badge && <Chip size="small" label={badge} sx={{ height: 20, fontSize: 10 }} />}
  </div>
);

const MemberList = ({ RoomInfo, user }) => (
  <div>
    <Typography variant="overline" sx={{ color: "text.secondary" }}>Teacher</Typography>
    <PersonRow
      person={RoomInfo?.admin}
      isYou={user?.email === RoomInfo?.admin?.email}
      badge="admin"
    />
    <Divider sx={{ my: 1.5 }} />
    <Typography variant="overline" sx={{ color: "text.secondary" }}>
      Members ({RoomInfo?.members?.length || 0})
    </Typography>
    {RoomInfo?.members?.length ? (
      <div className="divide-y divide-gray-100">
        {RoomInfo.members.map((member) => (
          <PersonRow key={member.email} person={member} isYou={user?.email === member.email} />
        ))}
      </div>
    ) : (
      <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
        No members yet.
      </Alert>
    )}
  </div>
);

const MemberAddingSection = ({ RoomInfo, setRoomInfo }) => {
  const { token } = useAuth();
  const { getDepartments, deptLoading } = useUtility();
  const [requestEmail, setRequestEmail] = React.useState("");
  const [semester, setSemester] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [feedback, setFeedback] = React.useState(null);

  const [addMember, { loading: addingOne }] = useMutation(ADD_MEMBER);
  const [addBulkMember, { loading: addingMany }] = useMutation(ADD_BULK_MEMBER);

  const say = (severity, message) => setFeedback({ severity, message });

  const handleAddSingleMember = (e) => {
    e.preventDefault();
    setFeedback(null);
    addMember({ variables: { memberEmail: requestEmail.trim(), roomid: RoomInfo?._id, token } })
      .then(({ data }) => {
        if (data?.addMember) {
          setRoomInfo(data.addMember);
          setRequestEmail("");
          say("success", "Member added.");
        }
      })
      // was a window.alert branching on HTTP status codes that GraphQL never sends
      .catch((err) => say("error", err?.graphQLErrors?.[0]?.message || err.message));
  };

  const handleAddBulkMember = (e) => {
    e.preventDefault();
    setFeedback(null);
    addBulkMember({ variables: { semester, department, roomid: RoomInfo?._id, token } })
      .then(({ data }) => {
        if (data?.addBulkMember) {
          setRoomInfo(data.addBulkMember);
          say("success", `Students of ${department.toUpperCase()} ${semester} added.`);
        }
      })
      .catch((err) => say("error", err?.graphQLErrors?.[0]?.message || err.message));
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 mb-6">
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Add people</Typography>
      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={handleAddSingleMember}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>By email</Typography>
          <div className="flex gap-2 mt-1">
            <TextField
              size="small" fullWidth type="email" placeholder="name@example.com"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              required
            />
            <LoadingButton
              type="submit" variant="contained" loading={addingOne}
              disabled={!requestEmail.trim()} startIcon={<PersonAddIcon />}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              add
            </LoadingButton>
          </div>
        </form>

        {/* Was gated on the viewer's designation being "teacher", while the
            server authorises on being the room admin -- so a room admin
            designated a student could not bulk add to their own classroom.
            This section already only renders for the admin. */}
        <form onSubmit={handleAddBulkMember}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            All students of a department and semester
          </Typography>
          {/* the old version glued three controls together with height:100% and a
              fixed h-[36px], which broke down on narrow screens */}
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <FormControl size="small" fullWidth required>
              <InputLabel id="bulk-dept-label">Department</InputLabel>
              <Select
                labelId="bulk-dept-label" label="Department" value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {!deptLoading && getDepartments.map((item) => (
                  item && (
                    <MenuItem key={item} value={item}>
                      <Tooltip title={tagTitle[item] || ""} placement="top-start" arrow>
                        <div className="w-full">{item.toUpperCase()}</div>
                      </Tooltip>
                    </MenuItem>
                  )
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel id="bulk-sem-label">Semester</InputLabel>
              <Select
                labelId="bulk-sem-label" label="Semester" value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                {semesterList.map((sem) =>
                  sem?.title ? (
                    <ListSubheader key={sem.title} sx={{ fontWeight: 700 }}>{sem.title}</ListSubheader>
                  ) : (
                    <MenuItem key={sem} value={sem} sx={{ ml: 1 }}>{sem}</MenuItem>
                  )
                )}
              </Select>
            </FormControl>
            <LoadingButton
              type="submit" variant="contained" loading={addingMany}
              disabled={!department || !semester} startIcon={<GroupAddIcon />}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              add
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

const RelatedMaterial = ({ RoomInfo }) => {
  const [material, setMaterial] = React.useState([]);
  const [fetchMaterial] = useLazyQuery(GET_MATERIAL);
  React.useEffect(() => {
    if (!RoomInfo?.courseCode) return;
    fetchMaterial({ variables: { courseCode: RoomInfo.courseCode } })
      .then(({ data }) => setMaterial(data?.getMaterial || []))
      .catch((err) => console.error(err.message));
  }, [RoomInfo?._id]);

  return (
    <div>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Library material for {RoomInfo?.courseCode?.toUpperCase()}
      </Typography>
      {material.length ? (
        <Accordionlist title="Material" contents={material} />
      ) : (
        // returned null before, so the section vanished with no explanation
        <Alert severity="info" variant="outlined">
          Nothing in the library matches this course code yet. Uploads tagged{" "}
          <strong>{RoomInfo?.courseCode?.toUpperCase()}</strong> will show up here.
        </Alert>
      )}
    </div>
  );
};

const Classwork = ({ RoomInfo, setRoomInfo }) => (
  <div>
    <CreateTaskModal RoomInfo={RoomInfo} setRoomInfo={setRoomInfo} />
    {RoomInfo?.tasks?.length ? (
      RoomInfo.tasks.map((task) => (
        <TaskDetailsModal key={task._id} task={task} admin={RoomInfo?.admin} />
      ))
    ) : (
      <Alert severity="info">No assignments have been posted yet.</Alert>
    )}
  </div>
);

const TabViewPanel = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`classroom-tabpanel-${index}`}
    aria-labelledby={`classroom-tab-${index}`}
  >
    {value === index && children}
  </div>
);

export default ClassroomDetails;
