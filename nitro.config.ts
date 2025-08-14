import { defineNitroConfig } from 'nitropack';

export default defineNitroConfig({
  preset: 'vercel',
  externals: {
    external: ['@prisma/client'], // only this
  },
});
