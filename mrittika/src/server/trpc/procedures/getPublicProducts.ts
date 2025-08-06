import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPublicProducts = baseProcedure
  .query(async () => {
    const products = await db.product.findMany({
      where: {
        status: "ACTIVE"
      },
      include: {
        productTypes: {
          where: {
            status: "ACTIVE"
          },
          orderBy: {
            productPrice: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return products;
  });
