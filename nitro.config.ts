// nitro.config.ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // Make sure Prisma code is bundled so default.js resolves cleanly
  externals: {
    inline: ['@prisma/client', 'prisma'],
  },

  // Optional but helpful so Nitro doesn't try to pre-bundle engines
  // and we avoid odd node-resolve shenanigans.
  // If you don’t have this section already, it’s safe to add.
  // routeRules: {}, // keep your own rules if you have any

  rollupConfig: {
    plugins: [
      {
        name: 'shim-prisma-dotprisma',
        resolveId(id: string) {
          if (id === '.prisma' || id === '.prisma/client/index-browser') {
            return '\0prisma-shim'
          }
          return null
        },
        load(id: string) {
          if (id === '\0prisma-shim') {
            // Empty module — Prisma will still work; this just neutralizes the virtual import
            return 'export default {}'
          }
          return null
        },
      },
    ],
  },
})
