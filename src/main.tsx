/// <reference types="vinxi/types/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { createRouter } from "./router";
import { TRPCReactProvider } from "./trpc/react";
import "./styles.css";

const router = createRouter();

const rootEl = document.getElementById("root")!;
if (!rootEl.innerHTML) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <TRPCReactProvider>
        <RouterProvider router={router} />
      </TRPCReactProvider>
    </React.StrictMode>,
  );
}
