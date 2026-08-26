import React from "react";
import PageLayout from "../../Layout/PageLayout";
import { Alert, Button, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SchoolIcon from "@mui/icons-material/School";
import GroupIcon from "@mui/icons-material/Group";
import CreateClassroomModal from "./CreateClassroomModal";
import { useAuth } from "../../Hooks/useAuth";
import { useLazyQuery, useMutation } from "@apollo/client";
import { GET_CLASSROOMS, DELETE_CLASSROOM } from "../../queries/query";
import { NavLink } from "react-router-dom";
import ClassroomLoading from "../../components/Loading/ClassroomLoading";

const RoomCard = ({ room, adminEmail, onDelete }) => (
  <div className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-lg">
    <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-sky-500">
      <p className="font-semibold text-white truncate" title={room?.roomName}>
        {room?.roomName}
      </p>
    </div>
    <div className="flex flex-col justify-between flex-1 p-4 gap-3">
      <div className="space-y-1.5 min-w-0">
        <p className="text-sm text-gray-700 break-words">{room?.courseTitle}</p>
        <div className="flex flex-wrap gap-1.5">
          {room?.courseCode && (
            <Chip size="small" variant="outlined" label={room.courseCode.toUpperCase()} sx={{ height: 20, fontSize: 11 }} />
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">
          {/* previously every card said "Admin: <your own email>", even for
              classrooms you had merely joined */}
          {adminEmail ? `Admin: ${adminEmail}` : null}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <NavLink to={`${room?._id}`} className="flex-1">
          <Button size="small" variant="contained" fullWidth sx={{ textTransform: "none" }}>
            Open
          </Button>
        </NavLink>
        {onDelete && (
          <Tooltip title="Delete classroom" arrow>
            <IconButton size="small" color="error" onClick={() => onDelete(room?._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  </div>
);

const Section = ({ icon, title, count, children }) => (
  <section className="mb-10">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Chip size="small" label={count} sx={{ height: 20, fontSize: 11 }} />
    </div>
    {children}
  </section>
);

const Classroom = () => {
  const { user, token } = useAuth();
  const [myRoom, setMyRoom] = React.useState([]);
  const [joinedRoom, setJoinedRoom] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [fetchClassrooms] = useLazyQuery(GET_CLASSROOMS, { fetchPolicy: "network-only" });
  const [deleteClassroom] = useMutation(DELETE_CLASSROOM);

  const handleFetchClassroomFromDB = () => {
    setLoading(true);
    setError("");
    fetchClassrooms({ variables: { token } })
      .then(({ data }) => {
        // default to [] so a null response cannot make .map throw
        setMyRoom(data?.getClassrooms?.myRoom || []);
        setJoinedRoom(data?.getClassrooms?.joinedRoom || []);
      })
      // was only console.log, so a failure showed as an empty page
      .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message))
      .finally(() => setLoading(false));
  };

  const handleDeleteClassroom = (id) => {
    const room = myRoom.find((r) => r?._id === id);
    if (!window.confirm(`Delete "${room?.roomName}"? Its assignments go with it and this cannot be undone.`)) return;
    setError("");
    deleteClassroom({ variables: { roomid: id, token } })
      .then(({ data }) => {
        if (data?.deleteClassroom?.success) {
          setMyRoom((pre) => pre.filter((r) => r?._id !== id));
        } else {
          setError(data?.deleteClassroom?.message || "Could not delete that classroom.");
        }
      })
      .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
  };

  // the token arrives asynchronously from onAuthStateChanged
  React.useEffect(() => {
    token && handleFetchClassroomFromDB();
  }, [token]);

  const nothingAtAll = !loading && !myRoom.length && !joinedRoom.length;

  return (
    <PageLayout>
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
          <div>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Classrooms</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Coursework, assignments and materials for the classes you run or belong to.
            </Typography>
          </div>
          <CreateClassroomModal setMyRoom={setMyRoom} />
        </div>

        {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>{error}</Alert>}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => <ClassroomLoading key={n} />)}
          </div>
        ) : nothingAtAll ? (
          // there was no empty state at all -- just two headings reading (0)
          <Alert severity="info">
            You are not in any classroom yet. Create one, or ask a teacher to add
            you to theirs.
          </Alert>
        ) : (
          <>
            <Section
              icon={<SchoolIcon sx={{ color: "text.secondary" }} />}
              title="Classrooms you manage"
              count={myRoom?.length || 0}
            >
              {myRoom?.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {myRoom.map((room) => (
                    <RoomCard
                      key={room?._id}
                      room={room}
                      adminEmail={`${user?.email} (you)`}
                      onDelete={handleDeleteClassroom}
                    />
                  ))}
                </div>
              ) : (
                <Alert severity="info" variant="outlined">
                  You do not run any classroom yet.
                </Alert>
              )}
            </Section>

            <Section
              icon={<GroupIcon sx={{ color: "text.secondary" }} />}
              title="Classrooms you've joined"
              count={joinedRoom?.length || 0}
            >
              {joinedRoom?.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {joinedRoom.map((room) => (
                    // no admin email available on this query, and printing the
                    // viewer's own address here was simply wrong
                    <RoomCard key={room?._id} room={room} adminEmail={null} />
                  ))}
                </div>
              ) : (
                <Alert severity="info" variant="outlined">
                  You have not been added to any classroom yet.
                </Alert>
              )}
            </Section>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default Classroom;
