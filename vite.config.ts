import react from '@vitejs/plugin-react'
import { projectSaves } from './projectSaves.ts'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), projectSaves()],
  server: { watch: { ignored: ["**/public/saves/**"] } },
})

