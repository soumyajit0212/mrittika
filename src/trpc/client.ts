// src/trpc/client.ts
import { createTRPCReact } from "@trpc/tanstack-react-query"; // v11
import { httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../server/trpc/router";

// If you’re SPA-only, this returns '' in the browser so URL is relative
const getBaseUrl = () => {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

export const trpc = createTRPCReact<AppRouter>();

export function createClient(getToken?: () => string | null) {
  return trpc.createClient({
    transformer: superjson,
    links: [
      loggerLink({ enabled: () => process.env.NODE_ENV !== "production" }),
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,   // ⬅️ must be exactly "/trpc"
        fetch(url, opts) {
          // send cookies for login flows
          return fetch(url, { ...opts, credentials: "include" });
        },
        headers() {
          const token = getToken?.();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        },
      }),
    ],
  });
}
