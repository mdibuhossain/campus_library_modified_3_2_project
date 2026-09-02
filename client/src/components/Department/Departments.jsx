import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { DepartmentCard, DepartmentStyle } from "./Department.style";
import { NavLink } from "react-router-dom";
import useUtility from "../../Hooks/useUtility";
import useLibraryStats from "../../Hooks/useLibraryStats";
import { tagTitle } from "../../utility/tagTitle";
import { useMemo, useState } from "react";

const Departments = () => {
  /* `searchedValue`/`setSearchedValue` used to be pulled from useUtility, but
   * useData never returned them -- they were always undefined. So the
   * Autocomplete was uncontrolled (value={undefined}), and picking a department
   * threw "setSearchedValue is not a function" on every selection. It is local
   * UI state; only the filtered list (setGetDepartments) needs to be shared. */
  const { getDepartments, setGetDepartments, deptLoading } = useUtility();
  const { busiest } = useLibraryStats();
  const [searchedValue, setSearchedValue] = useState("");
  const [inputValue, setInputValue] = useState("");

  const handleChange = (event, newValue) => {
    if (newValue?.trim() === "" || newValue === null) {
      setGetDepartments(Object.keys(tagTitle));
    }
    // Trigger only when an option is selected from the list
    if (["click", "keydown"].includes(event.type) && newValue) {
      const dept = newValue?.split(" - ")[0]?.toLowerCase();
      const filteredDept = Object.keys(tagTitle).filter(
        (item) => item === dept
      );
      setSearchedValue(newValue);
      setGetDepartments(filteredDept);
    }
  };

  const handleResetSearch = (e) => {
    setInputValue(() => "");
    setSearchedValue(() => "");
    setGetDepartments(() => Object.keys(tagTitle));
  };

  const handleInputValueChange = (e, newValue) => {
    setInputValue(newValue);
  };

  const total = Object.keys(tagTitle).length;
  const present = getDepartments?.filter(Boolean) || [];
  const shown = present.length;
  const isFiltered = shown !== total;

  /* 33 tiles made the home page 6,400px tall on desktop and roughly 7,400px on
   * a phone, where they stack one per row -- the entire page was this grid.
   * Showing a first screenful and ordering it by how much each department
   * actually holds puts something useful above the fold; the rest is one tap
   * away. A filtered result is never collapsed: hiding matches behind "see all"
   * when someone has just searched would be perverse. */
  const COLLAPSED = 8;
  const [expanded, setExpanded] = useState(false);
  const ordered = useMemo(() => {
    if (isFiltered) return present;
    const rank = new Map(busiest.map((dept, i) => [dept, i]));
    return [...present].sort(
      (a, b) => (rank.has(a) ? rank.get(a) : 999) - (rank.has(b) ? rank.get(b) : 999)
    );
  }, [present, isFiltered, busiest]);
  const canCollapse = !isFiltered && ordered.length > COLLAPSED;
  const visible = canCollapse && !expanded ? ordered.slice(0, COLLAPSED) : ordered;

  return (
    <div className="flex-1">
      {/* The page title and the content search now live in the Hero above. What
          is left here is a *filter* over the tiles, labelled as one -- it used
          to say "Search for departments" directly under a box that searched
          books, and the two were routinely confused. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Browse by department
          </Typography>
          {!deptLoading && canCollapse && (
            <Button
              size="small"
              onClick={() => setExpanded((v) => !v)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {expanded ? "show fewer" : `see all ${total}`}
            </Button>
          )}
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-1">
        <Autocomplete
          fullWidth
          disableClearable
          selectOnFocus={true}
          id="free-solo-2-demo"
          options={Object.keys(tagTitle).map(
            (option) => `${option.toUpperCase()} - ${tagTitle[option]}`
          )}
          value={searchedValue}
          inputValue={inputValue}
          onChange={handleChange}
          onInputChange={handleInputValueChange}
          isOptionEqualToValue={(option, value) => {
            // Show all options when input is empty
            if (value === "") return true;
            return option === value;
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              placeholder={`Filter departments by name…`}
              variant="outlined"
              InputLabelProps={{
                shrink: false,
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    {/* decorative: selecting an option is what filters, and this
                        button previously called handleChange with no value,
                        which could only ever be a no-op */}
                    <SearchIcon sx={{ color: "action.active", ml: 1 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleResetSearch} aria-label="reset search">
                      <RestartAltIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                style: { borderRadius: "100px", width: "100%" },
              }}
            />
          )}
        />
        {!deptLoading && isFiltered && (
          <div className="flex items-center gap-2 mt-2">
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              showing {shown} of {total} departments
            </Typography>
            <Button size="small" onClick={handleResetSearch} sx={{ fontSize: 11 }}>
              show all
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 pt-4">
        {deptLoading ? (
          <div className="flex justify-center py-16">
            <CircularProgress color="info" />
          </div>
        ) : shown === 0 ? (
          // previously a search with no match rendered a completely blank page
          <div className="max-w-md mx-auto">
            <Alert
              severity="info"
              action={
                <Button size="small" onClick={handleResetSearch}>
                  reset
                </Button>
              }
            >
              No department matches that search.
            </Alert>
          </div>
        ) : (
          /* a real grid: even gutters at every breakpoint, instead of a
             flex-wrap of cards each carrying its own 25px margin */
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map(
              (item) =>
                item && (
                  <DepartmentCard key={item}>
                    <NavLink
                      to={`/department/${item}`}
                      aria-label={tagTitle[item] || item}
                      className="block"
                    >
                      <DepartmentStyle tag={item} />
                    </NavLink>
                  </DepartmentCard>
                )
            )}
          </div>
        )}

        {!deptLoading && canCollapse && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outlined"
              onClick={() => setExpanded((v) => !v)}
              sx={{ borderRadius: 7, textTransform: "none" }}
            >
              {expanded
                ? "Show fewer departments"
                : `See all ${total} departments`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
