import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const updateSession = baseProcedure
  .input(z.object({
    authToken: z.string(),
    sessionId: z.number(),
    sessionName: z.string().min(1).optional(),
    sessionDate: z.string().datetime().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    sessionDetails: z.string().optional(),
    sessionBalanceCapacity: z.number().min(1).optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const session = await db.eventSession.findUnique({
      where: { id: input.sessionId },
      include: { event: true }
    });

    if (!session) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }

    // Validate session date is within event dates if provided
    if (input.sessionDate) {
      const sessionDate = new Date(input.sessionDate);
      if (sessionDate < session.event.startDate || sessionDate > session.event.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session date must be within event date range",
        });
      }
    }

    const updatedSession = await db.eventSession.update({
      where: { id: input.sessionId },
      data: {
        ...(input.sessionName && { sessionName: input.sessionName }),
        ...(input.sessionDate && { sessionDate: new Date(input.sessionDate) }),
        ...(input.startTime && { startTime: input.startTime }),
        ...(input.endTime && { endTime: input.endTime }),
        ...(input.sessionDetails !== undefined && { sessionDetails: input.sessionDetails }),
        ...(input.sessionBalanceCapacity && { sessionBalanceCapacity: input.sessionBalanceCapacity })
      },
      include: {
        event: true,
        productSessionMaps: {
          include: {
            product: true
          }
        }
      }
    });

    return {
      success: true,
      session: updatedSession
    };
  });
