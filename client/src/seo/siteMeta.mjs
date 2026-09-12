import { DEPARTMENTS } from "./departments.mjs";

export const SITE = {
  url: "https://campuslib.web.app",
  name: "Campus Classroom",
  shortName: "Campus Classroom",
  locale: "en_US",
  twitter: "",
  themeColor: "#0f172a",
  image: "/assets/images/og-cover.png",
  imageWidth: 1200,
  imageHeight: 630,
  tagline: "Books, question papers and syllabus for every department",
  description:
    "Free books, question papers and syllabus for every BSMRSTU department. Uploaded and checked by students and teachers, with classrooms for coursework.",
};

export const PUBLIC_ROUTES = [
  {
    path: "/",
    title: "Campus Classroom — Books, Question Papers & Syllabus for BSMRSTU",
    description: SITE.description,
    priority: "1.0",
    changefreq: "daily",
  },
  {
    path: "/search",
    title: "Search books, question papers and syllabus | Campus Classroom",
    description:
      "Search the full Campus Classroom library of books, question papers and syllabus across all 33 BSMRSTU departments.",
    priority: "0.7",
    changefreq: "weekly",
  },
  {
    path: "/request",
    title: "Share a book, question paper or syllabus | Campus Classroom",
    description:
      "Upload a book, question paper or syllabus to Campus Classroom and share it with students in your department.",
    priority: "0.6",
    changefreq: "monthly",
  },
  {
    path: "/login",
    title: "Log in | Campus Classroom",
    description: "Log in to Campus Classroom to upload material, join classrooms and message other members.",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/signup",
    title: "Create an account | Campus Classroom",
    description: "Create a free Campus Classroom account to upload material, join classrooms and message other members.",
    priority: "0.4",
    changefreq: "yearly",
  },
  {
    path: "/forgot-password",
    title: "Reset your password | Campus Classroom",
    description: "Reset the password for your Campus Classroom account.",
    priority: "0.2",
    changefreq: "yearly",
    noindex: true,
  },
];

export const departmentRoutes = () =>
  DEPARTMENTS.map(({ slug, name }) => ({
    path: `/department/${slug}`,
    title: `${name} — Books, Question Papers & Syllabus | Campus Classroom`,
    description: `Download ${name} books, question papers and syllabus for every semester at BSMRSTU. Free, shared by students and teachers.`,
    priority: "0.8",
    changefreq: "weekly",
    department: name,
  }));

export const PRIVATE_PATHS = [
  "/messages",
  "/history",
  "/settings",
  "/manage",
  "/pending",
  "/mycontent",
  "/makeadmin",
  "/roles",
  "/edit",
  "/complete-profile",
  "/classroom",
  "/support",
  "/test",
];

export const allRoutes = () => [...PUBLIC_ROUTES, ...departmentRoutes()];

export const metaForPath = (pathname) => {
  const clean = (pathname || "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return allRoutes().find((r) => r.path === clean) || null;
};

export const absolute = (path) =>
  `${SITE.url}${path === "/" ? "" : path}`.replace(/\/+$/, "") || SITE.url;
