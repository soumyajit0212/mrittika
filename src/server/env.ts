// src/server/env.ts (or wherever your env.ts lives)
import { z } from "zod";
import "dotenv/config";

const raw = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  BASE_URL: process.env.BASE_URL,
  BASE_URL_OTHER_PORT: process.env.BASE_URL_OTHER_PORT,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  MINIO_DISABLE: process.env.MINIO_DISABLE ?? "true",

  // Hosting hints
  VERCEL: process.env.VERCEL,
  VERCEL_URL: process.env.VERCEL_URL, // e.g. my-app.vercel.app
  NETLIFY: process.env.NETLIFY,
  DEPLOY_URL: process.env.DEPLOY_URL,
  DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
  URL: process.env.URL,
  PORT: process.env.PORT ?? "3000",
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  MINIO_DISABLE: z.enum(["true", "false"]).default("true"),

  VERCEL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  NETLIFY: z.string().optional(),
  DEPLOY_URL: z.string().optional(),
  DEPLOY_PRIME_URL: z.string().optional(),
  URL: z.string().optional(),
  PORT: z.string(),
});

const parsed = envSchema.parse(raw);

// Compute a public base URL that works on Vercel/Netlify/Local
function computePublicBaseUrl() {
  if (parsed.VERCEL_URL) return `https://${parsed.VERCEL_URL}`;
  if (parsed.NETLIFY) return parsed.DEPLOY_PRIME_URL || parsed.DEPLOY_URL || parsed.URL || undefined;
  return parsed.BASE_URL || `http://localhost:${parsed.PORT}`;
}

// Ensure sslmode=require for Postgres in production if missing
function withSSL(url: string) {
  if (parsed.NODE_ENV !== "production") return url;
  if (!/^postgres(ql)?:\/\//.test(url)) return url;
  if (/[?&]sslmode=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

export const env = {
  ...parsed,
  IS_PROD: parsed.NODE_ENV === "production",
  PUBLIC_BASE_URL: computePublicBaseUrl(),
  DATABASE_URL: withSSL(parsed.DATABASE_URL),
};
