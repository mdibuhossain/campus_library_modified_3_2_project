import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { useParams } from "react-router-dom";
import { useAuth } from "../../Hooks/useAuth";
import axios from "axios";
import { Dropdown } from '@mui/base/Dropdown';
import { Menu } from '@mui/base/Menu';
import { MenuButton } from '@mui/base/MenuButton';
import { ButtonBase, Button, Tooltip, FormControl, InputLabel, Box, Modal, MenuItem, Select, Tab, Tabs, ListSubheader } from '@mui/material';
import { styled } from '@mui/system';
import { semesterList } from "../../utility/semesterList";
import useUtility from "../../Hooks/useUtility";
import { tagTitle } from "../../utility/tagTitle";

const ModalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: "95%",
    maxWidth: "450px",
    bgcolor: 'background.paper',
    boxShadow: 24,
};

const ClassroomDetails = () => {
    const { rid } = useParams();
    const { user } = useAuth();
    const [RoomInfo, setRoomInfo] = React.useState({});
    const [tabIndex, setTabIndex] = React.useState(0);

    const handleFetchRoomDetails = () => {
        axios.get(`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/classroom/${rid}`, {
            params: { email: user?.email }
        }).then(result => {
            setRoomInfo(result?.data);
        }).catch(err => {
            console.error(err)
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
                    <RoomBanner RoomInfo={RoomInfo} tabIndex={tabIndex} setTabIndex={setTabIndex} setRoomInfo={setRoomInfo} />
                </div>
            </PageLayout>
        )
    } else {
        return (
            <PageLayout>
                <div className="md:w-3/5 w-full m-auto">
                    <RoomBanner RoomInfo={RoomInfo} tabIndex={tabIndex} setTabIndex={setTabIndex} setRoomInfo={setRoomInfo} />
                </div>
            </PageLayout>
        )
    }
}

const ShowMembers = ({ RoomInfo }) => {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    return (
        <>
            <div className="flex -space-x-3 rtl:space-x-reverse mb-5">
                {
                    RoomInfo?.members?.slice(0, 3)?.map((mem, idx) => (
                        <button key={idx} onClick={handleOpen} className="w-8 h-8 border-2 border-gray-400 rounded-full bg-gray-300 hover:bg-gray-200 flex justify-center items-center text-sm font-medium text-center text-slate-700">{mem.displayName.slice(0, 2).toUpperCase()}</button>
                    ))
                }
                {
                    RoomInfo?.members?.length > 3 && <button onClick={handleOpen} className="flex items-center justify-center w-8 h-8 text-xs font-medium text-white bg-gray-700 border-2 border-white rounded-full hover:bg-gray-600 dark:border-gray-800" href="#">{RoomInfo?.members?.length - 2}+</button>
                }
            </div>
            <Modal
                open={open}
                onClose={handleClose}
            >
                <MemberList RoomInfo={RoomInfo} user={user} isModal={true} />
            </Modal >
        </>
    )
}

const MemberList = ({ RoomInfo, user, isModal }) => {
    return (
        <Box

            sx={{ ...(isModal && ModalStyle), m: { md: "auto", xs: 'auto' }, p: isModal ? 3 : 0, bgcolor: "white", borderRadius: 2, boxShadow: isModal === true ? '0.65px 1.75px 10px rgb(0, 0, 0, 0.3)' : '' }}
        >
            <h3>Members</h3>
            <div className="flex flex-col gap-3 mt-3">
                <div className="flex justify-start items-center">
                    <div className="w-7 h-7 border-2 border-gray-400 rounded-full bg-gray-100 flex justify-center items-center text-xs font-medium text-center text-slate-700">{RoomInfo?.admin?.displayName.slice(0, 2).toUpperCase()}</div>
                    <p className="ms-2">{RoomInfo?.admin?.displayName} (Admin) {user?.email === RoomInfo?.admin?.email && '(You)'}</p>
                </div>
                {
                    RoomInfo?.members?.map((member) => (
                        <div key={member.email} className="flex justify-start items-center">
                            <div className="w-7 h-7 border-2 border-gray-400 rounded-full bg-gray-300 flex justify-center items-center text-xs font-medium text-center text-slate-700">{member.displayName.slice(0, 2).toUpperCase()}</div>
                            <p className="ms-2">{member.displayName} {user?.email === member.email && '(You)'}</p>
                        </div>
                    ))
                }
            </div>
        </Box >
    )
}

const MemberAddingSection = ({ RoomInfo, setRoomInfo }) => {
    const { user, userDesignation } = useAuth();
    const { getDepartments, deptLoading } = useUtility()
    const [requestEmail, setRequestEmail] = React.useState('')
    const [semester, setSemester] = React.useState('')
    const [department, setDepartment] = React.useState('')

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

    return (
        user?.email === RoomInfo?.admin?.email &&
        <div className="grid lg:grid-cols-2 lg:gap-0 gap-5 grid-cols-1">
            <div>
                <p className="mb-2">Add specific member:</p>
                <form onSubmit={handleAddSingleMember} className="flex items-center">
                    <input
                        type="text"
                        placeholder="Enter email"
                        name="requestEmail"
                        className="outline-none border-2 border-gray-200 rounded-lg px-2 py-1 rounded-e-none max-lg:w-full"
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
    )
}

const RoomBanner = ({ RoomInfo, tabIndex, setTabIndex, setRoomInfo }) => {
    const { user } = useAuth();
    return (
        <>
            <div className='md:mt-10 mb-10 md:shadow-lg md:rounded-lg overflow-hidden bg-sky-200'>
                <div className="px-4 py-5">
                    <h3 className="text-4xl">{RoomInfo?.roomName}</h3>
                    <h5 className="text-sm pt-2">Course title: {RoomInfo?.courseTitle} ({RoomInfo?.courseCode?.toUpperCase()})</h5>
                </div>
                <div className="bg-sky-50 px-4 py-2 flex justify-between md:items-center items-start md:flex-row flex-col">
                    <p className="text-xs">Created by {RoomInfo?.admin?.email}</p>
                    {
                        !RoomInfo?.isJoined ? <Button sx={{ my: 1 }} variant="contained" size="small">Join</Button> :
                            <Dropdown>
                                <MenuButton>
                                    <Box sx={{ my: 1, p: "6px", border: "1px solid #1565c0", color: "#1565c0", borderRadius: 2, fontSize: "0.9rem" }} size="small">Joined</Box>
                                </MenuButton>
                                <Menu slots={{ listbox: Listbox }}>
                                    {/* <MenuItem> */}
                                    <Button sx={{ m: 0, p: 0, width: "100%", textTransform: "lowercase", color: "red" }} variant="text">Leave</Button>
                                    {/* </MenuItem> */}
                                </Menu>
                            </Dropdown>
                    }
                </div>
                <div className="bg-stone-100">
                    <Tabs value={tabIndex} onChange={(event, newIndex) => setTabIndex(newIndex)}>
                        <Tab label="Stream" sx={{ fontWeight: 600, textTransform: "capitalize" }} />
                        <Tab label="Classwork" sx={{ fontWeight: 600, textTransform: "capitalize" }} />
                        <Tab label="People" sx={{ fontWeight: 600, textTransform: "capitalize" }} />
                    </Tabs>
                </div>
                <div className="bg-white pt-5 md:p-8">
                    <TabViewPanel value={tabIndex} index={0}>
                        <div className="max-md:w-[95%] mx-auto">
                            {RoomInfo?.members?.length > 0 && <ShowMembers RoomInfo={RoomInfo} />}
                            <MemberAddingSection RoomInfo={RoomInfo} setRoomInfo={setRoomInfo} />
                        </div>
                    </TabViewPanel>
                    <TabViewPanel value={tabIndex} index={1}>
                        cal
                    </TabViewPanel>
                    <TabViewPanel value={tabIndex} index={2}>
                        <MemberList RoomInfo={RoomInfo} user={user} isModal={false} />
                    </TabViewPanel>
                </div>
            </div>
        </>
    )
}

const TabViewPanel = (props) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
    );
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