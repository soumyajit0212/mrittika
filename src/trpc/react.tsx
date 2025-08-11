// src/trpc/react.tsx
import { useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SuperJSON from "superjson";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";

import type { AppRouter } from "~/server/trpc/root";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
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

/** Back-compat shim so existing code `import { useTRPC } from "~/trpc/react"` still works */
export const useTRPC = () => trpc.useContext();
/** If you used `useTRPCClient` before, this gives you the underlying tRPC client */
export const useTRPCClient = () => trpc.useContext().client;
