// server.mjs - Render/Node server for Vite SPA + tRPC
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import cors from 'cors'

// ⬇️ Adjust these two imports to match your project structure.
import { appRouter } from './src/server/router.js'
import { createContext } from './src/server/context.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// Mount tRPC at /api/trpc
const handler = createHTTPHandler({
  router: appRouter,
  createContext: ({ req, res }) => createContext({ req, res }),
  onError({ error, path }) {
    console.error('tRPC error on path', path, error)
  },
})
app.all('/api/trpc', (req, res) => handler(req, res))
app.all('/api/trpc/*', (req, res) => handler(req, res))

// Serve static files from dist
const distDir = path.join(__dirname, 'dist')
app.use(express.static(distDir))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
