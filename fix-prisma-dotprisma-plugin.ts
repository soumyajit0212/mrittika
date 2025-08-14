// fix-prisma-dotprisma-plugin.ts
import { Plugin } from 'vite';

export function fixPrismaDotPrismaImport(): Plugin {
  return {
    name: 'fix-prisma-dotprisma-import',
    enforce: 'pre',
    resolveId(id) {
      if (id === '.prisma/client/index-browser') {
        return '\0prisma-browser-shim';
      }
      if (id === '.prisma') {
        return '\0prisma-shim';
      }
      return null;
    },
    load(id) {
      if (id === '\0prisma-shim' || id === '\0prisma-browser-shim') {
        return 'export default {}';
      }
      return null;
    },
  };
}
