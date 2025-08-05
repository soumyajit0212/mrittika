import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const createEvent = baseProcedure
  .input(z.object({
    authToken: z.string(),
    eventName: z.string().min(1),
    startDate: z.string().date(),
    endDate: z.string().date(),
    eventDetails: z.string().optional(),
    venueId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    // Validate venue exists
    const venue = await db.venue.findUnique({
      where: { id: input.venueId }
    });

    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    // Validate dates
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (startDate > endDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "End date must be on or after start date",
      });
    }

    const event = await db.event.create({
      data: {
        eventName: input.eventName,
        startDate,
        endDate,
        eventDetails: input.eventDetails,
        venueId: input.venueId
      },
      include: {
        venue: true
      }
    });

    return {
      success: true,
      event
    };
  });
