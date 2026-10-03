import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Puerto propio para no chocar con otras apps. Si está ocupado, Vite usa el siguiente libre.
  server: { port: 5180 },
  preview: { port: 5180 },
})
