import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Critical for Docker on Windows
    },
    host: true, // Helper to listen on all IPs (0.0.0.0)
    strictPort: true,
    port: 3000, 
  }
})