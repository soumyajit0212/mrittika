import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const updateOrder = baseProcedure
  .input(z.object({
    authToken: z.string(),
    orderId: z.number(),
    totalCost: z.number().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const { orderId, totalCost, status, ...updateData } = input;

    const updatedOrder = await db.orderMaster.update({
      where: { id: orderId },
      data: {
        ...(totalCost !== undefined && { totalCost }),
        // Note: status field doesn't exist in current schema, but we're preparing for it
      },
      include: {
        guest: true,
        member: true,
        orderLines: {
          include: {
            product: true,
            productType: true,
          }
        }
      }
    });

    return updatedOrder;
  });
