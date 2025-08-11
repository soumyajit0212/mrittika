// app.config.ts
import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import TanStackRouterVite from "@tanstack/router-plugin/vite";
import { config } from "vinxi/plugins/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { env } from "./src/server/env";

// Build "allowedHosts" from env for local/dev previews
function allowedHostsFromEnv(): string[] {
  return (env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default createApp({
  server: {
    // Important for Vercel builds
    preset: "vercel",
  },

  routers: [
    // --- API: tRPC ---
    {
      name: "trpc",
      mode: "http",
      base: "/api/trpc",
      target: "server",
      handler: "./src/server/trpc/handler.ts",
    },

    // --- API: Client log forwarding (optional) ---
    {
      name: "debug-logs",
      mode: "http",
      base: "/api/debug/client-logs",
      target: "server",
      handler: "./src/server/debug/client-logs-handler.ts",
    },

    // --- Client app (SPA) ---
    {
      name: "client",
      mode: "spa",
      base: "/",
      target: "browser",
      handler: "./src/main.tsx",
      plugins: [
        config.vite({
          appRoot: "src",

          // Vite plugins
          plugins: [
            react(),
            // Use TS path aliases (e.g. "~/*" -> "src/*")
            tsconfigPaths(),
            // TanStack Router codegen during the build
            TanStackRouterVite({
              routesDirectory: "src/routes",
              generatedRouteTree: "src/generated/tanstack-router/routeTree.gen.ts",
              autoCodeSplitting: true,
            }),
            // Node core polyfills needed by some libs (e.g. minio)
            nodePolyfills(),
          ],

          // Extra safety: make "~/" alias explicit for Vite as well
          resolve: {
            alias: {
              "~/": "/src/",
            },
          },

          // Allow local hostnames from env (for dev preview proxies, etc.)
          server: {
            allowedHosts: allowedHostsFromEnv(),
          },

          define: {
            "process.env.NODE_ENV": JSON.stringify(
              process.env.NODE_ENV ?? "production",
            ),
          },

          // Helpful for DX; safe on Vercel
          build: {
            sourcemap: true,
          },

          // Speed up cold starts by pre-optimizing common deps
          optimizeDeps: {
            include: [
              "@tanstack/react-router",
              "@tanstack/react-query",
              "@trpc/client",
              "superjson",
            ],
          },
        }),
      ],
    },
  ],
});
