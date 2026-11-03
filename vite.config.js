import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // host: true lets a phone on the same Wi-Fi open the dev server.
  server: { host: true },
})
