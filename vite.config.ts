import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      // Fix missing internal unenv reference
      'unenv/runtime/node/process': 'unenv/runtime/node',
    },
  },
});