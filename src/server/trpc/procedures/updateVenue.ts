import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const updateVenue = baseProcedure
  .input(z.object({
    authToken: z.string(),
    venueId: z.number(),
    venueAddress: z.string().min(1).optional(),
    venueCapacity: z.number().min(1).optional(),
    venueDetails: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const venue = await db.venue.findUnique({
      where: { id: input.venueId }
    });

    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    const updatedVenue = await db.venue.update({
      where: { id: input.venueId },
      data: {
        ...(input.venueAddress && { venueAddress: input.venueAddress }),
        ...(input.venueCapacity && { venueCapacity: input.venueCapacity }),
        ...(input.venueDetails !== undefined && { venueDetails: input.venueDetails })
      }
    });

    return {
      success: true,
      venue: updatedVenue
    };
  });
