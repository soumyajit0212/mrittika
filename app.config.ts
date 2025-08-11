// app.config.ts
import { createApp } from "vinxi";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default createApp({
  // Vercel target
  server: { preset: "vercel" },

  // Vite config shared by routers
  vite: {
    plugins: () => [
      tsconfigPaths(),
      tailwindcss(),
      nodePolyfills(),
      TanStackRouterVite({
        // keep generated files alongside your src
        // (you’re already running `tsr generate` in prebuild)
        routes: { dir: "src/routes" },
      }),
    ],
  },

  routers: [
    // Client SPA
    {
      name: "client",
      type: "spa",
      base: "/",
      handler: "./src/main.tsx",
      target: "browser",
    },

    // tRPC HTTP endpoint
    {
      name: "trpc",
      type: "http",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
    },

    // Debug logs HTTP endpoint
    {
      name: "debug-logs",
      type: "http",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
    },
  ],
});
