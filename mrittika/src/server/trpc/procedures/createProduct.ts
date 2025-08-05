import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const createProduct = baseProcedure
  .input(z.object({
    authToken: z.string(),
    productCode: z.string().min(1),
    productName: z.string().min(1),
    productDesc: z.string().optional(),
    productType: z.enum(["Food", "Entry"]),
    productTypes: z.array(z.object({
      productSize: z.enum(["Adult", "Children", "Elder"]),
      productChoice: z.enum(["VEG", "NON-VEG", "NONE"]),
      productPref: z.enum(["CHICKEN", "MUTTON", "FISH", "NONE"]),
      productPrice: z.number().min(0),
      productSubtype: z.enum(["PACKET", "DINE-IN", "NONE"])
    })).optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Check if product code already exists
    const existingProduct = await db.product.findUnique({
      where: { productCode: input.productCode }
    });

    if (existingProduct) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Product with this code already exists",
      });
    }

    const product = await db.product.create({
      data: {
        productCode: input.productCode,
        productName: input.productName,
        productDesc: input.productDesc,
        productType: input.productType,
        ...(input.productTypes && input.productTypes.length > 0 && {
          productTypes: {
            create: input.productTypes
          }
        })
      },
      include: {
        productTypes: true
      }
    });

    return {
      success: true,
      product
    };
  });
