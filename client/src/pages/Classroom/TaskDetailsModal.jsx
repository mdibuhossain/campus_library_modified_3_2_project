import React from 'react'
import { Box, Button, Modal, TextField } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';
import { useAuth } from '../../Hooks/useAuth';


const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: "95%",
    height: 600,
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 3,
    p: 1,
};

const TaskDetailsModal = ({ task }) => {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return (
        <>
            <Box
                onClick={handleOpen}
                sx={{ "&:hover": { boxShadow: "0px 0px 5px #d9d9d9" }, p: 2, borderRadius: 2, cursor: "pointer" }}
            >
                <div className="flex align-center items-center gap-2">
                    <div className="bg-sky-500 rounded-full p-2 fill-white">
                        <svg focusable="false" width="24" height="24" viewBox="0 0 24 24"><path d="M7 15h7v2H7zm0-4h10v2H7zm0-4h10v2H7z"></path><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-.14 0-.27.01-.4.04a2.008 2.008 0 0 0-1.44 1.19c-.1.23-.16.49-.16.77v14c0 .27.06.54.16.78s.25.45.43.64c.27.27.62.47 1.01.55.13.02.26.03.4.03h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19 19H5V5h14v14z"></path></svg>
                    </div>
                    <div className="w-full flex align-center justify-between">
                        <p>{task?.title}</p>
                        <p className="text-xs text-gray-400">Posted {new Date(task?.iat).toDateString()}</p>
                    </div>
                </div>
            </Box>
            <Modal
                open={open}
            >
                <Box sx={{ ...style }}>
                    <div className='flex justify-end mb-2' onClick={handleClose}>
                        <IconButton><ClearIcon /></IconButton>
                    </div>
                    <Box sx={{ border: "1px solid black" }}>
                        {task.description} <br />
                        {new Date(task.deadline).toLocaleString()}
                    </Box>
                </Box>
            </Modal>
        </>
    )
}

export default TaskDetailsModal;