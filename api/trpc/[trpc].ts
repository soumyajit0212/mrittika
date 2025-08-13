// api/trpc/[trpc].ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'

// ⬇️ Adjust these two imports to match where your router/context live.
// Common locations are: src/server/router, src/server/trpc, src/trpc, etc.
import { appRouter } from '../../src/server/router'
import { createContext } from '../../src/server/context'

// tRPC handler for Node HTTP-style req/res (works on Vercel Node functions)
const handler = createHTTPHandler({
  router: appRouter,
  // If your createContext expects ({ req, res }) this will satisfy it.
  // If your context is different, adapt this accordingly.
  createContext: (opts) => createContext({ req: opts.req, res: opts.res }),
  onError({ error, path }) {
    console.error('tRPC error on path', path, error)
  },
})

export default (req: VercelRequest, res: VercelResponse) => {
  // Important: do NOT export any "config.runtime" here; we’ll set runtime in vercel.json
  return handler(req, res)
}
