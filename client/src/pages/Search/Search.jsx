import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Alert, Chip, CircularProgress, IconButton, Tab, Tabs, Typography } from '@mui/material';
import PageLayout from '../../Layout/PageLayout';
import useUtility from '../../Hooks/useUtility';

const TYPES = [
    { key: 'all', label: 'All' },
    { key: 'book', label: 'Books' },
    { key: 'question', label: 'Questions' },
    { key: 'syllabus', label: 'Syllabus' },
];

const norm = (v) => String(v ?? '').toLowerCase();

const Search = () => {
    // Build the corpus from the three typed lists rather than the pre-merged
    // `allData`, so each hit can say what kind of thing it is.
    const { books, questions, syllabus, dataLoading } = useUtility();
    /* Seeded from ?q= so the navbar's search box can hand off to this page, and
       so a search is a shareable / bookmarkable URL rather than transient state. */
    const [searchParams, setSearchParams] = useSearchParams();
    const [text, setText] = useState(() => searchParams.get('q') || '');
    const [type, setType] = useState(0);

    // follow the URL when it changes underneath us (navbar search, back button)
    useEffect(() => {
        const q = searchParams.get('q') || '';
        setText((prev) => (prev === q ? prev : q));
    }, [searchParams]);

    // mirror typing back into the URL, replacing so each keystroke does not
    // become its own history entry
    useEffect(() => {
        const current = searchParams.get('q') || '';
        if (current === text) return;
        const id = setTimeout(() => {
            setSearchParams(text ? { q: text } : {}, { replace: true });
        }, 400);
        return () => clearTimeout(id);
    }, [text]);

    const corpus = useMemo(() => [
        ...(books || []).map((b) => ({ ...b, _type: 'book' })),
        ...(questions || []).map((q) => ({ ...q, _type: 'question' })),
        ...(syllabus || []).map((s) => ({ ...s, _type: 'syllabus' })),
    // Public search must only show approved content. `allData` carries every
    // row regardless of status, so unapproved uploads were previously visible
    // to any visitor here.
    ].filter((item) => item?.status), [books, questions, syllabus]);

    const query = text.trim().toLowerCase();

    const results = useMemo(() => {
        if (!query) return [];
        const wanted = TYPES[type].key;
        return corpus.filter((item) => {
            if (wanted !== 'all' && item._type !== wanted) return false;
            return (
                norm(item.book_name).includes(query) ||
                norm(item.author).includes(query) ||
                norm(item.course_code).includes(query) ||
                norm(item.categories).includes(query) ||
                norm(item.sub_categories).includes(query)
            );
        });
    }, [corpus, query, type]);

    // how many each tab would return, so the tabs are informative
    const countFor = (key) => {
        if (!query) return 0;
        return corpus.filter((item) => {
            if (key !== 'all' && item._type !== key) return false;
            return (
                norm(item.book_name).includes(query) ||
                norm(item.author).includes(query) ||
                norm(item.course_code).includes(query) ||
                norm(item.categories).includes(query) ||
                norm(item.sub_categories).includes(query)
            );
        }).length;
    };

    const href = (link) =>
        !link ? '#' : /^https?:\/\//.test(link) ? link : `http://${link}`;

    return (
        <PageLayout>
            <div className="flex-1 w-full max-w-3xl mx-auto px-4 pt-8 pb-12">
                <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center' }}>
                    Search the library
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', textAlign: 'center', mt: 1, mb: 3 }}
                >
                    Find books, question papers and syllabus by title, author, course code
                    or department.
                </Typography>

                <Paper
                    component="form"
                    onSubmit={(e) => e.preventDefault()}
                    sx={{ p: '4px 6px', display: 'flex', alignItems: 'center', borderRadius: 999 }}
                >
                    <SearchIcon sx={{ mx: 1, color: 'action.active' }} />
                    <InputBase
                        sx={{ ml: 1, flex: 1 }}
                        placeholder="Search by title, author, course code…"
                        inputProps={{ 'aria-label': 'search the library' }}
                        value={text}
                        autoFocus
                        onChange={(e) => setText(e.target.value)}
                    />
                    {text &&
                        <IconButton aria-label="clear search" onClick={() => setText('')} size="small">
                            <ClearIcon fontSize="small" />
                        </IconButton>}
                </Paper>

                {query &&
                    <Tabs
                        value={type}
                        onChange={(e, v) => setType(v)}
                        variant="fullWidth"
                        sx={{ mt: 2, minHeight: 40 }}
                    >
                        {TYPES.map((t) => (
                            <Tab
                                key={t.key}
                                sx={{ minHeight: 40, fontWeight: 600, fontSize: 13 }}
                                label={`${t.label} (${countFor(t.key)})`}
                            />
                        ))}
                    </Tabs>}

                <div className="mt-4">
                    {dataLoading
                        ? <div className="flex justify-center py-16"><CircularProgress color="inherit" /></div>
                        : !query
                            // previously this area was simply blank until you typed
                            ? <div className="text-center py-16">
                                <SearchIcon sx={{ fontSize: 56, color: 'action.disabled' }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                                    Start typing to search {corpus.length} items.
                                </Typography>
                            </div>
                            : results.length === 0
                                // ...and a search with no hits was also blank
                                ? <Alert severity="info">
                                    Nothing matches “{text.trim()}”. Try a course code, an author,
                                    or a shorter phrase.
                                </Alert>
                                : <>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {results.length} result{results.length === 1 ? '' : 's'}
                                    </Typography>
                                    <div className="flex flex-col gap-2 mt-2">
                                        {results.map((item) => (
                                            <a
                                                key={item._id}
                                                href={href(item.download_link)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block"
                                            >
                                                <Paper
                                                    sx={{
                                                        p: 2, borderRadius: 2,
                                                        transition: '0.15s',
                                                        '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' },
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <Typography sx={{ fontWeight: 600 }}>
                                                            {item.book_name}
                                                            {item.edition && ` — ${item.edition}E`}
                                                        </Typography>
                                                        <OpenInNewIcon sx={{ fontSize: 15, color: 'text.disabled', mt: '4px' }} />
                                                    </div>
                                                    {item.author &&
                                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                            by {item.author}
                                                        </Typography>}
                                                    <div className="flex gap-1.5 flex-wrap mt-2">
                                                        <Chip
                                                            size="small" label={item._type}
                                                            color="primary" variant="outlined"
                                                            sx={{ height: 20, fontSize: 11 }}
                                                        />
                                                        {item.categories &&
                                                            <Chip size="small" variant="outlined"
                                                                label={item.categories.toUpperCase()}
                                                                sx={{ height: 20, fontSize: 11 }} />}
                                                        {item.sub_categories &&
                                                            <Chip size="small" variant="outlined"
                                                                label={item.sub_categories.toUpperCase()}
                                                                sx={{ height: 20, fontSize: 11 }} />}
                                                        {item.course_code &&
                                                            <Chip size="small" variant="outlined"
                                                                label={item.course_code.toUpperCase()}
                                                                sx={{ height: 20, fontSize: 11 }} />}
                                                    </div>
                                                </Paper>
                                            </a>
                                        ))}
                                    </div>
                                </>}
                </div>
            </div>
        </PageLayout>
    );
};

export default Search;
