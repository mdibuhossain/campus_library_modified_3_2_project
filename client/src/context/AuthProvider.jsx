import React, { createContext } from 'react';
import useData from '../Hooks/useData';
import useFirebase from '../Hooks/useFirebase';
import useNotifications from '../Hooks/useNotifications';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const firebase = useFirebase();
    // notifications need the caller's ID token, so they hang off useFirebase
    const notifications = useNotifications(firebase.token);
    const AllContext = { ...firebase, ...useData(), ...notifications };
    return (
        <AuthContext.Provider value={AllContext}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthProvider, AuthContext };