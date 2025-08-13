/*import "dotenv/config";
import { Client } from "minio";
import { env } from "./env";
import { getBaseUrl } from "./utils/base-url";

export const minioBaseUrl = getBaseUrl({ port: 9000 });

console.log("🔧 MinIO Base URL:", minioBaseUrl);

export const minioClient = new Client({
  endPoint: minioBaseUrl.split("://")[1]!,
  useSSL: minioBaseUrl.startsWith("https://"),
  accessKey: "admin",
  secretKey: env.ADMIN_PASSWORD,
});

// Test MinIO connection on startup (non-blocking)
if (env.NODE_ENV === "development") {
  minioClient.listBuckets()
    .then(() => {
      console.log("✅ MinIO connection established successfully");
    })
    .catch((error) => {
      console.error("❌ MinIO connection failed:", error);
      console.log("   File upload features may not work properly");
      console.log("   Ensure MinIO service is running and accessible");
    });
}*/

/* import { Client } from "minio";
import { env } from "./env";
import { getBaseUrl } from "./utils/base-url";

export const minioClient = {
  putObject: async () => Promise.resolve(),
  getObject: async () => Promise.resolve(null),
  removeObject: async () => Promise.resolve(),
}; */

// src/server/minio.ts
import "dotenv/config";
import { Client } from "minio";

/** Methods your app actually uses. Add more here if needed. */
type MinioLike = {
  putObject: (bucket: string, objectName: string, data: any, size?: number | undefined, meta?: Record<string, any> | undefined) => Promise<any>;
  getObject: (bucket: string, objectName: string) => Promise<NodeJS.ReadableStream | null>;
  removeObject: (bucket: string, objectName: string) => Promise<void>;
  presignedPutObject?: (bucket: string, objectName: string, expiry?: number) => Promise<string>;
  presignedGetObject?: (bucket: string, objectName: string, expiry?: number) => Promise<string>;
};

const DISABLED = process.env.MINIO_DISABLE === "true";

/** Make a friendly base URL default; override via MINIO_BASE_URL */
const DEFAULT_BASE = "http://localhost:9000";

/** Build the real MinIO client (but don't do it at import time) */
function createRealClient(): Client {
  const base = process.env.MINIO_BASE_URL || DEFAULT_BASE; // e.g. http://localhost:9000
  const u = new URL(base);
  const useSSL = u.protocol === "https:";
  const port = u.port ? Number(u.port) : useSSL ? 443 : 80;

  if (!u.hostname) throw new Error(`MINIO_BASE_URL missing hostname: ${base}`);
  if (Number.isNaN(port)) throw new Error(`Invalid port in MINIO_BASE_URL: ${base}`);

  const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

  return new Client({
    endPoint: u.hostname, // hostname only
    port,                  // numeric port
    useSSL,                // true/false
    accessKey,
    secretKey,
  });
}

/** A safe stub for local dev when MINIO_DISABLE=true */
const stub: MinioLike = {
  async putObject() {
    console.warn("[minio:stub] putObject() called – skipping.");
    return {};
  },
  async getObject() {
    console.warn("[minio:stub] getObject() called – returning null.");
    return null;
  },
  async removeObject() {
    console.warn("[minio:stub] removeObject() called – skipping.");
  },
  async presignedPutObject() {
    console.warn("[minio:stub] presignedPutObject() called – returning dummy URL.");
    return "about:blank";
  },
  async presignedGetObject() {
    console.warn("[minio:stub] presignedGetObject() called – returning dummy URL.");
    return "about:blank";
  },
};

let real: Client | null = null;

/** Unified export your code can import everywhere */
export const minio: MinioLike =
  DISABLED
    ? stub
    : new Proxy({} as MinioLike, {
        get(_t, prop: keyof MinioLike) {
          if (!real) real = createRealClient();
          // @ts-ignore - forward to real client where possible
          return real[prop]?.bind(real);
        },
      });

/** Optional: quick health log in dev */
if (process.env.NODE_ENV === "development") {
  try {
    if (DISABLED) {
      console.log("🔧 MinIO disabled via MINIO_DISABLE=true");
    } else {
      const base = process.env.MINIO_BASE_URL || DEFAULT_BASE;
      console.log("🔧 MinIO Base URL:", base);
      // ping (non-blocking)
      (async () => {
        try {
          if (!real) real = createRealClient();
          await real.listBuckets();
          console.log("✅ MinIO connection OK");
        } catch (e) {
          console.warn("❌ MinIO connection failed:", e);
        }
      })();
    }
  } catch (e) {
    console.warn("⚠️ MinIO init warning:", e);
  }
}

