import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { TRPCReactProvider } from "./trpc/react";
import { createRouter } from "./router";
import "./styles.css";

const router = createRouter();
const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TRPCReactProvider>
        <RouterProvider router={router} />
      </TRPCReactProvider>
    </React.StrictMode>,
  );
}
