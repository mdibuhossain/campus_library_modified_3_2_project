import { Typography } from '@mui/material';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Hooks/useAuth';

const AdminRoute = ({ children }) => {
    const { admin, user, isLoading, userStatusLoading } = useAuth()
    const location = useLocation();
    if (isLoading || userStatusLoading)
        return <Typography variant='h4'>Loading...</Typography>
    if (!((user?.email || user?.displayName) && admin))
        return <Navigate to="/" state={{ from: location }} />
    if ((user?.email || user?.displayName) && admin)
        return children
};

export default AdminRoute;