import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { BookOpenIcon } from '@heroicons/react/outline';
import {
    Alert, Avatar, Chip, CircularProgress, IconButton, LinearProgress, List,
    ListItem, ListItemAvatar, Pagination, Tooltip, Typography,
} from '@mui/material';
import { Box } from '@mui/system';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../Hooks/useAuth';
import { DELETE_BOOK, DELETE_QUESTION, DELETE_SYLLABUS, GET_BOOKS, GET_QUESTIONS, GET_SYLLABUS, UPDATE_STATUS_BOOK, UPDATE_STATUS_QUESTION, UPDATE_STATUS_SYLLABUS } from '../queries/query';
import { useMutation } from '@apollo/client';
import useUtility from '../Hooks/useUtility';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 8;

// normalise a possibly schemeless link
const href = (link) =>
    !link ? "#"
        : /^https?:\/\//.test(link) ? link : `http://${link}`;

const ListOfRequest = ({ content = [], title, mode, emptyMessage }) => {
    const { user, can, token } = useAuth();
    const { dataLoading } = useUtility();
    const [page, setPage] = useState(1);
    const [error, setError] = useState("");

    // `content` arrives already filtered by the parent. Paginate THAT, not the
    // unfiltered list -- filtering inside the map after slicing used to leave
    // pages rendering empty.
    const pageCount = Math.max(1, Math.ceil(content.length / PAGE_SIZE));
    useEffect(() => { setPage(1) }, [content.length, title]);
    const visible = content.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);

    const updateContentStatusFromCache = (arg, comp) => {
        const res = [...arg]
        const indx = res.findIndex((unit) => unit?._id === comp?._id)
        if (indx < 0) return res
        res[indx] = { ...res[indx], status: !res[indx]?.status }
        return res
    }

    const [updateStatusBook, { loading: updateStatusBookloading }] = useMutation(UPDATE_STATUS_BOOK, {
        update(cache, { data: { editBookStatus } }) {
            const { getBooks } = cache.readQuery({ query: GET_BOOKS });
            cache.writeQuery({
                query: GET_BOOKS,
                data: { getBooks: updateContentStatusFromCache(getBooks, editBookStatus) },
            });
        },
    })
    const [updateStatusQuestion, { loading: updateStatusQuestionloading }] = useMutation(UPDATE_STATUS_QUESTION, {
        update(cache, { data: { editQuestionStatus } }) {
            const { getQuestions } = cache.readQuery({ query: GET_QUESTIONS });
            cache.writeQuery({
                query: GET_QUESTIONS,
                data: { getQuestions: updateContentStatusFromCache(getQuestions, editQuestionStatus) },
            });
        },
    })
    const [updateStatusSyllabus, { loading: updateStatusSyllabusloading }] = useMutation(UPDATE_STATUS_SYLLABUS, {
        update(cache, { data: { editSyllabusStatus } }) {
            const { getAllSyllabus } = cache.readQuery({ query: GET_SYLLABUS });
            cache.writeQuery({
                query: GET_SYLLABUS,
                data: { getAllSyllabus: updateContentStatusFromCache(getAllSyllabus, editSyllabusStatus) },
            });
        },
    })

    const deleteContentFromCache = (arg, comp) => arg.filter((unit) => unit?._id !== comp?._id)

    const [deleteContentBook, { loading: deleteBookLoading }] = useMutation(DELETE_BOOK, {
        update(cache, { data: { deleteBook } }) {
            const { getBooks } = cache.readQuery({ query: GET_BOOKS });
            cache.writeQuery({
                query: GET_BOOKS,
                data: { getBooks: deleteContentFromCache(getBooks, deleteBook) },
            });
        },
    })
    const [deleteContentQuestion, { loading: deleteQuestionLoading }] = useMutation(DELETE_QUESTION, {
        update(cache, { data: { deleteQuestion } }) {
            const { getQuestions } = cache.readQuery({ query: GET_QUESTIONS });
            cache.writeQuery({
                query: GET_QUESTIONS,
                data: { getQuestions: deleteContentFromCache(getQuestions, deleteQuestion) },
            });
        },
    })
    const [deleteContentSyllabus, { loading: deleteSyllabusLoading }] = useMutation(DELETE_SYLLABUS, {
        update(cache, { data: { deleteSyllabus } }) {
            const { getAllSyllabus } = cache.readQuery({ query: GET_SYLLABUS });
            cache.writeQuery({
                query: GET_SYLLABUS,
                data: { getAllSyllabus: deleteContentFromCache(getAllSyllabus, deleteSyllabus) },
            });
        },
    })

    const busy = updateStatusSyllabusloading || updateStatusQuestionloading ||
        updateStatusBookloading || deleteSyllabusLoading || deleteQuestionLoading ||
        deleteBookLoading;

    const onError = (err) =>
        setError(err?.graphQLErrors?.[0]?.message || err.message);

    const deleteRequest = (item) => {
        if (!window.confirm(`Delete "${item?.book_name}"? This cannot be undone.`)) return;
        setError("");
        const vars = { variables: { token, _id: item?._id } };
        const kind = title.toLowerCase();
        const run = kind === 'book' ? deleteContentBook
            : kind === 'question' ? deleteContentQuestion
                : deleteContentSyllabus;
        run(vars).catch(onError);
    }

    const handleStatus = (_id, status) => {
        setError("");
        const vars = { variables: { _id, status, token } };
        const kind = title.toLowerCase();
        const run = kind === 'book' ? updateStatusBook
            : kind === 'question' ? updateStatusQuestion
                : updateStatusSyllabus;
        run(vars).catch(onError);
    }

    if (dataLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <CircularProgress color="info" />
            </div>
        )
    }

    if (!content.length) {
        return <div className="p-6"><Alert severity="info">{emptyMessage}</Alert></div>
    }

    return (
        <div>
            <Box sx={{ height: 4 }}>{busy && <LinearProgress />}</Box>
            {error &&
                <div className="px-4 pt-4">
                    <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
                </div>}

            <div className="flex items-baseline justify-between px-4 pt-3">
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {content.length} {title.toLowerCase()}{content.length === 1 ? '' : 's'}
                    {mode !== 'mine' && ` · ${content.filter(i => !i?.status).length} pending`}
                </Typography>
                {pageCount > 1 &&
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        page {page} of {pageCount}
                    </Typography>}
            </div>

            <List>
                {visible.map(item => {
                    // These must mirror the server rules exactly, or the UI offers
                    // buttons that come back Unauthorized:
                    //   approve/hide -> content.approve
                    //   edit         -> owner OR content.edit.any
                    //   delete       -> owner OR content.delete.any
                    const isOwner = item?.added_by === user?.email;
                    const mayApprove = can('content.approve');
                    const mayEdit = isOwner || can('content.edit.any');
                    const mayDelete = isOwner || can('content.delete.any');
                    return (
                        <ListItem
                            key={item?._id}
                            divider
                            sx={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}
                            secondaryAction={
                                <span className="flex items-center gap-0.5">
                                    {mayApprove && (!item?.status
                                        ? <Tooltip title="Approve — make this visible to everyone" arrow>
                                            <IconButton size="small" color="primary"
                                                onClick={() => handleStatus(item?._id, true)}>
                                                <CheckIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        : <Tooltip title="Hide — remove from public listings" arrow>
                                            <IconButton size="small" color="warning"
                                                onClick={() => handleStatus(item?._id, false)}>
                                                <VisibilityOffIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>)}
                                    {mayEdit &&
                                        <Tooltip title="Edit details" arrow>
                                            <NavLink to={`/edit/${item?._id}`}>
                                                <IconButton size="small" color="success">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </NavLink>
                                        </Tooltip>}
                                    {mayDelete &&
                                        <Tooltip title="Delete permanently" arrow>
                                            <IconButton size="small" color="error"
                                                onClick={() => deleteRequest(item)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>}
                                </span>
                            }
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ p: 1, bgcolor: item?.status ? 'success.light' : 'warning.light' }}>
                                    <BookOpenIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, pr: 12 }}>
                                <a href={href(item?.download_link)} target="_blank" rel="noreferrer"
                                    className="hover:underline inline-flex items-center gap-1">
                                    <Typography component="span" sx={{ fontWeight: 600 }}>
                                        {item?.book_name}
                                        {item?.edition && ` - ${item.edition}E`}
                                    </Typography>
                                    {item?.author &&
                                        <Typography component="em" variant="body2" sx={{ color: 'text.secondary' }}>
                                            by {item.author}
                                        </Typography>}
                                    <OpenInNewIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                </a>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                    <Chip
                                        size="small"
                                        label={item?.status ? 'approved' : 'pending'}
                                        color={item?.status ? 'success' : 'warning'}
                                        variant={item?.status ? 'outlined' : 'filled'}
                                        sx={{ height: 20, fontSize: 11 }}
                                    />
                                    {item?.categories &&
                                        <Chip size="small" variant="outlined" label={item.categories}
                                            sx={{ height: 20, fontSize: 11 }} />}
                                    {item?.course_code &&
                                        <Chip size="small" variant="outlined"
                                            label={item.course_code.toUpperCase()}
                                            sx={{ height: 20, fontSize: 11 }} />}
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        {isOwner ? 'uploaded by you' : `uploaded by ${item?.added_by}`}
                                    </Typography>
                                </div>
                            </Box>
                        </ListItem>
                    )
                })}
            </List>

            {pageCount > 1 &&
                <div className="flex justify-center pb-3">
                    <Pagination
                        count={pageCount}
                        page={page}
                        sx={{ mt: 2, mb: 1 }}
                        shape="rounded" color="warning" showFirstButton showLastButton
                        onChange={(e, value) => setPage(value)}
                    />
                </div>}
            <Box sx={{ height: 4 }}>{busy && <LinearProgress />}</Box>
        </div>
    )
}

export default ListOfRequest;
