import "dotenv/config";

import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
// Only keep this if you truly need Node polyfills in the browser:
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default createApp({
  routers: [
    // API: tRPC
    {
      name: "trpc",
      type: "http",
      base: "/api/trpc",
      handler: "./src/server/trpc/handler.ts",
    },

    // API: debug client logs
    {
      name: "debug-logs",
      type: "http",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
    },

    // Client SPA (no handler here; use type "spa" + entry)
    {
      name: "client",
      type: "spa",
      base: "/",
      entry: "./src/main.tsx",
      plugins: () => [
        tsconfigPaths(),   // resolves "~/*" -> "src/*" per your tsconfig
        react(),
        // comment out if not needed:
        nodePolyfills(),
      ],
      vite: {
        define: {
          "process.env": {},
        },
        optimizeDeps: {
          include: [
            "superjson",
            "@trpc/client",
            "@trpc/react-query",
            "@tanstack/react-query",
            "@tanstack/react-router",
          ],
        },
        build: { sourcemap: true },
      },
    },
  ],
});
