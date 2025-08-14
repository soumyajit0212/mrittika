// app.config.ts
import { defineConfig } from "vinxi";

/** Try to load the React plugin (SWC first, then classic). */
async function maybeReactPlugin() {
  try {
    const mod = await import("@vitejs/plugin-react-swc");
    return mod.default();
  } catch {
    try {
      const mod = await import("@vitejs/plugin-react");
      console.warn("[build] Using @vitejs/plugin-react fallback.");
      return mod.default();
    } catch {
      console.warn("[build] No React plugin found; continuing without it.");
      return null;
    }
  }
}

/** Try to load vite-tsconfig-paths for path alias resolution. */
async function maybeTsconfigPaths() {
  try {
    const mod = await import("vite-tsconfig-paths");
    return mod.default();
  } catch {
    console.warn("[build] vite-tsconfig-paths not installed; skipping path alias resolution.");
    return null;
  }
}

export default defineConfig(async () => {
  const [reactPlugin, tsPaths] = await Promise.all([
    maybeReactPlugin(),
    maybeTsconfigPaths(),
  ]);

  return {
    server: {
      preset: "node", // good for Vercel/Render node functions
    },
    routers: [
      // Browser bundle (CSR / SPA)
      {
        name: "client",
        type: "spa",
        base: "/",
        handler: "./src/entry-client.tsx", // keep your actual client entry path
        target: "browser",
        vite: {
          plugins: [reactPlugin, tsPaths].filter(Boolean),
        },
      },

      // If you actually have SSR or server handlers, uncomment & point to real files:
      // {
      //   name: "server",
      //   type: "http",
      //   base: "/",
      //   handler: "./src/entry-server.tsx",
      //   target: "server",
      // },

      // If you have a server API that Vinxi should build, uncomment & point to your entry:
      // {
      //   name: "api",
      //   type: "http",
      //   base: "/api",
      //   handler: "./src/api/index.ts",
      //   target: "server",
      // },

      // Static assets
      {
        name: "assets",
        type: "static",
        base: "/",
        dir: "./public",
      },
    ],
  };
});
