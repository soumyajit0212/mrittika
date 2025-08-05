import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireMember } from "~/server/utils/auth";

export const createExpense = baseProcedure
  .input(z.object({
    authToken: z.string(),
    expenseType: z.string().min(1),
    vendor: z.string().min(1),
    amount: z.number().min(0),
    receiptFile: z.string().optional(),
    eventId: z.number()
  }))
  .mutation(async ({ input }) => {
    const { user } = await requireMember(input.authToken);

    if (!user.memberId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User must be associated with a member",
      });
    }

    // Validate event exists
    const event = await db.event.findUnique({
      where: { id: input.eventId }
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    const expense = await db.expense.create({
      data: {
        expenseType: input.expenseType,
        vendor: input.vendor,
        amount: input.amount,
        receiptFile: input.receiptFile,
        incurredBy: user.memberId,
        eventId: input.eventId
      },
      include: {
        member: {
          select: {
            id: true,
            memberName: true,
            memberEmail: true
          }
        },
        event: {
          select: {
            id: true,
            eventName: true
          }
        }
      }
    });

    return {
      success: true,
      expense
    };
  });
