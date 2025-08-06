import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const deleteProductType = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productTypeId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const productType = await db.productType.findUnique({
      where: { id: input.productTypeId }
    });

    if (!productType) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Product type not found",
      });
    }

    // Check for existing orders that reference this product type
    const orderCount = await db.orderLine.count({
      where: {
        productTypeId: input.productTypeId
      }
    });

    if (orderCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete product type with existing orders",
      });
    }

    await db.productType.delete({
      where: { id: input.productTypeId }
    });

    return {
      success: true
    };
  });
