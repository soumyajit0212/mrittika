// app.config.ts
import { defineConfig } from "vinxi";
import react from "@vitejs/plugin-react-swc";

/**
 * Try to load vite-tsconfig-paths at build time.
 * If it's not installed, we skip it (and log a warning) so the build doesn't fail.
 */
async function maybeTsconfigPaths() {
  try {
    const mod = await import("vite-tsconfig-paths");
    // most builds export default the plugin factory
    return mod.default();
  } catch {
    console.warn("[build] vite-tsconfig-paths not installed; skipping path alias resolution.");
    return null;
  }
}

export default defineConfig(async () => {
  const tsPaths = await maybeTsconfigPaths();

  return {
    /**
     * You can tweak server preset if you need a specific runtime.
     * 'node' is a safe default for Vercel/Render node functions.
     */
    server: {
      preset: "node",
    },

    routers: [
      // --- Client (browser) bundle ---
      {
        name: "client",
        type: "spa",            // or "client" if you’re using SSR/hybrid. "spa" is safe when using CSR.
        base: "/",
        handler: "./src/entry-client.tsx", // keep your actual entry path
        target: "browser",
        vite: {
          plugins: [react(), tsPaths].filter(Boolean),
        },
      },

      // --- Server app (SSR or server handlers) ---
      {
        name: "server",
        type: "http",
        base: "/",
        handler: "./src/entry-server.tsx", // keep your actual entry path if you use SSR; otherwise you can remove this router
        target: "server",
      },

      // --- API routes (e.g. /api/*) ---
      // If you expose handlers under src/api/**, keep this. If not, remove it.
      {
        name: "api",
        type: "http",
        base: "/api",
        handler: "./src/api/index.ts", // adjust to your actual API entry (or remove this router if unused)
        target: "server",
      },

      // --- Static assets in /public ---
      {
        name: "assets",
        type: "static",
        base: "/",
        dir: "./public",
      },
    ],
  };
});
