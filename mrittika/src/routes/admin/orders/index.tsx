import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { useAuthStore } from "~/stores/auth";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Edit, Trash2, X, DollarSign, User, Calendar, Package, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
});

const orderFormSchema = z.object({
  totalCost: z.number().min(0, "Total cost must be positive"),
});

type OrderForm = z.infer<typeof orderFormSchema>;

function OrdersPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);

  const ordersQuery = useQuery(
    trpc.getOrders.queryOptions({ authToken: token! })
  );

  const updateOrderMutation = useMutation(trpc.updateOrder.mutationOptions({
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
  }));

  const deleteOrderMutation = useMutation(trpc.deleteOrder.mutationOptions({
    onSuccess: () => {
      toast.success("Order deleted successfully");
      ordersQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete order");
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<OrderForm>({
    resolver: zodResolver(orderFormSchema),
  });

  // Handle conditional rendering after all hooks are called
  if (user?.role !== "ADMIN") {
    return (
      <Layout>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setValue("totalCost", order.totalCost);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: OrderForm) => {
    try {
      await updateOrderMutation.mutateAsync({
        authToken: token!,
        orderId: editingOrder.id,
        totalCost: data.totalCost,
      });
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      await deleteOrderMutation.mutateAsync({
        authToken: token!,
        orderId,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <div className="text-sm text-gray-500">
            Total Orders: {ordersQuery.data?.length || 0}
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading orders...</p>
          </div>
        ) : ordersQuery.data?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {ordersQuery.data?.map((order) => (
                <li key={order.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {order.guest?.guestName || order.member?.memberName || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {order.guest?.guestEmail || order.member?.memberEmail || "No email"}
                              </p>
                              {(order.guest?.guestPhone || order.member?.memberPhone) && (
                                <p className="text-sm text-gray-500">
                                  {order.guest?.guestPhone || order.member?.memberPhone}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(order.createdAt)}
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              {formatCurrency(order.totalCost)}
                            </span>
                            <span className="flex items-center">
                              <Package className="h-4 w-4 mr-1" />
                              {order.orderLines.length} items
                            </span>
                          </div>

                          <div className="mt-2">
                            <p className="text-xs text-gray-400">
                              Transaction ID: {order.transactionId}
                            </p>
                          </div>

                          {/* Guest Details */}
                          {order.guest && (
                            <div className="mt-2 text-xs text-gray-600">
                              <span className="font-medium">Family:</span> 
                              {order.guest.adults} adults, {order.guest.children} children, 
                              {order.guest.infants} infants, {order.guest.elder} elders
                              {order.guest.guestLocation && (
                                <span> • Location: {order.guest.guestLocation}</span>
                              )}
                            </div>
                          )}

                          {/* Order Items Preview */}
                          <div className="mt-2">
                            <details className="text-xs text-gray-600">
                              <summary className="cursor-pointer hover:text-gray-800">
                                View Order Items ({order.orderLines.length})
                              </summary>
                              <div className="mt-1 ml-4 space-y-1">
                                {order.orderLines.map((line, index) => (
                                  <div key={index} className="flex justify-between">
                                    <span>
                                      {line.product.productName} 
                                      {line.productType && ` (${line.productType.productSize})`}
                                      {line.quantity > 1 && ` x${line.quantity}`}
                                    </span>
                                    {line.productType && (
                                      <span>${(line.productType.productPrice * line.quantity).toFixed(2)}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openEditModal(order)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit Order"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete Order"
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
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Order #{editingOrder.id}
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
                    <strong>Warning:</strong> Editing orders may affect customer records. Use with caution.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-700">
                    {editingOrder.guest?.guestName || editingOrder.member?.memberName}
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
                    Total Cost ($)
                  </label>
                  <input
                    {...register("totalCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.totalCost && (
                    <p className="mt-1 text-sm text-red-600">{errors.totalCost.message}</p>
                  )}
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
      </div>
    </Layout>
  );
}
