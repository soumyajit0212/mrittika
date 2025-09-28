import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const updateOrder = baseProcedure
  .input(z.object({
    authToken: z.string(),
    orderId: z.number(),
    totalCost: z.number().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REFUNDED"]).optional(),
    orderLines: z.array(z.object({
      productId: z.number(),
      productTypeId: z.number().optional(),
      quantity: z.number().min(0),
      sessionId: z.number().optional(),
    })).optional(),
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const { orderId, totalCost, status, orderLines, ...updateData } = input;

    // If orderLines are provided, we need to update them and recalculate total cost
    if (orderLines) {
      // Use a transaction to ensure data consistency
      const updatedOrder = await db.$transaction(async (tx) => {
        // First, delete existing order lines
        await tx.orderLine.deleteMany({
          where: { orderId: orderId }
        });

        // Create new order lines
        if (orderLines.length > 0) {
          await tx.orderLine.createMany({
            data: orderLines.map(line => ({
              orderId: orderId,
              productId: line.productId,
              productTypeId: line.productTypeId,
              quantity: line.quantity,
              sessionId: line.sessionId,
            }))
          });
        }

        // Calculate new total cost if not explicitly provided
        let newTotalCost = totalCost;
        if (newTotalCost === undefined && orderLines.length > 0) {
          // Get product types with prices to calculate total
          const productTypeIds = orderLines
            .filter(line => line.productTypeId && line.quantity > 0)
            .map(line => line.productTypeId!);

          if (productTypeIds.length > 0) {
            const productTypes = await tx.productType.findMany({
              where: { id: { in: productTypeIds } }
            });

            newTotalCost = orderLines.reduce((total, line) => {
              if (line.productTypeId && line.quantity > 0) {
                const productType = productTypes.find(pt => pt.id === line.productTypeId);
                if (productType) {
                  return total + (productType.productPrice * line.quantity);
                }
              }
              return total;
            }, 0);
          } else {
            newTotalCost = 0;
          }
        }

        // Update the order master with new total cost
        return await tx.orderMaster.update({
          where: { id: orderId },
          data: {
            ...(newTotalCost !== undefined && { totalCost: newTotalCost }),
            ...(status !== undefined && { status }),
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
      });

      return updatedOrder;
    } else {
      // Original logic for updating only total cost
      const updatedOrder = await db.orderMaster.update({
        where: { id: orderId },
        data: {
          ...(totalCost !== undefined && { totalCost }),
          ...(status !== undefined && { status }),
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
    }
  });
