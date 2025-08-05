import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const deleteVenue = baseProcedure
  .input(z.object({
    authToken: z.string(),
    venueId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const venue = await db.venue.findUnique({
      where: { id: input.venueId },
      include: {
        events: true
      }
    });

    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    // Check if venue has existing events
    if (venue.events.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete venue with existing events",
      });
    }

    await db.venue.delete({
      where: { id: input.venueId }
    });

    return {
      success: true
    };
  });
