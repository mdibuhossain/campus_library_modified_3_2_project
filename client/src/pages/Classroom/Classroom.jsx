import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { Box, Button, IconButton } from "@mui/material"
import DeleteIcon from '@mui/icons-material/Delete';
import CreateClassroomModal from "./CreateClassroomModal";
import { useAuth } from "../../Hooks/useAuth";
import { useLazyQuery, useMutation } from "@apollo/client";
import { GET_CLASSROOMS, DELETE_CLASSROOM } from "../../queries/query";
import { NavLink } from "react-router-dom";
import ClassroomLoading from "../../components/Loading/ClassroomLoading";

const Classroom = () => {
    const { user, token } = useAuth();
    const [myRoom, setMyRoom] = React.useState([])
    const [joinedRoom, setJoinedRoom] = React.useState([])
    const [loading, setLoading] = React.useState(false)

    const [fetchClassrooms] = useLazyQuery(GET_CLASSROOMS, { fetchPolicy: "network-only" });
    const [deleteClassroom] = useMutation(DELETE_CLASSROOM);

    const handleFetchClassroomFromDB = () => {
        setLoading(true);
        fetchClassrooms({ variables: { token } })
            .then(({ data }) => {
                setMyRoom(data?.getClassrooms?.myRoom)
                setJoinedRoom(data?.getClassrooms?.joinedRoom)
            }).catch(err => {
                console.log(err)
            }).finally(() => {
                setLoading(false)
            })
    }

    const handleDeleteClassroom = (id) => {
        if (window.confirm("Are you sure want to delete your classroom?")) {
            deleteClassroom({ variables: { roomid: id, token } })
                .then(({ data }) => {
                    if (data?.deleteClassroom?.success)
                        setMyRoom(pre => pre.filter(room => room?._id !== id));
                    else {
                        console.log("Room doesn't exist!");
                    }
                }).catch(err => {
                    console.error(err.message);
                })
        }
    }

    React.useEffect(() => {
        token && handleFetchClassroomFromDB();
    }, [token])
    return (
        <PageLayout>
            <Box sx={{ pt: 4, px: 5 }}>
                <CreateClassroomModal setMyRoom={setMyRoom} />
                <Box sx={{ pt: 4 }}>
                    <Box>
                        <h3 className="text-xl">Classrooms you manage ({myRoom?.length})</h3>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 2 }}>
                            {
                                loading ? (
                                    [1, 2, 3].map((_, index) => <ClassroomLoading key={index} />)
                                ) :
                                    myRoom?.map((room) => (
                                        <div key={room?._id} className="rounded-xl border-2 border-gray-300 overflow-hidden w-[300px] break-words">
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
                                loading ? (
                                    [1, 2, 3].map((_, index) => <ClassroomLoading key={index} />)
                                ) :
                                    joinedRoom?.map((room) => (
                                        <div key={room?._id} className="rounded-xl border-2 border-gray-300 overflow-hidden w-[300px] break-words flex flex-col">
                                            <div className="py-2 bg-gray-300 px-4">
                                                <b className="">{room?.roomName}</b>
                                            </div>
                                            <div className="py-3 px-4 flex flex-col justify-between h-full">
                                                <div>
                                                    <p><em>Course Title</em>: {room?.courseTitle}</p>
                                                    <p><em>Course Code</em>: {room?.courseCode}</p>
                                                    <p><em>Admin</em>: {user?.email}</p>
                                                </div>
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