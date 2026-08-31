import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is served from https://<user>.github.io/Network-Education/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/Network-Education/',
})
