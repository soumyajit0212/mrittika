import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const createSession = baseProcedure
  .input(z.object({
    authToken: z.string(),
    sessionName: z.string().min(1),
    sessionDate: z.string().datetime(),
    startTime: z.string(),
    endTime: z.string(),
    sessionDetails: z.string().optional(),
    sessionBalanceCapacity: z.number().min(1),
    eventId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

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

    // Validate session date is within event dates
    const sessionDate = new Date(input.sessionDate);
    if (sessionDate < event.startDate || sessionDate > event.endDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Session date must be within event date range",
      });
    }

    const session = await db.eventSession.create({
      data: {
        sessionName: input.sessionName,
        sessionDate,
        startTime: input.startTime,
        endTime: input.endTime,
        sessionDetails: input.sessionDetails,
        sessionBalanceCapacity: input.sessionBalanceCapacity,
        eventId: input.eventId
      },
      include: {
        event: true
      }
    });

    return {
      success: true,
      session
    };
  });
