import React from 'react';
import { NavLink } from 'react-router-dom';
import PageLayout from '../../Layout/PageLayout';
import NotFoundStyle from './NotFoundStyle.module.css';

const NotFound = () => {
    return (
        <PageLayout className="flex flex-col">
            <div id="notfound" className="flex-1 flex items-center justify-center overflow-hidden px-4">
                <div className="text-center max-w-md">
                    <h1 className="text-8xl sm:text-9xl font-extrabold tracking-tight text-gray-900 relative inline-block">
                        <span className="relative z-10">404</span>
                        <span className="absolute inset-0 blur-sm text-gray-300 -z-0" aria-hidden="true">404</span>
                    </h1>

                    <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-gray-800">
                        Oops! This Page Could Not Be Found
                    </h2>

                    <p className="mt-3 text-sm sm:text-base text-gray-500 leading-relaxed">
                        Sorry, but the page you are looking for does not exist, has been removed,
                        had its name changed, or is temporarily unavailable.
                    </p>

                    <NavLink
                        to="/"
                        className="mt-8 inline-block rounded-full bg-gray-900 px-8 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                    >
                        Go To Homepage
                    </NavLink>
                </div>
            </div>
        </PageLayout>
    );
};

export default NotFound;