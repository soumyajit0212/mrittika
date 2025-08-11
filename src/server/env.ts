import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // App URLs (optional; used for allowedHosts & links)
  BASE_URL: z.string().url().optional(),
  BASE_URL_OTHER_PORT: z.string().url().optional(),

  // Auth / DB (set in prod)
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),

  // MinIO / S3-compatible storage
  MINIO_DISABLED: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : !!v))
    .optional(),
  MINIO_ENDPOINT: z.string().optional(),   // e.g. "play.min.io" or "s3.amazonaws.com"
  MINIO_PORT: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .optional(),
  MINIO_USE_SSL: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : !!v))
    .optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  MINIO_REGION: z.string().optional(),
  MINIO_PUBLIC_URL: z.string().optional(), // optional public base for direct links
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // In dev, fail fast. In prod, log and keep going so handlers can return JSON errors.
  if (process.env.NODE_ENV !== "production") {
    console.error(parsed.error.flatten());
    throw new Error("Invalid environment variables");
  } else {
    console.error("[env] validation failed", parsed.error.flatten());
  }
}

export const env = {
  ...(parsed.success ? parsed.data : (process.env as any)),
};
