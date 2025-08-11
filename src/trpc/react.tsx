// src/trpc/react.tsx
import { useState, useMemo, useContext, createContext, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "~/server/trpc/root";

export const trpc = createTRPCReact<AppRouter>();

// Hold the raw tRPC client so we can expose a stable useTRPCClient() hook
type RawClient = ReturnType<typeof trpc.createClient>;
const TRPCClientContext = createContext<RawClient | null>(null);

function getBaseUrl() {
  // Same-origin in browser so cookies/sessions work on Vercel
  if (typeof window !== "undefined") return "";
  // Fallback for build-time / server contexts
  return "http://localhost:3000";
}

export function TRPCReactProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  const client = useMemo<RawClient>(() => {
    return trpc.createClient({
      transformer: SuperJSON,
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          // make sure cookies (session) flow on Vercel
          fetch: (url, opts) =>
            fetch(url, {
              ...opts,
              credentials: "include",
            }),
        }),
      ],
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCClientContext.Provider value={client}>
        <trpc.Provider client={client} queryClient={queryClient}>
          {children}
        </trpc.Provider>
      </TRPCClientContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * Back-compat shims so existing imports keep working:
 *   const api = useTRPC(); api.login.useMutation()  ✅
 *   const client = useTRPCClient();                 ✅
 */
export const useTRPC = () => trpc;
export function useTRPCClient() {
  const client = useContext(TRPCClientContext);
  if (!client) throw new Error("useTRPCClient must be used inside <TRPCReactProvider>");
  return client;
}
