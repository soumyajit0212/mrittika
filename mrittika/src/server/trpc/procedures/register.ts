import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { hashPassword, signToken } from "~/server/utils/auth";

export const register = baseProcedure
  .input(z.object({ 
    memberName: z.string().min(1),
    memberEmail: z.string().email(),
    memberPhone: z.string().optional(),
    adults: z.number().min(1).default(1),
    children: z.number().min(0).default(0),
    infants: z.number().min(0).default(0),
    elder: z.number().min(0).default(0),
    password: z.string().min(6)
  }))
  .mutation(async ({ input }) => {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: input.memberEmail }
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email already exists",
      });
    }

    // Check if member email already exists
    const existingMember = await db.member.findUnique({
      where: { memberEmail: input.memberEmail }
    });

    if (existingMember) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Member with this email already exists",
      });
    }

    const hashedPassword = await hashPassword(input.password);

    // Create member first
    const member = await db.member.create({
      data: {
        memberName: input.memberName,
        memberEmail: input.memberEmail,
        memberPhone: input.memberPhone,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        elder: input.elder
      }
    });

    // Create user linked to member
    const user = await db.user.create({
      data: {
        email: input.memberEmail,
        password: hashedPassword,
        role: "MEMBER",
        memberId: member.id
      }
    });

    const token = signToken({
      userId: user.id,
      role: user.role,
      memberId: member.id
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        member
      }
    };
  });
