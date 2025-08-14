// app.config.ts
import { createApp } from "vinxi";

export default createApp({
  routers: [
    // serve static assets in /public at the root
    {
      name: "public",
      type: "static",
      dir: "./public",
      base: "/",
    },

    // Vite browser client
    {
      name: "client",
      type: "client",
      handler: "./src/main.tsx", // change if your entry file differs
      target: "browser",
      base: "/_build",
      // Lazily import Vite plugins so the file itself doesn't crash
      plugins: async () => {
        const plugins: any[] = [];

        // React plugin: prefer SWC, fall back to Babel if needed
        try {
          const reactSwc = (await import("@vitejs/plugin-react-swc")).default;
          plugins.push(reactSwc());
        } catch {
          try {
            const react = (await import("@vitejs/plugin-react")).default;
            plugins.push(react());
          } catch {
            // As a last resort, continue without React plugin (not recommended)
          }
        }

        // TS path aliases
        try {
          const tsconfigPaths = (await import("vite-tsconfig-paths")).default;
          plugins.push(tsconfigPaths());
        } catch {
          // ok to skip if not installed
        }

        return plugins;
      },
    },
  ],
});
