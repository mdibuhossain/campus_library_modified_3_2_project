import React from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  Alert, Avatar, Button, Chip, CircularProgress, Skeleton, Typography,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PageLayout from "../../Layout/PageLayout";
import { useAuth } from "../../Hooks/useAuth";
import { GET_SUPPORT_CONTACTS, START_CONVERSATION } from "../../queries/query";
import useDocumentMeta from "../../Hooks/useDocumentMeta";

/* Talk to the team.
 *
 * This is a directory, not a ticket system: picking someone opens the ordinary
 * 1:1 chat that already exists, so there is no second inbox for staff to
 * remember to check. The list is derived from *permissions* server-side (see
 * SUPPORT_PERMISSIONS), so it follows role edits without a code change and can
 * never accidentally list an ordinary member.
 */
const REASONS = [
  "A book, question paper or syllabus is wrong, mislabelled or missing",
  "Something you uploaded is still waiting for approval",
  "You need a different role — teacher access, or help moderating",
  "Something on the site is broken, or content needs reporting",
];

const ContactSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
    <Skeleton variant="circular" width={52} height={52} />
    <div className="flex-1">
      <Skeleton variant="text" width="45%" height={20} />
      <Skeleton variant="text" width="70%" height={15} />
    </div>
    <Skeleton variant="rounded" width={104} height={34} />
  </div>
);

const TalkToAdmin = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [error, setError] = React.useState("");
  // which row is opening, so only that button spins
  const [pending, setPending] = React.useState("");

  useDocumentMeta({
    title: "Talk to admin | Campus Classroom",
    description: "Message the admins and moderators who run the Campus Classroom library.",
  });

  const { data, loading } = useQuery(GET_SUPPORT_CONTACTS, {
    variables: { token },
    skip: !token,
    fetchPolicy: "cache-and-network",
  });
  const [startConversation] = useMutation(START_CONVERSATION);

  const contacts = data?.getSupportContacts || [];

  const talkTo = (person) => {
    setError("");
    setPending(person.email);
    startConversation({ variables: { email: person.email, token } })
      .then(({ data: d }) => {
        if (d?.startConversation?._id) navigate(`/messages/${d.startConversation._id}`);
      })
      .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message))
      .finally(() => setPending(""));
  };

  return (
    <PageLayout>
      <div className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 py-8">
        <div className="flex items-start gap-3 mb-6">
          <span className="hidden sm:flex h-12 w-12 rounded-full bg-sky-50 text-sky-600 items-center justify-center shrink-0">
            <SupportAgentIcon />
          </span>
          <div>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Talk to admin</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Message the people who look after the library. Replies arrive in
              your normal inbox.
            </Typography>
          </div>
        </div>

        {/* Saying what this is for cuts down on "hello?" messages that then
            need a follow-up before anyone can actually help. */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Good things to ask about</p>
          <ul className="space-y-1.5">
            {REASONS.map((r) => (
              <li key={r} className="text-sm text-gray-700 flex gap-2">
                <span className="text-sky-500 mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
        )}

        {loading && contacts.length === 0 ? (
          <div className="space-y-3">
            <ContactSkeleton />
            <ContactSkeleton />
          </div>
        ) : contacts.length === 0 ? (
          /* Two ways to land here: nobody holds a support role yet, or you are
             the only one who does -- you are excluded from your own list. */
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <SupportAgentIcon sx={{ fontSize: 44, color: "action.disabled" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>
              No one else to contact
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              There is nobody besides you holding an admin or moderator role
              right now. If you need something, try again later.
            </Typography>
            <Button sx={{ mt: 2, textTransform: "none" }} onClick={() => navigate("/messages")}>
              Go to messages
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((person) => (
              <div
                key={person._id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-sky-300 transition-colors"
              >
                <Avatar
                  src={person.photoURL || undefined}
                  sx={{ width: 52, height: 52, fontSize: 18 }}
                >
                  {(person.displayName || person.email)?.slice(0, 2).toUpperCase()}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm sm:text-base font-semibold truncate">
                      {person.displayName || person.email}
                    </p>
                    {/* the role is why this person is on the list, so it is not
                        decoration -- it is how you pick the right one */}
                    <Chip
                      size="small"
                      label={person.role}
                      sx={{ height: 20, fontSize: 11, textTransform: "capitalize", bgcolor: "#e0f2fe", color: "#075985" }}
                    />
                  </div>
                  {person.roleDescription && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{person.roleDescription}</p>
                  )}
                  {person.department && (
                    <p className="text-[11px] text-gray-400 uppercase mt-0.5">{person.department}</p>
                  )}
                </div>
                <Button
                  variant="contained"
                  size="small"
                  disableElevation
                  startIcon={pending === person.email ? null : <ChatBubbleOutlineIcon />}
                  onClick={() => talkTo(person)}
                  disabled={!!pending}
                  sx={{ borderRadius: 7, textTransform: "none", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {pending === person.email ? <CircularProgress size={18} color="inherit" /> : "Message"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default TalkToAdmin;
