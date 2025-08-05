import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { minioClient } from "~/server/minio";
import { randomBytes } from "crypto";

export const getPresignedUrlForUpload = baseProcedure
  .input(z.object({
    authToken: z.string(),
    fileName: z.string(),
    fileType: z.string()
  }))
  .query(async ({ input }) => {
    await requireAuth(input.authToken);

    const bucketName = "expense-receipts";
    
    // Generate unique object name with timestamp and random string
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString('hex');
    const fileExtension = input.fileName.split('.').pop() || '';
    const objectName = `receipt-${timestamp}-${randomString}.${fileExtension}`;

    try {
      // Ensure bucket exists
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName);
      }

      // Generate presigned URL (expires in 15 minutes)
      const presignedUrl = await minioClient.presignedPutObject(bucketName, objectName, 15 * 60);
      
      return {
        presignedUrl,
        objectName,
        bucketName
      };
    } catch (error) {
      throw new Error(`Failed to generate upload URL: ${error}`);
    }
  });
