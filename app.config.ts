// app.config.ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// Only run the router plugin locally (we pre-generate on Vercel)
const enableRouterPlugin =
  process.env.NODE_ENV !== "production" && !process.env.VERCEL;

const config = {
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
                TanStackRouterVite({
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
};

export default config;
