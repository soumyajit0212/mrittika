import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const deleteSession = baseProcedure
  .input(z.object({
    authToken: z.string(),
    sessionId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const session = await db.eventSession.findUnique({
      where: { id: input.sessionId }
    });

    if (!session) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    // Check for existing orders/registrations
    const orderCount = await db.orderLine.count({
      where: {
        sessionId: input.sessionId
      }
    });

    if (orderCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete session with existing registrations",
      });
    }

    await db.eventSession.delete({
      where: { id: input.sessionId }
    });

    return {
      success: true
    };
  });
