import { defineConfig } from "vinxi";

export default defineConfig({
  client: {
    name: "client",
    mode: "spa",
    handler: "./src/entry-client.tsx",
    vite: {
      resolve: {
        alias: {
          "unenv/node/process": "/patches/unenv/process.js",
          "unenv/runtime/node/process": "/patches/unenv/process.js",
          "./node/process": "/patches/unenv/process.js",
        },
      },
    },
  },
  trpc: {
    name: "trpc",
    mode: "http",
    handler: "./src/server/trpc/handler.ts",
  },
  debug: {
    name: "debug",
    mode: "http",
    handler: "./src/server/debug/log.ts",
  },
});
