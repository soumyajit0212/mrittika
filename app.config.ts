import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { config } from "vinxi/plugins/config";
import { env } from "./src/server/env";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { consoleForwardPlugin } from "./vite-console-forward-plugin";
import { fixPrismaDotPrismaImport } from "./fix-prisma-dotprisma-plugin";
import path from "node:path";

// Try to load vite-tsconfig-paths if it's installed (e.g. locally)
// but don't fail the build if it's missing in production.
let tsconfigPathsPlugin: any | null = null;
try {
  const mod = await import("vite-tsconfig-paths");
  tsconfigPathsPlugin = (mod as any).default ?? mod;
} catch {
  tsconfigPathsPlugin = null;
}

export default createApp({
  server: {
    // Use Vercel preset in Vercel, Node preset elsewhere (e.g. Render)
    preset: process.env.VERCEL ? "vercel" : "node-server",
    experimental: {
      asyncContext: true,
    },
    routers: [
      // API server (tRPC, etc.)
      {
        name: "server",
        base: "/api",
        handler: "./src/server/server.ts",
        plugins: [
          // Allow the deployment host if BASE_URL is set
          config("allowedHosts", {
            server: {
              allowedHosts: env.BASE_URL ? [new URL(env.BASE_URL).host] : undefined,
            },
          }),
          // Fallback aliases so "~/*" and "@/*" work even without vite-tsconfig-paths
          config("paths-alias", {
            resolve: {
              alias: {
                "~": path.resolve(process.cwd(), "src"),
                "@": path.resolve(process.cwd(), "src"),
              },
            },
          }),
          // Use vite-tsconfig-paths if available
          ...(tsconfigPathsPlugin ? [tsconfigPathsPlugin({ projects: ["./tsconfig.json"] })] : []),
          // Keep Prisma .prisma import fix for server bundle
          fixPrismaDotPrismaImport(),
        ],
      },

      // Web (client) app
      {
        name: "web",
        base: "/",
        plugins: [
          config("allowedHosts", {
            server: {
              allowedHosts: env.BASE_URL ? [new URL(env.BASE_URL).host] : undefined,
            },
          }),
          config("paths-alias", {
            resolve: {
              alias: {
                "~": path.resolve(process.cwd(), "src"),
                "@": path.resolve(process.cwd(), "src"),
              },
            },
          }),
          ...(tsconfigPathsPlugin ? [tsconfigPathsPlugin({ projects: ["./tsconfig.json"] })] : []),
          TanStackRouterVite({
            routesDirectory: "./src/routes",
            generatedRouteTree: "./src/generated/routeTree.gen.ts",
          }),
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
  },
});
