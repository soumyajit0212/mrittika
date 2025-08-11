// app.config.ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import nodePolyfills from "vite-plugin-node-polyfills";
import { routerPlugin } from "@tanstack/router-plugin";

// We generate the route tree via CLI on Vercel, so disable the Vite plugin there.
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
