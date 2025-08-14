// src/trpc/react.tsx
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
// If this import errors, ensure main.ts exports: `export type AppRouter = typeof appRouter`
import type { AppRouter } from "~/server/trpc/main";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  // Client bundles use relative; works on Vercel/Render
  if (typeof window !== "undefined") return "";
  // (SSR fallback if you add SSR later)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.RENDER_EXTERNAL_URL) return `https://${process.env.RENDER_EXTERNAL_URL}`;
  return `http://localhost:${process.env.PORT ?? 5173}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const [client] = React.useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
