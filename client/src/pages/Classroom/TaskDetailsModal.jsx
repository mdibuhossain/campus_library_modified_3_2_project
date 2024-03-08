import React from "react";
import { Box, Button, Modal, TextField } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import ClearIcon from "@mui/icons-material/Clear";
import axios from "axios";
import dompurify from "dompurify";
import { useAuth } from "../../Hooks/useAuth";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "95%",
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 3,
  overflowY: "auto",
  p: 1,
  pb: 3,
};

const divmod = (n, m) => [Math.trunc(n / m), n % m];
const MS_DAYS = 8.64e7,
  MS_HOURS = 3.6e6,
  MS_MINUTES = 6e4,
  MS_SECONDS = 1e3;

const TaskDetailsModal = ({ task: propsTask, admin }) => {
  const { user } = useAuth();
  const senitizer = dompurify.sanitize;
  const [open, setOpen] = React.useState(false);
  const [rmDays, setRmDays] = React.useState(0);
  const [rmHours, setRmHours] = React.useState(0);
  const [rmMinutes, setRmMinutes] = React.useState(0);
  const [rmSeconds, setRmSeconds] = React.useState(0);
  const [task, setTask] = React.useState(propsTask)
  const [remainingTime, setRemainingTime] = React.useState(
    new Date(task?.deadline).getTime() - new Date().getTime()
  );
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  React.useEffect(() => {
    if (typeof remainingTime === "number" && remainingTime >= 0) {
      const [days, daysMS] = divmod(remainingTime, MS_DAYS);
      const [hours, hoursMS] = divmod(daysMS, MS_HOURS);
      const [minutes, minutesMS] = divmod(hoursMS, MS_MINUTES);
      const [seconds, secondsMS] = divmod(minutesMS, MS_SECONDS);
      setRmDays(days);
      setRmHours(hours);
      setRmMinutes(minutes);
      setRmSeconds(seconds);
    }
  }, [remainingTime]);

  React.useEffect(() => {
    const countDown = () => {
      const interval = setInterval(() => {
        setRemainingTime((pre) => pre - 1000);
      }, 1000);
      return () => clearInterval(interval);
    };
    if (remainingTime / 1000 >= 1 && remainingTime >= 0) {
      return countDown();
    }
  }, []);

  const handleSubmittingWork = async (e) => {
    e.preventDefault();
    const workFile = e.target["assignment"].files[0];
    if (workFile && admin?.email !== user?.email) {
      const formData = new FormData();
      formData.append("email", user?.email)
      formData.append("assignment", workFile)
      axios.post(`${import.meta.env.VITE_APP_BACKEND_API_WITHOUT_GQL}/task/${task?._id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(result => {
        if (result?.status === 200) {
          setTask(result?.data)
          console.log(result?.data)
        }
      }).catch(err => {
        console.log(err)
      })
    } else {
      alert("First select file");
    }
  };

  const handleUnsubmittingWork = async (id) => {
    if (window.confirm("Are you sure want to unsubmit your work?")) {
      axios.patch(`${import.meta.env.VITE_APP_BACKEND_API_WITHOUT_GQL}/task/unsubmit/${id}`, { email: user?.email })
        .then((result) => {
          if (result?.status === 201) {
            setTask(result?.data)
          }
        }).catch(err => {
          console.error(err.message)
        })
    }
  }

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          "&:hover": { boxShadow: "0px 0px 5px #d9d9d9" },
          p: 2,
          borderRadius: 2,
          cursor: "pointer",
          background:
            rmDays || rmHours || rmMinutes || rmSeconds ? "none" : "#f8f8f8",
          boxShadow:
            rmDays || rmHours || rmMinutes || rmSeconds
              ? "none"
              : "inset 0 0 8px #e0dede",
        }}
      >
        <div className="flex align-center items-center gap-2">
          <div className="bg-sky-500 rounded-full p-2 fill-white">
            <svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
              <path d="M7 15h7v2H7zm0-4h10v2H7zm0-4h10v2H7z"></path>
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-.14 0-.27.01-.4.04a2.008 2.008 0 0 0-1.44 1.19c-.1.23-.16.49-.16.77v14c0 .27.06.54.16.78s.25.45.43.64c.27.27.62.47 1.01.55.13.02.26.03.4.03h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19 19H5V5h14v14z"></path>
            </svg>
          </div>
          <div className="w-full flex align-center justify-between">
            <p>{task?.title}</p>
            <p className="text-xs text-gray-400">
              Due {new Date(task?.deadline).toLocaleString()}
            </p>
          </div>
        </div>
      </Box>
      <Modal open={open}>
        <Box sx={{ ...style }}>
          {/* Modal close button */}
          <div className="flex justify-end mb-2" onClick={handleClose}>
            <IconButton>
              <ClearIcon />
            </IconButton>
          </div>
          {/* Main body */}
          <div className="flex gap-5 md:flex-row flex-col justify-between items-start">
            {/* Rich text - Task Description */}
            <div className="flex-1 w-full">
              <div className="shadow-slate-400 p-3 shadow-inner rounded-md w-full max-h-[400px] min-h-[350px] overflow-auto">
                <div
                  dangerouslySetInnerHTML={{
                    __html: senitizer(task?.description),
                  }}
                />
              </div>
            </div>
            {/* Timmer & submission form */}
            <div className="flex flex-col shadow-md shadow-slate-400 p-3 rounded-lg mx-auto max-w-[300px]">
              <p>Remaining submission time</p>
              {/* Timmer */}
              <div className="inline-block border-2 rounded-lg p-2 mx-auto">
                <div
                  className={`flex justify-center gap-1 text-md font-bold ${rmDays || rmHours || rmMinutes || rmSeconds
                    ? "text-gray-600"
                    : "text-gray-300"
                    }`}
                >
                  <div className="flex flex-col justify-center items-center text-center">
                    <span>{rmDays >= 10 ? rmDays : `0${rmDays}`}</span>
                    <span className="text-sm font-medium">Days</span>
                  </div>
                  <span>:</span>
                  <div className="flex flex-col justify-center items-center text-center">
                    <span>{rmHours >= 10 ? rmHours : `0${rmHours}`}</span>
                    <span className="text-sm font-medium">Hours</span>
                  </div>
                  <span>:</span>
                  <div className="flex flex-col justify-center items-center text-center">
                    <span>{rmMinutes >= 10 ? rmMinutes : `0${rmMinutes}`}</span>
                    <span className="text-sm font-medium">Minutes</span>
                  </div>
                  <span>:</span>
                  <div className="flex flex-col justify-center items-center text-center">
                    <span>{rmSeconds >= 10 ? rmSeconds : `0${rmSeconds}`}</span>
                    <span className="text-sm font-medium">Seconds</span>
                  </div>
                </div>
              </div>
              {
                !(admin?.email === user?.email) ? (
                  // Submission form & unsubmission button
                  <div className="mt-4">
                    <p className="font-medium">Your work</p>
                    {
                      !(task?.submission?.[0]) ? (
                        // Submission form
                        <form onSubmit={handleSubmittingWork}>
                          <label className="block bg-gray-50 rounded-full mt-2">
                            <input
                              disabled={!(rmDays || rmHours || rmMinutes || rmSeconds)}
                              type="file"
                              name="assignment"
                              className={`block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${rmDays || rmHours || rmMinutes || rmSeconds
                                ? "file:bg-violet-50 file:text-violet-600 hover:file:bg-violet-100"
                                : ""
                                } `}
                            />
                          </label>
                          <button
                            disabled={!(rmDays || rmHours || rmMinutes || rmSeconds)}
                            className={`mt-3 rounded-md   text-white py-1 w-full ${rmDays || rmHours || rmMinutes || rmSeconds
                              ? "bg-violet-600 hover:bg-violet-700 hover:shadow-md"
                              : "bg-gray-300"
                              }`}
                          >
                            Turn in
                          </button>
                        </form>
                      ) : (
                        // unsubmission button
                        <div>
                          <div className="flex flex-row justify-between ">
                            <a className="w-10/12 flex-1" target="_blank" href={`${import.meta.env.VITE_APP_BACKEND_WITHOUT_GQL}/assignments/${task?.submission?.[0]?.fileId}`}>
                              <div className="py-2 px-3 bg-green-500 rounded-md rounded-e-none cursor-pointer hover:shadow-md shadow-green-500 text-ellipsis overflow-hidden">
                                {task?.submission?.[0]?.originalFilename}
                              </div>
                            </a>
                            <button onClick={() => handleUnsubmittingWork(task?.submission?.[0]?._id)} className="py-2 px-3 bg-red-600 text-white font-bold rounded-e-md hover:shadow-md shadow-orange-600">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    }
                  </div>
                ) : null
              }
            </div>
          </div>
          {
            admin?.email === user?.email ? (
              <div className="mt-10">
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
                <p>bal</p>
              </div>
            ) : null
          }
        </Box>
      </Modal>
    </>
  );
};

export default TaskDetailsModal;
