// app.config.ts
import { createApp } from "vinxi";
import react from "@vitejs/plugin-react-swc";
// Optional but recommended: respects paths from your tsconfig
import tsconfigPaths from "vite-tsconfig-paths";

export default createApp({
  routers: [
    // Serves files from ./public at the root (/, /favicon.ico, etc.)
    {
      name: "public",
      type: "static",
      dir: "./public",
      base: "/",
    },

    // Builds the browser bundle for your SPA
    {
      name: "client",
      type: "client",
      // If your entry is different, adjust this path (e.g. "./src/app.tsx")
      handler: "./src/main.tsx",
      target: "browser",
      base: "/_build",
      // Vite plugins for the client build
      plugins: () => [react(), tsconfigPaths()],
    },

    // If later you add server rendering or API handlers via vinxi/nitro,
    // you can add an "http" router here. For a pure SPA you don't need it.
    // {
    //   name: "server",
    //   type: "http",
    //   handler: "./src/entry-server.ts",
    //   target: "server",
    // },
  ],
});
