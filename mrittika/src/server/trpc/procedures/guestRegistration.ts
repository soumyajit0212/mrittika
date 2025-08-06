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
    adults: z.number().min(1),
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

    // Validate dine-in rules for all sessions
    for (let i = 0; i < input.sessionSelections.length; i++) {
      const sessionSelection = input.sessionSelections[i];
      console.log(`Validating session ${i + 1} (ID: ${sessionSelection.sessionId})`);
      
      // Skip dine-in validation if opted out of food
      if (sessionSelection.optOutOfFood) {
        console.log(`Session ${i + 1} opted out of food, skipping dine-in validation`);
        continue;
      }
      
      console.log(`Validating dine-in requirements for session ${i + 1}...`);
      // Validate dine-in meal selections for this session
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
      
      console.log(`Session ${i + 1} dine-in selections:`, dineInSelectionsByPersonType);
      
      // Validate that dine-in selections match person counts for this session
      const personTypeCounts = {
        Adult: input.adults,
        Children: input.children,
        Elder: input.elder
      };
      
      for (const [personType, totalSelected] of Object.entries(dineInSelectionsByPersonType)) {
        const requiredCount = personTypeCounts[personType as keyof typeof personTypeCounts] || 0;
        if (requiredCount > 0 && totalSelected !== requiredCount) {
          console.log(`ERROR: Dine-in validation failed for session ${i + 1} - ${personType}: required ${requiredCount}, selected ${totalSelected}`);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `For dine-in meals in session ${i + 1}, you must select exactly ${requiredCount} ${personType.toLowerCase()} meal(s) total. Currently selected: ${totalSelected} for ${personType}.`,
          });
        }
      }
      console.log(`Session ${i + 1} dine-in validation passed`);
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
    let finalEntryCost = entryCost;
    if (allSessionsSelected && entryCost > 0) {
      finalEntryCost = entryCost * 0.7; // 30% discount on entry only
    }

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
