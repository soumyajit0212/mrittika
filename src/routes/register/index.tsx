import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Calendar, MapPin, Clock, Users, DollarSign, Check } from "lucide-react";

export const Route = createFileRoute("/register/")({
  component: GuestRegistrationPage,
});

const registrationSchema = z.object({
  guestName: z.string().min(1, "Name is required"),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),
  guestLocation: z.string().optional(),
  adults: z.number().min(1, "At least 1 adult required"),
  children: z.number().min(0),
  infants: z.number().min(0),
  elder: z.number().min(0),
  memberId: z.number().min(1, "Please select a member"),
  eventId: z.number().min(1, "Please select an event"),
  sessionSelections: z.array(z.object({
    sessionId: z.number(),
    selected: z.boolean(),
    optOutOfFood: z.boolean().default(false),
    productSelections: z.array(z.object({
      productId: z.number(),
      productTypeId: z.number(),
      quantity: z.number().min(0)
    }))
  }))
});

type RegistrationForm = z.infer<typeof registrationSchema>;

function GuestRegistrationPage() {
  const trpc = useTRPC();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Query data
  const eventsQuery = useQuery(
    trpc.getPublicEvents.queryOptions()
  );

  const membersQuery = useQuery(
    trpc.getPublicMembers.queryOptions()
  );

  const sessionsQuery = useQuery({
    ...trpc.getPublicSessions.queryOptions({ eventId: selectedEventId! }),
    enabled: !!selectedEventId
  });

  const productsQuery = useQuery(
    trpc.getPublicProducts.queryOptions()
  );

  const registrationMutation = useMutation(trpc.guestRegistration.mutationOptions({
    onSuccess: (data) => {
      toast.success(`Registration successful! Transaction ID: ${data.transactionId}`);
      reset();
      setSelectedEventId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed");
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      adults: 1,
      children: 0,
      infants: 0,
      elder: 0,
      sessionSelections: []
    }
  });

  const { fields: sessionFields, replace: replaceSessionFields } = useFieldArray({
    control,
    name: "sessionSelections"
  });

  const sessionSelections = watch("sessionSelections");
  const watchedEventId = watch("eventId");
  const adults = watch("adults");
  const children = watch("children");
  const infants = watch("infants");
  const elder = watch("elder");

  // Calculate total number of guests
  const totalGuests = (adults || 0) + (children || 0) + (infants || 0) + (elder || 0);

  // Helper function to calculate Entry product quantity based on guest counts
  const calculateEntryQuantity = (productSize: string, adults: number, children: number, elder: number) => {
    switch (productSize) {
      case 'Adult':
        return adults || 0;
      case 'Children':
        return children || 0;
      case 'Elder':
        return elder || 0;
      default:
        return 0;
    }
  };

  // Update sessions when event changes
  useEffect(() => {
    if (watchedEventId && watchedEventId !== selectedEventId) {
      setSelectedEventId(watchedEventId);
    }
  }, [watchedEventId, selectedEventId]);

  // Initialize session selections when sessions load
  useEffect(() => {
    if (sessionsQuery.data && sessionsQuery.data.length > 0 && productsQuery.data) {
      console.log("Guest registration: Initializing session selections...");

      const newSessionSelections = sessionsQuery.data.map(session => {
        const productSelections: any[] = [];

        session.productSessionMaps.forEach(psm => {
          psm.product.productTypes.forEach(productType => {
            // Initialize all quantities to 0 - entry quantities will be set when sessions are selected
            let quantity = 0;

            productSelections.push({
              productId: psm.product.id,
              productTypeId: productType.id,
              quantity
            });
          });
        });

        console.log(`Guest registration: Session ${session.id} initialized with ${productSelections.length} product selections`);

        return {
          sessionId: session.id,
          selected: false,
          optOutOfFood: false,
          productSelections
        };
      });

      replaceSessionFields(newSessionSelections);
      console.log("Guest registration: Session selections initialized:", newSessionSelections);
    }
  }, [sessionsQuery.data, productsQuery.data, adults, children, elder, replaceSessionFields]);

  // Update Entry product quantities when guest counts change
  useEffect(() => {
    if (sessionFields.length > 0 && productsQuery.data && sessionsQuery.data) {
      console.log("Guest registration: Updating entry quantities based on guest counts...");

      sessionFields.forEach((field, sessionIndex) => {
        // Get the current session data directly from the field
        const sessionId = field.sessionId;
        const session = sessionsQuery.data?.find(s => s.id === sessionId);
        if (!session) return;

        // Update entry quantities for this session
        session.productSessionMaps.forEach(psm => {
          psm.product.productTypes.forEach(productType => {
            if (psm.product.productType === 'Entry') {
              const expectedQuantity = calculateEntryQuantity(productType.productSize, adults || 1, children || 0, elder || 0);

              // Find the product selection index by looking at the sessionFields structure
              const productSelectionIndex = sessionFields[sessionIndex]?.productSelections?.findIndex(
                (ps: any) => ps.productId === psm.product.id && ps.productTypeId === productType.id
              );

              if (productSelectionIndex !== undefined && productSelectionIndex >= 0) {
                setValue(`sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`, expectedQuantity);
              }
            }
          });
        });
      });
    }
  }, [adults, children, elder, sessionFields.length, productsQuery.data, sessionsQuery.data, setValue, calculateEntryQuantity]);

  // Calculate total cost with guest-specific logic
  const calculateTotalCost = () => {
    if (!sessionsQuery.data || !productsQuery.data) return { totalCost: 0, entryCost: 0, foodCost: 0, discountApplied: false };

    let entryCost = 0;
    let foodCost = 0;
    let selectedSessionsCount = 0;

    sessionSelections?.forEach((sessionSelection, sessionIndex) => {
      if (sessionSelection.selected) {
        selectedSessionsCount++;

        sessionSelection.productSelections?.forEach(productSelection => {
          if (productSelection.quantity > 0) {
            const session = sessionsQuery.data.find(s => s.id === sessionSelection.sessionId);
            const productSessionMap = session?.productSessionMaps.find(psm => psm.product.id === productSelection.productId);
            const product = productSessionMap?.product;
            const productType = product?.productTypes.find(pt => pt.id === productSelection.productTypeId);

            if (product && productType) {
              const lineTotal = productType.productPrice * productSelection.quantity;

              // Separate costs by product type
              if (product.productType === 'Entry') {
                entryCost += lineTotal;
              } else if (product.productType === 'Food') {
                // Only add food cost if not opted out
                if (!sessionSelection.optOutOfFood) {
                  foodCost += lineTotal;
                }
              }
            }
          }
        });
      }
    });

    // Apply 30% discount only to entry costs if all sessions are selected
    const totalSessions = sessionFields.length;
    const allSessionsSelected = totalSessions > 0 && selectedSessionsCount === totalSessions;
    const twoSessions = selectedSessionsCount >= 2 && selectedSessionsCount < 4;
    const fourSessions = selectedSessionsCount >=4 && selectedSessionsCount < totalSessions;
    let discountPct="0%";
    let discountF=1;
    let discountApplied = false;

    if (allSessionsSelected && entryCost > 0) {
      entryCost = entryCost * 0.7; // 30% discount on entry only
      discountApplied = true;
      discountPct="30%";
      discountF=0.7;
    }else if (fourSessions && entryCost > 0){
      entryCost = entryCost * 0.8;
      discountPct="20%";
      discountApplied = true;
      discountF=0.8;
    }else if (twoSessions && entryCost > 0){
      entryCost = entryCost * 0.9;
      discountPct="10%";
      discountF=0.9;
      discountApplied = true;
    }

    const totalCost = entryCost + foodCost;
    return { totalCost, entryCost, foodCost, discountApplied, discountPct, discountF};
  };

  const { totalCost, entryCost, foodCost, discountApplied, discountPct,  discountF} = calculateTotalCost();

  const onSubmit = async (data: RegistrationForm) => {
    // Validate dine-in food selections for sessions that haven't opted out of food
    let validationError = "";

    // Group selections by person type to validate dine-in requirements
    const personTypeCounts = {
      Adult: data.adults,
      Children: data.children,
      Elder: data.elder
    };

    data.sessionSelections
      .filter(session => session.selected && !session.optOutOfFood)
      .forEach((session, sessionIndex) => {
        // Group food selections by person type
        const foodSelectionsByPersonType: { [key: string]: number } = {};

        session.productSelections?.forEach(productSelection => {
          if (productSelection.quantity > 0) {
            const product = productsQuery.data?.find(p => p.id === productSelection.productId);
            const productType = product?.productTypes.find(pt => pt.id === productSelection.productTypeId);

            if (product?.productType === 'Food' && productType?.productSubtype === 'DINE-IN') {
              const personType = productType.productSize;
              if (!foodSelectionsByPersonType[personType]) {
                foodSelectionsByPersonType[personType] = 0;
              }
              foodSelectionsByPersonType[personType] += productSelection.quantity;
            }
          }
        });

        // Check if dine-in selections match person counts
        Object.entries(foodSelectionsByPersonType).forEach(([personType, totalSelected]) => {
          const requiredCount = personTypeCounts[personType as keyof typeof personTypeCounts] || 0;
          if (requiredCount > 0 && totalSelected !== requiredCount) {
            validationError = `For dine-in meals, you must select exactly ${requiredCount} ${personType.toLowerCase()} meal(s) total per session. Currently selected: ${totalSelected} for ${personType}.`;
          }
        });
      });

    if (validationError) {
      toast.error(validationError, { duration: 6000 });
      return;
    }

    const filteredSessionSelections = data.sessionSelections
      .filter(session => session.selected)
      .map(session => ({
        sessionId: session.sessionId,
        optOutOfFood: session.optOutOfFood,
        productSelections: session.productSelections.filter(p => p.quantity > 0)
      }));

    if (filteredSessionSelections.length === 0) {
      toast.error("Please select at least one session with products.");
      return;
    }

    try {
      await registrationMutation.mutateAsync({
        ...data,
        guestEmail: data.guestEmail || undefined,
        sessionSelections: filteredSessionSelections
      });
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img
            src="https://iili.io/FQqzADQ.png"
            alt="Mrittika Canada Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-red-600">Mrittika Canada</h1>
          <p className="text-gray-600 mt-2">Guest Event Registration</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Guest Event Registration</h1>
            <p className="text-gray-600 mt-1">Register for upcoming events as a guest</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    {...register("guestName")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.guestName && (
                    <p className="mt-1 text-sm text-red-600">{errors.guestName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    {...register("guestEmail")}
                    type="email"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.guestEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.guestEmail.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    {...register("guestPhone")}
                    type="tel"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    {...register("guestLocation")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Family Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Family Details</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adults *
                  </label>
                  <input
                    {...register("adults", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.adults && (
                    <p className="mt-1 text-sm text-red-600">{errors.adults.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Children (5-13)
                  </label>
                  <input
                    {...register("children", { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Infants (0-5)
                  </label>
                  <input
                    {...register("infants", { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Elders (60+)
                  </label>
                  <input
                    {...register("elder", { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Guests
                  </label>
                  <div className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700 cursor-not-allowed">
                    {totalGuests}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Automatically calculated from above entries</p>
                </div>
              </div>
            </div>

            {/* Member and Event Selection */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Event Selection</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sponsoring Member *
                  </label>
                  <select
                    {...register("memberId", { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select a member...</option>
                    {membersQuery.data?.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.memberName} ({member.memberEmail})
                      </option>
                    ))}
                  </select>
                  {errors.memberId && (
                    <p className="mt-1 text-sm text-red-600">{errors.memberId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Event *
                  </label>
                  <select
                    {...register("eventId", { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select an event...</option>
                    {eventsQuery.data?.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.eventName} - {formatDate(event.startDate)}
                      </option>
                    ))}
                  </select>
                  {errors.eventId && (
                    <p className="mt-1 text-sm text-red-600">{errors.eventId.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Session Selection */}
            {sessionsQuery.data && sessionsQuery.data.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Session & Product Selection</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Guest Pricing:</strong> Entry fees apply for all sessions. Select 2 or more sessions to get <strong>10% </strong>off entry fees! Food items are charged at regular prices.
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Guest Pricing:</strong> Entry fees apply for all sessions. Select 4 or more sessions to get <strong>20% </strong>off entry fees! Food items are charged at regular prices.
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Guest Pricing:</strong> Entry fees apply for all sessions. Select all sessions to get <strong>30% </strong>off entry fees! Food items are charged at regular prices.
                  </p>
                </div>

                <div className="space-y-4">
                  {sessionFields.map((field, sessionIndex) => {
                    const session = sessionsQuery.data?.find(s => s.id === field.sessionId);
                    if (!session) return null;

                    return (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-4">
                          <input
                            {...register(`sessionSelections.${sessionIndex}.selected`)}
                            type="checkbox"
                            disabled={session.isFull}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            onChange={(e) => {
                              if (session.isFull && e.target.checked) {
                                e.target.checked = false;
                                toast.error(`${session.sessionName} is full and cannot be selected.`);
                              }
                            }}
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium text-gray-900">{session.sessionName}</h3>
                              {session.isFull && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  FULL
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(session.sessionDate)}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {session.isFull ? (
                                  <span className="text-red-600 font-medium">Full ({session.sessionBalanceCapacity}/{session.sessionBalanceCapacity})</span>
                                ) : (
                                  <span className="text-green-600">
                                    {session.availableSpots} of {session.sessionBalanceCapacity} available
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {session.availableSpots <= 5 && session.availableSpots > 0 && (
                          <div className="mb-4 ml-7 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-yellow-800">
                                  <strong>Limited spots remaining!</strong> Only {session.availableSpots} spots left for this session.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {sessionSelections?.[sessionIndex]?.selected && (
                          <div className="ml-7 space-y-4">
                            {/* Enhanced per-session food opt-out */}
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <input
                                  {...register(`sessionSelections.${sessionIndex}.optOutOfFood`)}
                                  type="checkbox"
                                  className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
                                  onChange={(e) => {
                                    // Clear food product quantities when opting out
                                    if (e.target.checked && sessionSelections?.[sessionIndex]?.productSelections) {
                                      sessionSelections[sessionIndex].productSelections.forEach((productSelection, productIndex) => {
                                        const product = productsQuery.data?.find(p => p.id === productSelection.productId);
                                        if (product?.productType === 'Food') {
                                          setValue(`sessionSelections.${sessionIndex}.productSelections.${productIndex}.quantity`, 0);
                                        }
                                      });
                                    }
                                  }}
                                />
                                <div className="flex-1">
                                  <label className="text-base font-semibold text-amber-900 cursor-pointer">
                                    🚫 Skip Food for This Session (Entry Only)
                                  </label>
                                  <p className="text-sm text-amber-800 mt-1">
                                    Check this box if you only want entry tickets and don't want to order any food for this session.
                                    You'll still pay for entry tickets, but no food orders will be placed.
                                  </p>
                                  {sessionSelections?.[sessionIndex]?.optOutOfFood && (
                                    <div className="mt-2 p-2 bg-amber-100 rounded text-sm text-amber-900 font-medium">
                                      ✓ Food ordering disabled for this session. You'll get entry tickets without any food orders.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Food selection guidance when not opted out */}
                            {!sessionSelections?.[sessionIndex]?.optOutOfFood && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">🍽️ Food Selection Guide</h4>
                                <div className="text-sm text-blue-800 space-y-1">
                                  <p><strong>Your Group:</strong> {adults} Adult{adults !== 1 ? 's' : ''}, {children} Children, {elder} Elder{elder !== 1 ? 's' : ''}</p>
                                  <p><strong>Guest Pricing:</strong> Entry fees apply (30% discount if all sessions selected)</p>
                                  <p><strong>Dine-in meals:</strong> You must select exactly one meal per person in each category</p>
                                  <p><strong>Take-away items:</strong> You can select any quantity you want</p>
                                  <p>💡 <strong>Tip:</strong> If you don't want food, use the "Skip Food" option above</p>
                                </div>
                              </div>
                            )}

                            <h4 className="font-medium text-gray-700">Select Products:</h4>
                            {session.productSessionMaps
                              .filter(psm => sessionSelections?.[sessionIndex]?.optOutOfFood ? psm.product.productType !== 'Food' : true)
                              .map((psm) => {
                                const product = psm.product;
                                const isFood = product.productType === 'Food';

                                return (
                                  <div key={product.id} className={`${isFood ? 'bg-green-50 border-green-200' : 'bg-gray-50'} border p-4 rounded-lg`}>
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="text-lg">{isFood ? '🍽️' : '🎫'}</span>
                                          <p className="font-semibold text-gray-900">{product.productName}</p>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{product.productDesc}</p>
                                      </div>
                                    </div>

                                    {isFood && !sessionSelections?.[sessionIndex]?.optOutOfFood ? (
                                      // Enhanced food selection UI grouped by person type
                                      <div className="space-y-5">
                                        {['Adult', 'Children', 'Elder'].map(personType => {
                                          const personCount = personType === 'Adult' ? adults :
                                                            personType === 'Children' ? children : elder;

                                          if (personCount === 0) return null;

                                          const availableOptions = product.productTypes.filter(pt => pt.productSize === personType);

                                          if (availableOptions.length === 0) return null;

                                          return (
                                            <div key={personType} className="bg-white border-2 border-green-300 rounded-lg p-4">
                                              <div className="flex items-center justify-between mb-3">
                                                <h5 className="font-semibold text-green-800 text-lg">
                                                  {personType === 'Adult' ? '👥' : personType === 'Children' ? '🧒' : '👴'}
                                                  {' '}{personType} Meals
                                                </h5>
                                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                                  {personCount} {personType.toLowerCase()}{personCount !== 1 ? 's' : ''}
                                                </span>
                                              </div>

                                              <div className="grid gap-3">
                                                {availableOptions.map(productType => {
                                                  const productSelectionIndex = sessionSelections?.[sessionIndex]?.productSelections?.findIndex(
                                                    ps => ps.productId === product.id && ps.productTypeId === productType.id
                                                  );

                                                  if (productSelectionIndex === undefined || productSelectionIndex === -1) {
                                                    console.warn(`Guest registration: Product selection not found for product ${product.id}, type ${productType.id} in session ${sessionIndex}`);
                                                    return (
                                                      <div key={productType.id} className="p-3 rounded-lg border bg-red-50 border-red-200">
                                                        <p className="text-red-600 text-sm">Error: Product selection not initialized properly</p>
                                                      </div>
                                                    );
                                                  }

                                                  const isDineIn = productType.productSubtype === 'DINE-IN';

                                                  return (
                                                    <div key={productType.id} className={`p-3 rounded-lg border ${isDineIn ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                                                      <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                          <div className="flex items-center space-x-2">
                                                            <span className="text-sm">{isDineIn ? '🍽️' : '📦'}</span>
                                                            <label className="block text-sm font-medium text-gray-900">
                                                              {productType.productChoice !== 'NONE' ? productType.productChoice : 'Standard Option'}
                                                              {productType.productPref !== 'NONE' && ` - ${productType.productPref}`}
                                                            </label>
                                                          </div>
                                                          <div className="flex items-center justify-between mt-1">
                                                            <span className="text-lg font-bold text-green-600">${productType.productPrice}</span>
                                                            <span className="text-xs text-gray-500">
                                                              {isDineIn ? 'Dine-in meal' : 'Take-away'}
                                                            </span>
                                                          </div>
                                                        </div>

                                                        <div className="ml-4 w-24">
                                                          <input
                                                            {...register(`sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`, { valueAsNumber: true })}
                                                            type="number"
                                                            min="0"
                                                            max={isDineIn ? personCount : undefined}
                                                            placeholder="0"
                                                            className="block w-full border border-gray-300 rounded-md px-2 py-2 text-center text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                                          />
                                                          {isDineIn && (
                                                            <p className="text-xs text-orange-600 mt-1 text-center">
                                                              Max: {personCount}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>

                                              {availableOptions.some(pt => pt.productSubtype === 'DINE-IN') && (
                                                <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                                                  <strong>Dine-in requirement:</strong> For dine-in meals, you must select exactly {personCount} meal{personCount !== 1 ? 's' : ''} total for {personType.toLowerCase()}s in this category.
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      // Regular product selection for non-food items (Entry tickets)
                                      <div className="space-y-3">
                                        {product.productTypes.map(productType => {
                                          const productSelectionIndex = sessionSelections?.[sessionIndex]?.productSelections?.findIndex(
                                            ps => ps.productId === product.id && ps.productTypeId === productType.id
                                          );

                                          if (productSelectionIndex === undefined || productSelectionIndex === -1) {
                                            console.warn(`Guest registration: Product selection not found for product ${product.id}, type ${productType.id} in session ${sessionIndex}`);
                                            return (
                                              <div key={productType.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                <p className="text-red-600 text-sm">Error: Product selection not initialized properly</p>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div key={productType.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700">
                                                    🎫 {productType.productSize}
                                                    {productType.productChoice !== 'NONE' && ` - ${productType.productChoice}`}
                                                    <span className="text-gray-600 ml-2">${productType.productPrice.toFixed(2)}</span>
                                                  </label>
                                                </div>

                                                <div className="ml-4">
                                                  {product.productType === 'Entry' ? (
                                                    <div className="flex items-center space-x-2">
                                                      <div className="w-16 text-center bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700 font-medium">
                                                        {sessionSelections?.[sessionIndex]?.productSelections?.[productSelectionIndex]?.quantity || 0}
                                                      </div>
                                                      <span className="text-xs text-blue-600">Auto-set</span>
                                                      {/* Hidden input to maintain form state */}
                                                      <input
                                                        {...register(`sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`, { valueAsNumber: true })}
                                                        type="hidden"
                                                      />
                                                    </div>
                                                  ) : (
                                                    <input
                                                      {...register(`sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`, { valueAsNumber: true })}
                                                      type="number"
                                                      min="0"
                                                      className="w-20 text-center border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                    />
                                                  )}
                                                </div>
                                              </div>

                                              {product.productType === 'Entry' && (
                                                <p className="text-xs text-blue-600 mt-2">
                                                  ✨ Entry tickets are automatically calculated based on your family size when session is selected!
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cost Summary */}
            {totalCost > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Cost Summary</h2>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {entryCost > 0 && (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Entry Fees Subtotal:</span>
                        <span className="text-sm font-medium text-gray-900">${discountApplied ? (entryCost / discountF).toFixed(2) : entryCost.toFixed(2)}</span>
                      </div>
                      {discountApplied && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-green-600 flex items-center">
                            <Check className="h-4 w-4 mr-1" />
                            Entry Discount ({discountPct} discount applied):
                          </span>
                          <span className="text-sm font-medium text-green-600">-${(((entryCost / discountF).toFixed(2)) *((1 - discountF)).toFixed(2)).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Entry Fees Total:</span>
                        <span className="text-sm font-medium text-gray-900">${entryCost.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {foodCost > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Food Items:</span>
                      <span className="text-sm font-medium text-gray-900">${foodCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total Cost:</span>
                      <span className="font-bold text-lg text-gray-900">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">Please transfer <strong> ${totalCost.toFixed(2)} </strong> using Interac to mrittikacanada@gmail.com. Admin will complete your registration once payment is verified.</span>
                    </div>
                  </div>

                  {!discountApplied && sessionFields.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                      💡 <strong>Tip:</strong> Select all sessions to get 30% off entry fees!
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={registrationMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registrationMutation.isPending
                  ? "Processing..."
                  : totalCost > 0
                    ? `Pay $${totalCost.toFixed(2)} & Complete Registration`
                    : "Complete Registration"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
