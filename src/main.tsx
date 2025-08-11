import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createRouter } from "./router";
import { TRPCProvider } from "./trpc/react";
import "./styles.css";

const router = createRouter();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TRPCProvider>
      <RouterProvider router={router} />
    </TRPCProvider>
  </React.StrictMode>
);
