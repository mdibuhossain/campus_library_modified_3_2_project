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
import { tagTitle } from "../../utility/tagTitle";
import { useState } from "react";

const Departments = () => {
  const {
    getDepartments,
    setGetDepartments,
    searchedValue,
    setSearchedValue,
    deptLoading,
  } = useUtility();
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
  const shown = getDepartments?.filter(Boolean)?.length || 0;
  const isFiltered = shown !== total;

  return (
    <div className="flex-1">
      {/* A visitor used to land on a bare search box with no explanation of what
          the site is. Give the page a title and one line of orientation. */}
      <header className="text-center px-4 pt-8 pb-2">
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Browse by department
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "text.secondary", mt: 1, maxWidth: "42rem", mx: "auto" }}
        >
          Books, question papers and syllabus, organised by department. Pick one
          below or search for it by name.
        </Typography>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 py-5">
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
              placeholder={`Search for departments...`}
              variant="outlined"
              InputLabelProps={{
                shrink: false,
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton onClick={handleChange} aria-label="search">
                      <SearchIcon />
                    </IconButton>
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
        {!deptLoading && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {isFiltered
                ? `showing ${shown} of ${total} departments`
                : `${total} departments`}
            </Typography>
            {isFiltered && (
              <Button size="small" onClick={handleResetSearch} sx={{ fontSize: 11 }}>
                show all
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
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
            {getDepartments?.map(
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
      </div>
    </div>
  );
};

export default Departments;
