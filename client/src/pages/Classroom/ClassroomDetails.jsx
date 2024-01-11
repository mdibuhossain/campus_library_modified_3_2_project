import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { useParams } from "react-router-dom";
import { useAuth } from "../../Hooks/useAuth";
import axios from "axios";

const ClassroomDetails = () => {
    const { rid } = useParams();
    const { user } = useAuth();
    const [RoomInfo, setRoomInfo] = React.useState({});

    const handleFetchRoomDetails = () => {
        axios.get(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/${rid}`, {
            params: { email: user?.email }
        }).then(result => {
            setRoomInfo(result?.data);
        }).catch(err => {
            console.error(err)
        })
    }

    React.useEffect(() => {
        handleFetchRoomDetails();
    }, []);

    if (RoomInfo?.isJoined) {
        return (
            <PageLayout>
                <h1>This is Room details</h1>
            </PageLayout>
        )
    } else {
        return (
            <PageLayout>
                <h1>You are not member of this classroom</h1>
            </PageLayout>
        )
    }
}

export default ClassroomDetails;