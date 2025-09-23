import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/auth";
import toast from "react-hot-toast";
import { Calendar, Clock, Users, UserCheck } from "lucide-react";

export const Route = createFileRoute("/member-register/")({
  component: MemberRegistrationPage,
});

const memberRegistrationSchema = z.object({
  adults: z.number().min(1, "At least 1 adult required"),
  children: z.number().min(0),
  infants: z.number().min(0),
  elder: z.number().min(0),
  eventId: z.number().min(1, "Please select an event"),
  sessionSelections: z.array(
    z.object({
      sessionId: z.number(),
      selected: z.boolean(),
      optOutOfFood: z.boolean().default(false),
      productSelections: z.array(
        z.object({
          productId: z.number(),
          productTypeId: z.number(),
          quantity: z.number().min(0),
        })
      ),
    })
  ),
});

type MemberRegistrationForm = z.infer<typeof memberRegistrationSchema>;

function MemberRegistrationPage() {
  const { user, token } = useAuthStore();
  const trpc = useTRPC();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Queries
  const eventsQuery = useQuery(trpc.getPublicEvents.queryOptions());
  const sessionsQuery = useQuery({
    ...trpc.getPublicSessions.queryOptions({ eventId: selectedEventId! }),
    enabled: !!selectedEventId,
  });
  const productsQuery = useQuery(trpc.getPublicProducts.queryOptions());

  // Mutation
  const registrationMutation = useMutation(
    trpc.memberRegistration.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Registration successful! Transaction ID: ${data.transactionId}`);
        reset();
        setSelectedEventId(null);
      },
      onError: (error: any) => {
        toast.error(error.message || "Registration failed");
      },
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
    getValues,
  } = useForm<MemberRegistrationForm>({
    resolver: zodResolver(memberRegistrationSchema),
    defaultValues: {
      adults: user?.member?.adults || 1,
      children: user?.member?.children || 0,
      infants: user?.member?.infants || 0,
      elder: user?.member?.elder || 0,
      sessionSelections: [],
    },
  });

  const { fields: sessionFields, replace: replaceSessionFields } = useFieldArray({
    control,
    name: "sessionSelections",
  });

  // Watches
  const sessionSelections = watch("sessionSelections");
  const watchedEventId = watch("eventId");
  const adults = watch("adults");
  const children = watch("children");
  const infants = watch("infants");
  const elder = watch("elder");

  // Toggle session (keep Food at 0 by default; clear on deselect)
  const onToggleSession = (sessionIndex: number, selected: boolean) => {
    const current = getValues();
    const sess = sessionsQuery.data?.find(
      (s) => s.id === current.sessionSelections?.[sessionIndex]?.sessionId
    );

    setValue(
      `sessionSelections.${sessionIndex}.selected` as const,
      selected,
      { shouldDirty: true, shouldTouch: true }
    );

    if (!sess) return;

    if (selected) {
      // Default ALL Food quantities to 0
      sess.productSessionMaps.forEach((psm: any) => {
        if (psm.product.productType !== "Food") return;
        psm.product.productTypes.forEach((pt: any) => {
          const psIndex =
            current.sessionSelections?.[sessionIndex]?.productSelections?.findIndex(
              (p: any) => p.productId === psm.product.id && p.productTypeId === pt.id
            ) ?? -1;
          if (psIndex < 0) return;
          setValue(
            `sessionSelections.${sessionIndex}.productSelections.${psIndex}.quantity` as const,
            0,
            { shouldDirty: true }
          );
        });
      });

      setValue(
        `sessionSelections.${sessionIndex}.optOutOfFood` as const,
        false,
        { shouldDirty: true }
      );
    } else {
      // Clear on deselect
      const lines = current.sessionSelections?.[sessionIndex]?.productSelections || [];
      lines.forEach((_ps: any, i: number) => {
        setValue(
          `sessionSelections.${sessionIndex}.productSelections.${i}.quantity` as const,
          0,
          { shouldDirty: true }
        );
      });
      setValue(
        `sessionSelections.${sessionIndex}.optOutOfFood` as const,
        false,
        { shouldDirty: true }
      );
    }
  };

  const totalGuests = (adults || 0) + (children || 0) + (infants || 0) + (elder || 0);

  const calculateEntryQuantity = (
    productSize: string,
    adults: number,
    children: number,
    elder: number
  ) => {
    switch (productSize) {
      case "Adult":
        return adults || 0;
      case "Children":
        return children || 0;
      case "Elder":
        return elder || 0;
      default:
        return 0;
    }
  };

  // Event change → load sessions
  useEffect(() => {
    if (watchedEventId && watchedEventId !== selectedEventId) {
      setSelectedEventId(watchedEventId);
    }
  }, [watchedEventId, selectedEventId]);

  // Initialize session selections when sessions load
  useEffect(() => {
    if (sessionsQuery.data && sessionsQuery.data.length > 0 && productsQuery.data) {
      const newSessionSelections = sessionsQuery.data.map((session: any) => {
        const productSelections: any[] = [];

        session.productSessionMaps.forEach((psm: any) => {
          psm.product.productTypes.forEach((productType: any) => {
            // Auto-populate Entry only; Food stays 0
            let quantity = 0;
            if (psm.product.productType === "Entry") {
              quantity = calculateEntryQuantity(
                productType.productSize,
                adults || 1,
                children || 0,
                elder || 0
              );
            }
            productSelections.push({
              productId: psm.product.id,
              productTypeId: productType.id,
              quantity,
            });
          });
        });

        return {
          sessionId: session.id,
          selected: false,
          optOutOfFood: false,
          productSelections,
        };
      });

      replaceSessionFields(newSessionSelections);
    }
  }, [sessionsQuery.data, productsQuery.data, adults, children, elder, replaceSessionFields]);

  // Keep Entry quantities in sync with family counts
  useEffect(() => {
    if (sessionFields.length > 0 && productsQuery.data && sessionsQuery.data) {
      sessionFields.forEach((field, sessionIndex) => {
        const sessionId = field.sessionId;
        const session = sessionsQuery.data?.find((s: any) => s.id === sessionId);
        if (!session) return;

        session.productSessionMaps.forEach((psm: any) => {
          psm.product.productTypes.forEach((productType: any) => {
            if (psm.product.productType === "Entry") {
              const expectedQuantity = calculateEntryQuantity(
                productType.productSize,
                adults || 1,
                children || 0,
                elder || 0
              );

              const productSelectionIndex =
                sessionFields[sessionIndex]?.productSelections?.findIndex(
                  (ps: any) => ps.productId === psm.product.id && ps.productTypeId === productType.id
                );

              if (productSelectionIndex !== undefined && productSelectionIndex >= 0) {
                setValue(
                  `sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`,
                  expectedQuantity
                );
              }
            }
          });
        });
      });
    }
  }, [adults, children, elder, sessionFields.length, productsQuery.data, sessionsQuery.data, setValue]);

  // Total cost (Food only; Entry is free for members)
  const calculateTotalCost = () => {
    if (!sessionsQuery.data || !productsQuery.data) return 0;
    let total = 0;

    sessionSelections?.forEach((sessionSelection) => {
      if (sessionSelection.selected) {
        sessionSelection.productSelections?.forEach((productSelection) => {
          if (productSelection.quantity > 0) {
            const session = sessionsQuery.data.find((s: any) => s.id === sessionSelection.sessionId);
            const productSessionMap = session?.productSessionMaps.find(
              (psm: any) => psm.product.id === productSelection.productId
            );
            const product = productSessionMap?.product;
            const productType = product?.productTypes.find(
              (pt: any) => pt.id === productSelection.productTypeId
            );

            if (product?.productType === "Food" && productType) {
              total += productType.productPrice * productSelection.quantity;
            }
          }
        });
      }
    });

    return total;
  };

  const totalCost = calculateTotalCost();

  // Guard unauthenticated
  if (!user || !user.member) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You must be logged in as a member to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: MemberRegistrationForm) => {
    if (!token) {
      toast.error("Authentication token not found. Please log in again.");
      return;
    }

    let validationError = "";
    const personTypeCounts = {
      Adult: data.adults,
      Children: data.children,
      Elder: data.elder,
    };

    data.sessionSelections
      .filter((session) => session.selected && !session.optOutOfFood)
      .forEach((session) => {
        const foodSelectionsByPersonType: Record<string, number> = {};

        session.productSelections?.forEach((ps) => {
          if (ps.quantity > 0) {
            const product = productsQuery.data?.find((p: any) => p.id === ps.productId);
            const pt = product?.productTypes.find((t: any) => t.id === ps.productTypeId);

            if (product?.productType === "Food" && pt?.productSubtype === "DINE-IN") {
              const size = pt.productSize;
              foodSelectionsByPersonType[size] = (foodSelectionsByPersonType[size] || 0) + ps.quantity;
            }
          }
        });

        Object.entries(foodSelectionsByPersonType).forEach(([size, totalSelected]) => {
          const requiredCount = personTypeCounts[size as keyof typeof personTypeCounts] || 0;
          if (requiredCount > 0 && totalSelected !== requiredCount) {
            validationError = `For dine-in meals, you must select exactly ${requiredCount} ${size.toLowerCase()} meal(s) total per session. Currently selected: ${totalSelected} for ${size}.`;
          }
        });
      });

    if (validationError) {
      toast.error(validationError, { duration: 6000 });
      return;
    }

    const filteredSessionSelections = data.sessionSelections
      .filter((session) => session.selected)
      .map((session) => ({
        sessionId: session.sessionId,
        optOutOfFood: session.optOutOfFood,
        productSelections: session.productSelections.filter((p) => p.quantity > 0),
      }));

    if (filteredSessionSelections.length === 0) {
      toast.error("Please select at least one session with products.");
      return;
    }

    try {
      await registrationMutation.mutateAsync({
        authToken: token,
        eventId: data.eventId,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        elder: data.elder,
        sessionSelections: filteredSessionSelections,
      });
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  const formatDate = (iso: string) => {
    const base = new Date(iso);
    const utcNoon = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 12)
    );
    return utcNoon.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };
  const formatTime = (timeString: string) => timeString;

  const getCapForSize = (size: "Adult" | "Children" | "Elder" | "Infant") => {
    switch (size) {
      case "Adult":
        return Number(adults || 0);
      case "Children":
        return Number(children || 0);
      case "Elder":
        return Number(elder || 0);
      case "Infant":
        return Number(infants || 0);
      default:
        return 0;
    }
  };

  const isDineInFood = (product: any, pt: any) =>
    product?.productType === "Food" && pt?.productSubtype === "DINE-IN";

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-6">
          {/* LEFT SPONSOR RAIL (desktop+) — EXACTLY LIKE ATTACHED */}
          <aside className="hidden lg:block w-80 xl:w-100">
            <div className="sticky top-24 space-y-2">
              <img
                src="/sponsor1.png"
                alt="Sponsor 1"
                className="w-full h-100 object-contain rounded-lg bg-white border border-gray-200 p-3 shadow-sm"
              />
              <img
                src="/sponsor2.png"
                alt="Sponsor 2"
                className="w-full h-100 object-contain rounded-lg bg-white border border-gray-200 p-3 shadow-sm"
              />
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 max-w-4xl mx-auto">
            {/* Logo / Title */}
            <div className="text-center mb-8">
              <img src="/mrittika.png" alt="Mrittika Canada Logo" className="h-16 w-auto mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-red-600">Mrittika Canada</h1>
              <p className="text-gray-600 mt-2">Member Event Registration</p>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Member Event Registration</h1>
                <p className="text-gray-600 mt-1">Register for upcoming events as a member</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
                {/* Member Info */}
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Member Information</h2>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-blue-900">{user.member.memberName}</p>
                        <p className="text-sm text-blue-700">{user.member.memberEmail}</p>
                        {user.member.memberPhone && (
                          <p className="text-sm text-blue-700">{user.member.memberPhone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Family Details */}
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Family Details</h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Adults (13+) *</label>
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
                      <label className="block text-sm font-medium text-gray-700">Children (5-12)</label>
                      <input
                        {...register("children", { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Infants (0-5)</label>
                      <input
                        {...register("infants", { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Elders (65+)</label>
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
                      <label className="block text-sm font-medium text-gray-700">Total Guests</label>
                      <div className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                        {totalGuests}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Automatically calculated from above entries
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Selection */}
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Event Selection</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Event *</label>
                    <select
                      {...register("eventId", { valueAsNumber: true })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select an event...</option>
                      {eventsQuery.data?.map((event: any) => (
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

                {/* Sessions & Products */}
                {sessionsQuery.data && sessionsQuery.data.length > 0 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-medium text-gray-900">Session & Product Selection</h2>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        <strong>Member Benefit:</strong> As a member, you get free entry to all events! Food items are
                        charged at regular prices.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {sessionFields.map((field, sessionIndex) => {
                        const session = sessionsQuery.data?.find((s: any) => s.id === field.sessionId);
                        if (!session) return null;

                        // Helper to find product/type
                        const findPT = (ps: any) => {
                          for (const psm of session.productSessionMaps) {
                            if (psm.product.id === ps.productId) {
                              const pt = psm.product.productTypes.find((t: any) => t.id === ps.productTypeId);
                              if (pt) return { product: psm.product, pt };
                            }
                          }
                          return null;
                        };

                        return (
                          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center mb-4">
                              <Controller
                                name={`sessionSelections.${sessionIndex}.selected`}
                                control={control}
                                render={({ field }) => (
                                  <input
                                    type="checkbox"
                                    checked={!!field.value}
                                    disabled={session.isFull}
                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      if (session.isFull && checked) {
                                        e.target.checked = false;
                                        toast.error(`${session.sessionName} is full and cannot be selected.`);
                                        return;
                                      }
                                      field.onChange(checked);
                                      onToggleSession(sessionIndex, checked);
                                    }}
                                  />
                                )}
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
                                      <span className="text-red-600 font-medium">
                                        Full ({session.sessionBalanceCapacity}/{session.sessionBalanceCapacity})
                                      </span>
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
                                  <div className="ml-3">
                                    <p className="text-sm text-yellow-800">
                                      <strong>Limited spots remaining!</strong> Only {session.availableSpots} spots left
                                      for this session.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {sessionSelections?.[sessionIndex]?.selected && (
                              <div className="ml-7 space-y-4">
                                {/* Session-level food opt-out */}
                                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                                  <div className="flex items-start space-x-3">
                                    <input
                                      type="checkbox"
                                      {...register(
                                        `sessionSelections.${sessionIndex}.optOutOfFood` as const,
                                        {
                                          onChange: (e) => {
                                            const checked = (e?.target as HTMLInputElement)?.checked;
                                            if (checked) {
                                              const lines =
                                                sessionSelections?.[sessionIndex]?.productSelections || [];
                                              lines.forEach((ps: any, productIndex: number) => {
                                                const product = productsQuery.data?.find(
                                                  (p: any) => p.id === ps.productId
                                                );
                                                if (product?.productType === "Food") {
                                                  setValue(
                                                    `sessionSelections.${sessionIndex}.productSelections.${productIndex}.quantity` as const,
                                                    0,
                                                    { shouldDirty: true, shouldTouch: true }
                                                  );
                                                }
                                              });
                                            }
                                          },
                                        }
                                      )}
                                      className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <label className="text-base font-semibold text-amber-900 cursor-pointer">
                                        🚫 Skip Food for This Session (Entry Only)
                                      </label>
                                      <p className="text-sm text-amber-800 mt-1">
                                        Check this box if you only want entry tickets and don't want to order any food for
                                        this session. As a member, your entry is always <strong>FREE</strong>.
                                      </p>
                                      {sessionSelections?.[sessionIndex]?.optOutOfFood && (
                                        <div className="mt-2 p-2 bg-amber-100 rounded text-sm text-amber-900 font-medium">
                                          ✓ Food ordering disabled for this session.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <h4 className="font-medium text-gray-700">Select Products:</h4>
                                {session.productSessionMaps
                                  .filter((psm: any) =>
                                    sessionSelections?.[sessionIndex]?.optOutOfFood
                                      ? psm.product.productType !== "Food"
                                      : true
                                  )
                                  .map((psm: any) => {
                                    const product = psm.product;
                                    const isFood = product.productType === "Food";

                                    return (
                                      <div
                                        key={product.id}
                                        className={`${isFood ? "bg-green-50 border-green-200" : "bg-gray-50"} border p-4 rounded-lg`}
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-lg">{isFood ? "🍽️" : "🎫"}</span>
                                              <p className="font-semibold text-gray-900">{product.productName}</p>
                                              {product.productType === "Entry" && (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                  FREE for Members
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{product.productDesc}</p>
                                          </div>
                                        </div>

                                        {isFood && !sessionSelections?.[sessionIndex]?.optOutOfFood ? (
                                          // FOOD grouped by person type with cross-type caps
                                          <div className="space-y-5">
                                            {["Adult", "Children", "Elder"].map((personType) => {
                                              const personCount =
                                                personType === "Adult" ? adults : personType === "Children" ? children : elder;
                                              if (personCount === 0) return null;

                                              const availableOptions = product.productTypes.filter(
                                                (pt: any) => pt.productSize === personType
                                              );
                                              if (availableOptions.length === 0) return null;

                                              const selectionsThisSession =
                                                sessionSelections?.[sessionIndex]?.productSelections || [];

                                              return (
                                                <div key={personType} className="bg-white border-2 border-green-300 rounded-lg p-4">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <h5 className="font-semibold text-green-800 text-lg">
                                                      {personType === "Adult" ? "👥" : personType === "Children" ? "🧒" : "👴"}{" "}
                                                      {personType} Meals
                                                    </h5>
                                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                                      {personCount} {personType.toLowerCase()}
                                                      {personCount !== 1 ? "s" : ""}
                                                    </span>
                                                  </div>

                                                  <div className="grid gap-3">
                                                    {availableOptions.map((pt: any) => {
                                                      const productSelectionIndex =
                                                        selectionsThisSession?.findIndex(
                                                          (ps: any) => ps.productId === product.id && ps.productTypeId === pt.id
                                                        );

                                                      if (
                                                        productSelectionIndex === undefined ||
                                                        productSelectionIndex === -1
                                                      ) {
                                                        return (
                                                          <div
                                                            key={pt.id}
                                                            className="p-3 rounded-lg border bg-red-50 border-red-200"
                                                          >
                                                            <p className="text-red-600 text-sm">
                                                              Error: Product selection not initialized properly
                                                            </p>
                                                          </div>
                                                        );
                                                      }

                                                      const isDineIn = pt.productSubtype === "DINE-IN";
                                                      const size = pt.productSize as "Adult" | "Children" | "Elder" | "Infant";
                                                      const cap = getCapForSize(size);

                                                      // Sum of other DINE-IN selections of the same size across the session
                                                      const sumOthersSameGroup = selectionsThisSession.reduce(
                                                        (acc: number, s: any, idx: number) => {
                                                          if (idx === productSelectionIndex) return acc;
                                                          const found = session.productSessionMaps.find(
                                                            (m: any) => m.product.id === s.productId
                                                          );
                                                          const t = found?.product?.productTypes?.find(
                                                            (xx: any) => xx.id === s.productTypeId
                                                          );
                                                          if (isDineInFood(found?.product, t) && t?.productSize === size) {
                                                            acc += Number(s.quantity || 0);
                                                          }
                                                          return acc;
                                                        },
                                                        0
                                                      );

                                                      const maxForThisField = isDineIn
                                                        ? Math.max(0, cap - sumOthersSameGroup)
                                                        : undefined;

                                                      return (
                                                        <div
                                                          key={pt.id}
                                                          className={`p-3 rounded-lg border ${
                                                            isDineIn ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"
                                                          }`}
                                                        >
                                                          <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                              <div className="flex items-center space-x-2">
                                                                <span className="text-sm">{isDineIn ? "🍽️" : "📦"}</span>
                                                                <label className="block text-sm font-medium text-gray-900">
                                                                  {pt.productChoice !== "NONE" ? pt.productChoice : "Standard Option"}
                                                                  {pt.productPref !== "NONE" && ` - ${pt.productPref}`}
                                                                </label>
                                                              </div>
                                                              <div className="flex items-center justify-between mt-1">
                                                                <span className="text-lg font-bold text-green-600">
                                                                  ${pt.productPrice}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                  {isDineIn ? "Dine-in meal" : "Take-away"}
                                                                </span>
                                                              </div>
                                                            </div>

                                                            <div className="ml-4 w-28">
                                                              <Controller
                                                                name={`sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`}
                                                                control={control}
                                                                render={({ field }) => {
                                                                  const currentValue = Number(field.value || 0);
                                                                  const remainingAfterCurrent =
                                                                    isDineIn
                                                                      ? Math.max(0, cap - (sumOthersSameGroup + currentValue))
                                                                      : undefined;

                                                                  return (
                                                                    <>
                                                                      <input
                                                                        type="number"
                                                                        value={currentValue}
                                                                        min={0}
                                                                        max={maxForThisField}
                                                                        onChange={(e) => {
                                                                          let next = e.currentTarget.valueAsNumber;
                                                                          if (Number.isNaN(next)) next = 0;
                                                                          if (isDineIn) {
                                                                            next = Math.max(
                                                                              0,
                                                                              Math.min(next, maxForThisField ?? Number.MAX_SAFE_INTEGER)
                                                                            );
                                                                          }
                                                                          field.onChange(next);
                                                                        }}
                                                                        className="block w-full border border-gray-300 rounded-md px-2 py-2 text-center text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                                                                      />
                                                                      {isDineIn && (
                                                                        <p className="text-[11px] text-orange-700 mt-1 text-center">
                                                                          Remaining for {size.toLowerCase()}: {remainingAfterCurrent}
                                                                        </p>
                                                                      )}
                                                                    </>
                                                                  );
                                                                }}
                                                              />
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>

                                                  {availableOptions.some((pt: any) => pt.productSubtype === "DINE-IN") && (
                                                    <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                                                      <strong>Dine-in requirement:</strong> Select exactly {personCount} meal
                                                      {personCount !== 1 ? "s" : ""} total for {personType.toLowerCase()}s in this
                                                      session (any mix of options).
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          // Non-food (Entry – FREE)
                                          <div className="space-y-3">
                                            {product.productTypes.map((pt: any) => {
                                              const productSelectionIndex =
                                                sessionSelections?.[sessionIndex]?.productSelections?.findIndex(
                                                  (ps: any) => ps.productId === product.id && ps.productTypeId === pt.id
                                                );

                                              if (
                                                productSelectionIndex === undefined ||
                                                productSelectionIndex === -1
                                              ) {
                                                return (
                                                  <div key={pt.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <p className="text-red-600 text-sm">
                                                      Error: Product selection not initialized properly
                                                    </p>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <div key={pt.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700">
                                                        🎫 {pt.productSize}
                                                        {pt.productChoice !== "NONE" && ` - ${pt.productChoice}`}
                                                        <span className="text-green-600 ml-2 font-semibold">FREE</span>
                                                      </label>
                                                    </div>

                                                    <div className="ml-4">
                                                      <div className="flex items-center space-x-2">
                                                        <div className="w-16 text-center bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm text-green-700 font-medium">
                                                          {
                                                            sessionSelections?.[sessionIndex]?.productSelections?.[
                                                              productSelectionIndex
                                                            ]?.quantity || 0
                                                          }
                                                        </div>
                                                        <span className="text-xs text-green-600">Auto-set</span>
                                                        <input
                                                          {...register(
                                                            `sessionSelections.${sessionIndex}.productSelections.${productSelectionIndex}.quantity`,
                                                            { valueAsNumber: true }
                                                          )}
                                                          type="hidden"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <p className="text-xs text-green-600 mt-2">
                                                    ✨ As a member, entry is completely FREE for all your family members!
                                                  </p>
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
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Entry Fee:</span>
                        <span className="text-sm font-medium text-green-600">FREE (Member Benefit)</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Food Items:</span>
                        <span className="text-sm font-medium text-gray-900">${totalCost.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Total Cost:</span>
                          <span className="font-bold text-lg text-gray-900">${totalCost.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-300 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                            Please transfer <strong>${totalCost.toFixed(2)}</strong> using Interac to
                            mrittikacanada@gmail.com. Admin will complete your registration once payment is verified.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit */}
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
                      : "Complete Registration"}
                  </button>
                </div>
              </form>
            </div>

            {/* MOBILE-ONLY SPONSORS — EXACTLY LIKE ATTACHED */}
            <div className="lg:hidden mt-8">
              <h3 className="text-center text-sm font-medium text-gray-600 mb-3">Sponsors</h3>
              <div className="grid grid-cols-2 gap-4">
                <img src="/sponsor1.png" alt="Sponsor 1" className="w-full h-24 object-contain bg-white border border-gray-200 p-2 rounded-lg" />
                <img src="/sponsor2.png" alt="Sponsor 2" className="w-full h-24 object-contain bg-white border border-gray-200 p-2 rounded-lg" />
                <img src="/sponsor3.png" alt="Sponsor 3" className="w-full h-24 object-contain bg-white border border-gray-200 p-2 rounded-lg" />
                <img src="/sponsor4.png" alt="Sponsor 4" className="w-full h-24 object-contain bg-white border border-gray-200 p-2 rounded-lg" />
                <img src="/sponsor5.png" alt="Sponsor 5" className="w-full h-24 object-contain bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
            </div>
          </main>

          {/* RIGHT SPONSOR RAIL (desktop+) — EXACTLY LIKE ATTACHED */}
          <aside className="hidden lg:block w-80 xl:w-100">
            <div className="sticky top-24 space-y-4">
              <img
                src="/sponsor3.png"
                alt="Sponsor 3"
                className="w-full h-100 object-contain rounded-lg bg-white border border-gray-200 p-3 shadow-sm"
              />
              <img
                src="/sponsor4.png"
                alt="Sponsor 4"
                className="w-full h-100 object-contain rounded-lg bg-white border border-gray-200 p-3 shadow-sm"
              />
              <img
                              src="/sponsor5.png"
                              alt="Sponsor 5"
                              className="w-full h-100 object-contain rounded-lg bg-white border border-gray-200 p-3 shadow-sm"
                            />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default MemberRegistrationPage;
