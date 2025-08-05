import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const createProductType = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productId: z.number(),
    productSize: z.enum(["Adult", "Children", "Elder"]),
    productChoice: z.enum(["VEG", "NON-VEG", "NONE"]),
    productPref: z.enum(["CHICKEN", "MUTTON", "FISH", "NONE"]),
    productPrice: z.number().min(0),
    productSubtype: z.enum(["PACKET", "DINE-IN", "NONE"])
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Validate product exists
    const product = await db.product.findUnique({
      where: { id: input.productId }
    });

    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    const productType = await db.productType.create({
      data: {
        productId: input.productId,
        productSize: input.productSize,
        productChoice: input.productChoice,
        productPref: input.productPref,
        productPrice: input.productPrice,
        productSubtype: input.productSubtype
      }
    });

    return {
      success: true,
      productType
    };
  });
