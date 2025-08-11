// src/trpc/react.tsx
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink, loggerLink } from "@trpc/react-query";
import SuperJSON from "superjson";
import type { AppRouter } from "~/server/trpc/root";

// Canonical v11 hook namespace: trpc.<routerPath>.<useQuery|useMutation|...>
export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  // Browser -> same origin
  if (typeof window !== "undefined") return "";
  // Serverless (Vercel)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local dev
  return "http://localhost:3000";
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  const [client] = React.useState(() =>
    trpc.createClient({
      transformer: SuperJSON,
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          fetch(url, opts) {
            // include cookies for auth if you use them
            return fetch(url, { ...opts, credentials: "include" });
          },
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={client} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}

/** ---------- Compatibility shims (so older code keeps working) ---------- */

// If some pages still do: `import { useTRPC } from "~/trpc/react"`
export function useTRPC() {
  // Return the namespace so calls like useTRPC().login.useMutation still work.
  return trpc;
}

// If some code expects `useTRPCClient()` to exist:
export function useTRPCClient() {
  // In v11 we can get the underlying client off the utils context
  return trpc.useUtils().client;
}
