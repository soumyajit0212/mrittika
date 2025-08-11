// src/trpc/client.ts
import { trpc } from './react';
import { httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../server/trpc/root';

export function createClient(getToken?: () => string | null) {
  const baseUrl =
    typeof window === 'undefined'
      ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      : ''; // relative in the browser

  return trpc.createClient({
    transformer: superjson,
    links: [
      loggerLink({ enabled: () => process.env.NODE_ENV !== 'production' }),
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers() {
          const token = getToken?.();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
