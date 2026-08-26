import React from "react";
import { NavLink, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Button } from "@mui/material";
import BookShowcase from "../components/BookShowcase";
import useUtility from "../Hooks/useUtility";
import PageLayout from "../Layout/PageLayout";
import Banner from "./Home/Home.style";
import LinearLoadin from "../components/Linear_Loading/LinearLoadin";
import NotFound from "../components/NotFound/NotFound";
import { tagTitle } from "../utility/tagTitle";
import { Helmet } from "react-helmet";

const Department = () => {
  const { dept } = useParams();
  const { dataLoading } = useUtility();

  if (dataLoading) return <LinearLoadin />;

  const name = tagTitle[dept];
  if (!name) return <NotFound />;

  return (
    <>
      <Helmet>
        {/* the site is branded "Campus Classroom" everywhere else */}
        <title>{name} | Campus Classroom</title>
        <meta
          name="description"
          content={`Get all the books, questions, and syllabus of ${name} department`}
        />
        <meta
          name="keywords"
          content={`${name}, books, questions, syllabus`}
        />
      </Helmet>
      <PageLayout>
        <Banner title={dept} src={dept} />
        {/* there was no way back to the department list except the browser
            button or the logo */}
        <div className="w-full md:w-4/5 lg:w-3/5 mx-auto px-2 sm:px-6 md:px-8 pt-4">
          <NavLink to="/">
            <Button size="small" startIcon={<ArrowBackIcon />} sx={{ textTransform: "none" }}>
              All departments
            </Button>
          </NavLink>
        </div>
        <BookShowcase department={dept} />
      </PageLayout>
    </>
  );
};

export default Department;
