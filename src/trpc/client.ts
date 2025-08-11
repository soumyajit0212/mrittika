import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../server/trpc/root';

export const trpc = createTRPCReact<AppRouter>();

// If you pass a token getter, we'll add it to headers
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
        url: `${baseUrl}/trpc`, // matches app.config.ts base
        headers() {
          const token = getToken?.();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
