import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const deleteOrder = baseProcedure
  .input(z.object({
    authToken: z.string(),
    orderId: z.number(),
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Delete order lines first due to foreign key constraints
    await db.orderLine.deleteMany({
      where: { orderId: input.orderId }
    });

    // Then delete the order master
    const deletedOrder = await db.orderMaster.delete({
      where: { id: input.orderId }
    });

    return deletedOrder;
  });
