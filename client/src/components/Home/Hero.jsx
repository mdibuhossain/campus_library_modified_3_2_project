import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button, Skeleton, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useAuth } from "../../Hooks/useAuth";

/* The top of the home page.
 *
 * Carries the CONTENT search, not the department filter. Those were previously
 * two boxes about 250px apart with nothing explaining the difference -- and on a
 * phone the navbar's content search is folded into the hamburger, so the only
 * visible box searched *departments*. Someone looking for a book typed into the
 * wrong one and got no useful result. This is now the prominent search on every
 * screen size, and the department box below is labelled as a filter.
 *
 * The counts are real, from data already in memory (see useLibraryStats), which
 * is worth more than an adjective: "63 books" tells a visitor whether the site
 * is worth their time in a way that "a huge collection" does not.
 */
const Hero = ({ totals, loading }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = React.useState("");

  const submit = (e) => {
    e.preventDefault();
    const value = q.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  };

  const facts = [
    totals.books ? `${totals.books} book${totals.books === 1 ? "" : "s"}` : null,
    totals.questions
      ? `${totals.questions} question paper${totals.questions === 1 ? "" : "s"}`
      : null,
    totals.syllabus ? `${totals.syllabus} syllabus` : null,
    `${totals.departments} departments`,
  ].filter(Boolean);

  return (
    <header className="bg-gradient-to-b from-slate-50 to-white border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-9 text-center">
        <Typography
          variant="h3"
          sx={{ fontWeight: 800, fontSize: { xs: "1.85rem", sm: "2.4rem" }, lineHeight: 1.15 }}
        >
          Everything for your semester, in one place
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "text.secondary", mt: 1.5, maxWidth: "36rem", mx: "auto" }}
        >
          Books, question papers and syllabus for every department — uploaded and
          checked by students and teachers.
        </Typography>

        <form onSubmit={submit} className="relative mt-6">
          <SearchIcon
            sx={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "action.active" }}
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search books, questions, syllabus…"
            aria-label="Search the library"
            className="w-full rounded-full border border-gray-300 bg-white pl-12 pr-28 py-3.5 text-base outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-gray-800 transition"
          >
            Search
          </button>
        </form>

        {loading ? (
          <Skeleton variant="text" width={260} sx={{ mx: "auto", mt: 2 }} />
        ) : (
          <p className="text-xs sm:text-sm text-gray-500 mt-3">{facts.join(" · ")}</p>
        )}

        {/* A visitor is told how to contribute; a member gets the shortcut.
            Either way the page has one clear secondary action. */}
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <Button
            component={NavLink}
            to="/request"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            sx={{ borderRadius: 7, textTransform: "none" }}
          >
            Share something you have
          </Button>
          {!user?.email && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              or{" "}
              <NavLink to="/signup" className="text-sky-700 font-medium underline">
                create an account
              </NavLink>
            </Typography>
          )}
        </div>
      </div>
    </header>
  );
};

export default Hero;
