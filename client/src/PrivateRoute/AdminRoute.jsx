import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Hooks/useAuth';
import CircularLoading from '../components/Circular_Loading/CircularLoading';

// Gate a route on a single permission key, e.g.
//   <AdminRoute permission="content.approve">...</AdminRoute>
// or on the protected root role, which no permission can stand in for:
//   <AdminRoute superadmin>...</AdminRoute>
// With neither prop it falls back to the old "is admin" behaviour, so existing
// usages keep working.
const AdminRoute = ({ children, permission, superadmin }) => {
    const { admin, can, user, isLoading, userStatusLoading, isSuperadmin } = useAuth()
    const location = useLocation();
    // userStatusLoading covers the permissions query too -- without waiting on
    // it, a permitted user gets bounced on first render
    if (isLoading || userStatusLoading)
        return <CircularLoading />
    const signedIn = !!(user?.email || user?.displayName);
    /* `superadmin` is checked instead of, not alongside, a permission: the
     * server gates these routes on the protected role, and mirroring that here
     * keeps the client's idea of who may enter identical to the server's. */
    const allowed = superadmin ? isSuperadmin : permission ? can(permission) : admin;
    if (!(signedIn && allowed))
        return <Navigate to="/" state={{ from: location }} />
    return children
};

export default AdminRoute;
