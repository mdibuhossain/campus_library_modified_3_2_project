import { useMemo, useState } from "react";
import { tagTitle } from "../utility/tagTitle";

const EMPTY = { role: "", department: "", designation: "", authType: "" };

export const SORTS = {
  name: { label: "Name (A-Z)", cmp: (a, b) => nameOf(a).localeCompare(nameOf(b)) },
  nameDesc: { label: "Name (Z-A)", cmp: (a, b) => nameOf(b).localeCompare(nameOf(a)) },
  role: {
    label: "Role",
    cmp: (a, b) =>
      String(a.role || "").localeCompare(String(b.role || "")) ||
      nameOf(a).localeCompare(nameOf(b)),
  },
  department: {
    label: "Department",
    cmp: (a, b) =>
      String(a.department || "").localeCompare(String(b.department || "")) ||
      nameOf(a).localeCompare(nameOf(b)),
  },

  newest: { label: "Newest first", cmp: (a, b) => String(b._id).localeCompare(String(a._id)) },
  oldest: { label: "Oldest first", cmp: (a, b) => String(a._id).localeCompare(String(b._id)) },
};

const nameOf = (u) => String(u?.displayName || u?.email || "").toLowerCase();

const uniq = (users, key) =>
  [...new Set(users.map((u) => String(u?.[key] || "").trim().toLowerCase()).filter(Boolean))]
    .sort();

const useUserFilters = (users = []) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY);
  const [sort, setSort] = useState("name");

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setQuery("");
    setFilters(EMPTY);
    setSort("name");
  };

  const options = useMemo(
    () => ({
      role: uniq(users, "role"),
      department: uniq(users, "department").map((d) => ({
        value: d,
        label: tagTitle[d] || d.toUpperCase(),
      })),
      designation: uniq(users, "designation"),
      authType: uniq(users, "authType"),
    }),
    [users]
  );

  const result = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = users.filter((u) => {
      for (const key of Object.keys(EMPTY)) {
        const want = filters[key];
        if (want && String(u?.[key] || "").toLowerCase() !== want) return false;
      }
      if (!needle) return true;

      const haystack = [u.displayName, u.email, u.department, u.role, u.designation]
        .map((f) => String(f || "").toLowerCase());
      return needle
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => haystack.some((f) => f.includes(term)));
    });
    return [...matches].sort(SORTS[sort]?.cmp || SORTS.name.cmp);
  }, [users, query, filters, sort]);

  const activeCount =
    Object.values(filters).filter(Boolean).length + (query.trim() ? 1 : 0);

  return {
    query, setQuery,
    filters, setFilter,
    sort, setSort,
    reset,
    options,
    result,
    activeCount,
    isFiltered: activeCount > 0,
    total: users.length,
  };
};

export default useUserFilters;
