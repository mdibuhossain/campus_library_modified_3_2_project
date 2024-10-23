import { CircularProgress, TextField, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";
import useUtility from "../../Hooks/useUtility";
import { DepartmentCard, DepartmentStyle } from "./Department.style";

const Departments = () => {
  const { getDepartments, deptLoading } = useUtility();
  return (
    <>
      <div className="w-full m-auto mb-5">
        <div className="w-[90vw] mx-auto flex justify-center py-5">
          <TextField
            fullWidth
            placeholder="Search for departments"
            variant="outlined"
            InputProps={{
              style: {
                borderRadius: "100px",
                padding: "0rem 0.5rem",
                boxShadow: "0px 0px 10px 0px rgba(184, 185, 190, 0.5)",
                transition: "0.2s ease-in-out",
                fontWeight: 600,
                maxWidth: "32rem",
                margin: "auto",
              },
            }}
            InputLabelProps={{
              shrink: false,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&.Mui-focused": {
                  boxShadow:
                    "0px 0px 15px 0px rgba(112, 122, 244, 0.5) !important",
                },
                "&.Mui-focused": {
                  maxWidth: "100% !important",
                },
              },
            }}
          />
        </div>
        {/* <Typography
          variant="h4"
          sx={{ fontWeight: 600, textAlign: "center", py: 5, color: "#707af4" }}
        >
          Departments
        </Typography> */}
        <div className="flex flex-wrap justify-center">
          {deptLoading ? (
            <CircularProgress color="info" />
          ) : (
            getDepartments?.map(
              (item) =>
                item && (
                  <DepartmentCard key={item}>
                    <NavLink to={`/department/${item}`}>
                      <DepartmentStyle tag={item} />
                    </NavLink>
                  </DepartmentCard>
                )
            )
          )}
        </div>
      </div>
    </>
  );
};

export default Departments;
