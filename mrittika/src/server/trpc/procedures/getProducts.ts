import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getProducts = baseProcedure
  .input(z.object({
    authToken: z.string()
  }))
  .query(async ({ input }) => {
    await requireAuth(input.authToken);

    const products = await db.product.findMany({
      include: {
        productTypes: {
          where: {
            status: "ACTIVE"
          },
          orderBy: {
            productPrice: 'asc'
          }
        },
        productSessionMaps: {
          include: {
            session: {
              select: {
                id: true,
                sessionName: true,
                sessionDate: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return products;
  });
