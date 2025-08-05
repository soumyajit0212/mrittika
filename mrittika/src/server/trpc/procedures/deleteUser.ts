import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin } from "~/server/utils/auth";

export const deleteUser = baseProcedure
  .input(z.object({
    authToken: z.string(),
    userId: z.number()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const user = await db.user.findUnique({
      where: { id: input.userId }
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Delete user (member will be deleted due to cascade in schema)
    await db.user.delete({
      where: { id: input.userId }
    });

    return {
      success: true
    };
  });
