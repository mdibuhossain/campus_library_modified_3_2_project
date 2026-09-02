import React from 'react';
import Departments from '../../components/Department/Departments';
import Hero from '../../components/Home/Hero';
import RecentlyAdded from '../../components/Home/RecentlyAdded';
import YourDepartment from '../../components/Home/YourDepartment';
import PageLayout from '../../Layout/PageLayout';
import useLibraryStats from '../../Hooks/useLibraryStats';
import useDocumentMeta from '../../Hooks/useDocumentMeta';

/**
 * The home page was previously just <Departments />: a 33-tile index, ~6,400px
 * tall, with no statement of what the site is and none of its actual content on
 * screen. The tiles are still here, but they are now the last section rather
 * than the whole page.
 *
 * Order is deliberate -- what a visitor needs, then what a member needs:
 *   Hero            what this is, and the content search
 *   YourDepartment  a member's one-tap shortcut (renders nothing for visitors)
 *   RecentlyAdded   "is there anything new?", answered without a click
 *   Departments     browse, collapsed to a screenful
 *
 * Every number on the page comes from useLibraryStats, which reads arrays
 * useData already fetched -- so none of this adds a request.
 */
const Home = () => {
    const { totals, byDept, recent, dataLoading } = useLibraryStats();

    useDocumentMeta({
        title: 'Campus Classroom — books, question papers and syllabus',
        description:
            'Books, question papers and syllabus for every department, uploaded and checked by students and teachers.',
    });

    return (
        <PageLayout>
            <Hero totals={totals} loading={dataLoading} />
            <YourDepartment stats={byDept} />
            <RecentlyAdded items={recent} loading={dataLoading} />
            <Departments />
        </PageLayout>
    );
};

export default Home;
