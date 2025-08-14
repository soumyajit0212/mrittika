import { defineNitroConfig } from 'nitropack';

export default defineNitroConfig({
  externals: {
    external: ['@prisma/client'], // only this
  },
});
