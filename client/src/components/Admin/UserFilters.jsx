import React from "react";
import {
  Badge, Button, Chip, Collapse, InputAdornment, MenuItem, TextField,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import { SORTS } from "../../Hooks/useUserFilters";

const FIELDS = [
  { key: "role", label: "Role" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "authType", label: "Sign-in" },
];

const labelFor = (key, value, options) => {
  if (key === "department") {
    return options.department.find((o) => o.value === value)?.label || value;
  }
  return value;
};

const UserFilters = ({ state, resultLabel = "users", className = "" }) => {
  const {
    query, setQuery, filters, setFilter, sort, setSort,
    reset, options, result, activeCount, isFiltered, total,
  } = state;
  const [open, setOpen] = React.useState(false);

  const usable = FIELDS.filter(({ key }) => (options[key] || []).length > 1);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <TextField
          fullWidth
          size="small"
          placeholder="Search name, email, department or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <CloseIcon fontSize="small" />
                </button>
              </InputAdornment>
            ) : null,
          }}
        />
        {usable.length > 0 && (
          <Badge badgeContent={activeCount} color="primary" overlap="rectangular">
            <Button
              size="small"
              variant={open ? "contained" : "outlined"}
              disableElevation
              startIcon={<TuneIcon />}
              onClick={() => setOpen((v) => !v)}
              sx={{ borderRadius: 2, textTransform: "none", whiteSpace: "nowrap" }}
            >
              Filters
            </Button>
          </Badge>
        )}
      </div>

      <Collapse in={open}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
          {usable.map(({ key, label }) => (
            <TextField
              key={key}
              select
              size="small"
              label={label}
              value={filters[key]}
              onChange={(e) => setFilter(key, e.target.value)}
            >
              <MenuItem value="">
                <em>Any</em>
              </MenuItem>
              {(options[key] || []).map((opt) => {
                const value = typeof opt === "string" ? opt : opt.value;
                const text = typeof opt === "string" ? opt : opt.label;
                return (
                  <MenuItem key={value} value={value} sx={{ textTransform: "capitalize" }}>
                    {text}
                  </MenuItem>
                );
              })}
            </TextField>
          ))}
          <TextField
            select
            size="small"
            label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <MenuItem key={key} value={key}>{s.label}</MenuItem>
            ))}
          </TextField>
        </div>
      </Collapse>

      <div className="flex items-center gap-2 flex-wrap mt-2.5">
        <span className="text-xs uppercase tracking-wider text-gray-500">
          {isFiltered
            ? `${result.length} of ${total} ${resultLabel}`
            : `${total} ${resultLabel}`}
        </span>

        {Object.entries(filters).map(([key, value]) =>
          value ? (
            <Chip
              key={key}
              size="small"
              label={labelFor(key, value, options)}
              onDelete={() => setFilter(key, "")}
              sx={{ height: 22, fontSize: 11, textTransform: "capitalize" }}
            />
          ) : null
        )}

        {isFiltered && (
          <Button size="small" onClick={reset} sx={{ fontSize: 11, textTransform: "none" }}>
            clear all
          </Button>
        )}
      </div>
    </div>
  );
};

export default UserFilters;
