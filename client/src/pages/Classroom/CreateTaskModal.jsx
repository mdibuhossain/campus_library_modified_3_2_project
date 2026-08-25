import React from 'react'
import { Box, Button, Modal, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMutation } from "@apollo/client";
import { CREATE_TASK } from "../../queries/query";
import "suneditor/dist/css/suneditor.min.css";
import Editor from "suneditor-react";
import { useAuth } from '../../Hooks/useAuth';


const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: "90%",
    maxHeight: "90vh",
    bgcolor: 'background.paper',
    boxShadow: 24,
    overflowY: "auto",
    overflowX: "hidden"
};

const CreateTaskModal = ({ RoomInfo, setRoomInfo }) => {
    const { user, token } = useAuth();
    const [createTask] = useMutation(CREATE_TASK);
    const editor = React.useRef();
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const [deadline, setDeadline] = React.useState("");
    const [editorContent, setEditorContent] = React.useState("");
    const [date, setDate] = React.useState('');
    const [time, setTime] = React.useState('');
    const getSunEditorInstance = (sunEditor) => {
        editor.current = sunEditor;
    };

    const handleOnChangeTime = (e) => {
        const changedTime = e.target.value;
        setTime(changedTime);
        if (date.length > 0) {
            const isoTime = new Date(date + ' ' + changedTime).toUTCString();
            setDeadline(isoTime);
        }
    }

    const handleOnChangeDate = (e) => {
        const changedDate = e.target.value;
        setDate(changedDate);
        const isoTime = new Date(changedDate + ' ' + time).toUTCString();
        setDeadline(isoTime);
    }

    const handleCreateClassroom = (e) => {
        e.preventDefault();
        createTask({
            variables: {
                title: e.target["title"].value,
                description: editor.current.getContents(),
                deadline: deadline,
                roomid: RoomInfo?._id,
                token,
            }
        }).then(({ data }) => {
            if (data?.createTask) {
                setRoomInfo(pre => {
                    const newData = { ...pre }
                    newData.tasks = [data.createTask, ...newData.tasks]
                    return newData;
                })
                handleClose();
                alert('Task created successfully');
            }
        }).catch(err => {
            alert(err?.graphQLErrors?.[0]?.message || err.message)
        })
    }
    if (RoomInfo?.admin?.email === user?.email)
        return (
            <>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 7, mb: 2, py: 1 }}
                    onClick={handleOpen}
                >Create</Button>
                <Modal
                    open={open}
                >
                    <Box

                        sx={{ ...style, p: { md: 5, xs: 2 }, bgcolor: "white", borderRadius: 2, boxShadow: '0.65px 1.75px 10px rgb(0, 0, 0, 0.3)' }}
                    >
                        <h5 className="mb-5 text-lg">Assignment</h5>
                        <form onSubmit={handleCreateClassroom} className='flex flex-col gap-y-5'>
                            <TextField
                                id="component-task-title"
                                label="Title"
                                variant="standard"
                                name="title"
                                required
                            />
                            <Editor
                                name="description"
                                getSunEditorInstance={getSunEditorInstance}
                                placeholder="Write description"
                                height='180px'
                                setOptions={{
                                    buttonList: [[
                                        "undo", "redo",
                                        "bold", "underline", "italic", "strike", "subscript", "superscript",
                                        "blockquote",
                                        "align",
                                        "font",
                                        "fontColor",
                                        "fontSize",
                                        "hiliteColor",
                                        "horizontalRule",
                                        "lineHeight",
                                        "list",
                                        "paragraphStyle",
                                        "table",
                                        "textStyle",
                                    ]]
                                }}
                            />

                            <input
                                className='border-2 p-2 rounded-md'
                                type='date'
                                name='date'
                                onChange={handleOnChangeDate}
                                required
                            />
                            <input
                                className='border-2 p-2 rounded-md'
                                type='time'
                                name='time'
                                onChange={handleOnChangeTime}
                                required
                            />
                            <div className="flex flex-row-reverse gap-x-3">
                                <Button className='self-end w-0' variant="text" color='error' onClick={handleClose}>Close</Button>
                                <Button type='submit' className='self-end w-0' variant="text">Assign</Button>
                            </div>
                        </form>
                    </Box>
                </Modal>
            </>
        )
    else
        return null;
}

export default CreateTaskModal;