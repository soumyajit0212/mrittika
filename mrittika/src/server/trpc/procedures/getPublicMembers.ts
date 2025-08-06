import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPublicMembers = baseProcedure
  .query(async () => {
    const members = await db.member.findMany({
      select: {
        id: true,
        memberName: true,
        memberEmail: true
      },
      orderBy: {
        memberName: 'asc'
      }
    });

    return members;
  });
