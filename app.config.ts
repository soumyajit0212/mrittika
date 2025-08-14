import { createApp } from "vinxi";
import reactRefresh from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { config } from "vinxi/plugins/config";
import { env } from "./src/server/env";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { consoleForwardPlugin } from "./vite-console-forward-plugin";
import { fixPrismaDotPrismaImport } from "./fix-prisma-dotprisma-plugin";

export default createApp({
  server: {
    preset: process.env.VERCEL ? "vercel" : "node-server", // change to 'netlify' or 'bun' or anyof the supported presets for nitro (nitro.unjs.io)
    experimental: {
      asyncContext: true,
      nitro: {
      externals: {
        inline: ["@prisma/client", "prisma"], // make Prisma work in serverless
      },
      // Add Vercel-specific presets
        vercel: {
          config: {
            includeFiles: ["./prisma/schema.prisma"]
          }
        }
    },
    },
  },
  routers: [
    {
      type: "static",
      name: "public",
      dir: "./public",
    },
    {
      type: "http",
      name: "trpc",
      base: "/trpc",
      handler: "./src/server/trpc/handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL
              ? [env.BASE_URL.split("://")[1]]
              : undefined,
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "http",
      name: "debug",
      base: "/api/debug/client-logs",
      handler: "./src/server/debug/client-logs-handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL
              ? [env.BASE_URL.split("://")[1]]
              : undefined,
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
      ],
    },
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => [
        fixPrismaDotPrismaImport(),
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL
              ? [env.BASE_URL.split("://")[1]]
              : undefined,
          },
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"],
        }),
        TanStackRouterVite({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/generated/routeTree.gen.ts",
        }),
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
