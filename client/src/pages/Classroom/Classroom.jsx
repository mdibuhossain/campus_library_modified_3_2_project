import React from "react"
import PageLayout from "../../Layout/PageLayout"
import { Box, Button } from "@mui/material"
import AddIcon from '@mui/icons-material/Add';
import CreateClassroomModal from "./CreateClassroomModal";

const Classroom = () => {
    return (
        <PageLayout>
            <Box sx={{ pt: 4, px: 5 }}>
                <CreateClassroomModal />
                <Box sx={{ pt: 4 }}>
                    <Box>
                        <h1>Classrooms you manage</h1>
                        <Box>

                        </Box>
                    </Box>
                    <Box>
                        <h1>All classrooms you've joined (0)</h1>
                    </Box>
                </Box>
            </Box>
        </PageLayout>
    )
}

export default Classroom