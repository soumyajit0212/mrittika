import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const removeProductFromSession = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productId: z.number(),
    sessionId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Check if mapping exists
    const existingMapping = await db.productSessionMap.findUnique({
      where: {
        sessionId_productId: {
          sessionId: input.sessionId,
          productId: input.productId
        }
      }
    });

    if (!existingMapping) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Product is not tagged to this session",
      });
    }

    // Delete the mapping
    await db.productSessionMap.delete({
      where: {
        id: existingMapping.id
      }
    });

    return { success: true };
  });
