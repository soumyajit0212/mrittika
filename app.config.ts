import "dotenv/config";

import { createApp } from "vinxi";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
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
    preset: "node-server",
    experimental: { asyncContext: true },
  },
  routers: [
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
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => [
        config("allowedHosts", { server: { allowedHosts: allowedHostsFromEnv() } } as any),
        tsConfigPaths({ projects: ["./tsconfig.json"] }),
        TanStackRouterVite({
          autoCodeSplitting: true,
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/generated/routeTree.gen.ts",
        }),
        {
          name: "disable-node-polyfills",
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
