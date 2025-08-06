import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getVenues = baseProcedure
  .input(z.object({
    authToken: z.string()
  }))
  .query(async ({ input }) => {
    await requireAuth(input.authToken);

    const venues = await db.venue.findMany({
      include: {
        events: {
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

    return venues;
  });
