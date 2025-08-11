// app.config.ts
import { createApp } from "vinxi";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default createApp({
  server: { preset: "vercel" },

  vite: {
    plugins: () => [
      tsconfigPaths(),
      nodePolyfills(),
      TanStackRouterVite({
        routes: { dir: "src/routes" },
        // make the plugin write to the same place your `tsr generate` step does
        generatedModule: "src/generated/tanstack-router/routeTree.gen.ts",
      }),
    ],
  },

  routers: [
    {
      name: "client",
      type: "spa",
      base: "/",
      handler: "./src/main.tsx",
      target: "browser",
    },
    {
      name: "trpc",
      type: "http",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
    },
    {
      name: "debug-logs",
      type: "http",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
    },
  ],
});
