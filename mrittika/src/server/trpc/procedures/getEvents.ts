import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getEvents = baseProcedure
  .input(z.object({
    authToken: z.string()
  }))
  .query(async ({ input }) => {
    await requireAuth(input.authToken);

    const events = await db.event.findMany({
      include: {
        venue: true,
        sessions: {
          orderBy: {
            sessionDate: 'asc'
          }
        },
        expenses: {
          select: {
            id: true,
            amount: true,
            status: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    return events;
  });
