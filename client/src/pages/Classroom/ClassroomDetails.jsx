import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { useParams } from "react-router-dom";
import { useAuth } from "../../Hooks/useAuth";
import axios from "axios";
import { Dropdown } from '@mui/base/Dropdown';
import { Menu } from '@mui/base/Menu';
import { MenuButton } from '@mui/base/MenuButton';
import TextField from '@mui/material/TextField';
import { Button, Typography } from "@mui/material";
import { styled } from '@mui/system';

const ClassroomDetails = () => {
    const { rid } = useParams();
    const { user } = useAuth();
    const [RoomInfo, setRoomInfo] = React.useState({});
    const [requestEmail, setRequestEmail] = React.useState('')

    const handleFetchRoomDetails = () => {
        axios.get(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/${rid}`, {
            params: { email: user?.email }
        }).then(result => {
            setRoomInfo(result?.data);
        }).catch(err => {
            console.error(err)
        })
    }

    const handleAddMemberDemo = (e) => {
        e.preventDefault();
        axios.post(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/addmember`, { email: requestEmail, roomid: RoomInfo?._id })
            .then(result => {
                if (result?.status === 200)
                    setRoomInfo(result?.data);
            }).catch(err => {
                if (err?.response?.status === 409) {
                    alert(err?.response?.data?.message);
                } else if (err?.response?.status === 404) {
                    alert(err?.response?.data?.message);
                }
            })
    }

    React.useEffect(() => {
        handleFetchRoomDetails();
    }, []);


    if (RoomInfo?.isJoined) {
        return (
            <PageLayout>
                <div className="md:w-3/5 w-full m-auto">
                    <RoomBanner RoomInfo={RoomInfo} />
                    {
                        user?.email === RoomInfo?.admin?.email && <div>
                            <p>Add member:</p>
                            <form onSubmit={handleAddMemberDemo} className="flex items-center">
                                <input
                                    type="text"
                                    placeholder="Enter email"
                                    name="requestEmail"
                                    className="outline-none border-2 border-gray-200 rounded-lg px-2 py-1 rounded-e-none"
                                    onChange={(e) => setRequestEmail(e.target.value)} />
                                <button type="submit"
                                    className="rounded-lg rounded-s-none px-3 py-1 outline-none border-2 border-gray-200 border-s-0 hover:bg-sky-400 hover:border-sky-400 hover:text-white duration-200"
                                >ADD</button>
                            </form>
                        </div>
                    }
                </div>
            </PageLayout>
        )
    } else {
        return (
            <PageLayout>
                <div className="md:w-3/5 w-full m-auto">
                    <RoomBanner RoomInfo={RoomInfo} />
                </div>
            </PageLayout>
        )
    }
}

const RoomBanner = ({ RoomInfo }) => {
    return (
        <>
            <div className='md:mt-10 mb-10 md:shadow-lg md:rounded-lg overflow-hidden bg-sky-200'>
                <div className="px-4 py-5">
                    <Typography variant="h3">{RoomInfo?.courseTitle}</Typography>

                </div>
                <div className="bg-sky-50 px-4 py-2 flex justify-between md:items-center items-start md:flex-row flex-col">
                    <Typography variant="caption">Created by {RoomInfo?.admin?.email}</Typography>
                    {
                        !RoomInfo?.isJoined ? <Button sx={{ my: 1 }} variant="contained" size="small">Join</Button> :
                            <Dropdown>
                                <MenuButton>
                                    <Button sx={{ my: 1 }} variant="outlined" size="small">Joined</Button>
                                </MenuButton>
                                <Menu slots={{ listbox: Listbox }}>
                                    {/* <MenuItem> */}
                                    <Button sx={{ m: 0, p: 0, width: "100%", textTransform: "lowercase", color: "red" }} variant="text">Leave</Button>
                                    {/* </MenuItem> */}
                                </Menu>
                            </Dropdown>
                    }
                </div>
            </div>
        </>
    )

}

const Listbox = styled('ul')(
    ({ theme }) => `
    font-size: 0.875rem;
    box-sizing: border-box;
    margin: 12px 0;
    min-width: 100px;
    border-radius: 12px;
    overflow: auto;
    outline: none;
    background: '#fff';
    border: 1px solid #fff;
    color: red;
    font-weight: 500;
    text-align: center;
    cursor: pointer;
    box-shadow: 0px 4px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.50)' : 'rgba(0,0,0, 0.05)'
        };
    z-index: 1;
    `,
);

export default ClassroomDetails;