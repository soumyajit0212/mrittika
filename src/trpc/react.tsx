// src/trpc/react.tsx
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";

export const trpc = createTRPCReact<AppRouter>();

// Back-compat helpers (optional)
export const useTRPC = () => trpc.useUtils();
export const useTRPCClient = () => trpc.useContext().client;

function getBaseUrl() {
  // In the browser, keep it relative so it hits the same origin
  if (typeof window !== "undefined") return "";
  // On Vercel server
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local dev
  return "http://localhost:3000";
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
