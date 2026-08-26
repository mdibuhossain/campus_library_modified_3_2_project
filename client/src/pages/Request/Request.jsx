import { useMutation } from '@apollo/client';
import {
    Alert, AlertTitle, Box, Button, Chip, Divider, FormControl, InputAdornment,
    InputLabel, ListSubheader, MenuItem, Select, TextField, ToggleButton,
    ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginIcon from '@mui/icons-material/Login';
import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../Hooks/useAuth';
import PageLayout from '../../Layout/PageLayout';
import { POST_BOOK, POST_QUESTION, POST_SYLLABUS, GET_BOOKS, GET_QUESTIONS, GET_SYLLABUS } from '../../queries/query';
import useUtility from '../../Hooks/useUtility';
import { tagTitle } from '../../utility/tagTitle';
import { semesterList } from '../../utility/semesterList';

const KINDS = [
    { value: 'book', label: 'Book', icon: <MenuBookIcon fontSize="small" /> },
    { value: 'question', label: 'Question paper', icon: <QuizIcon fontSize="small" /> },
    { value: 'syllabus', label: 'Syllabus', icon: <DescriptionIcon fontSize="small" /> },
];

const emptyForm = {
    book_name: '',
    author: '',
    edition: '',
    download_link: '',
    categories: '',
    sub_categories: '',
    semester: [],
    course_code: '',
    status: false,
};

const looksLikeLink = (v) =>
    !v || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/i.test(v.trim());

const Request = () => {
    const { user, token } = useAuth();
    const { getDepartments, deptLoading } = useUtility();

    const [form, setForm] = useState(emptyForm);
    const [deptChoice, setDeptChoice] = useState('');
    const [otherDept, setOtherDept] = useState(false);
    const [submitted, setSubmitted] = useState(null);
    const [error, setError] = useState('');

    const signedIn = !!user?.email;
    const isBook = form.sub_categories === 'book';

    const set = (name, value) => {
        setError('');
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // The cache `update` callbacks below read GET_BOOKS/GET_QUESTIONS/GET_SYLLABUS.
    // readQuery returns null when that query is not in the cache yet, and the old
    // code destructured straight off it, which would throw.
    const appendToCache = (query, field) => (cache, { data }) => {
        const added = Object.values(data || {})[0];
        if (!added) return;
        const existing = cache.readQuery({ query });
        if (!existing?.[field]) return;
        cache.writeQuery({ query, data: { [field]: [...existing[field], added] } });
    };

    const [postBook, { loading: bookLoading }] =
        useMutation(POST_BOOK, { update: appendToCache(GET_BOOKS, 'getBooks') });
    const [postQuestion, { loading: questionLoading }] =
        useMutation(POST_QUESTION, { update: appendToCache(GET_QUESTIONS, 'getQuestions') });
    const [postSyllabus, { loading: syllabusLoading }] =
        useMutation(POST_SYLLABUS, { update: appendToCache(GET_SYLLABUS, 'getAllSyllabus') });

    const loading = bookLoading || questionLoading || syllabusLoading;

    const canSubmit = useMemo(() =>
        signedIn &&
        form.sub_categories &&
        form.book_name.trim() &&
        form.categories.trim() &&
        form.download_link.trim() &&
        looksLikeLink(form.download_link),
        [signedIn, form]
    );

    const resetAll = () => {
        // The old code called e.target.reset(), which clears uncontrolled DOM
        // inputs but leaves React state untouched -- and the controlled Selects
        // kept their values. So after a submit the form looked half-cleared while
        // `dataStruct` still held everything, and pressing submit again re-posted
        // the previous entry.
        setForm(emptyForm);
        setDeptChoice('');
        setOtherDept(false);
        setError('');
    };

    const handleDepartment = (e) => {
        const value = e.target.value;
        setDeptChoice(value);
        if (value === 'others') {
            setOtherDept(true);
            set('categories', '');
        } else {
            setOtherDept(false);
            set('categories', value.trim().toLowerCase());
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        const variables = {
            ...form,
            book_name: form.book_name.trim(),
            author: form.author.trim(),
            course_code: form.course_code.trim(),
            download_link: form.download_link.trim(),
            categories: form.categories.trim().toLowerCase(),
            added_by: user?.email,
            token,
        };
        const run = form.sub_categories === 'book' ? postBook
            : form.sub_categories === 'question' ? postQuestion
                : postSyllabus;
        run({ variables })
            .then(() => {
                setSubmitted({ title: variables.book_name, kind: form.sub_categories });
                resetAll();
            })
            // previously this was a window.alert in a useEffect watching the
            // mutation results, and failures were silent
            .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
    };

    const fieldProps = { fullWidth: true, size: 'small', disabled: !signedIn || loading };

    return (
        <PageLayout>
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Share a resource
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: '38rem', mx: 'auto' }}>
                        Add a book, question paper or syllabus to your department's library.
                        A moderator checks it before it appears publicly.
                    </Typography>
                </div>

                {!signedIn && (
                    <div className="max-w-xl mx-auto mb-6">
                        {/* replaces a link that blinked twice a second via setInterval --
                            a flashing element is an accessibility hazard and it
                            re-rendered the whole page on a 500ms timer */}
                        <Alert
                            severity="info"
                            action={
                                <NavLink to="/login">
                                    <Button size="small" startIcon={<LoginIcon />}>sign in</Button>
                                </NavLink>
                            }
                        >
                            <AlertTitle sx={{ mb: 0 }}>Sign in to upload</AlertTitle>
                            The form below is read-only until you do.
                        </Alert>
                    </div>
                )}

                {submitted && (
                    <div className="max-w-xl mx-auto mb-6">
                        <Alert
                            severity="success"
                            icon={<CheckCircleIcon />}
                            onClose={() => setSubmitted(null)}
                            action={
                                <NavLink to="/mycontent">
                                    <Button size="small">my content</Button>
                                </NavLink>
                            }
                        >
                            <AlertTitle sx={{ mb: 0 }}>“{submitted.title}” submitted</AlertTitle>
                            It is waiting for review. You can add another below.
                        </Alert>
                    </div>
                )}

                <div className="grid lg:grid-cols-5 gap-8 items-start">
                    {/* guidance column -- the illustration alone said nothing */}
                    <aside className="hidden lg:block lg:col-span-2">
                        <img
                            className="w-4/5 mx-auto"
                            src="/assets/images/request_banner.webp"
                            alt=""
                        />
                        <div className="bg-white rounded-lg shadow-lg p-5 mt-4">
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                How it works
                            </Typography>
                            <Divider sx={{ my: 1.5 }} />
                            <ol className="text-sm text-gray-600 space-y-2.5 list-decimal ml-4">
                                <li>Upload your file to Google Drive (or similar) and make it viewable by anyone with the link.</li>
                                <li>Fill in the details here and paste that link.</li>
                                <li>A moderator reviews it. Once approved it appears on your department page.</li>
                            </ol>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
                                Track anything you have submitted under{' '}
                                <NavLink to="/mycontent" className="underline">My Content</NavLink>.
                            </Typography>
                        </div>
                    </aside>

                    {/* the form */}
                    <div className="lg:col-span-3">
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 3, p: { xs: 2.5, sm: 4 } }}
                        >
                            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

                            {/* 1 -- kind. A segmented control reads faster than a
                                select, and it drives which fields appear below. */}
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                                1 · What are you sharing?
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size="small"
                                value={form.sub_categories}
                                onChange={(e, value) => value && set('sub_categories', value)}
                                disabled={!signedIn || loading}
                                sx={{ mt: 1, mb: 3 }}
                            >
                                {KINDS.map((k) => (
                                    <ToggleButton key={k.value} value={k.value} sx={{ textTransform: 'none', gap: 0.75 }}>
                                        {k.icon}
                                        {k.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>

                            {/* 2 -- details */}
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                                2 · Details
                            </Typography>
                            <div className="flex flex-col gap-3 mt-1 mb-3">
                                <TextField
                                    {...fieldProps}
                                    // every field used to share id="outlined-basic",
                                    // which is invalid and breaks label association
                                    id="upload-title"
                                    label="Title"
                                    name="book_name"
                                    value={form.book_name}
                                    onChange={(e) => set('book_name', e.target.value)}
                                    required
                                    helperText={isBook ? 'The book title' : 'e.g. Final 2023, or Syllabus 2024'}
                                />

                                {isBook && (
                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <TextField
                                                {...fieldProps}
                                                id="upload-author"
                                                label="Author"
                                                value={form.author}
                                                onChange={(e) => set('author', e.target.value)}
                                            />
                                        </div>
                                        <TextField
                                            {...fieldProps}
                                            id="upload-edition"
                                            label="Edition"
                                            type="number"
                                            value={form.edition}
                                            onChange={(e) => set('edition', e.target.value)}
                                        />
                                    </div>
                                )}

                                <FormControl {...fieldProps} required>
                                    <InputLabel id="upload-dept-label">Department</InputLabel>
                                    <Select
                                        labelId="upload-dept-label"
                                        id="upload-dept"
                                        value={deptChoice}
                                        label="Department"
                                        onChange={handleDepartment}
                                    >
                                        {!deptLoading && getDepartments.map((item) => (
                                            item && (
                                                <MenuItem key={item} value={item}>
                                                    <Tooltip title={tagTitle[item] || ''} placement="top-start" arrow>
                                                        <div className="w-full">{item.toUpperCase()}</div>
                                                    </Tooltip>
                                                </MenuItem>
                                            )
                                        ))}
                                        <MenuItem value="others">
                                            <em>Other / not sure</em>
                                        </MenuItem>
                                    </Select>
                                </FormControl>

                                {otherDept && (
                                    <TextField
                                        {...fieldProps}
                                        id="upload-other-dept"
                                        label="Department name"
                                        value={form.categories}
                                        onChange={(e) => set('categories', e.target.value)}
                                        required
                                        helperText="Type the department this belongs to"
                                    />
                                )}

                                {isBook && (
                                    <>
                                        <FormControl {...fieldProps}>
                                            <InputLabel id="upload-sem-label">Semester</InputLabel>
                                            <Select
                                                labelId="upload-sem-label"
                                                id="upload-sem"
                                                multiple
                                                label="Semester"
                                                value={form.semester}
                                                onChange={(e) => set('semester', e.target.value)}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value) => (
                                                            <Chip key={value} label={value} size="small" />
                                                        ))}
                                                    </Box>
                                                )}
                                            >
                                                {semesterList.map((sem) =>
                                                    sem?.title ? (
                                                        <ListSubheader key={sem.title} sx={{ fontWeight: 700 }}>
                                                            {sem.title}
                                                        </ListSubheader>
                                                    ) : (
                                                        <MenuItem key={sem} value={sem} sx={{ ml: 1 }}>{sem}</MenuItem>
                                                    )
                                                )}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            {...fieldProps}
                                            id="upload-course-code"
                                            label="Course code"
                                            value={form.course_code}
                                            onChange={(e) => set('course_code', e.target.value)}
                                            helperText="Optional — lets this book show as material inside a classroom"
                                        />
                                    </>
                                )}
                            </div>

                            {/* 3 -- link */}
                            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                                3 · Where is it?
                            </Typography>
                            <TextField
                                {...fieldProps}
                                id="upload-link"
                                label="Shareable link"
                                value={form.download_link}
                                onChange={(e) => set('download_link', e.target.value)}
                                required
                                sx={{ mt: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LinkIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                                // the link was never validated before
                                error={!!form.download_link && !looksLikeLink(form.download_link)}
                                helperText={
                                    form.download_link && !looksLikeLink(form.download_link)
                                        ? "That does not look like a link"
                                        : 'Paste a Google Drive or other public link'
                                }
                            />

                            <LoadingButton
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                loading={loading}
                                disabled={!canSubmit}
                                sx={{ mt: 3 }}
                            >
                                submit for review
                            </LoadingButton>
                            {signedIn && (
                                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 1.5 }}>
                                    Uploading as {user.email}
                                </Typography>
                            )}
                        </Box>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export default Request;
