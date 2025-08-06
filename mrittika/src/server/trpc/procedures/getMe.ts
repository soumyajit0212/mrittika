import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";

export const getMe = baseProcedure
  .input(z.object({ 
    authToken: z.string()
  }))
  .query(async ({ input }) => {
    const { user } = await requireAuth(input.authToken);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      member: user.member
    };
  });
