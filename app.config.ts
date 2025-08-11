// app.config.ts
import { defineConfig } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import nodePolyfills from "vite-plugin-node-polyfills";
import { routerPlugin } from "@tanstack/router-plugin";

// On Vercel/production we generate via CLI (tsr generate), so disable the Vite plugin there.
const enableRouterPlugin = process.env.NODE_ENV !== "production" && !process.env.VERCEL;

export default defineConfig({
  routers: [
    {
      name: "client",
      type: "spa",
      base: "/",
      handler: "index.html",
      vite: {
        build: { sourcemap: true },
        plugins: [
          tsconfigPaths(),
          react(),
          ...(enableRouterPlugin
            ? [
                routerPlugin({
                  routesDirectory: "./src/routes",
                  generatedRouteTree:
                    "./src/generated/tanstack-router/routeTree.gen.ts",
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
