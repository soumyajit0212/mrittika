import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const updateEvent = baseProcedure
  .input(z.object({
    authToken: z.string(),
    eventId: z.number(),
    eventName: z.string().min(1).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    eventDetails: z.string().optional(),
    venueId: z.number().optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const event = await db.event.findUnique({
      where: { id: input.eventId }
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    // Validate venue if provided
    if (input.venueId) {
      const venue = await db.venue.findUnique({
        where: { id: input.venueId }
      });

      if (!venue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue not found",
        });
      }
    }

    // Validate dates if both are provided
    const startDate = input.startDate ? new Date(input.startDate) : event.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : event.endDate;

    if (startDate > endDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "End date must be on or after start date",
      });
    }

    const updatedEvent = await db.event.update({
      where: { id: input.eventId },
      data: {
        ...(input.eventName && { eventName: input.eventName }),
        ...(input.startDate && { startDate: new Date(input.startDate) }),
        ...(input.endDate && { endDate: new Date(input.endDate) }),
        ...(input.eventDetails !== undefined && { eventDetails: input.eventDetails }),
        ...(input.venueId && { venueId: input.venueId })
      },
      include: {
        venue: true,
        sessions: true
      }
    });

    return {
      success: true,
      event: updatedEvent
    };
  });
