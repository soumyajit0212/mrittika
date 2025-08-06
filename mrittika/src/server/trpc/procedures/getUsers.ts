import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getUsers = baseProcedure
  .input(z.object({
    authToken: z.string()
  }))
  .query(async ({ input }) => {
    await requireAdmin(input.authToken);

    const users = await db.user.findMany({
      include: {
        member: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      member: user.member
    }));
  });
