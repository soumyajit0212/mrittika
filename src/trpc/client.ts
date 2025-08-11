import { createTRPCReact } from "@trpc/tanstack-react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "../server/trpc/root";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  // In the browser, use relative; on SSR (if any), fall back safely
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:3000`;
}

export function makeTRPCClient(getToken?: () => string | null) {
  return trpc.createClient({
    links: [
      loggerLink({
        enabled: () => process.env.NODE_ENV !== "production",
      }),
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        async headers() {
          const token = getToken?.();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
        // If you want to be extra defensive, you can harden fetch here:
        // fetch: (input, init) => fetch(input, { ...init, credentials: "same-origin" }),
      }),
    ],
  });
}
