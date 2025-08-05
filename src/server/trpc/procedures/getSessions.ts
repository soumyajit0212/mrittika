import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getSessions = baseProcedure
  .input(z.object({
    authToken: z.string(),
    eventId: z.number().optional()
  }))
  .query(async ({ input }) => {
    await requireAuth(input.authToken);

    const sessions = await db.eventSession.findMany({
      where: input.eventId ? { eventId: input.eventId } : undefined,
      include: {
        event: {
          select: {
            id: true,
            eventName: true,
            startDate: true,
            endDate: true
          }
        },
        productSessionMaps: {
          include: {
            product: true
          }
        }
      },
      orderBy: [
        { sessionDate: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // For each session, count current registrations (Entry products only)
    const sessionsWithCapacity = await Promise.all(
      sessions.map(async (session) => {
        const currentRegistrations = await db.orderLine.count({
          where: {
            sessionId: session.id,
            product: {
              productType: 'Entry'
            }
          }
        });

        const availableSpots = session.sessionBalanceCapacity - currentRegistrations;
        const isFull = availableSpots <= 0;

        return {
          ...session,
          currentRegistrations,
          availableSpots,
          isFull
        };
      })
    );

    return sessionsWithCapacity;
  });
