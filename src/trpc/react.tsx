// src/trpc/react.tsx
import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "~/server/trpc/root";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  // On the browser, use same-origin so cookies/sessions work on Vercel
  if (typeof window !== "undefined") return window.location.origin;
  // Fallback for local dev during SSR/prerendered builds
  return "http://localhost:3000";
}

export function TRPCReactProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  const [client] = useState(() =>
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

// Back-compat helpers (so older imports keep working)
export const useTRPC = () => trpc.useContext();
export const useTRPCClient = () => trpc.useUtils().client ?? (trpc as any)._client;
