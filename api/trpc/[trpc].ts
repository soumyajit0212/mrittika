// api/trpc/[trpc].ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHTTPHandler } from '@trpc/server/adapters/node-http'
import { appRouter } from '../../src/server/trpc/router'
import { createTRPCContext } from '../../src/server/trpc/context'

const handler = createHTTPHandler({
  router: appRouter,
  createContext: ({ req, res }) => createTRPCContext({ req, res }),
  onError({ error, path }) {
    console.error('tRPC error on path', path, error)
  },
})

export default function vercelTrpcHandler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  return handler(req, res)
}
