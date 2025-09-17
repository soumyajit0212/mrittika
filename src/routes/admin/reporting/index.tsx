import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "~/components/Layout";
import { useAuthStore } from "~/stores/auth";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { BarChart3, Download, Calendar, DollarSign, Users, Package, FileText, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/admin/reporting/")({
  component: ReportingPage,
});

const exportFormSchema = z.object({
  exportType: z.enum(["expenses", "events", "sessions", "products", "registrations", "foodSessionWise", "foodFamilyWise"]),
  eventId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ExportForm = z.infer<typeof exportFormSchema>;

function ReportingPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [selectedExportType, setSelectedExportType] = useState<string>("expenses");
  const [exportedData, setExportedData] = useState<{
    headers: string[];
    data: any[][];
    exportType: string;
    timestamp: string;
  } | null>(null);
  const [exportParams, setExportParams] = useState<ExportForm | null>(null);

  const eventsQuery = useQuery(
    trpc.getEvents.queryOptions({ authToken: token! })
  );

  const expensesQuery = useQuery(
    trpc.getExpenses.queryOptions({ authToken: token! })
  );

  const sessionsQuery = useQuery(
    trpc.getSessions.queryOptions({ authToken: token! })
  );

  const productsQuery = useQuery(
    trpc.getProducts.queryOptions({ authToken: token! })
  );

  const exportQuery = useQuery({
    ...trpc.exportToExcel.queryOptions({
      authToken: token!,
      ...exportParams!,
    }),
    enabled: exportParams !== null,
  });

  // Handle export query results with useEffect
  useEffect(() => {
    if (exportQuery.isSuccess && exportQuery.data) {
      const data = exportQuery.data;
      
      // Store the data in state for table display
      setExportedData(data);
      
      // Convert data to CSV format
      const csvContent = [
        data.headers.join(','),
        ...data.data.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${data.exportType}_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Export completed successfully");
      
      // Reset export params to disable the query
      setExportParams(null);
    }
    
    if (exportQuery.isError) {
      toast.error(exportQuery.error?.message || "Export failed");
      setExportParams(null);
    }
  }, [exportQuery.isSuccess, exportQuery.isError, exportQuery.data, exportQuery.error]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ExportForm>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      exportType: "expenses"
    }
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

  const onExportSubmit = async (data: ExportForm) => {
    try {
      setExportParams(data);
    } catch (error) {
      // Error handling is done in query callbacks
    }
  };

  // Calculate summary statistics
  const totalEvents = eventsQuery.data?.length || 0;
  const totalSessions = sessionsQuery.data?.length || 0;
  const totalProducts = productsQuery.data?.length || 0;
  
  const totalExpenses = expensesQuery.data?.reduce((sum, expense) => 
    expense.status === 'APPROVED' ? sum + expense.amount : sum, 0) || 0;
  
  const pendingExpenses = expensesQuery.data?.filter(expense => 
    expense.status === 'PENDING').length || 0;

  const approvedExpenses = expensesQuery.data?.filter(expense => 
    expense.status === 'APPROVED').length || 0;

  const rejectedExpenses = expensesQuery.data?.filter(expense => 
    expense.status === 'REJECTED').length || 0;

  // Recent activity (last 5 expenses)
  const recentExpenses = expensesQuery.data?.slice(0, 5) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Reporting & Analytics</h1>
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-sm text-gray-600">Admin Dashboard</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Status Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Expense Status Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{pendingExpenses}</p>
              <p className="text-sm text-yellow-800">Pending Approval</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{approvedExpenses}</p>
              <p className="text-sm text-green-800">Approved</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{rejectedExpenses}</p>
              <p className="text-sm text-red-800">Rejected</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Expense Activity</h2>
          {recentExpenses.length > 0 ? (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{expense.expenseType}</p>
                      <p className="text-xs text-gray-500">{expense.vendor} • {formatDate(expense.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      expense.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      expense.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {expense.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent expenses</p>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Data Export</h2>
          <form onSubmit={handleSubmit(onExportSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Export Type *
                </label>
                <select
                  {...register("exportType")}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                >
                  <option value="expenses">Expenses</option>
                  <option value="events">Events</option>
                  <option value="sessions">Sessions</option>
                  <option value="products">Products</option>
                  <option value="registrations">Registrations</option>
                </select>
                {errors.exportType && (
                  <p className="mt-1 text-sm text-red-600">{errors.exportType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Filter by Event
                </label>
                <select
                  {...register("eventId", { valueAsNumber: true })}
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
                  {...register("startDate")}
                  type="date"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  {...register("endDate")}
                  type="date"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={exportQuery.isLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportQuery.isLoading ? "Exporting..." : "Export to CSV"}
              </button>
            </div>
          </form>
        </div>

        {/* Exported Data Table */}
        {exportedData && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Exported Data - {exportedData.exportType.charAt(0).toUpperCase() + exportedData.exportType.slice(1)}
              </h2>
              <div className="text-sm text-gray-500">
                Exported on: {new Date(exportedData.timestamp).toLocaleString()}
              </div>
            </div>
            
            {exportedData.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {exportedData.headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exportedData.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No data found for the selected criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
