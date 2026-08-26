import { styled } from "@mui/material/styles";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import MuiAccordion from "@mui/material/Accordion";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import { Alert, Chip, CircularProgress, Tooltip } from "@mui/material";
import { useMemo } from "react";
import IconButton from "@mui/material/IconButton";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import useUtility from "../Hooks/useUtility";
import { useNavigate } from "react-router-dom";

// The eight semesters, in order, with the label shown to a reader. Replaces
// nine separate useState hooks that each held one filtered slice.
const SEMESTERS = [
  ["1.1", "1st year 1st semester"],
  ["1.2", "1st year 2nd semester"],
  ["2.1", "2nd year 1st semester"],
  ["2.2", "2nd year 2nd semester"],
  ["3.1", "3rd year 1st semester"],
  ["3.2", "3rd year 2nd semester"],
  ["4.1", "4th year 1st semester"],
  ["4.2", "4th year 2nd semester"],
];

const Accordion = styled((props) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&:before": {
    display: "none",
  },
}));

const AccordionSummary = styled((props) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, .05)"
      : "rgba(0, 0, 0, .03)",
  flexDirection: "row-reverse",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(90deg)",
  },
  "& .MuiAccordionSummary-content": {
    marginLeft: theme.spacing(2),
    alignItems: "center",
    justifyContent: "space-between",
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingTop: theme.spacing(1),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
}));

// a link stored as "drive.google.com/..." with no scheme would otherwise
// resolve as a path relative to the current page
const href = (link) =>
  !link ? "#" : /^https?:\/\//.test(link) ? link : `http://${link}`;

export default function Accordionlist({ title, contents }) {
  const history = useNavigate();
  const { dataLoading } = useUtility();

  const approved = useMemo(
    () => (contents || []).filter((item) => item?.status),
    [contents]
  );

  // group once, derived -- no state, no effects
  const groups = useMemo(() => {
    const named = SEMESTERS.map(([key, label]) => ({
      key,
      label,
      items: approved.filter((d) => d?.semester?.includes(key)),
    }));
    const ungrouped = approved.filter((d) => !d?.semester?.length);
    return [
      ...named,
      { key: "other", label: "Not tied to a semester", items: ungrouped },
    ];
  }, [approved]);

  // only the groups that actually have something -- previously all nine
  // rendered, so a department with books in one semester showed eight
  // disabled rows reading "(0)"
  const filled = groups.filter((g) => g.items.length);

  const handleViewRoute = (item) => {
    history(`/content/${item._id}`, { state: item });
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center py-10">
        <CircularProgress color="inherit" />
      </div>
    );
  }

  // used to return null, so an empty tab rendered a blank panel with no
  // explanation of why
  if (!approved.length) {
    return (
      <div className="py-6">
        <Alert severity="info">
          No {title.toLowerCase()} has been added for this department yet.
        </Alert>
      </div>
    );
  }

  if (title === "Books") {
    return (
      <div className="flex flex-col">
        {filled.map((group, index) => (
          <Accordion
            key={group.key}
            // open the first group that has content, so a reader sees
            // something without an extra click
            defaultExpanded={index === 0}
          >
            <AccordionSummary
              aria-controls={`${group.key}-content`}
              id={`${group.key}-header`}
            >
              <Typography sx={{ fontWeight: 600 }}>{group.label}</Typography>
              <Chip
                size="small"
                label={group.items.length}
                sx={{ height: 20, fontSize: 11, ml: 1 }}
              />
            </AccordionSummary>
            <AccordionDetails>
              <InnerList showData={group.items} handleViewRoute={handleViewRoute} />
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    );
  }

  // questions and syllabus: a flat list, but styled like the books list
  return (
    <div className="bg-white">
      <InnerList showData={approved} handleViewRoute={handleViewRoute} />
    </div>
  );
}

const InnerList = ({ showData, handleViewRoute }) => {
  return (
    <ol className="flex flex-col divide-y divide-gray-100">
      {showData?.map((item, index) => (
        <li
          // _id, not the array index -- an index key misassociates rows as soon
          // as the list is filtered or reordered
          key={item?._id || index}
          className="flex flex-row items-center justify-between gap-3 px-1 py-2"
        >
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="font-rubik_doodle font-bold text-gray-400 shrink-0">
              {index + 1}.
            </span>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => handleViewRoute(item)}
                className="text-left hover:underline"
              >
                <strong>
                  {item?.book_name}
                  {item?.edition ? ` ${item.edition}E` : ""}
                </strong>
                {item?.author && (
                  <span className="text-gray-600"> — {item.author}</span>
                )}
              </button>
              {item?.course_code && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={item.course_code.toUpperCase()}
                  sx={{ height: 18, fontSize: 10, ml: 1 }}
                />
              )}
            </div>
          </div>
          {/* Two actions that used to be an unlabelled raw link plus an
              unlabelled icon, with no way to tell them apart. */}
          <div className="flex items-center shrink-0">
            <Tooltip title="Read here" arrow>
              <IconButton
                aria-label={`Read ${item?.book_name} in the viewer`}
                size="small"
                onClick={() => handleViewRoute(item)}
              >
                <ImportContactsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open the original link" arrow>
              <IconButton
                aria-label={`Open the original link for ${item?.book_name}`}
                size="small"
                component="a"
                href={href(item?.download_link)}
                target="_blank"
                rel="noreferrer"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </li>
      ))}
    </ol>
  );
};
