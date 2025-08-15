import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { requireAuth } from "~/server/utils/auth";
import { db } from "~/server/db";

export const exportToExcel = baseProcedure
  .input(z.object({
    authToken: z.string(),
    exportType: z.enum(["expenses", "events", "sessions", "products", "registrations", "foodSessionWise", "foodFamilyWise"]),
    eventId: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }))
  .query(async ({ input }) => {
    const { user } = await requireAuth(input.authToken);

    let data: any[] = [];
    let headers: string[] = [];

    switch (input.exportType) {
      case "expenses":
        const whereClause: any = {};
        if (user.role !== "ADMIN") {
          whereClause.incurredBy = user.memberId;
        }
        if (input.eventId) {
          whereClause.eventId = input.eventId;
        }
        if (input.startDate && input.endDate) {
          whereClause.createdAt = {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate)
          };
        }

        const expenses = await db.expense.findMany({
          where: whereClause,
          include: {
            member: true,
            event: true
          },
          orderBy: { createdAt: 'desc' }
        });

        headers = ["Date", "Event", "Type", "Vendor", "Amount", "Status", "Incurred By"];
        data = expenses.map(expense => [
          expense.createdAt.toISOString().split('T')[0],
          expense.event.eventName,
          expense.expenseType,
          expense.vendor,
          expense.amount,
          expense.status,
          expense.member.memberName
        ]);
        break;

      case "events":
        if (user.role !== "ADMIN") {
          throw new Error("Unauthorized: Admin access required");
        }

        const events = await db.event.findMany({
          include: {
            venue: true,
            sessions: true,
            expenses: true
          },
          orderBy: { startDate: 'desc' }
        });

        headers = ["Event Name", "Start Date", "End Date", "Venue", "Sessions Count", "Total Expenses"];
        data = events.map(event => [
          event.eventName,
          event.startDate.toISOString().split('T')[0],
          event.endDate.toISOString().split('T')[0],
          event.venue.venueAddress,
          event.sessions.length,
          event.expenses.reduce((sum, exp) => exp.status === 'APPROVED' ? sum + exp.amount : sum, 0)
        ]);
        break;

      case "sessions":
        const sessions = await db.eventSession.findMany({
          where: input.eventId ? { eventId: input.eventId } : undefined,
          include: {
            event: true
          },
          orderBy: { sessionDate: 'desc' }
        });

        headers = ["Session Name", "Event", "Date", "Start Time", "End Time", "Capacity"];
        data = sessions.map(session => [
          session.sessionName,
          session.event.eventName,
          session.sessionDate.toISOString().split('T')[0],
          session.startTime,
          session.endTime,
          session.sessionBalanceCapacity
        ]);
        break;

      case "products":
        const products = await db.product.findMany({
          include: {
            productTypes: true
          },
          orderBy: { createdAt: 'desc' }
        });

        headers = ["Product Code", "Product Name", "Type", "Status", "Variations Count"];
        data = products.map(product => [
          product.productCode,
          product.productName,
          product.productType,
          product.status,
          product.productTypes.length
        ]);
        break;

      
      case "foodSessionWise": {
        // Totals by session: Veg / Non-Veg with Non-Veg breakdown
        const sessions = await db.eventSession.findMany({
          where: input.eventId ? { eventId: input.eventId } : undefined,
          include: { event: true },
          orderBy: { sessionDate: 'asc' }
        });
        const sessionIds = sessions.map(s => s.id);
        const lines = await db.orderLine.findMany({
          where: sessionIds.length > 0 ? { sessionId: { in: sessionIds } } : { NOT: { sessionId: null } },
          include: { product: true, productType: true },
          orderBy: { createdAt: 'asc' }
        });

        type Row = { veg: number; nonVeg: number; chicken: number; mutton: number; fish: number; total: number };
        const bySession: Record<number, Row> = {};

        for (const l of lines) {
          if (!l.sessionId) continue;
          if (l.product?.productType !== "Food") continue;
          const r = (bySession[l.sessionId] ||= { veg: 0, nonVeg: 0, chicken: 0, mutton: 0, fish: 0, total: 0 });
          const qty = l.quantity || 0;
          const choice = String(l.productType?.productChoice || "").toUpperCase();
          const pref = String(l.productType?.productPref || "").toUpperCase();

          if (choice === "VEG") r.veg += qty;
          else if (choice === "NON-VEG" || choice === "NON_VEG" || choice === "NONVEG") {
            r.nonVeg += qty;
            if (pref === "CHICKEN") r.chicken += qty;
            else if (pref === "MUTTON") r.mutton += qty;
            else if (pref === "FISH") r.fish += qty;
          }
          r.total += qty;
        }

        headers = ["Event", "Session", "Date", "Time", "No. of Veg", "No. of Non-Veg", "No. of Chicken", "Mutton", "Fish", "Total"];
        data = sessions.map(sess => {
          const r = bySession[sess.id] || { veg: 0, nonVeg: 0, chicken: 0, mutton: 0, fish: 0, total: 0 };
          const date = (sess.sessionDate instanceof Date ? sess.sessionDate : new Date(sess.sessionDate)).toISOString().split('T')[0];
          const time = `${sess.startTime} - ${sess.endTime}`;
          return [sess.event?.eventName || "", sess.sessionName, date, time, r.veg, r.nonVeg, r.chicken, r.mutton, r.fish, r.total];
        });
        break;
      }

      case "foodFamilyWise": {
        // One row per (order x session) with family-size & choices
        const sessions = await db.eventSession.findMany({
          where: input.eventId ? { eventId: input.eventId } : undefined,
          include: { event: true },
        });
        const sessionIds = sessions.map(s => s.id);
        const sessionMap = new Map(sessions.map(s => [s.id, s]));

        const orders = await db.orderMaster.findMany({
          where: sessionIds.length > 0 ? { orderLines: { some: { sessionId: { in: sessionIds } } } } : undefined,
          include: {
            guest: true,
            member: true,
            orderLines: { where: { sessionId: { in: sessionIds } }, include: { product: true, productType: true } }
          },
          orderBy: { createdAt: 'asc' }
        });

        headers = ["Event", "Session", "Guest Name", "Guest Email", "Adults", "Children", "Elders", "No. of Veg", "No. of Non-Veg", "No. of Chicken", "Mutton", "Fish"];
        data = [];

        for (const order of orders) {
          const bySessionLines: Record<number, any[]> = {};
          for (const l of order.orderLines) {
            if (!l.sessionId) continue;
            (bySessionLines[l.sessionId] ||= []).push(l);
          }

          for (const [sidStr, lines] of Object.entries(bySessionLines)) {
            const sid = Number(sidStr);
            const sess = sessionMap.get(sid);
            if (!sess) continue;

            let adults = 0, children = 0, elders = 0;
            let veg = 0, nonVeg = 0, chicken = 0, mutton = 0, fish = 0;

            for (const l of lines) {
              if (l.product?.productType !== "Food") continue;
              const qty = l.quantity || 0;
              const subtype = String(l.productType?.productSubtype || "").toUpperCase(); // "DINE-IN" / "TAKEAWAY"
              const size = String(l.productType?.productSize || "").toUpperCase();       // ADULT / CHILDREN / ELDER
              const choice = String(l.productType?.productChoice || "").toUpperCase();   // VEG / NON-VEG
              const pref = String(l.productType?.productPref || "").toUpperCase();       // CHICKEN / MUTTON / FISH

              if (subtype === "DINE-IN") {
                if (size === "ADULT") adults += qty;
                else if (size === "CHILDREN" || size == "CHILD") children += qty;
                else if (size === "ELDER" || size == "ELDERLY") elders += qty;
              }

              if (choice === "VEG") veg += qty;
              else if (choice === "NON-VEG" || choice == "NON_VEG" || choice == "NONVEG") {
                nonVeg += qty;
                if (pref === "CHICKEN") chicken += qty;
                else if (pref === "MUTTON") mutton += qty;
                else if (pref === "FISH") fish += qty;
              }
            }

            const name = order.guest?.guestName || order.member?.memberName || "";
            const email = order.guest?.guestEmail || order.member?.memberEmail || "";

            data.push([
              sess.event?.eventName || "",
              sess.sessionName,
              name,
              email,
              adults, children, elders,
              veg, nonVeg, chicken, mutton, fish
            ]);
          }
        }
        break;
      }
case "registrations":
        const orders = await db.orderMaster.findMany({
          where: input.eventId ? {
            orderLines: {
              some: {
                sessionId: {
                  in: await db.eventSession.findMany({
                    where: { eventId: input.eventId },
                    select: { id: true }
                  }).then(sessions => sessions.map(s => s.id))
                }
              }
            }
          } : undefined,
          include: {
            guest: true,
            member: true,
            orderLines: {
              include: {
                product: true,
                productType: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        // Get session information for grouping
        const sessionIds = [...new Set(orders.flatMap(order => 
          order.orderLines.map(line => line.sessionId).filter(Boolean)
        ))];
        
        const sessionsData = await db.eventSession.findMany({
          where: { id: { in: sessionIds } },
          include: { event: true }
        });

        headers = [
          "Order Date", "Transaction ID", "Guest Name", "Guest Email", "Guest Phone", "Guest Location",
          "Adults", "Children", "Infants", "Elders", "Total Family Size",
          "Member Name", "Member Email", "Member Phone",
          "Session Name", "Session Date", "Session Time",
          "Product Name", "Product Type", "Product Size", "Product Choice", "Food Preference", 
          "Product Subtype", "Quantity", "Unit Price", "Line Total", "Order Total Cost"
        ];

        // Create a row for each order line, grouped by session
        data = [];
        for (const order of orders) {
          const guestInfo = order.guest || order.member;
          const baseInfo = [
            order.createdAt.toISOString().split('T')[0],
            order.transactionId,
            order.guest?.guestName || order.member?.memberName || "N/A",
            order.guest?.guestEmail || order.member?.memberEmail || "N/A",
            order.guest?.guestPhone || order.member?.memberPhone || "N/A",
            order.guest?.guestLocation || "N/A",
            order.guest?.adults || order.member?.adults || 0,
            order.guest?.children || order.member?.children || 0,
            order.guest?.infants || order.member?.infants || 0,
            order.guest?.elder || order.member?.elder || 0,
            (order.guest?.adults || order.member?.adults || 0) + 
            (order.guest?.children || order.member?.children || 0) + 
            (order.guest?.infants || order.member?.infants || 0) + 
            (order.guest?.elder || order.member?.elder || 0),
            order.member?.memberName || "N/A",
            order.member?.memberEmail || "N/A",
            order.member?.memberPhone || "N/A"
          ];

          // Group order lines by session
          const linesBySession = order.orderLines.reduce((acc, line) => {
            const sessionId = line.sessionId || 'no-session';
            if (!acc[sessionId]) acc[sessionId] = [];
            acc[sessionId].push(line);
            return acc;
          }, {} as Record<string, typeof order.orderLines>);

          for (const [sessionId, lines] of Object.entries(linesBySession)) {
            const session = sessionsData.find(s => s.id === parseInt(sessionId)) || null;
            const sessionInfo = [
              session?.sessionName || "No Session",
              session?.sessionDate ? session.sessionDate.toISOString().split('T')[0] : "N/A",
              session ? `${session.startTime} - ${session.endTime}` : "N/A"
            ];

            for (const line of lines) {
              const productInfo = [
                line.product.productName,
                line.product.productType,
                line.productType?.productSize || "N/A",
                line.productType?.productChoice || "NONE",
                line.productType?.productPref || "NONE",
                line.productType?.productSubtype || "NONE",
                line.quantity,
                line.productType?.productPrice || 0,
                (line.productType?.productPrice || 0) * line.quantity,
                order.totalCost
              ];

              data.push([...baseInfo, ...sessionInfo, ...productInfo]);
            }
          }
        }
        break;
    }

    return {
      headers,
      data,
      exportType: input.exportType,
      timestamp: new Date().toISOString()
    };
  });
