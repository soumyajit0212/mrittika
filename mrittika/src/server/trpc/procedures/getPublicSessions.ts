import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPublicSessions = baseProcedure
  .input(z.object({
    eventId: z.number().optional()
  }))
  .query(async ({ input }) => {
    // If no eventId is provided, return an empty array
    if (!input.eventId) {
      return [];
    }

    const sessions = await db.eventSession.findMany({
      where: {
        eventId: input.eventId,
        sessionDate: {
          gte: new Date() // Only show future sessions
        }
      },
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
            product: {
              include: {
                productTypes: {
                  where: {
                    status: "ACTIVE"
                  }
                }
              }
            }
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
