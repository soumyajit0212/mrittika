import "dotenv/config";

import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
// If you need Node polyfills in the browser, keep this line; otherwise you can remove it.
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default createApp({
  // You can add a project-wide "root" here if your sources aren't in ./,
  // but with src/* it’s fine to omit.
  routers: [
    // --- API: tRPC router ---------------------------------------------------
    {
      name: "trpc",
      type: "http",
      base: "/api/trpc",
      handler: "./src/server/trpc/handler.ts",
    },

    // --- API: client logs (debug) ------------------------------------------
    {
      name: "debug-logs",
      type: "http",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
    },

    // --- Client SPA ---------------------------------------------------------
    {
      name: "client",
      type: "spa",
      base: "/",
      target: "browser",
      entry: "./src/main.tsx",

      // Attach Vite plugins directly — do NOT import from "vinxi/plugins/vite"
      plugins: () => [
        tsconfigPaths(),   // resolves "~/*" -> "src/*" per your tsconfig
        react(),
        nodePolyfills(),   // comment this out if you don't need polyfills
      ],

      // Optional Vite settings that help with common issues in this stack
      vite: {
        define: {
          // Prevent "process is not defined" style leaks on the client
          "process.env": {},
        },
        optimizeDeps: {
          // Helps Vite pre-bundle deps used by TRPC/TanStack
          include: [
            "superjson",
            "@trpc/client",
            "@trpc/react-query",
            "@tanstack/react-query",
            "@tanstack/react-router",
          ],
        },
        build: {
          sourcemap: true,
        },
      },
    },
  ],
});
