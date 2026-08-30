import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const REACT_CORE = [
    'node_modules/react/',
    'node_modules/react-dom/',
    'node_modules/scheduler/',
    'node_modules/react-router/',
    'node_modules/react-router-dom/',
]

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (REACT_CORE.some((p) => id.includes(p))) return 'vendor-react'
                    return undefined
                },
            },
        },
    },
})
