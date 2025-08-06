import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getExpenses = baseProcedure
  .input(z.object({
    authToken: z.string(),
    eventId: z.number().optional(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
  }))
  .query(async ({ input }) => {
    const { user } = await requireAuth(input.authToken);

    const whereClause: any = {};
    
    // Non-admin users can only see their own expenses
    if (user.role !== "ADMIN") {
      whereClause.incurredBy = user.memberId;
    }
    
    if (input.eventId) {
      whereClause.eventId = input.eventId;
    }
    
    if (input.status) {
      whereClause.status = input.status;
    }

    const expenses = await db.expense.findMany({
      where: whereClause,
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
            eventName: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return expenses;
  });
