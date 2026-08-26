import React, { useMemo, useState } from 'react';
import { Alert, Badge, Tab, Tabs, Typography } from '@mui/material';
import PageLayout from '../../Layout/PageLayout';
import ListOfRequest from '../../components/ListOfRequest';
import useUtility from '../../Hooks/useUtility';
import { useAuth } from '../../Hooks/useAuth';

// The three routes that render this page differ only in WHICH rows they show.
// Previously they were told apart by an `isMyContent` boolean that was then
// (mis)used as a content *status* value, which made /pending and /manage
// identical for approvers and made /mycontent hide the caller's own pending
// uploads. Each page now states its intent instead.
const MODES = {
    mine: {
        title: "MY CONTENT",
        blurb: "Everything you have uploaded, whether or not it has been approved yet.",
        empty: "You have not uploaded anything yet.",
    },
    pending: {
        title: "PENDING REQUEST",
        // what this shows depends on whether the caller can approve
        blurb: (canApprove) => canApprove
            ? "Everything waiting for approval, from every contributor."
            : "Your uploads that are still waiting for approval.",
        empty: (canApprove) => canApprove
            ? "Nothing is waiting for approval."
            : "You have nothing waiting for approval.",
    },
    manage: {
        title: "MANAGE CONTENT",
        blurb: "Every item in the library, approved and pending.",
        empty: "The library is empty.",
    },
};

const TABS = [
    { key: "books", label: "BOOKS", title: "Book" },
    { key: "questions", label: "QUESTIONS", title: "Question" },
    { key: "syllabus", label: "SYLLABUS", title: "Syllabus" },
];

// One rule, used for both the visible rows and the tab counts, so a badge can
// never disagree with the list under it.
const rowsFor = (items = [], mode, email, canApprove) => {
    const base =
        mode === "mine" ? items.filter((i) => i?.added_by === email)
            : mode === "pending"
                ? (canApprove
                    ? items.filter((i) => !i?.status)
                    : items.filter((i) => !i?.status && i?.added_by === email))
                : items; // manage -- the route already requires content.approve
    // pending first: those are the rows someone still has to act on
    return [...base].sort((a, b) => Number(a?.status) - Number(b?.status));
};

const ContentManagement = ({ mode = "pending" }) => {
    const [tab, setTab] = useState(0);
    const { books, questions, syllabus, dataLoading } = useUtility();
    const { user, can } = useAuth();
    const canApprove = can("content.approve");

    const config = MODES[mode] || MODES.pending;
    const resolve = (v) => (typeof v === "function" ? v(canApprove) : v);

    const source = { books, questions, syllabus };
    const filtered = useMemo(
        () => TABS.reduce((acc, t) => {
            acc[t.key] = rowsFor(source[t.key], mode, user?.email, canApprove);
            return acc;
        }, {}),
        [books, questions, syllabus, mode, user?.email, canApprove]
    );

    const total = TABS.reduce((n, t) => n + filtered[t.key].length, 0);
    const active = TABS[tab];

    return (
        <PageLayout>
            <div className="2xl:w-8/12 xl:w-9/12 lg:w-10/12 w-11/12 mx-auto pb-16">
                <Typography variant="h5" sx={{ fontWeight: 600, textAlign: "center", mt: 4 }}>
                    {config.title}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ textAlign: "center", color: "text.secondary", mt: 1, mb: 3 }}
                >
                    {resolve(config.blurb)}
                </Typography>

                <div className="bg-white rounded-lg shadow-lg">
                    <Tabs
                        value={tab}
                        onChange={(e, v) => setTab(v)}
                        variant="fullWidth"
                        sx={{ borderBottom: 1, borderColor: "divider" }}
                    >
                        {TABS.map((t) => (
                            <Tab
                                key={t.key}
                                sx={{ fontWeight: 600 }}
                                label={
                                    <Badge
                                        badgeContent={filtered[t.key].length}
                                        color={filtered[t.key].length ? "primary" : "default"}
                                        showZero
                                        sx={{ '& .MuiBadge-badge': { right: -16, top: 2 } }}
                                    >
                                        {t.label}
                                    </Badge>
                                }
                            />
                        ))}
                    </Tabs>

                    {!dataLoading && total === 0
                        ? <div className="p-6">
                            <Alert severity="info">{resolve(config.empty)}</Alert>
                        </div>
                        : <ListOfRequest
                            key={active.key}
                            content={filtered[active.key]}
                            title={active.title}
                            mode={mode}
                            emptyMessage={`No ${active.label.toLowerCase()} to show here.`}
                        />
                    }
                </div>
            </div>
        </PageLayout>
    );
};

export default ContentManagement;
