// src/trpc/react.tsx
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";

import { trpc } from "./client";

// Prefer relative URL so requests stay on the same origin in prod & dev
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  // SSR (if any). Vercel sets VERCEL_URL without protocol.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
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

  // IMPORTANT: QueryClientProvider should wrap trpc.Provider
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}

// ---- Convenience re-exports ----

// If some files still import { useTRPC } from "~/trpc/react",
// this shim lets them keep working without refactors.
export function useTRPC() {
  return trpc;
}

// If some code needs the raw TRPC client, prefer using the hooks on `trpc`,
// but we can add helpers later if needed.
export { trpc } from "./client";
