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
import useDocumentMeta from "../Hooks/useDocumentMeta";

const Department = () => {
  const { dept } = useParams();
  const { dataLoading } = useUtility();
  const name = tagTitle[dept];

  // hooks must run before any early return
  useDocumentMeta({
    title: name ? `${name} | Campus Classroom` : undefined,
    description: name
      ? `Get all the books, questions, and syllabus of ${name} department`
      : undefined,
    keywords: name ? `${name}, books, questions, syllabus` : undefined,
  });

  if (dataLoading) return <LinearLoadin />;
  if (!name) return <NotFound />;

  return (
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
  );
};

export default Department;
