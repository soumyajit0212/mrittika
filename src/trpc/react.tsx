// src/trpc/react.tsx
import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";

// The typed React adapter
export const trpc = createTRPCReact<AppRouter>();

// ✅ Keep backward-compat with existing imports
export const useTRPC = () => trpc;

// If you also need the raw client somewhere later, you can add:
// export const useTRPCClient = () => trpc.useContext().client; // optional

function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // same-origin in browser
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [client] = useState(() =>
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
      <trpc.Provider client={client} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
