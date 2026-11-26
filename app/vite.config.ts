import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api goes to the Python API (python -m abaci.server). In production the API serves dist/.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8787' } },
})
