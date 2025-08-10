import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { FileDownload } from "~/components/FileDownload";
import { useAuthStore } from "~/stores/auth";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Edit, X, Receipt, DollarSign, Calendar, User, FileText, Upload, Check, XCircle, Clock, Download } from "lucide-react";

export const Route = createFileRoute("/admin/expenses/")({
  component: ExpensesPage,
});

const expenseFormSchema = z.object({
  expenseType: z.string().min(1, "Expense type is required"),
  vendor: z.string().min(1, "Vendor is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  eventId: z.number().min(1, "Please select an event"),
});

type ExpenseForm = z.infer<typeof expenseFormSchema>;

function ExpensesPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");

  const expensesQuery = useQuery(
    trpc.getExpenses.queryOptions({
      authToken: token!,
      eventId: selectedEventId || undefined,
      status: selectedStatus as any || undefined
    })
  );

  const eventsQuery = useQuery(
    trpc.getEvents.queryOptions({ authToken: token! })
  );

  const createExpenseMutation = useMutation(trpc.createExpense.mutationOptions({
    onSuccess: () => {
      toast.success("Expense created successfully");
      setIsModalOpen(false);
      reset();
      setUploadedFileUrl("");
      expensesQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create expense");
    },
  }));

  const updateExpenseStatusMutation = useMutation(trpc.updateExpenseStatus.mutationOptions({
    onSuccess: () => {
      toast.success("Expense status updated successfully");
      expensesQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update expense status");
    },
  }));

  const getPresignedUrlMutation = useMutation(trpc.getPresignedUrlForUpload.mutationOptions({
    onSuccess: async (data) => {
      try {
        // Get the file from the component state
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = fileInput?.files?.[0];

        if (!file) {
          throw new Error('No file selected');
        }

        // Upload file to presigned URL
        const response = await fetch(data.presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (response.ok) {
          const fileUrl = `${data.bucketName}/${data.objectName}`;
          setUploadedFileUrl(fileUrl);
          toast.success("File uploaded successfully");
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        toast.error("Failed to upload file");
      } finally {
        setUploadingFile(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to get upload URL");
      setUploadingFile(false);
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseFormSchema),
  });

  // Handle conditional rendering after all hooks are called
  if (!user || !token) {
    return (
      <Layout>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">Please log in to access this page.</p>
        </div>
      </Layout>
    );
  }

  const openCreateModal = () => {
    reset();
    setUploadedFileUrl("");
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ExpenseForm) => {
    try {
      await createExpenseMutation.mutateAsync({
        authToken: token,
        ...data,
        receiptFile: uploadedFileUrl || undefined,
      });
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadingFile(true);

    try {
      await getPresignedUrlMutation.mutateAsync({
        authToken: token,
        fileName: file.name,
        fileType: file.type,
      });
    } catch (error) {
      setUploadingFile(false);
    }
  };

  const handleStatusUpdate = async (expenseId: number, newStatus: string) => {
    if (window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this expense?`)) {
      await updateExpenseStatusMutation.mutateAsync({
        authToken: token,
        expenseId,
        status: newStatus as any,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Check className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <button
            onClick={openCreateModal}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Event
              </label>
              <select
                value={selectedEventId || ""}
                onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : null)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Events</option>
                {eventsQuery.data?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </div>

            {user.role === "ADMIN" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {expensesQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading expenses...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {expensesQuery.data?.map((expense) => (
              <div key={expense.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <Receipt className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{expense.expenseType}</h3>
                      <p className="text-sm text-gray-500">{expense.vendor}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                      {getStatusIcon(expense.status)}
                      <span className="ml-1">{expense.status}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="font-semibold text-green-600">{formatCurrency(expense.amount)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(expense.createdAt)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    <span>{expense.member.memberName}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>{expense.event.eventName}</span>
                  </div>

                  {expense.receiptFile && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Download className="h-4 w-4 mr-2" />
                      <FileDownload
                        fileName={expense.receiptFile.split('/').pop() || ''}
                        displayName="View Receipt"
                      />
                    </div>
                  )}

                  {user.role === "ADMIN" && expense.status === "PENDING" && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Admin Actions</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(expense.id, "APPROVED")}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(expense.id, "REJECTED")}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {expensesQuery.data?.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-600 mb-4">
              {selectedEventId || selectedStatus ? "No expenses match your current filters." : "Get started by adding your first expense."}
            </p>
            <button
              onClick={openCreateModal}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Add Expense
            </button>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Create Expense
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expense Type *
                  </label>
                  <input
                    {...register("expenseType")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g., Food, Transportation, Supplies..."
                  />
                  {errors.expenseType && (
                    <p className="mt-1 text-sm text-red-600">{errors.expenseType.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vendor *
                  </label>
                  <input
                    {...register("vendor")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter vendor name..."
                  />
                  {errors.vendor && (
                    <p className="mt-1 text-sm text-red-600">{errors.vendor.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount *
                  </label>
                  <input
                    {...register("amount", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
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
                        {event.eventName}
                      </option>
                    ))}
                  </select>
                  {errors.eventId && (
                    <p className="mt-1 text-sm text-red-600">{errors.eventId.message}</p>
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
                    disabled={createExpenseMutation.isPending || uploadingFile}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createExpenseMutation.isPending ? "Creating..." : "Create Expense"}
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
