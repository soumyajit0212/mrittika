// app.config.ts
import { createApp } from "vinxi";

export default createApp({
  routers: [
    {
      name: "public",
      type: "static",
      dir: "./public",
      base: "/",
    },
    {
      name: "client",
      type: "client",
      handler: "./src/main.tsx", // change if your entry differs
      target: "browser",
      base: "/_build",
      // lazy import plugins so app.config.ts doesn't crash if a plugin isn't installed yet
      plugins: async () => {
        const react = (await import("@vitejs/plugin-react-swc")).default;
        const tsconfigPaths = (await import("vite-tsconfig-paths")).default;
        return [react(), tsconfigPaths()];
      },
    },
    // Add an "http" router later if you introduce SSR or server handlers.
  ],
});
