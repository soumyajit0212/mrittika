// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

const target =
  process.env.VERCEL ? 'vercel' :
  process.env.NETLIFY ? 'netlify' :
  'node-server' // local/dev fallback

export default defineConfig({
  plugins: [
    react(),
    tanstackStart({ target }),
  ],
})
