import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { randomBytes } from "crypto";

export const guestRegistration = baseProcedure
  .input(z.object({
    guestName: z.string().min(1),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().optional(),
    guestLocation: z.string().optional(),
    adults: z.number().min(0),
    children: z.number().min(0),
    infants: z.number().min(0),
    elder: z.number().min(0),
    memberId: z.number(),
    eventId: z.number(),
    sessionSelections: z.array(z.object({
      sessionId: z.number(),
      optOutOfFood: z.boolean().default(false),
      productSelections: z.array(z.object({
        productId: z.number(),
        productTypeId: z.number(),
        quantity: z.number().min(1)
      }))
    }))
  }))
  .mutation(async ({ input }) => {
    // Validate member exists
    const member = await db.member.findUnique({
      where: { id: input.memberId }
    });

    if (!member) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found",
      });
    }

    // Validate event exists and get sessions
    const event = await db.event.findUnique({
      where: { id: input.eventId },
      include: {
        sessions: true
      }
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    // Validate all selected sessions belong to the event
    const sessionIds = input.sessionSelections.map(s => s.sessionId);
    const validSessionIds = event.sessions.map(s => s.id);
    const invalidSessions = sessionIds.filter(id => !validSessionIds.includes(id));

    if (invalidSessions.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid session selection",
      });
    }

    // Validate food opt-out and dine-in rules per session
    for (const sessionSelection of input.sessionSelections) {
      if (sessionSelection.optOutOfFood) {
        // Check if any food products are selected when opted out for this session
        for (const productSelection of sessionSelection.productSelections) {
          const productType = await db.productType.findUnique({
            where: { id: productSelection.productTypeId },
            include: { product: true }
          });

          if (productType?.product.productType === 'Food') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot select food products when opted out of food for a session",
            });
          }
        }
      } else {
        // Validate dine-in meal selections when not opted out for this session
        // Group dine-in selections by person type for this session
        const dineInSelectionsByPersonType: { [key: string]: number } = {};

        for (const productSelection of sessionSelection.productSelections) {
          const productType = await db.productType.findUnique({
            where: { id: productSelection.productTypeId },
            include: { product: true }
          });

          if (!productType) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Product type not found",
            });
          }

          // Group dine-in food selections by person type
          if (productType.product.productType === 'Food' && productType.productSubtype === 'DINE-IN') {
            const personType = productType.productSize;
            if (!dineInSelectionsByPersonType[personType]) {
              dineInSelectionsByPersonType[personType] = 0;
            }
            dineInSelectionsByPersonType[personType] += productSelection.quantity;
          }
        }

        // Validate that dine-in selections match person counts for this session
        const personTypeCounts = {
          Adult: input.adults,
          Children: input.children,
          Elder: input.elder
        };

        for (const [personType, totalSelected] of Object.entries(dineInSelectionsByPersonType)) {
          const requiredCount = personTypeCounts[personType as keyof typeof personTypeCounts] || 0;
          if (requiredCount > 0 && totalSelected !== requiredCount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `For dine-in meals, you must select exactly ${requiredCount} ${personType.toLowerCase()} meal(s) total per session. Currently selected: ${totalSelected} for ${personType} in session.`,
            });
          }
        }
      }
    }

    // Check session capacity before processing registration
    for (const sessionSelection of input.sessionSelections) {
      const session = event.sessions.find(s => s.id === sessionSelection.sessionId);
      if (!session) continue;

      // Count current registrations for this session (Entry products only)
      const currentRegistrations = await db.orderLine.count({
        where: {
          sessionId: sessionSelection.sessionId,
          product: {
            productType: 'Entry'
          }
        }
      });

      // Count how many Entry products this registration will add
      let newEntryRegistrations = 0;
      for (const productSelection of sessionSelection.productSelections) {
        const productType = await db.productType.findUnique({
          where: { id: productSelection.productTypeId },
          include: { product: true }
        });

        if (productType?.product.productType === 'Entry') {
          newEntryRegistrations += productSelection.quantity;
        }
      }

      // Check if this would exceed capacity
      const availableSpots = session.sessionBalanceCapacity - currentRegistrations;
      if (newEntryRegistrations > availableSpots) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Session "${session.sessionName}" is full or would exceed capacity. Available spots: ${availableSpots}, trying to register: ${newEntryRegistrations}`,
        });
      }
    }

    // Calculate total cost and apply discount only to entry products
    let entryCost = 0;
    let foodCost = 0;
    const orderLines: Array<{
      productId: number;
      productTypeId: number;
      quantity: number;
      sessionId: number;
      price: number;
    }> = [];

    for (const sessionSelection of input.sessionSelections) {
      for (const productSelection of sessionSelection.productSelections) {
        // Get product type with price
        const productType = await db.productType.findUnique({
          where: { id: productSelection.productTypeId },
          include: { product: true }
        });

        if (!productType) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product type not found",
          });
        }

        const lineTotal = productType.productPrice * productSelection.quantity;

        // Separate costs by product type
        if (productType.product.productType === 'Entry') {
          entryCost += lineTotal;
        } else if (productType.product.productType === 'Food') {
          foodCost += lineTotal;
        }

        orderLines.push({
          productId: productSelection.productId,
          productTypeId: productSelection.productTypeId,
          quantity: productSelection.quantity,
          sessionId: sessionSelection.sessionId,
          price: productType.productPrice
        });
      }
    }

    // Apply 30% discount only to entry costs if guest selects all sessions
    const allSessionsSelected = event.sessions.length === sessionIds.length;
    const twoSessions = sessionIds.length ==2 && sessionIds.length < 3;
    const threeSessions = sessionIds.length ==3 && sessionIds.length < 4;
    const fourSessions = sessionIds.length ==4 && sessionIds.length < event.sessions.length;
    let finalEntryCost = entryCost;
    if (allSessionsSelected && entryCost > 0) {
      finalEntryCost = entryCost * 0.7; // 30% discount on entry only
    }else if (fourSessions && entryCost > 0){
        finalEntryCost = entryCost * 0.75; // 25% discount on entry only
    }else if (threeSessions && entryCost > 0){
        finalEntryCost = entryCost * 0.8; // 20% discount on entry only
    }else if (twoSessions && entryCost > 0){
             finalEntryCost = entryCost * 0.9; // 10% discount on entry only
    }

/*else if (sessionIds.length >= 4 && sessionIds.length < event.sessions.length && entryCost > 0){
      finalEntryCost = entryCost * 0.8; // 20% discount on entry only
    }else if (sessionIds.length >= 2 && sessionIds.length < 4 && entryCost > 0){
      finalEntryCost = entryCost * 0.9; // 10% discount on entry only
    }*/

    // Total cost is discounted entry cost + full food cost
    const totalCost = finalEntryCost + foodCost;

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Create guest
    const guest = await db.guest.create({
      data: {
        memberId: input.memberId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        guestLocation: input.guestLocation,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        elder: input.elder
      }
    });

    // Create order
    const order = await db.orderMaster.create({
      data: {
        guestId: guest.id,
        totalCost,
        transactionId,
        orderLines: {
          create: orderLines.map(line => ({
            productId: line.productId,
            productTypeId: line.productTypeId,
            quantity: line.quantity,
            sessionId: line.sessionId
          }))
        }
      },
      include: {
        orderLines: {
          include: {
            product: true
          }
        }
      }
    });

    return {
      success: true,
      transactionId,
      totalCost,
      discountApplied: allSessionsSelected && entryCost > 0,
      discountAmount: allSessionsSelected && entryCost > 0 ? entryCost * 0.3 : 0,
      entryCost: finalEntryCost,
      foodCost,
      guest,
      order
    };
  });
