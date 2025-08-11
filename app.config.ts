// app.config.ts
import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import TanStackRouterVite from "@tanstack/router-plugin/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { vite } from "vinxi/plugins/vite"; // ✅ correct vinxi Vite plugin

// (Optional) If you have env helper, pull from there; otherwise remove this.
import { env } from "./src/server/env";

function allowedHostsFromEnv(): string[] {
  const v = (env as any)?.ALLOWED_HOSTS ?? process.env.ALLOWED_HOSTS ?? "";
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default createApp({
  server: {
    preset: "vercel",
  },
  routers: [
    // --- tRPC API ---
    {
      name: "trpc",
      mode: "http",
      base: "/api/trpc",
      target: "server",
      handler: "./src/server/trpc/handler.ts",
    },

    // --- Client logs (optional) ---
    {
      name: "debug-logs",
      mode: "http",
      base: "/api/debug/client-logs",
      target: "server",
      handler: "./src/server/debug/client-logs-handler.ts",
    },

    // --- Client (SPA) ---
    {
      name: "client",
      mode: "spa",
      base: "/",
      target: "browser",
      handler: "./src/main.tsx",
      plugins: [
        vite({
          // Let Vite resolve "~" and "~/"
          resolve: {
            alias: {
              "~": "/src",
              "~/": "/src/",
            },
          },
          plugins: [
            react(),
            tsconfigPaths(),
            TanStackRouterVite({
              routesDirectory: "src/routes",
              generatedRouteTree:
                "src/generated/tanstack-router/routeTree.gen.ts",
              autoCodeSplitting: true,
            }),
            nodePolyfills(),
          ],
          define: {
            "process.env.NODE_ENV": JSON.stringify(
              process.env.NODE_ENV ?? "production",
            ),
          },
          server: {
            allowedHosts: allowedHostsFromEnv(),
          },
          build: {
            sourcemap: true,
          },
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
