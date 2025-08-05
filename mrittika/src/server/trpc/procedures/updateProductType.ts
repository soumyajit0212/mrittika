import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const updateProductType = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productTypeId: z.number(),
    productSize: z.enum(["Adult", "Children", "Elder"]).optional(),
    productChoice: z.enum(["VEG", "NON-VEG", "NONE"]).optional(),
    productPref: z.enum(["CHICKEN", "MUTTON", "FISH", "NONE"]).optional(),
    productPrice: z.number().min(0).optional(),
    productSubtype: z.enum(["PACKET", "DINE-IN", "NONE"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Validate product type exists
    const productType = await db.productType.findUnique({
      where: { id: input.productTypeId }
    });

    if (!productType) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Product type not found",
      });
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (input.productSize !== undefined) updateData.productSize = input.productSize;
    if (input.productChoice !== undefined) updateData.productChoice = input.productChoice;
    if (input.productPref !== undefined) updateData.productPref = input.productPref;
    if (input.productPrice !== undefined) updateData.productPrice = input.productPrice;
    if (input.productSubtype !== undefined) updateData.productSubtype = input.productSubtype;
    if (input.status !== undefined) updateData.status = input.status;

    const updatedProductType = await db.productType.update({
      where: { id: input.productTypeId },
      data: updateData
    });

    return {
      success: true,
      productType: updatedProductType
    };
  });
