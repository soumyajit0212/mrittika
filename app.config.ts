// app.config.ts
import { defineApp } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import nodePolyfills from "vite-plugin-node-polyfills";
import { routerPlugin } from "@tanstack/router-plugin";

// In CI/Prod (e.g. Vercel) we generate with the CLI (tsr generate),
// so disable the vite plugin there to avoid collisions.
const enableRouterPlugin = process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export default defineApp({
  routers: [
    {
      name: "client",
      type: "spa",
      base: "/",
      handler: "index.html",
      vite: {
        build: { sourcemap: true }, // helps debug stack traces in prod
        plugins: [
          tsconfigPaths(),
          react(),
          ...(enableRouterPlugin
            ? [
                routerPlugin({
                  routesDirectory: "./src/routes",
                  generatedRouteTree: "./src/generated/tanstack-router/routeTree.gen.ts",
                }),
              ]
            : []),
          nodePolyfills(),
        ],
      },
    },
    {
      name: "trpc",
      type: "http",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
    },
    {
      name: "debug-logs",
      type: "http",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
    },
  ],
});
