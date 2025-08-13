// api/trpc/[trpc].ts
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter } from '../../src/server/trpc/router'      // <-- adjust if your router path differs
import { createContext } from '../../src/server/trpc/context'  // <-- adjust if needed

const handler = createHTTPHandler({
  router: appRouter,
  createContext,
  // This should match the deployed base path for the function:
  // /api/trpc/<procedure>
  endpoint: '/api/trpc',
})

export default function vercelHandler(req: any, res: any) {
  // Allow preflight on same path (helps prevent stray 405s)
  if (req.method === 'OPTIONS') {
    res.status(204)
      .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'content-type')
      .end()
    return
  }
  return handler(req, res)
}
