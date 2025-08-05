import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const getRegistrationCount = baseProcedure
  .input(z.object({
    authToken: z.string()
  }))
  .query(async ({ input }) => {
    await requireAuth(input.authToken);

    const count = await db.orderMaster.count();

    return {
      count
    };
  });
