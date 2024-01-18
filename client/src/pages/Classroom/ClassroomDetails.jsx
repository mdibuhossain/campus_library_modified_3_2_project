import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { useParams } from "react-router-dom";
import { useAuth } from "../../Hooks/useAuth";
import axios from "axios";
import { Dropdown } from '@mui/base/Dropdown';
import { Menu } from '@mui/base/Menu';
import { MenuButton } from '@mui/base/MenuButton';
import { Button, Tooltip, FormControl, InputLabel, MenuItem, Select, ListSubheader } from '@mui/material';
import { styled } from '@mui/system';
import { semesterList } from "../../utility/semesterList";
import useUtility from "../../Hooks/useUtility";
import { tagTitle } from "../../utility/tagTitle";

const ClassroomDetails = () => {
    const { rid } = useParams();
    const { user, userDesignation } = useAuth();
    const { getDepartments, deptLoading } = useUtility()
    const [RoomInfo, setRoomInfo] = React.useState({});
    const [requestEmail, setRequestEmail] = React.useState('')
    const [semester, setSemester] = React.useState('')
    const [department, setDepartment] = React.useState('')

    const handleFetchRoomDetails = () => {
        axios.get(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/${rid}`, {
            params: { email: user?.email }
        }).then(result => {
            setRoomInfo(result?.data);
        }).catch(err => {
            console.error(err)
        })
    }

    const handleAddSingleMember = (e) => {
        e.preventDefault();
        axios.post(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/addmember`, { email: requestEmail, roomid: RoomInfo?._id })
            .then(result => {
                if (result?.status === 200) {
                    setRoomInfo(result?.data);
                    alert("User successfully added!");
                }
            }).catch(err => {
                if (err?.response?.status === 409) {
                    alert(err?.response?.data?.message);
                } else if (err?.response?.status === 404) {
                    alert(err?.response?.data?.message);
                }
            })
    }

    const handleAddBulkMember = (e) => {
        e.preventDefault();
        axios.post(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/addmember/bulk`, {
            semester: semester,
            department: department, roomid: RoomInfo?._id
        }).then(result => {
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
    console.log(RoomInfo)
    React.useEffect(() => {
        handleFetchRoomDetails();
    }, []);


    if (RoomInfo?.isJoined) {
        return (
            <PageLayout>
                <div className="md:w-3/5 w-full m-auto">
                    <RoomBanner RoomInfo={RoomInfo} />
                    {
                        user?.email === RoomInfo?.admin?.email &&
                        <div className="grid grid-cols-2">
                            <div>
                                <p className="mb-2">Add specific member:</p>
                                <form onSubmit={handleAddSingleMember} className="flex items-center">
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
                            {
                                userDesignation === 'teacher' && <div>
                                    <p className="mb-2">Add the students of:</p>
                                    <form onSubmit={handleAddBulkMember} className="flex w-full justify-end items-stretch h-[36px]">
                                        <FormControl size="small" fullWidth sx={{ height: '100%', mb: 2 }}>
                                            <InputLabel id="department-selection">department</InputLabel>
                                            <Select
                                                value={department}
                                                labelId="department-selection"
                                                id="department-selection"
                                                label="Department"
                                                name="categories"
                                                sx={{ height: "100%", borderRadius: 2, borderTopRightRadius: 0, borderEndEndRadius: 0 }}
                                                onChange={(e) => setDepartment(e.target.value)}
                                                required
                                            >
                                                {!deptLoading && getDepartments.map((item, index) => (
                                                    item &&
                                                    <MenuItem key={index} value={item}>
                                                        <Tooltip title={tagTitle[item] || ''} placement="top-start" arrow>
                                                            <div className="w-full">{item.toUpperCase()}</div>
                                                        </Tooltip>
                                                    </MenuItem>
                                                ))}
                                                <MenuItem value="others" sx={{ bgcolor: "orange", ":hover": { bgcolor: "skyblue" } }}>
                                                    <Tooltip title="If not sure." placement="top-start" arrow>
                                                        <div className="w-full">OTHERS</div>
                                                    </Tooltip>
                                                </MenuItem>
                                            </Select>
                                        </FormControl>
                                        <FormControl fullWidth sx={{ height: '100%' }}>
                                            <InputLabel size="small" htmlFor="semester-select">semester</InputLabel>
                                            <Select
                                                value={semester}
                                                name="semester"
                                                id="semester-select"
                                                labelId="semester-select"
                                                label="semester"
                                                sx={{ height: "100%", borderRadius: 0 }}
                                                onChange={(e) => setSemester(e.target.value)}
                                                required
                                            >
                                                {
                                                    semesterList.map((sem) => {
                                                        if (sem?.title) {
                                                            return (
                                                                <ListSubheader key={sem.title} sx={{ fontWeight: "700" }}>{sem.title}</ListSubheader>
                                                            )
                                                        }
                                                        return (
                                                            <MenuItem key={sem} value={sem} sx={{ ml: 1 }}>{sem}</MenuItem>
                                                        )
                                                    })
                                                }
                                            </Select>
                                        </FormControl>
                                        <Button type="submit" sx={{ height: "100%", borderRadius: 2, borderTopLeftRadius: 0, borderEndStartRadius: 0, boxShadow: "none" }} variant="contained" >Add</Button>
                                    </form>
                                </div>
                            }
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
                    <h3 className="text-4xl">{RoomInfo?.roomName}</h3>
                    <h5 className="text-sm pt-2">course title: {RoomInfo?.courseTitle} ({RoomInfo?.courseCode})</h5>
                </div>
                <div className="bg-sky-50 px-4 py-2 flex justify-between md:items-center items-start md:flex-row flex-col">
                    <p className="text-xs">Created by {RoomInfo?.admin?.email}</p>
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