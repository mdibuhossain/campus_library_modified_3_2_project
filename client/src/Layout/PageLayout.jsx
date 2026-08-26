import React, { Suspense } from 'react';
import { lazy } from 'react';
import LinearLoadin from '../components/Linear_Loading/LinearLoadin';
const FooterBar = lazy(() => import('../components/FooterBar'))

/**
 * Wraps every page.
 *
 * This used to set a fixed `height: calc(100vh - 64px)`, which clipped any page
 * taller than the viewport and forced the footer into a `sticky top-[100vh]`
 * workaround. `minHeight` plus a flex column does the job properly: short pages
 * still push the footer to the bottom of the screen, long pages simply grow.
 *
 * The children are wrapped in a `flex-1 flex flex-col` element so a page that
 * wants to fill the remaining height (NotFound centres itself with `flex-1`)
 * still can.
 */
const PageLayout = ({ children, className }) => {
    return (
        <Suspense fallback={<LinearLoadin />}>
            <div
                style={{ minHeight: 'calc(100vh - 64px)' }}
                className={`flex flex-col ${className || ''}`}
            >
                <div className="flex-1 flex flex-col">
                    {children}
                </div>
                <FooterBar />
            </div>
        </Suspense>
    );
};

export default PageLayout;
