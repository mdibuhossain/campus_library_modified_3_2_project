import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Hooks/useAuth';
import CircularLoading from '../components/Circular_Loading/CircularLoading';

// Gate a route on a single permission key, e.g.
//   <AdminRoute permission="content.approve">...</AdminRoute>
// With no `permission` prop it falls back to the old "is admin" behaviour, so
// existing usages keep working.
const AdminRoute = ({ children, permission }) => {
    const { admin, can, user, isLoading, userStatusLoading } = useAuth()
    const location = useLocation();
    // userStatusLoading covers the permissions query too -- without waiting on
    // it, a permitted user gets bounced on first render
    if (isLoading || userStatusLoading)
        return <CircularLoading />
    const signedIn = !!(user?.email || user?.displayName);
    const allowed = permission ? can(permission) : admin;
    if (!(signedIn && allowed))
        return <Navigate to="/" state={{ from: location }} />
    return children
};

export default AdminRoute;
