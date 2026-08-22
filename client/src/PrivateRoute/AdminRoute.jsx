import { Typography } from '@mui/material';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Hooks/useAuth';
import CircularLoading from '../components/Circular_Loading/CircularLoading';

const AdminRoute = ({ children }) => {
    const { admin, user, isLoading, userStatusLoading } = useAuth()
    const location = useLocation();
    if (isLoading || userStatusLoading)
        return <CircularLoading />
    if (!((user?.email || user?.displayName) && admin))
        return <Navigate to="/" state={{ from: location }} />
    if ((user?.email || user?.displayName) && admin)
        return children
};

export default AdminRoute;