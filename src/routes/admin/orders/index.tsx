import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { useAuthStore } from "~/stores/auth";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Edit,
  Trash2,
  X,
  DollarSign,
  User,
  Package,
  Download,
  Search,
  Filter,
  Users,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  FileText,
  Plus,
  Minus,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/orders/")({
  component: RegistrationManagementPage,
});

const orderFormSchema = z.object({
  totalCost: z.number().min(0, "Total cost must be positive"),
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REFUNDED"])
    .optional(),
  orderLines: z
    .array(
      z.object({
        productId: z.number().min(1, "Please select a product"),
        productTypeId: z.number().optional(),
        quantity: z.number().min(0, "Quantity must be non-negative"),
        sessionId: z.number().optional(),
      }),
    )
    .min(1, "At least one order line is required"),
});

const filterFormSchema = z.object({
  search: z.string().optional(),
  registrationType: z.enum(["all", "guest", "member"]).default("all"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  eventId: z.number().optional(),
});

const exportFormSchema = z.object({
  eventId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type OrderForm = z.infer<typeof orderFormSchema>;
type FilterForm = z.infer<typeof filterFormSchema>;
type ExportForm = z.infer<typeof exportFormSchema>;

const getVisibleOrderLines = (order: any) => {
  const isMemberOrder = !!order.member && !order.guest;
  const lines: any[] = order.orderLines || [];
  // Members get free entry → hide Entry lines in the UI
  return isMemberOrder
    ? lines.filter((l) => l?.product?.productType !== "Entry")
    : lines;
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    CONFIRMED: { color: "bg-blue-100 text-blue-800", label: "Confirmed" },
    CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    COMPLETED: { color: "bg-green-100 text-green-800", label: "Completed" },
    REFUNDED: { color: "bg-gray-100 text-gray-800", label: "Refunded" },
  } as const;

  const config = (statusConfig as any)[status] || statusConfig.PENDING;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
};

function RegistrationManagementPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportParams, setExportParams] = useState<ExportForm | null>(null);

  const ordersQuery = useQuery(trpc.getOrders.queryOptions({ authToken: token! }));
  const eventsQuery = useQuery(trpc.getEvents.queryOptions({ authToken: token! }));
  const productsQuery = useQuery(trpc.getProducts.queryOptions({ authToken: token! }));

  // ✅ Safe spread of export params (won't spread null)
  const exportQuery = useQuery({
    ...trpc.exportToExcel.queryOptions({
      authToken: token!,
      exportType: "registrations",
      ...(exportParams ?? {}),
    }),
    enabled: exportParams !== null,
  });

  const updateOrderMutation = useMutation(
    trpc.updateOrder.mutationOptions({
      onSuccess: () => {
        toast.success("Order updated successfully");
        setIsModalOpen(false);
        setEditingOrder(null);
        reset();
        ordersQuery.refetch();
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to update order");
      },
    }),
  );

  const deleteOrderMutation = useMutation(
    trpc.deleteOrder.mutationOptions({
      onSuccess: () => {
        toast.success("Order deleted successfully");
        ordersQuery.refetch();
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to delete order");
      },
    }),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<OrderForm>({
    resolver: zodResolver(orderFormSchema),
  });

  const {
    fields: orderLineFields,
    append: appendOrderLine,
    remove: removeOrderLine,
    replace: replaceOrderLines,
  } = useFieldArray({
    control,
    name: "orderLines",
  });

  const watchedOrderLines = useWatch({
    control,
    name: "orderLines",
  });

  const {
    register: registerFilter,
    handleSubmit: handleFilterSubmit,
    watch: watchFilter,
    reset: resetFilter,
  } = useForm<FilterForm>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      registrationType: "all",
    },
  });

  // ✅ Watch individual primitives (stable deps)
  const search = watchFilter("search");
  const registrationType = watchFilter("registrationType");
  const dateFrom = watchFilter("dateFrom");
  const dateTo = watchFilter("dateTo");
  const selectedEventId = watchFilter("eventId");

  // Sessions for selected event (used to map orders -> event via orderLines.sessionId)
  const sessionsQuery = useQuery({
    ...trpc.getSessions.queryOptions({
      authToken: token!,
      eventId: selectedEventId || undefined,
    }),
    enabled: !!selectedEventId,
  });

  // Approved expenses for the selected event
  const expensesQuery = useQuery({
    ...trpc.getExpenses.queryOptions({
      authToken: token!,
      eventId: selectedEventId || undefined,
      status: "APPROVED" as any,
    }),
    enabled: !!selectedEventId,
  });

  const {
    register: registerExport,
    handleSubmit: handleExportSubmit,
    formState: { errors: exportErrors },
  } = useForm<ExportForm>({
    resolver: zodResolver(exportFormSchema),
  });

  const calculateTotalFromOrderLines = useCallback(() => {
    if (!watchedOrderLines || !productsQuery.data) return 0;

    return watchedOrderLines.reduce((total, line) => {
      if (line.quantity > 0 && line.productTypeId) {
        const product = productsQuery.data?.find((p) => p.id === line.productId);
        const productType = product?.productTypes.find(
          (pt) => pt.id === line.productTypeId,
        );
        if (productType) {
          return total + productType.productPrice * line.quantity;
        }
      }
      return total;
    }, 0);
  }, [watchedOrderLines, productsQuery.data]);

  // Auto-calculate total cost when order lines change (only while modal open)
  useEffect(() => {
    if (isModalOpen && editingOrder) {
      const calculatedTotal = calculateTotalFromOrderLines();
      setValue("totalCost", calculatedTotal);
    }
  }, [
    watchedOrderLines,
    isModalOpen,
    editingOrder,
    calculateTotalFromOrderLines,
    setValue,
  ]);

  // Handle export query results (one-shot)
  useEffect(() => {
    if (exportQuery.isSuccess && exportQuery.data) {
      const data = exportQuery.data;

      // Convert data to CSV format
      const csvContent = [
        data.headers.join(","),
        ...data.data.map((row: any[]) =>
          row.map((cell) => `"${cell}"`).join(","),
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `registrations_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Registration export completed successfully");
      setShowExportModal(false);
      setExportParams(null); // disable the query
    }

    if (exportQuery.isError) {
      toast.error((exportQuery.error as any)?.message || "Export failed");
      setExportParams(null);
    }
  }, [
    exportQuery.isSuccess,
    exportQuery.isError,
    exportQuery.data,
    exportQuery.error,
  ]);

  // ✅ Derive filtered orders with useMemo (no state, no effect → no loop)
  const filteredOrders = useMemo(() => {
    const all = ordersQuery.data ?? [];
    let filtered = [...all];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.guest?.guestName?.toLowerCase().includes(s) ||
          order.member?.memberName?.toLowerCase().includes(s) ||
          order.guest?.guestEmail?.toLowerCase().includes(s) ||
          order.member?.memberEmail?.toLowerCase().includes(s) ||
          order.transactionId?.toLowerCase().includes(s),
      );
    }

    // Registration type filter
    if (registrationType === "guest") {
      filtered = filtered.filter((order) => order.guest);
    } else if (registrationType === "member") {
      filtered = filtered.filter((order) => order.member && !order.guest);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((o) => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.createdAt) <= to);
    }

    // Event filter: order has at least one line mapped to a session in selected event
    if (selectedEventId && sessionsQuery.data?.length) {
      const ids = new Set(sessionsQuery.data.map((s: any) => s.id));
      filtered = filtered.filter((o) =>
        (o.orderLines ?? []).some((ol: any) => ol.sessionId && ids.has(ol.sessionId)),
      );
    }

    return filtered;
  }, [
    ordersQuery.data,
    search,
    registrationType,
    dateFrom,
    dateTo,
    selectedEventId,
    sessionsQuery.data,
  ]);

  // Guard: only admins allowed
  if (user?.role !== "ADMIN") {
    return (
      <Layout>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">
            You don't have permission to access this page.
          </p>
        </div>
      </Layout>
    );
  }

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setValue("totalCost", order.totalCost);
    setValue("status", order.status || "PENDING");

    // 🚫 Remove Entry-only lines for member orders
    const initialOrderLines = order.orderLines
      .filter(
        (line: any) =>
          !(order.member && line.product?.productType === "Entry"),
      )
      .map((line: any) => ({
        productId: line.productId,
        productTypeId: line.productTypeId || undefined,
        quantity: line.quantity,
        sessionId: line.sessionId || undefined,
      }));

    replaceOrderLines(initialOrderLines);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: OrderForm) => {
    try {
      await updateOrderMutation.mutateAsync({
        authToken: token!,
        orderId: editingOrder.id,
        orderLines: data.orderLines,
        // If your backend schema does not have `status` on OrderMaster,
        // remove the next line to avoid server-side Prisma error.
        status: data.status,
      });
    } catch {
      // handled in mutation callbacks
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this order? This action cannot be undone.",
      )
    ) {
      await deleteOrderMutation.mutateAsync({
        authToken: token!,
        orderId,
      });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "CAD",
    }).format(amount);

  // Stats derived from memoized filteredOrders
  const totalRegistrations = filteredOrders.length;
  const guestRegistrations = filteredOrders.filter((o) => o.guest).length;
  const memberRegistrations = filteredOrders.filter(
    (o) => o.member && !o.guest,
  ).length;
  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + o.totalCost,
    0,
  );
  const totalExpenses = (expensesQuery?.data || []).reduce(
    (sum: number, exp: any) => sum + (exp.amount || 0),
    0,
  );
  const netRevenue = totalRevenue - totalExpenses;
  const totalPeople = filteredOrders.reduce((sum, order) => {
    const g = order.guest;
    const m = order.member;
    if (g) {
      return (
        sum +
        (g.adults || 0) +
        (g.children || 0) +
        (g.infants || 0) +
        (g.elder || 0)
      );
    } else if (m) {
      return (
        sum +
        (m.adults || 0) +
        (m.children || 0) +
        (m.infants || 0) +
        (m.elder || 0)
      );
    }
    return sum;
  }, 0);

  const onExportSubmit = (data: ExportForm) => setExportParams(data);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Registration Management
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Registration Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Registrations
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalRegistrations}
                </p>
                <p className="text-xs text-gray-500">
                  Orders: {formatCurrency(totalRevenue)} • Expenses:{" "}
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Guest | Member
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {guestRegistrations} | {memberRegistrations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total People</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPeople}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(netRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Filter Registrations
              </h3>
              <button
                onClick={() => {
                  resetFilter();
                  setShowFilters(false);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <div className="mt-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...registerFilter("search")}
                    type="text"
                    placeholder="Name, email, transaction ID..."
                    className="pl-10 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Registration Type
                </label>
                <select
                  {...registerFilter("registrationType")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All Registrations</option>
                  <option value="guest">Guest Only</option>
                  <option value="member">Member Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Event
                </label>
                <select
                  {...registerFilter("eventId", { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Events</option>
                  {eventsQuery.data?.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.eventName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  From Date
                </label>
                <input
                  {...registerFilter("dateFrom")}
                  type="date"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  To Date
                </label>
                <input
                  {...registerFilter("dateTo")}
                  type="date"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>
        )}

        {ordersQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" />
            <p className="mt-2 text-gray-600">Loading registrations...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {ordersQuery.data?.length === 0
                ? "No registrations found"
                : "No registrations match your filters"}
            </p>
            {ordersQuery.data?.length !== 0 && (
              <button
                onClick={() => {
                  resetFilter();
                  setShowFilters(false);
                }}
                className="mt-2 text-red-600 hover:text-red-700 text-sm"
              >
                Clear filters to show all registrations
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <li key={order.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Registration Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              {order.guest ? (
                                <div className="flex items-center">
                                  <User className="h-5 w-5 text-blue-600 mr-2" />
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                                    Guest Registration
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">
                                    Member Registration
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-gray-500">
                                #{order.id}
                              </span>
                              {order.status && (
                                <div className="ml-2">{getStatusBadge(order.status)}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(order.totalCost)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Contact Information
                              </h4>
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <User className="h-4 w-4 mr-2" />
                                  {order.guest?.guestName ||
                                    order.member?.memberName ||
                                    "Unknown"}
                                </div>
                                {(order.guest?.guestEmail ||
                                  order.member?.memberEmail) && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Mail className="h-4 w-4 mr-2" />
                                    {order.guest?.guestEmail ||
                                      order.member?.memberEmail}
                                  </div>
                                )}
                                {(order.guest?.guestPhone ||
                                  order.member?.memberPhone) && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="h-4 w-4 mr-2" />
                                    {order.guest?.guestPhone ||
                                      order.member?.memberPhone}
                                  </div>
                                )}
                                {order.guest?.guestLocation && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    {order.guest.guestLocation}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Family Details
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>
                                  Adults:{" "}
                                  {order.guest?.adults || order.member?.adults || 0}
                                </div>
                                <div>
                                  Children:{" "}
                                  {order.guest?.children ||
                                    order.member?.children ||
                                    0}
                                </div>
                                <div>
                                  Infants:{" "}
                                  {order.guest?.infants ||
                                    order.member?.infants ||
                                    0}
                                </div>
                                <div>
                                  Elders:{" "}
                                  {order.guest?.elder || order.member?.elder || 0}
                                </div>
                              </div>
                              <div className="mt-1 text-sm font-medium text-gray-900">
                                Total:{" "}
                                {(order.guest?.adults || order.member?.adults || 0) +
                                  (order.guest?.children ||
                                    order.member?.children ||
                                    0) +
                                  (order.guest?.infants ||
                                    order.member?.infants ||
                                    0) +
                                  (order.guest?.elder || order.member?.elder || 0)}{" "}
                                people
                              </div>
                            </div>
                          </div>

                          {/* Transaction Details */}
                          <div className="flex items-center text-xs text-gray-500 space-x-4 mb-3">
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              Transaction: {order.transactionId}
                            </span>
                            <span className="flex items-center">
                              <Package className="h-3 w-3 mr-1" />
                              {order.orderLines.length} items
                            </span>
                          </div>

                          {/* Order Items Preview */}
                          <div>
                            <details className="text-sm text-gray-600">
                              {(() => {
                                const visible = getVisibleOrderLines(order);
                                return (
                                  <>
                                    <summary className="cursor-pointer hover:text-gray-800 font-medium">
                                      View Registration Details ({visible.length} items)
                                    </summary>
                                    <div className="mt-2 ml-4 space-y-2 bg-gray-50 p-3 rounded">
                                      {visible.length === 0 ? (
                                        <div className="text-sm text-gray-500">
                                          No billable items to display. (Entry is free for
                                          members.)
                                        </div>
                                      ) : (
                                        visible.map((line: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0"
                                          >
                                            <div className="flex-1">
                                              <span className="font-medium">
                                                {line.product?.productName}
                                              </span>
                                              {line.productType && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {line.productType.productSize}
                                                  {line.productType.productChoice !==
                                                    "NONE" && ` • ${line.productType.productChoice}`}
                                                  {line.productType.productPref !== "NONE" &&
                                                    ` • ${line.productType.productPref}`}
                                                  {line.productType.productSubtype !== "NONE" &&
                                                    ` • ${line.productType.productSubtype}`}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="text-sm">
                                                Qty: {line.quantity}
                                              </div>
                                              {line.productType && (
                                                <div className="text-sm font-medium">
                                                  {new Intl.NumberFormat("en-US", {
                                                    style: "currency",
                                                    currency: "CAD",
                                                  }).format(
                                                    (line.productType.productPrice || 0) *
                                                      (line.quantity || 0),
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </details>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openEditModal(order)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
                        title="Edit Registration"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
                        title="Delete Registration"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Edit Order Modal */}
        {isModalOpen && editingOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Registration #{editingOrder.id}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Editing orders may affect customer
                    records. Use with caution.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-700">
                    {editingOrder.guest?.guestName ||
                      editingOrder.member?.memberName}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction ID
                  </label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-700">
                    {editingOrder.transactionId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Status
                  </label>
                  <select
                    {...register("status")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.status.message}
                    </p>
                  )}
                </div>

                {/* Order Lines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Order Items
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        appendOrderLine({
                          productId: 0,
                          productTypeId: undefined,
                          quantity: 1,
                          sessionId: undefined,
                        })
                      }
                      className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {orderLineFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 space-y-3">
                            {/* Product */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Product
                              </label>
                              <select
                                {...register(`orderLines.${index}.productId`, {
                                  valueAsNumber: true,
                                })}
                                className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                onChange={() => {
                                  // Reset product type when product changes
                                  setValue(
                                    `orderLines.${index}.productTypeId`,
                                    undefined,
                                  );
                                }}
                              >
                                <option value={0}>Select a product...</option>
                                {productsQuery.data?.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.productName} ({product.productType})
                                  </option>
                                ))}
                              </select>
                              {errors.orderLines?.[index]?.productId && (
                                <p className="mt-1 text-xs text-red-600">
                                  {
                                    errors.orderLines[index]?.productId
                                      ?.message as any
                                  }
                                </p>
                              )}
                            </div>

                            {/* Product Type */}
                            {watchedOrderLines?.[index]?.productId &&
                              watchedOrderLines[index].productId > 0 && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Product Type
                                  </label>
                                  <select
                                    {...register(
                                      `orderLines.${index}.productTypeId`,
                                      { valueAsNumber: true },
                                    )}
                                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                  >
                                    <option value="">Select type...</option>
                                    {productsQuery.data
                                      ?.find(
                                        (p) =>
                                          p.id ===
                                          watchedOrderLines[index].productId,
                                      )
                                      ?.productTypes.map((productType) => (
                                        <option
                                          key={productType.id}
                                          value={productType.id}
                                        >
                                          {productType.productSize}
                                          {productType.productChoice !== "NONE" &&
                                            ` - ${productType.productChoice}`}
                                          {productType.productPref !== "NONE" &&
                                            ` - ${productType.productPref}`}
                                          {productType.productSubtype !==
                                            "NONE" &&
                                            ` (${productType.productSubtype})`}
                                          {" - $" +
                                            productType.productPrice.toFixed(2)}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              )}

                            {/* Quantity */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              <input
                                {...register(
                                  `orderLines.${index}.quantity`,
                                  { valueAsNumber: true },
                                )}
                                type="number"
                                min="0"
                                className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-red-500 focus:border-red-500"
                              />
                              {errors.orderLines?.[index]?.quantity && (
                                <p className="mt-1 text-xs text-red-600">
                                  {
                                    errors.orderLines[index]?.quantity
                                      ?.message as any
                                  }
                                </p>
                              )}
                            </div>

                            {/* Line Total */}
                            {watchedOrderLines?.[index]?.productTypeId &&
                              watchedOrderLines[index].quantity > 0 && (
                                <div className="text-xs text-gray-600">
                                  Line Total:{" "}
                                  {formatCurrency(
                                    (() => {
                                      const product = productsQuery.data?.find(
                                        (p) =>
                                          p.id ===
                                          watchedOrderLines[index].productId,
                                      );
                                      const productType =
                                        product?.productTypes.find(
                                          (pt) =>
                                            pt.id ===
                                            watchedOrderLines[index]
                                              .productTypeId,
                                        );
                                      return productType
                                        ? productType.productPrice *
                                            watchedOrderLines[index].quantity
                                        : 0;
                                    })(),
                                  )}
                                </div>
                              )}
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeOrderLine(index)}
                            className="flex-shrink-0 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Remove this item"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {errors.orderLines && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.orderLines.message as any}
                    </p>
                  )}
                </div>

                {/* Total Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Cost
                  </label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md text-lg font-semibold text-gray-900">
                    {formatCurrency(calculateTotalFromOrderLines())}
                  </div>
                  <input
                    {...register("totalCost", { valueAsNumber: true })}
                    type="hidden"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateOrderMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {updateOrderMutation.isPending ? "Updating..." : "Update Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Export Registrations
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleExportSubmit(onExportSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Filter by Event
                  </label>
                  <select
                    {...registerExport("eventId", { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">All Events</option>
                    {eventsQuery.data?.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.eventName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    {...registerExport("startDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    {...registerExport("endDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Export includes:</strong> Registration details, contact
                    information, family details, session information, product selections,
                    and pricing data.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={exportQuery.isLoading}
                    className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {exportQuery.isLoading ? "Exporting..." : "Export to CSV"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default RegistrationManagementPage;
