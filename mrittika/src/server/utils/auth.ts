import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { env } from "~/server/env";
import { db } from "~/server/db";

export const signToken = (payload: { userId: number; role: string; memberId?: number }) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1y" });
};

export const verifyToken = (token: string) => {
  try {
    const verified = jwt.verify(token, env.JWT_SECRET);
    return z.object({ 
      userId: z.number(), 
      role: z.string(),
      memberId: z.number().optional()
    }).parse(verified);
  } catch (error) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const requireAuth = async (authToken: string) => {
  const payload = verifyToken(authToken);
  
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { member: true }
  });
  
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }
  
  return { user, payload };
};

export const requireAdmin = async (authToken: string) => {
  const { user, payload } = await requireAuth(authToken);
  
  if (user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  
  return { user, payload };
};

export const requireMember = async (authToken: string) => {
  const { user, payload } = await requireAuth(authToken);
  
  if (user.role !== "MEMBER" && user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Member access required",
    });
  }
  
  return { user, payload };
};
