import { Client } from "minio";
import { env } from "./env";
import { getBaseUrl } from "./utils/base-url";

export const minioClient = {
  putObject: async () => Promise.resolve(),
  getObject: async () => Promise.resolve(null),
  removeObject: async () => Promise.resolve(),
};
