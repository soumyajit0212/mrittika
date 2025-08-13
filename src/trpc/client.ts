import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/trpc/router"; // adjust path

export const trpc = createTRPCReact<AppRouter>();

export function createClient(getToken?: () => string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",                    // ⬅️ must match app.config.ts base
        headers() {
          const token = getToken?.();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
