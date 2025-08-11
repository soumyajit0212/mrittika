// app.config.ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills"; // ⬅️ named import
import { routerPlugin } from "@tanstack/router-plugin";

// We pre-generate the route tree on Vercel in `prevercel-build`, so
// only run the router plugin locally (dev).
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
                routerPlugin({
                  routesDirectory: "./src/routes",
                  generatedRouteTree:
                    "./src/generated/tanstack-router/routeTree.gen.ts",
                }),
              ]
            : []),
          nodePolyfills(), // ⬅️ call the plugin
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
