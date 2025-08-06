import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const createVenue = baseProcedure
  .input(z.object({
    authToken: z.string(),
    venueAddress: z.string().min(1),
    venueCapacity: z.number().min(1),
    venueDetails: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const venue = await db.venue.create({
      data: {
        venueAddress: input.venueAddress,
        venueCapacity: input.venueCapacity,
        venueDetails: input.venueDetails
      }
    });

    return {
      success: true,
      venue
    };
  });
