import { lazy, Suspense, useState } from "react";
import { useBooks } from "../Hooks/useBooks";
import LinearLoadin from "./Linear_Loading/LinearLoadin";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import SwipeableViews from "react-swipeable-views";
const Accordionlist = lazy(() => import("./Accordionlist"));


const BookShowcase = ({ department }) => {
    const [syllabus, setSyllabus] = useState([]);
    const [academic, setAcademic] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [value, setValue] = useState(1);

    useBooks(setAcademic, department, "books");
    useBooks(setQuestions, department, "questions");
    useBooks(setSyllabus, department, "syllabus");


    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    const handleChangeIndex = (index) => {
        setValue(index);
    };

    return (
        <Suspense fallback={<LinearLoadin />}>
            <div className='md:w-3/5 w-full m-auto my-10 md:shadow-2xl md:rounded-lg xs:px-10 px-2 sm:px-10 pt-5 pb-8 bg-white'>
                <Tabs value={value} onChange={handleChange} variant="fullWidth" centered>
                    <Tab label={`syllabus (${syllabus.length})`} sx={{ fontWeight: 600 }} />
                    <Tab label={`books (${academic.length})`} sx={{ fontWeight: 600 }} />
                    <Tab label={`questions (${questions.length})`} sx={{ fontWeight: 600 }} />
                </Tabs>
                <Box sx={{ textAlign: 'center', color: 'red', mt: 4, letterSpacing: 0.3 }}>
                    <p>Working on 3rd year project</p>
                    <p>So, data may not visible on this live site</p>
                    <span>Original site:</span> <a className="text-indigo-600 font-semibold" href="https://campuslib.web.app/" target="_black">campuslib.web.app</a>
                </Box>
                <div className="pt-5">
                    <SwipeableViews
                        index={value}
                        onChangeIndex={handleChangeIndex}
                    >
                        <Accordionlist title="Syllabus" contents={syllabus} />
                        <Accordionlist title="Books" contents={academic} />
                        <Accordionlist title="Questions" contents={questions} />
                    </SwipeableViews>
                </div>
            </div>
        </Suspense>
    );
};

export default BookShowcase;