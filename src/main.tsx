/// <reference types="vinxi/types/client" />
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, makeTRPCClient } from "./trpc/client";

import "./styles.css";
import { createRouter } from "./router";

const router = createRouter();
const queryClient = new QueryClient();
const trpcClient = makeTRPCClient();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <RouterProvider router={router} />
        </trpc.Provider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
