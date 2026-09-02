import React from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton, Typography } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import DescriptionIcon from "@mui/icons-material/Description";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { tagTitle } from "../../utility/tagTitle";

/* What arrived lately.
 *
 * The reason to put this on the home page: a returning visitor's real question
 * is "is there anything new?", and previously the only way to answer it was to
 * open each department and read the accordions. It is also the cheapest section
 * here -- the rows are already in memory, sorted by ObjectId.
 *
 * Cards navigate with the item in route state, matching Accordionlist, so the
 * viewer opens without waiting on anything. ContentViewer falls back to finding
 * the row by id, so the link still works if opened cold or shared.
 */
const KIND = {
  book: { label: "Book", icon: MenuBookIcon, color: "#0369a1", bg: "#e0f2fe" },
  question: { label: "Question paper", icon: DescriptionIcon, color: "#9a3412", bg: "#ffedd5" },
  syllabus: { label: "Syllabus", icon: ListAltIcon, color: "#3f6212", bg: "#ecfccb" },
};

const RecentlyAdded = ({ items, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <Skeleton variant="text" width={170} height={28} />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-3">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} variant="rounded" height={116} sx={{ borderRadius: 3 }} />
          ))}
        </div>
      </section>
    );
  }

  // an empty library should not render an empty heading
  if (!items?.length) return null;

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Recently added
        </Typography>
        <span className="text-xs text-gray-400">newest first</span>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const k = KIND[item.kind] || KIND.book;
          const Icon = k.icon;
          return (
            <button
              key={`${item.kind}-${item._id}`}
              type="button"
              onClick={() => navigate(`/content/${item._id}`, { state: item })}
              className="text-left bg-white rounded-2xl border border-gray-200 p-3.5 hover:border-sky-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                style={{ color: k.color, background: k.bg }}
              >
                <Icon sx={{ fontSize: 12 }} /> {k.label}
              </span>
              {/* two lines, so a long title cannot make one card taller than
                  its neighbours and break the row */}
              <p
                className="text-sm font-semibold text-gray-900 mt-2 leading-snug"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={item.book_name}
              >
                {item.book_name}
              </p>
              <p className="text-[11px] text-gray-500 mt-1.5 truncate">
                {tagTitle[String(item.categories || "").toLowerCase()] || item.categories}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default RecentlyAdded;
