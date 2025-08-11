import { createTRPCReact } from "@trpc/tanstack-react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/trpc/router"; // adjust path

export const trpc = createTRPCReact<AppRouter>();

export function createClient(getToken?: () => string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",                    // ⬅️ must match app.config.ts base
        headers() {
          const token = getToken?.();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
