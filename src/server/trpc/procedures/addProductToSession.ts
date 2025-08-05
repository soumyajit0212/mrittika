import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const addProductToSession = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productId: z.number(),
    sessionId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: input.productId }
    });

    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Verify session exists
    const session = await db.eventSession.findUnique({
      where: { id: input.sessionId }
    });

    if (!session) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    // Check if mapping already exists
    const existingMapping = await db.productSessionMap.findUnique({
      where: {
        sessionId_productId: {
          sessionId: input.sessionId,
          productId: input.productId
        }
      }
    });

    if (existingMapping) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Product is already tagged to this session",
      });
    }

    // Create the mapping
    const productSessionMap = await db.productSessionMap.create({
      data: {
        productId: input.productId,
        sessionId: input.sessionId
      },
      include: {
        product: true,
        session: {
          select: {
            id: true,
            sessionName: true,
            sessionDate: true
          }
        }
      }
    });

    return productSessionMap;
  });
