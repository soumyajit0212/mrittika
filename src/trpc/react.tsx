// src/trpc/react.tsx
import React, { useMemo, useState, useContext, createContext } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import { createTRPCReact } from "@trpc/react-query";
import type { TRPCClient } from "@trpc/client";

import type { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";

// The typed React adapter (v11)
export const trpc = createTRPCReact<AppRouter>();

// --- Back-compat shims (so existing imports keep working) ---
/** Old code does: `const t = useTRPC(); t.login.useMutation()` */
export function useTRPC() {
  return trpc;
}

/** Some places may have used useTRPCClient() */
const ClientCtx = createContext<TRPCClient<AppRouter> | null>(null);
export function useTRPCClient() {
  const c = useContext(ClientCtx);
  if (!c) throw new Error("useTRPCClient must be used inside <TRPCReactProvider>");
  return c;
}

/** Some code might import TRPCProvider instead of TRPCReactProvider */
export function TRPCProvider(props: { children: React.ReactNode }) {
  return <TRPCReactProvider>{props.children}</TRPCReactProvider>;
}
// ------------------------------------------------------------

function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // same-origin in the browser
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

  // memo so the ClientCtx value is stable
  const clientValue = useMemo(() => client, [client]);

  return (
    <QueryClientProvider client={queryClient}>
      <ClientCtx.Provider value={clientValue}>
        <trpc.Provider client={client} queryClient={queryClient}>
          {children}
        </trpc.Provider>
      </ClientCtx.Provider>
    </QueryClientProvider>
  );
}
