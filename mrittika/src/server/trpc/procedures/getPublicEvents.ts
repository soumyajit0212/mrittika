import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPublicEvents = baseProcedure
  .query(async () => {
    const events = await db.event.findMany({
      where: {
        endDate: {
          gte: new Date() // Only show future or ongoing events
        }
      },
      include: {
        venue: true,
        sessions: {
          orderBy: {
            sessionDate: 'asc'
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return events;
  });
