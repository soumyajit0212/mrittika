import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireAdmin, hashPassword } from "~/server/utils/auth";

export const updateUser = baseProcedure
  .input(z.object({
    authToken: z.string(),
    userId: z.number(),
    memberName: z.string().min(1).optional(),
    memberEmail: z.string().email().optional(),
    memberPhone: z.string().optional(),
    adults: z.number().min(1).optional(),
    children: z.number().min(0).optional(),
    infants: z.number().min(0).optional(),
    elder: z.number().min(0).optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["ADMIN", "MEMBER"]).optional()
  }))
  .mutation(async ({ input }) => {
    await requireAdmin(input.authToken);

    const user = await db.user.findUnique({
      where: { id: input.userId },
      include: { member: true }
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Check for email conflicts if email is being updated
    if (input.memberEmail && input.memberEmail !== user.email) {
      const existingUser = await db.user.findUnique({
        where: { email: input.memberEmail }
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }
    }

    // Update member if member data is provided
    if (user.member && (input.memberName || input.memberEmail || input.memberPhone !== undefined || 
        input.adults !== undefined || input.children !== undefined || input.infants !== undefined || input.elder !== undefined)) {
      await db.member.update({
        where: { id: user.member.id },
        data: {
          ...(input.memberName && { memberName: input.memberName }),
          ...(input.memberEmail && { memberEmail: input.memberEmail }),
          ...(input.memberPhone !== undefined && { memberPhone: input.memberPhone }),
          ...(input.adults !== undefined && { adults: input.adults }),
          ...(input.children !== undefined && { children: input.children }),
          ...(input.infants !== undefined && { infants: input.infants }),
          ...(input.elder !== undefined && { elder: input.elder })
        }
      });
    }

    // Update user
    const updateData: any = {};
    if (input.memberEmail) updateData.email = input.memberEmail;
    if (input.role) updateData.role = input.role;
    if (input.password) updateData.password = await hashPassword(input.password);

    const updatedUser = await db.user.update({
      where: { id: input.userId },
      data: updateData,
      include: { member: true }
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        member: updatedUser.member
      }
    };
  });
