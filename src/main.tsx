/// <reference types="vinxi/types/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import SuperJSON from "superjson";

import { createRouter } from "./router";
import { trpc } from "./trpc/client"; // must export createTRPCReact<AppRouter>() as `trpc`
import "./styles.css";

// On the browser, use relative URL so we stay on the same origin.
// (SSR fallback kept for local dev builds, but SPA won't hit it.)
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const router = createRouter();
const rootElement = document.getElementById("root")!;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const trpcClient = trpc.createClient({
  transformer: SuperJSON,
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`, // MUST match app.config.ts `base` for the trpc router
      headers() {
        return { "x-trpc-source": "web" };
      },
    }),
  ],
});

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <RouterProvider router={router} />
        </trpc.Provider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
