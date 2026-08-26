import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useBooks } from "../Hooks/useBooks";
import LinearLoadin from "./Linear_Loading/LinearLoadin";
import { Badge, Tab, Tabs } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
const Accordionlist = lazy(() => import("./Accordionlist"));
import "swiper/css";

/* Previously this used effect="creative". That effect stacks all three slides on
 * top of each other and only translates the previous one 20% aside (its intended
 * "peek"), so whenever the active panel was shorter than the one before it -- an
 * empty Questions tab is a single alert, Books can be thousands of pixels -- the
 * taller panel showed through underneath. Importing the effect's stylesheet
 * (which adds overflow:hidden per slide) was not enough, because autoHeight
 * shrinks the wrapper while the stacked sibling keeps its own full height.
 *
 * The default slide effect lays the slides out side by side instead, so a
 * taller neighbour is offscreen horizontally and clipped by .swiper's
 * overflow:hidden. This is the pairing autoHeight is designed for. The swipe
 * gesture is unchanged; only the 3D transition is gone, replaced by a CSS fade
 * on the panel so switching tabs still has motion.
 */
const BookShowcase = ({ department }) => {
  const swiperRef = useRef(null);
  const containerRef = useRef(null);
  const [syllabus, setSyllabus] = useState([]);
  const [academic, setAcademic] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [tabIndex, setTabIndex] = useState(1);

  useBooks(setAcademic, department, "books");
  useBooks(setQuestions, department, "questions");
  useBooks(setSyllabus, department, "syllabus");

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
    swiperRef.current?.slideTo(newValue);
  };
  const handleChangeIndex = (sw) => {
    swiperRef.current = sw;
    setTabIndex(sw.activeIndex);
  };

  const syncHeight = useCallback(() => {
    swiperRef.current?.updateAutoHeight(0);
  }, []);

  // autoHeight is measured when the slide changes, but this panel's height also
  // changes when the lazy Accordionlist finally mounts and whenever a reader
  // expands an accordion. Without re-measuring, the wrapper keeps a stale height
  // and either clips the list or leaves dead space under it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncHeight);
    el.querySelectorAll(".swiper-slide").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [syncHeight]);

  useEffect(() => { syncHeight(); }, [syllabus, academic, questions, tabIndex, syncHeight]);

  // only approved rows are publicly visible, so count those for the badges --
  // otherwise a tab could promise more than the panel shows
  const visible = (list) => (list || []).filter((i) => i?.status).length;

  const TABS = [
    { label: "syllabus", count: visible(syllabus) },
    { label: "books", count: visible(academic) },
    { label: "questions", count: visible(questions) },
  ];

  return (
    <Suspense fallback={<LinearLoadin />}>
      <div className="w-full md:w-4/5 lg:w-3/5 mx-auto my-8 px-2 sm:px-6 md:px-8 pt-4 pb-8 bg-white md:shadow-2xl md:rounded-lg">
        <Tabs
          value={tabIndex}
          onChange={handleChange}
          variant="fullWidth"
          centered
        >
          {TABS.map((t) => (
            <Tab
              key={t.label}
              sx={{ fontWeight: 600 }}
              label={
                <Badge
                  badgeContent={t.count}
                  color={t.count ? "primary" : "default"}
                  showZero
                  sx={{ "& .MuiBadge-badge": { right: -14, top: 2 } }}
                >
                  {t.label}
                </Badge>
              }
            />
          ))}
        </Tabs>
        <div ref={containerRef} className="pt-4">
          <Swiper
            autoHeight={true}
            spaceBetween={32}
            onInit={handleChangeIndex}
            onSlideChange={handleChangeIndex}
            onTransitionEnd={syncHeight}
          >
            <SwiperSlide>
              <Panel active={tabIndex === 0}>
                <Accordionlist title="Syllabus" contents={syllabus} />
              </Panel>
            </SwiperSlide>
            <SwiperSlide>
              <Panel active={tabIndex === 1}>
                <Accordionlist title="Books" contents={academic} />
              </Panel>
            </SwiperSlide>
            <SwiperSlide>
              <Panel active={tabIndex === 2}>
                <Accordionlist title="Questions" contents={questions} />
              </Panel>
            </SwiperSlide>
          </Swiper>
        </div>
      </div>
    </Suspense>
  );
};

// Keeps a little motion now that the 3D effect is gone, and gives short panels a
// floor so an empty tab does not collapse to a sliver next to a tall one.
const Panel = ({ active, children }) => (
  <div
    className="min-h-[8rem] transition-opacity duration-300 motion-reduce:transition-none"
    style={{ opacity: active ? 1 : 0.35 }}
  >
    {children}
  </div>
);

export default BookShowcase;
