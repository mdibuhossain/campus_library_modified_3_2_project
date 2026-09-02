import { useMemo } from "react";
import useUtility from "./useUtility";
import { tagTitle } from "../utility/tagTitle";

/**
 * Everything the home page needs to describe the library, derived entirely from
 * data the app has already fetched.
 *
 * `GET_ALL_DATA` pulls every book, question paper and syllabus at mount (26 KB,
 * measured), so counts, per-department totals and a "recently added" list cost
 * zero extra requests -- they are just three passes over arrays already in
 * memory. That is the reason this page can show real numbers instead of vague
 * marketing copy.
 *
 * Only approved rows are counted. A pending upload is invisible to the public
 * everywhere else in the app, and a home page promising 70 books that resolve
 * to 63 visible ones would be a lie in the one place a visitor forms their
 * first impression.
 *
 * Recency comes from the ObjectId. None of these collections has a createdAt,
 * but an ObjectId begins with a 4-byte creation timestamp, so a plain
 * descending string sort on `_id` is a true newest-first ordering.
 */
const useLibraryStats = () => {
  const { books, questions, syllabus, dataLoading } = useUtility();

  return useMemo(() => {
    const approved = (list) => (list || []).filter((item) => item?.status);
    const kinds = [
      ["book", approved(books)],
      ["question", approved(questions)],
      ["syllabus", approved(syllabus)],
    ];

    const byDept = new Map();
    kinds.forEach(([kind, list]) => {
      list.forEach((item) => {
        const dept = String(item?.categories || "").toLowerCase();
        if (!dept) return;
        const row = byDept.get(dept) || { books: 0, questions: 0, syllabus: 0, total: 0 };
        row[kind === "book" ? "books" : kind === "question" ? "questions" : "syllabus"] += 1;
        row.total += 1;
        byDept.set(dept, row);
      });
    });

    const recent = kinds
      .flatMap(([kind, list]) => list.map((item) => ({ ...item, kind })))
      .sort((a, b) => String(b._id).localeCompare(String(a._id)))
      .slice(0, 8);

    /* Departments ordered by how much is actually in them. Leading with empty
     * departments makes the library look emptier than it is, and a visitor who
     * taps one lands on a page with nothing to show. */
    const busiest = Object.keys(tagTitle)
      .filter((dept) => (byDept.get(dept)?.total || 0) > 0)
      .sort((a, b) => (byDept.get(b)?.total || 0) - (byDept.get(a)?.total || 0));

    return {
      dataLoading,
      totals: {
        books: kinds[0][1].length,
        questions: kinds[1][1].length,
        syllabus: kinds[2][1].length,
        departments: Object.keys(tagTitle).length,
        withContent: busiest.length,
      },
      byDept,
      busiest,
      recent,
    };
  }, [books, questions, syllabus, dataLoading]);
};

export default useLibraryStats;
