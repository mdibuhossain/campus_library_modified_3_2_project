import React from "react";
import { NavLink } from "react-router-dom";
import { Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAuth } from "../../Hooks/useAuth";
import { tagTitle } from "../../utility/tagTitle";

/* The one-tap shortcut for a signed-in member.
 *
 * Their department is already on their profile and required before they can use
 * the classroom, so making them scan 33 tiles for the one they visit every time
 * is pure friction. Renders nothing for a visitor, or for a member whose profile
 * department is missing or not a department we recognise.
 */
const YourDepartment = ({ stats }) => {
  const { user, userDepartment } = useAuth();
  const dept = String(userDepartment || "").toLowerCase();

  if (!user?.email || !dept || !tagTitle[dept]) return null;

  const row = stats?.get(dept);
  const parts = [
    row?.books ? `${row.books} book${row.books === 1 ? "" : "s"}` : null,
    row?.questions ? `${row.questions} question paper${row.questions === 1 ? "" : "s"}` : null,
    row?.syllabus ? `${row.syllabus} syllabus` : null,
  ].filter(Boolean);

  return (
    /* `w-full` is load-bearing. PageLayout renders children inside a flex
       column, and a flex item with auto side margins does not stretch -- its
       width collapses to its content. This card holds one short line, so
       without it the card rendered ~360px wide in a 1152px container while
       the grid sections beside it looked correct (their content is wide
       enough to hide the same problem). */
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
        Your department
      </p>
      <NavLink
        to={`/department/${dept}`}
        className="group flex items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl px-5 py-4 hover:from-slate-800 hover:to-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        <div className="min-w-0 flex-1">
          <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1.05rem" }}>
            {tagTitle[dept]}
          </Typography>
          <p className="text-xs text-gray-300 mt-0.5">
            {parts.length ? parts.join(" · ") : "nothing uploaded here yet — be the first"}
          </p>
        </div>
        <span className="shrink-0 h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-white/20 transition-colors">
          <ArrowForwardIcon fontSize="small" />
        </span>
      </NavLink>
    </section>
  );
};

export default YourDepartment;
