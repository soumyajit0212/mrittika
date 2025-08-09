import { PrismaClient } from "@prisma/client";
import { defineEventHandler, getHeader, createError } from "h3";

export default defineEventHandler(async (event) => {
  const token = getHeader(event, "x-migrate-token");
  if (!token || token !== process.env.MIGRATE_TOKEN) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Run Prisma migrate deploy via child_process to honor migrations
  const { execa } = await import("execa"); // execa is already a dep of many tools; if not, add it
  try {
    const { stdout } = await execa("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
    });
    return { ok: true, output: stdout };
  } catch (err: any) {
    return { ok: false, error: err?.stderr || String(err) };
  }
});
