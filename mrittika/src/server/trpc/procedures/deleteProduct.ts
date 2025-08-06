import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const deleteProduct = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const product = await db.product.findUnique({
      where: { id: input.productId }
    });

    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Check for existing orders
    const orderCount = await db.orderLine.count({
      where: {
        productId: input.productId
      }
    });

    if (orderCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete product with existing orders",
      });
    }

    await db.product.delete({
      where: { id: input.productId }
    });

    return {
      success: true
    };
  });
