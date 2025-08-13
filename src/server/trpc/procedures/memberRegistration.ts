import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { requireMember } from "~/server/utils/auth";
import { randomBytes } from "crypto";

export const memberRegistration = baseProcedure
  .input(z.object({
    authToken: z.string(),
    eventId: z.number(),
    adults: z.number().min(1),
    children: z.number().min(0),
    infants: z.number().min(0),
    elder: z.number().min(0),
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
    // Require authenticated member
    const { user } = await requireMember(input.authToken);
    
    if (!user.member) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User is not associated with a member account",
      });
    }

    const member = user.member;

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

    // Validate product types exist and create order lines
    const orderLines: Array<{
      productId: number;
      productTypeId: number;
      quantity: number;
      sessionId: number;
      price: number;
    }> = [];

    // Calculate total cost - members get free entry but pay for food
    let totalCost = 0;

    for (const sessionSelection of input.sessionSelections) {
      for (const productSelection of sessionSelection.productSelections) {
        // Get product type to validate it exists and get pricing info
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

        // For members: Entry is free, Food is charged
        const itemCost = productType.product.productType === 'Entry' ? 0 : productType.productPrice;
        totalCost += itemCost * productSelection.quantity;

        orderLines.push({
          productId: productSelection.productId,
          productTypeId: productSelection.productTypeId,
          quantity: productSelection.quantity,
          sessionId: sessionSelection.sessionId,
          price: productType.productPrice // Store original price for record keeping
        });
      }
    }

    // Generate transaction ID
    const transactionId = `MBR-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Create order for member with calculated cost
    const order = await db.orderMaster.create({
      data: {
        memberId: member.id, // Link directly to member, not guest
        totalCost: totalCost, // Use calculated cost instead of hardcoded 0
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
            product: true,
            productType: true
          }
        }
      }
    });

    return {
      success: true,
      transactionId,
      totalCost: totalCost,
      member: {
        ...member,
        familyDetails: {
          adults: input.adults,
          children: input.children,
          infants: input.infants,
          elder: input.elder
        }
      },
      order
    };
  });
