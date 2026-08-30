import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ApolloProvider } from "@apollo/client";
import "./App.css";
import { AuthProvider } from "./context/AuthProvider";
import CircularLoading from "./components/Circular_Loading/CircularLoading";
import NotFound from "./components/NotFound/NotFound";
import { UtilityProvider } from "./context/UtilityProvider";
import { client } from "./apollo/client";
import useRoutePrefetch from "./Hooks/useRoutePrefetch";
import {
  Home, Department, Search, Request, Login, Register, ForgotPassword,
  CompleteProfile, MakeAdmin, RoleManagement, Messages, EditContent, ChangeDP,
  Classroom, ClassroomDetails, ContentViewer, ContentManagement, Test,
  RequireAuth, AdminRoute,
} from "./routes/lazyRoutes";

const Navigation = lazy(() => import("./components/Navigationbar"));

const theme = createTheme({
  typography: {
    fontFamily: [
      "sans-serif",
      "'Encode Sans SC'",
      "'Secular One'",
      "'Poppins'",
    ].join(","),
  },
});

/* Split out so the prefetch hook runs inside the router. It does not read router
 * context, but keeping it here means it mounts once for the app rather than
 * re-registering its listeners whenever a provider above it re-renders. */
const AppRoutes = () => {
  useRoutePrefetch();

  return (
    <Routes>
      <Route path="*" element={<NotFound />} />
      <Route exact path="" element={<Home />} />
      <Route exact path="/" element={<Home />} />
      {/* <Route exact path="/reader" element={<Reader />} /> */}
      <Route exact path="search" element={<Search />} />
      <Route exact path="request" element={<Request />} />
      <Route exact path="test" element={<Test />} />
      <Route exact path="classroom">
        <Route index element={
          <RequireAuth>
            <Classroom />
          </RequireAuth>
        } />
        <Route path=":rid" element={
          <RequireAuth>
            <ClassroomDetails />
          </RequireAuth>
        } />
      </Route>
      <Route
        exact
        path="/settings"
        element={
          <RequireAuth>
            <ChangeDP />
          </RequireAuth>
        }
      />
      <Route
        exact
        path="/pending"
        element={
          <RequireAuth>
            <ContentManagement mode="pending" />
          </RequireAuth>
        }
      />
      <Route
        exact
        path="/mycontent"
        element={
          <RequireAuth>
            <ContentManagement mode="mine" />
          </RequireAuth>
        }
      />
      <Route
        exact
        path="/manage"
        element={
          <AdminRoute permission="content.approve">
            <ContentManagement mode="manage" />
          </AdminRoute>
        }
      />
      <Route
        exact
        path="/edit/:id"
        element={
          <RequireAuth>
            <EditContent />
          </RequireAuth>
        }
      />
      <Route
        exact
        path="/makeadmin"
        element={
          <AdminRoute permission="user.role.assign">
            <MakeAdmin />
          </AdminRoute>
        }
      />
      <Route
        exact
        path="/roles"
        element={
          <AdminRoute permission="role.manage">
            <RoleManagement />
          </AdminRoute>
        }
      />
      {/* both paths render the same page: the list, plus the open
          thread when a conversation id is present */}
      <Route
        exact
        path="/messages"
        element={
          <RequireAuth>
            <Messages />
          </RequireAuth>
        }
      />
      <Route
        exact
        path="/messages/:cid"
        element={
          <RequireAuth>
            <Messages />
          </RequireAuth>
        }
      />
      <Route exact path="/login" element={<Login />} />
      <Route exact path="/signup" element={<Register />} />
      <Route exact path="/forgot-password" element={<ForgotPassword />} />
      <Route
        exact
        path="/complete-profile"
        element={
          <RequireAuth>
            <CompleteProfile />
          </RequireAuth>
        }
      />
      <Route path="/content/:id" element={<ContentViewer />} />
      <Route exact path="/department/:dept" element={<Department />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ApolloProvider client={client}>
        <BrowserRouter>
          <Suspense fallback={<CircularLoading />}>
            <UtilityProvider>
              <AuthProvider>
                <Navigation />
                <AppRoutes />
              </AuthProvider>
            </UtilityProvider>
          </Suspense>
        </BrowserRouter>
      </ApolloProvider>
    </ThemeProvider>
  );
}

export default App;
