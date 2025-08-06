import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const updateProduct = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productId: z.number(),
    productCode: z.string().min(1).optional(),
    productName: z.string().min(1).optional(),
    productDesc: z.string().optional(),
    productType: z.enum(["Food", "Entry"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional()
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

    // Check if product code already exists (if changing)
    if (input.productCode && input.productCode !== product.productCode) {
      const existingProduct = await db.product.findUnique({
        where: { productCode: input.productCode }
      });

      if (existingProduct) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Product with this code already exists",
        });
      }
    }

    const updatedProduct = await db.product.update({
      where: { id: input.productId },
      data: {
        ...(input.productCode && { productCode: input.productCode }),
        ...(input.productName && { productName: input.productName }),
        ...(input.productDesc !== undefined && { productDesc: input.productDesc }),
        ...(input.productType && { productType: input.productType }),
        ...(input.status && { status: input.status })
      },
      include: {
        productTypes: true
      }
    });

    return {
      success: true,
      product: updatedProduct
    };
  });
