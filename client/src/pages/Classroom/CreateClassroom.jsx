import React from 'react'
import PageLayout from '../../Layout/PageLayout';
import { Box, Button, TextField } from '@mui/material';

const CreateClassroom = () => {
    return (
        <PageLayout>
            <Box sx={{ maxWidth: "450px", m: { md: "auto", xs: 2 }, p: 5, bgcolor: "white", borderRadius: 2, boxShadow: '0.65px 1.75px 10px rgb(0, 0, 0, 0.3)' }}>
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
                    <Button type='submit' className='self-end w-0' variant="text">Create</Button>
                </form>
            </Box>
        </PageLayout>
    )
}

export default CreateClassroom;