import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getOrders = baseProcedure
  .input(z.object({
    authToken: z.string(),
  }))
  .query(async ({ input }) => {
    await requireAdmin(input.authToken);

    const orders = await db.orderMaster.findMany({
      include: {
        guest: true,
        member: true,
        orderLines: {
          include: {
            product: true,
            productType: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders;
  });
