// app.config.ts
import { createApp } from "vinxi";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "src");

export default createApp({
  server: { preset: "vercel" },
  vite: {
    plugins: () => [
      tsconfigPaths(),
      nodePolyfills(),
      TanStackRouterVite({
        routes: { dir: "src/routes" },
        generatedModule: "src/generated/tanstack-router/routeTree.gen.ts",
      }),
    ],
    // 👇 ensure "~" works in ALL builds
    resolve: { alias: { "~": SRC } },
  },
  routers: [
    { name: "client", type: "spa", base: "/", handler: "./src/main.tsx", target: "browser" },
    { name: "trpc", type: "http", base: "/trpc", handler: "./src/server/trpc/handler.ts", target: "server" },
    { name: "debug-logs", type: "http", base: "/api/debug/client-logs", handler: "./src/server/debug/client-logs-handler.ts", target: "server" },
  ],
});
