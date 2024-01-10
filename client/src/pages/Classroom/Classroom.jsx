import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { Box, Button, IconButton } from "@mui/material"
import DeleteIcon from '@mui/icons-material/Delete';
import CreateClassroomModal from "./CreateClassroomModal";
import { useAuth } from "../../Hooks/useAuth";
import axios from "axios";
import { NavLink } from "react-router-dom";

const Classroom = () => {
    const { user } = useAuth();
    const [myRoom, setMyRoom] = React.useState([])
    const [joinedRoom, setJoinedRoom] = React.useState([])

    const handleFetchClassroomFromDB = () => {
        axios.get(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom`, {
            params: { email: user?.email }
        }).then(result => {
            setMyRoom(result?.data?.myRoom)
            setJoinedRoom(result?.data?.joinedRoom)
        }).catch(err => {
            console.log(err)
        })
    }

    const handleDeleteClassroom = (id) => {
        if (window.confirm("Are you sure want to delete your classroom?")) {
            axios.post(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/delete`, { roomid: id, email: user?.email })
                .then(result => {
                    if (result?.data?.deletedCount)
                        setMyRoom(pre => pre.filter(room => room?._id !== id));
                    else {
                        console.log("Room doesn't exist!");
                    }
                }).catch(err => {
                    console.error(err);
                })
        }
    }

    React.useEffect(() => {
        return handleFetchClassroomFromDB()
    }, [])
    return (
        <PageLayout>
            <Box sx={{ pt: 4, px: 5 }}>
                <CreateClassroomModal setMyRoom={setMyRoom} />
                <Box sx={{ pt: 4 }}>
                    <Box>
                        <h3 className="text-xl">Classrooms you manage ({myRoom?.length})</h3>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 2 }}>
                            {
                                myRoom?.map((room) => (
                                    <div key={room?._id} className="rounded-xl border-2 border-gray-300 overflow-hidden w-[270px] break-words">
                                        <div className="py-2 bg-gray-300 px-4">
                                            <b className="">{room?.roomName}</b>
                                        </div>
                                        <div className="py-3 px-4">
                                            <p><em>Course Title</em>: {room?.courseTitle}</p>
                                            <p><em>Course Code</em>: {room?.courseCode}</p>
                                            <p><em>Admin</em>: {user?.email} (You)</p>
                                            <div className="flex justify-between mt-4">
                                                <NavLink to={`${room?._id}`}><Button size="small" variant="contained">View</Button></NavLink>
                                                <IconButton onClick={() => handleDeleteClassroom(room?._id)} size="small"><DeleteIcon /></IconButton>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </Box>
                    </Box>
                    <Box>
                        <h3 className="text-xl">All classrooms you've joined ({joinedRoom?.length})</h3>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 2 }}>
                            {
                                joinedRoom?.map((room) => (
                                    <div key={room?._id} className="rounded-xl border-2 border-gray-300 overflow-hidden w-[270px] break-words">
                                        <div className="py-2 bg-gray-300 px-4">
                                            <b className="">{room?.roomName}</b>
                                        </div>
                                        <div className="py-3 px-4">
                                            <p><em>Course Title</em>: {room?.courseTitle}</p>
                                            <p><em>Course Code</em>: {room?.courseCode}</p>
                                            <p><em>Admin</em>: {user?.email}</p>
                                            <div className="flex justify-between mt-4">
                                                <NavLink to={`${room?._id}`}><Button size="small" variant="contained">View</Button></NavLink>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </Box>
                    </Box>
                </Box>
            </Box>
        </PageLayout>
    )
}

export default Classroom