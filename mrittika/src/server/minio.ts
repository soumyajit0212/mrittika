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
}
