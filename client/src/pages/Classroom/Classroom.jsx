import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { Box, Button } from "@mui/material"
import AddIcon from '@mui/icons-material/Add';
import CreateClassroomModal from "./CreateClassroomModal";
import { useAuth } from "../../Hooks/useAuth";
import axios from "axios";

const Classroom = () => {
    const { user } = useAuth();
    const [myRoom, setMyRoom] = React.useState([])
    const [joinedRoom, setJoinedRoom] = React.useState([])

    console.log(myRoom, joinedRoom)

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

    React.useEffect(() => {
        return handleFetchClassroomFromDB()
    }, [])
    return (
        <PageLayout>
            <Box sx={{ pt: 4, px: 5 }}>
                <CreateClassroomModal />
                <Box sx={{ pt: 4 }}>
                    <Box>
                        <h1>Classrooms you manage</h1>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {
                                myRoom?.map((room) => (
                                    <div key={room?._id} className="rounded-xl border-2 border-gray-300 overflow-hidden w-[270px] break-words">
                                        <div className="py-2 bg-gray-300 px-4">
                                            <b className="">{room?.roomName}</b>
                                        </div>
                                        <div className="pb-1 px-4">
                                            <p><em>Course Title</em>: {room?.courseTitle}</p>
                                            <p><em>Course Code</em>: {room?.courseCode}</p>
                                            <p><em>Admin</em>: {user?.email}</p>
                                        </div>
                                    </div>
                                ))
                            }
                        </Box>
                    </Box>
                    <Box>
                        <h1>All classrooms you've joined (0)</h1>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {
                                joinedRoom?.map((room) => (
                                    <div key={room?._id} className="rounded-xl border-2 border-gray-300 overflow-hidden w-[270px] break-words">
                                        <div className="py-2 bg-gray-300 px-4">
                                            <b className="">{room?.roomName}</b>
                                        </div>
                                        <div className="pb-1 px-4">
                                            <p><em>Course Title</em>: {room?.courseTitle}</p>
                                            <p><em>Course Code</em>: {room?.courseCode}</p>
                                            <p><em>Admin</em>: {user?.email}</p>
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