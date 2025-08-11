import "dotenv/config";

import { createApp } from "vinxi";
import reactRefresh from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from '@vitejs/plugin-react';
import { config } from "vinxi/plugins/config";
import { env } from "./src/server/env";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { consoleForwardPlugin } from "./vite-console-forward-plugin";

function allowedHostsFromEnv() {
  const hosts = [env.BASE_URL, env.BASE_URL_OTHER_PORT].filter(Boolean) as string[];
  return hosts.length ? hosts.map((u) => u.split("://")[1]!) : undefined;
}

export default createApp({
  server: {
    preset: "node-server", // change to 'netlify' or 'bun' for nitro deployment
    experimental: { asyncContext: true },
  },
  routers: [
    // tRPC HTTP handler (server)
    {
      type: "http",
      name: "trpc",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: { allowedHosts: allowedHostsFromEnv() },
        }),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ],
    },

    // Client log forwarding endpoint used by the Vite console forward plugin
    {
      type: "http",
      name: "debug-logs",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: { allowedHosts: allowedHostsFromEnv() },
        }),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ],
    },

    // Browser client (SPA) with TanStack Router
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: { allowedHosts: allowedHostsFromEnv() },
        }),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
        TanStackRouterVite({
          autoCodeSplitting: true,
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/generated/routeTree.gen.ts",
        }),
        // Avoid Vite/esbuild resolving Node inspector in the browser
        {
          name: "disable-node-polyfills",
          config() {
            return {
              optimizeDeps: {
                exclude: ["node:inspector", "inspector"],
              },
              resolve: {
                alias: {
                  "node:inspector": "unenv/mock/empty",
                  inspector: "unenv/mock/empty",
                },
              },
            };
          },
        } as any,
        reactRefresh(),
        nodePolyfills(),
        consoleForwardPlugin({
          enabled: true,
          endpoint: "/api/debug/client-logs",
          levels: ["log", "warn", "error", "info", "debug"],
        }),
      ],
    },
  ],
});
