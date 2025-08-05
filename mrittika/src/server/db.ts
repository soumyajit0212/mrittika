import { PrismaClient } from "@prisma/client";

import { env } from "~/server/env";

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: 'pretty',
  });

  // Add connection error handling
  client.$on('error', (e) => {
    console.error('Prisma Client Error:', e);
  });

  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Test database connection on startup
if (env.NODE_ENV === "development") {
  db.$connect()
    .then(() => {
      console.log("✅ Database connection established successfully");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:", error);
      console.log("   The app will continue to start, but database operations may fail");
    });
}
