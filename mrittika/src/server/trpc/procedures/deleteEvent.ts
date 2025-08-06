import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const deleteEvent = baseProcedure
  .input(z.object({
    authToken: z.string(),
    eventId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const event = await db.event.findUnique({
      where: { id: input.eventId },
      include: {
        sessions: {
          include: {
            productSessionMaps: true
          }
        },
        expenses: true
      }
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    // Check for existing orders/registrations
    const orderCount = await db.orderMaster.count({
      where: {
        orderLines: {
          some: {
            sessionId: {
              in: event.sessions.map(s => s.id)
            }
          }
        }
      }
    });

    if (orderCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete event with existing registrations",
      });
    }

    await db.event.delete({
      where: { id: input.eventId }
    });

    return {
      success: true
    };
  });
