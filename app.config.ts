// app.config.ts

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

/**
 * Export the Vinxi config directly (no defineConfig).
 * Vinxi accepts a plain object or an async function returning one.
 */
export default async () => {
  const [reactPlugin, tsPaths] = await Promise.all([
    maybeReactPlugin(),
    maybeTsconfigPaths(),
  ]);

  return {
    server: {
      // Works for Vercel/Render Node functions
      preset: "node",
    },
    routers: [
      // Client (SPA) bundle
      {
        name: "client",
        type: "spa",
        base: "/",
        // ⬇️ IMPORTANT: set this to your actual client entry file
        // If your project uses TanStack Start defaults, this is usually src/entry-client.tsx
        // If you don’t have one, point to your boot file (e.g. src/main.tsx).
        handler: "./src/entry-client.tsx",
        target: "browser",
        vite: {
          plugins: [reactPlugin, tsPaths].filter(Boolean),
        },
      },

      // Static assets
      {
        name: "assets",
        type: "static",
        base: "/",
        dir: "./public",
      },

      // If you have server handlers/APIs under Vinxi, add a router like this and set handler:
      // {
      //   name: "api",
      //   type: "http",
      //   base: "/api",
      //   handler: "./src/api/index.ts",
      //   target: "server",
      // },
    ],
  };
};
