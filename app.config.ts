import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default createApp({
  // Do NOT put a top-level `vite` or `plugins` here
  routers: [
    // --- APIs (HTTP routers need a handler) ---
    {
      name: "trpc",
      type: "http",
      base: "/api/trpc",
      handler: "./src/server/trpc/handler.ts",
    },
    {
      name: "debug-logs",
      type: "http",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
    },

    // --- Client (SPA router: entry, NO handler) ---
    {
      name: "client",
      type: "spa",
      base: "/",
      entry: "./src/main.tsx",
      plugins: () => [
        tsconfigPaths(), // resolves "~/*" per your tsconfig
        react(),
      ],
      vite: {
        // Fallback in case alias resolution is flaky
        resolve: {
          alias: { "~": "/src" },
        },
        build: { sourcemap: true },
        optimizeDeps: {
          include: [
            "@tanstack/react-query",
            "@tanstack/react-router",
            "@trpc/client",
            "@trpc/react-query",
            "superjson",
          ],
        },
        define: { "process.env": {} },
      },
    },
  ],
});
