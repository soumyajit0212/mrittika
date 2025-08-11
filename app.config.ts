// app.config.ts
import "dotenv/config";

import { createApp } from "vinxi";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { config } from "vinxi/plugins/config";
import { env } from "./src/server/env";

// Detect prod once (works on Vercel)
const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

function allowedHostsFromEnv() {
  const hosts = [env.BASE_URL, env.BASE_URL_OTHER_PORT].filter(Boolean) as string[];
  return hosts.length ? hosts.map((u) => u.split("://")[1]!) : undefined;
}

export default createApp({
  server: {
    preset: "vercel",
    experimental: { asyncContext: true },
  },
  routers: [
    // tRPC server
    {
      type: "http",
      name: "trpc",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", { server: { allowedHosts: allowedHostsFromEnv() } } as any),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ],
    },

    // client log collector (server-side)
    {
      type: "http",
      name: "debug-logs",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", { server: { allowedHosts: allowedHostsFromEnv() } } as any),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ],
    },

    // SPA client
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => {
        const base = [
          config("allowedHosts", { server: { allowedHosts: allowedHostsFromEnv() } } as any),
          tsConfigPaths({ projects: ["./tsconfig.json"] }),
          TanStackRouterVite({
            autoCodeSplitting: true,
            routesDirectory: "./src/routes",
            generatedRouteTree: "./src/generated/routeTree.gen.ts",
          }),
          // keep inspector stubs to avoid bundling it
          {
            name: "disable-node-inspector",
            config() {
              return {
                optimizeDeps: { exclude: ["node:inspector", "inspector"] },
                resolve: {
                  alias: {
                    "node:inspector": "unenv/mock/empty",
                    inspector: "unenv/mock/empty",
                  },
                },
              };
            },
          } as any,
          react(),
        ];

        // ✅ Only add debug/patch plugins in dev
        if (!isProd) {
          // require() so they are not even resolved in prod builds
          const { consoleForwardPlugin } = require("./vite-console-forward-plugin");
          base.push(
            consoleForwardPlugin({
              enabled: true,
              endpoint: "/api/debug/client-logs",
              levels: ["log", "info", "warn", "error", "debug"],
            })
          );

          // Optional: node polyfills only in dev (avoid in prod)
          const { nodePolyfills } = require("vite-plugin-node-polyfills");
          base.push(nodePolyfills());
        }

        return base;
      },
    },
  ],
});
