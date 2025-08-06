import { defineNitroConfig } from "nitropack";

export default defineNitroConfig({
  externals: {
    external: ["@prisma/client", "prisma"],
    inline: [/\.prisma\/client/], // Prevent bundling internal prisma modules
  },
});
