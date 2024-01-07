import React from 'react'
import { Box, Button, Modal, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';


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

const CreateClassroomModal = () => {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    return (
        <>
            <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleOpen}
            >Create Classroom</Button>
            <Modal
                open={open}
            >
                <Box

                    sx={{ ...style, maxWidth: "450px", m: { md: "auto", xs: 2 }, p: 5, bgcolor: "white", borderRadius: 2, boxShadow: '0.65px 1.75px 10px rgb(0, 0, 0, 0.3)' }}
                >
                    <h5 className="mb-5 text-lg">Create classroom</h5>
                    <form className='flex flex-col gap-y-5'>
                        <TextField
                            id="component-classroom-name"
                            label="Classroom name"
                            multiline
                            variant="standard"
                            name="room_name"
                            required
                        />
                        <TextField
                            id="component-course"
                            label="Course title"
                            multiline
                            variant="standard"
                            name="course_title"
                            required
                        />
                        <TextField
                            id="component-course-code"
                            label="Course code"
                            multiline
                            variant="standard"
                            name="course_code"
                            required
                        />
                        <div className="flex flex-row-reverse gap-x-3">
                            <Button type='submit' className='self-end w-0' variant="text" color='error' onClick={handleClose}>Close</Button>
                            <Button type='submit' className='self-end w-0' variant="text">Create</Button>
                        </div>
                    </form>
                </Box>
            </Modal>
        </>
    )
}

export default CreateClassroomModal;