/// <reference types="vinxi/types/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles.css";
import { createRouter } from "./router";

// tRPC client + helpers
import { trpc, makeTRPCClient } from "./trpc/client";

const router = createRouter();
const queryClient = new QueryClient();

// if you store a JWT locally, wire it here
const getToken = () => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  } catch {
    return null;
  }
};

const trpcClient = makeTRPCClient(getToken);

const rootEl = document.getElementById("root")!;
if (!rootEl.innerHTML) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>
    </React.StrictMode>
  );
}
