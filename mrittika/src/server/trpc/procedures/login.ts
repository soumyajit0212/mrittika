import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { comparePassword, signToken } from "~/server/utils/auth";

export const login = baseProcedure
  .input(z.object({ 
    email: z.string().email(),
    password: z.string().min(1)
  }))
  .mutation(async ({ input }) => {
    const user = await db.user.findUnique({
      where: { email: input.email },
      include: { member: true }
    });

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const isValidPassword = await comparePassword(input.password, user.password);
    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      memberId: user.memberId || undefined
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        member: user.member
      }
    };
  });
