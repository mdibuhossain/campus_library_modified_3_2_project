import { useMutation } from '@apollo/client';
import { LoadingButton } from '@mui/lab';
import {
    Alert, AlertTitle, Box, Button, Chip, CircularProgress, Divider, FormControl,
    InputAdornment, InputLabel, ListSubheader, MenuItem, Select, TextField,
    Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Hooks/useAuth';
import useUtility from '../../Hooks/useUtility';
import PageLayout from '../../Layout/PageLayout';
import { GET_BOOKS, GET_QUESTIONS, GET_SYLLABUS, UPDATE_BOOK, UPDATE_QUESTION, UPDATE_SYLLABUS } from '../../queries/query';
import { tagTitle } from '../../utility/tagTitle';
import { semesterList } from '../../utility/semesterList';

const looksLikeLink = (v) =>
    !v || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/i.test(v.trim());

const href = (link) =>
    !link ? '#' : /^https?:\/\//.test(link) ? link : `http://${link}`;

const EditContent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token, can } = useAuth();
    const { books, questions, syllabus, dataLoading, deptLoading, getDepartments } = useUtility();

    const product = useMemo(() => {
        const all = [...(books || []), ...(questions || []), ...(syllabus || [])];
        return all.find((item) => item?._id === id);
    }, [books, questions, syllabus, id]);

    const [form, setForm] = useState(null);
    const [deptChoice, setDeptChoice] = useState('');
    const [otherDept, setOtherDept] = useState(false);
    const [error, setError] = useState('');

    /* The old code did useState(product) and an effect keyed on [deptLoading].
     * useState only uses its argument on the first render, and on a refresh
     * books/questions/syllabus are still empty then -- so `product` was
     * undefined, `dataStruct` stayed undefined forever, and the form was
     * permanently blank. /edit/:id carries no route state, so any direct visit
     * or reload hit that. Seed the form once the record actually arrives. */
    useEffect(() => {
        if (!product || form) return;
        setForm({
            _id: product._id,
            sub_categories: product.sub_categories || '',
            book_name: product.book_name || '',
            author: product.author || '',
            edition: product.edition || '',
            categories: product.categories || '',
            semester: product.semester || [],
            course_code: product.course_code || '',
            download_link: product.download_link || '',
        });
        const known = getDepartments?.includes(product.categories);
        setDeptChoice(known ? product.categories : 'others');
        setOtherDept(!known && !!product.categories);
    }, [product, form, getDepartments]);

    const set = (name, value) => {
        setError('');
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // readQuery returns null when that query is not cached yet, and writing the
    // local state instead of the server's response could also put stale values
    // in the cache. Splice by id and bail out when the row is not there.
    const replaceInCache = (query, field) => (cache, { data }) => {
        const updated = Object.values(data || {})[0];
        if (!updated?._id) return;
        const existing = cache.readQuery({ query });
        if (!existing?.[field]) return;
        const next = existing[field].map((row) =>
            row?._id === updated._id ? { ...row, ...form, ...updated } : row
        );
        cache.writeQuery({ query, data: { [field]: next } });
    };

    const [updateBook, { loading: bookLoading }] =
        useMutation(UPDATE_BOOK, { update: replaceInCache(GET_BOOKS, 'getBooks') });
    const [updateQuestion, { loading: questionLoading }] =
        useMutation(UPDATE_QUESTION, { update: replaceInCache(GET_QUESTIONS, 'getQuestions') });
    const [updateSyllabus, { loading: syllabusLoading }] =
        useMutation(UPDATE_SYLLABUS, { update: replaceInCache(GET_SYLLABUS, 'getAllSyllabus') });

    const loading = bookLoading || questionLoading || syllabusLoading;
    const isBook = form?.sub_categories === 'book';

    const canSubmit =
        !!form?.book_name?.trim() &&
        !!form?.categories?.trim() &&
        !!form?.download_link?.trim() &&
        looksLikeLink(form?.download_link);

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
            token,
            _id: form._id,
            book_name: form.book_name.trim(),
            categories: form.categories.trim().toLowerCase(),
            download_link: form.download_link.trim(),
            sub_categories: form.sub_categories,
            ...(isBook && {
                author: form.author.trim(),
                edition: form.edition,
                semester: form.semester,
                course_code: form.course_code.trim(),
            }),
        };
        const run = form.sub_categories === 'book' ? updateBook
            : form.sub_categories === 'question' ? updateQuestion
                : updateSyllabus;
        // the old code fired the mutation and called navigate(-1) synchronously,
        // so a failure navigated away as if it had worked
        run({ variables })
            .then(() => navigate(-1))
            .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
    };

    /* Gate on `form`, not on `product`.
     *
     * Effects run after render, so on the very render where `product` first
     * becomes available `form` is still null -- the previous condition
     * (!product && !form) passed and the body below dereferenced form.sub_categories
     * on null. Requiring `form` covers loading, not-found, and the one-render
     * gap while the effect seeds it. */
    if (!form) {
        const notFound = !dataLoading && !product;
        return (
            <PageLayout>
                <div className="flex-1 flex items-center justify-center py-20">
                    {!notFound ? (
                        <CircularProgress color="info" />
                    ) : (
                        <div className="max-w-md w-full px-4">
                            <Alert
                                severity="warning"
                                action={
                                    <Button size="small" onClick={() => navigate(-1)}>back</Button>
                                }
                            >
                                <AlertTitle sx={{ mb: 0 }}>Content not found</AlertTitle>
                                Nothing matches this id. It may have been deleted.
                            </Alert>
                        </div>
                    )}
                </div>
            </PageLayout>
        );
    }

    const isOwner = product?.added_by === user?.email;
    const fieldProps = { fullWidth: true, size: 'small', disabled: loading };

    return (
        <PageLayout>
            <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
                <Button
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                    sx={{ textTransform: 'none', mb: 2 }}
                >
                    Back
                </Button>

                <Typography variant="h4" sx={{ fontWeight: 700 }}>Edit content</Typography>
                <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-5">
                    <Chip size="small" label={form.sub_categories || 'unknown'} color="primary" variant="outlined" />
                    <Chip
                        size="small"
                        label={product?.status ? 'approved' : 'pending review'}
                        color={product?.status ? 'success' : 'warning'}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {isOwner ? 'uploaded by you' : `uploaded by ${product?.added_by}`}
                    </Typography>
                    {product?.download_link && (
                        <Tooltip title="Open the current link" arrow>
                            <a href={href(product.download_link)} target="_blank" rel="noreferrer">
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                                    label="view"
                                    clickable
                                />
                            </a>
                        </Tooltip>
                    )}
                </div>

                {!isOwner && !can('content.edit.any') && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        This is not your upload. Saving will be refused unless your role
                        allows editing anyone's content.
                    </Alert>
                )}

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 3, p: { xs: 2.5, sm: 4 } }}
                >
                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

                    <div className="flex flex-col gap-3">
                        {/* The category decides which collection the row lives in,
                            so changing it here sent the update to the wrong
                            resolver -- editQuestion with a book's _id silently
                            matched nothing. Read-only. */}
                        <TextField
                            {...fieldProps}
                            id="edit-kind"
                            label="Type"
                            value={form.sub_categories}
                            disabled
                            helperText="A type cannot be changed after upload"
                        />

                        <TextField
                            {...fieldProps}
                            // every field shared id="outlined-basic" before
                            id="edit-title"
                            label="Title"
                            value={form.book_name}
                            onChange={(e) => set('book_name', e.target.value)}
                            required
                        />

                        {isBook && (
                            <>
                                <div className="grid sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <TextField
                                            {...fieldProps}
                                            id="edit-author"
                                            label="Author"
                                            value={form.author}
                                            onChange={(e) => set('author', e.target.value)}
                                        />
                                    </div>
                                    <TextField
                                        {...fieldProps}
                                        id="edit-edition"
                                        label="Edition"
                                        type="number"
                                        value={form.edition}
                                        onChange={(e) => set('edition', e.target.value)}
                                    />
                                </div>
                                <FormControl {...fieldProps}>
                                    <InputLabel id="edit-sem-label">Semester</InputLabel>
                                    <Select
                                        labelId="edit-sem-label"
                                        id="edit-sem"
                                        multiple
                                        label="Semester"
                                        value={form.semester ?? []}
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
                                    id="edit-course-code"
                                    label="Course code"
                                    value={form.course_code}
                                    onChange={(e) => set('course_code', e.target.value)}
                                    helperText="Lets this book show as material inside a classroom"
                                />
                            </>
                        )}

                        <FormControl {...fieldProps} required>
                            <InputLabel id="edit-dept-label">Department</InputLabel>
                            <Select
                                labelId="edit-dept-label"
                                id="edit-dept"
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
                                <MenuItem value="others"><em>Other / not sure</em></MenuItem>
                            </Select>
                        </FormControl>

                        {otherDept && (
                            <TextField
                                {...fieldProps}
                                id="edit-other-dept"
                                label="Department name"
                                value={form.categories}
                                onChange={(e) => set('categories', e.target.value)}
                                required
                            />
                        )}

                        <TextField
                            {...fieldProps}
                            id="edit-link"
                            label="Shareable link"
                            value={form.download_link}
                            onChange={(e) => set('download_link', e.target.value)}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LinkIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            error={!!form.download_link && !looksLikeLink(form.download_link)}
                            helperText={
                                form.download_link && !looksLikeLink(form.download_link)
                                    ? 'That does not look like a link'
                                    : ' '
                            }
                        />
                    </div>

                    <Divider sx={{ my: 3 }} />
                    <div className="flex gap-2">
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => navigate(-1)}
                            disabled={loading}
                        >
                            cancel
                        </Button>
                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            loading={loading}
                            disabled={!canSubmit}
                        >
                            save changes
                        </LoadingButton>
                    </div>
                </Box>
            </div>
        </PageLayout>
    );
};

export default EditContent;
