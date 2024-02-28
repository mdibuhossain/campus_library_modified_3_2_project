import React from 'react'
import { Box, Button, Modal, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { useAuth } from '../../Hooks/useAuth';


const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
};

const CreateTaskModal = ({ RoomInfo, setRoomInfo }) => {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const [formInfo, setFormInfo] = React.useState({ title: "", description: "", deadline: "" });
    const [date, setDate] = React.useState('');
    const [time, setTime] = React.useState('');

    const handleOnChangeForm = (e) => {
        const tmpFormInfo = { ...formInfo };
        tmpFormInfo[e.target.name] = e.target.value;
        setFormInfo(tmpFormInfo);
    }

    const handleOnChangeTime = (e) => {
        const changedTime = e.target.value;
        setTime(changedTime);
        if (date.length > 0) {
            const isoTime = new Date(date + ' ' + changedTime).toUTCString();
            const tmpFormInfo = { ...formInfo };
            tmpFormInfo["deadline"] = isoTime;
            setFormInfo(tmpFormInfo);
        }
    }

    const handleOnChangeDate = (e) => {
        const changedDate = e.target.value;
        setDate(changedDate);
        const isoTime = new Date(changedDate + ' ' + time).toUTCString();
        const tmpFormInfo = { ...formInfo };
        tmpFormInfo["deadline"] = isoTime;
        setFormInfo(tmpFormInfo);
    }

    const handleCreateClassroom = (e) => {
        e.preventDefault();
        axios.post(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/task/create`, {
            ...formInfo,
            email: user?.email,
            roomid: RoomInfo?._id
        }).then(result => {
            if (result?.status === 200) {
                setRoomInfo(pre => {
                    const newData = { ...pre }
                    newData.tasks.push(result?.data)
                    return newData;
                })
            }
        }).catch(err => {
            console.log(err)
        })
    }

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

                    sx={{ ...style, maxWidth: "450px", m: { md: "auto", xs: 2 }, p: 5, bgcolor: "white", borderRadius: 2, boxShadow: '0.65px 1.75px 10px rgb(0, 0, 0, 0.3)' }}
                >
                    <h5 className="mb-5 text-lg">Assignment</h5>
                    <form onSubmit={handleCreateClassroom} className='flex flex-col gap-y-5'>
                        <TextField
                            id="component-task-title"
                            label="Title"
                            variant="standard"
                            name="title"
                            onChange={handleOnChangeForm}
                            required
                        />
                        <TextField
                            id="component-course"
                            label="Instructions"
                            variant="standard"
                            name="description"
                            multiline
                            onChange={handleOnChangeForm}
                            required
                        />

                        <input
                            required
                            type='date'
                            name='date'
                            onChange={handleOnChangeDate}
                            className='border-2 p-2 rounded-md'
                        />
                        <input
                            required
                            type='time'
                            name='time'
                            onChange={handleOnChangeTime}
                            className='border-2 p-2 rounded-md'
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
}

export default CreateTaskModal;