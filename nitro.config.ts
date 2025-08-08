// nitro.config.ts
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // Make sure Nitro bundles prisma so the client files are available
  externals: {
    inline: ['@prisma/client', 'prisma'],
  },

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
            // Empty module – Prisma will handle resolving engines at runtime.
            return 'export default {}'
          }
          return null
        },
      },
    ],
  },
})
