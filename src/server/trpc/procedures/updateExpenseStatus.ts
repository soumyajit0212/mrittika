import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const updateExpenseStatus = baseProcedure
  .input(z.object({
    authToken: z.string(),
    expenseId: z.number(),
    status: z.enum(["APPROVED", "REJECTED"])
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const expense = await db.expense.findUnique({
      where: { id: input.expenseId }
    });

    if (!expense) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Expense not found",
      });
    }

    const updatedExpense = await db.expense.update({
      where: { id: input.expenseId },
      data: {
        status: input.status
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
      expense: updatedExpense
    };
  });
