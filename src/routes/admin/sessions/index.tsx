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
import { Plus, Edit, Trash2, X, Clock, Calendar, Users, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/sessions/")({
  component: SessionsPage,
});

const sessionFormSchema = z.object({
  sessionName: z.string().min(1, "Session name is required"),
  sessionDate: z.string().min(1, "Session date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  sessionDetails: z.string().optional(),
  sessionBalanceCapacity: z.number().min(1, "Capacity must be at least 1"),
  eventId: z.number().min(1, "Please select an event"),
});

type SessionForm = z.infer<typeof sessionFormSchema>;

function SessionsPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const sessionsQuery = useQuery(
    trpc.getSessions.queryOptions({ 
      authToken: token!,
      eventId: selectedEventId || undefined
    })
  );

  const eventsQuery = useQuery(
    trpc.getEvents.queryOptions({ authToken: token! })
  );

  const createSessionMutation = useMutation(trpc.createSession.mutationOptions({
    onSuccess: () => {
      toast.success("Session created successfully");
      setIsModalOpen(false);
      reset();
      sessionsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create session");
    },
  }));

  const updateSessionMutation = useMutation(trpc.updateSession.mutationOptions({
    onSuccess: () => {
      toast.success("Session updated successfully");
      setIsModalOpen(false);
      setEditingSession(null);
      reset();
      sessionsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update session");
    },
  }));

  const deleteSessionMutation = useMutation(trpc.deleteSession.mutationOptions({
    onSuccess: () => {
      toast.success("Session deleted successfully");
      sessionsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete session");
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SessionForm>({
    resolver: zodResolver(sessionFormSchema),
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
    setEditingSession(null);
    reset();
    setIsModalOpen(true);
  };

  const openEditModal = (session: any) => {
    setEditingSession(session);
    setValue("sessionName", session.sessionName);
    setValue("sessionDate", new Date(session.sessionDate).toISOString().slice(0, 10));
    setValue("startTime", session.startTime);
    setValue("endTime", session.endTime);
    setValue("sessionDetails", session.sessionDetails || "");
    setValue("sessionBalanceCapacity", session.sessionBalanceCapacity);
    setValue("eventId", session.eventId);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: SessionForm) => {
    try {
      if (editingSession) {
        await updateSessionMutation.mutateAsync({
          authToken: token,
          sessionId: editingSession.id,
          ...data,
          sessionDate: new Date(data.sessionDate).toISOString(),
        });
      } else {
        await createSessionMutation.mutateAsync({
          authToken: token,
          ...data,
          sessionDate: new Date(data.sessionDate).toISOString(),
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      await deleteSessionMutation.mutateAsync({
        authToken: token,
        sessionId,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getSessionStatus = (sessionDate: string) => {
    const now = new Date();
    const session = new Date(sessionDate);

    if (session > now) {
      return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'completed', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
          <div className="flex items-center space-x-4">
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
            {user.role === "ADMIN" && (
              <button
                onClick={openCreateModal}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </button>
            )}
          </div>
        </div>

        {sessionsQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading sessions...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sessionsQuery.data?.map((session) => {
              const sessionStatus = getSessionStatus(session.sessionDate);
              
              return (
                <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-red-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">{session.sessionName}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sessionStatus.color}`}>
                        {sessionStatus.status}
                      </span>
                      {user.role === "ADMIN" && (
                        <>
                          <button
                            onClick={() => openEditModal(session)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(session.sessionDate)}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{session.event.eventName}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        Capacity: {session.currentRegistrations}/{session.sessionBalanceCapacity}
                        {session.isFull && <span className="text-red-600 font-medium ml-1">(FULL)</span>}
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            session.isFull ? 'bg-red-500' : 
                            session.availableSpots <= 5 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min((session.currentRegistrations / session.sessionBalanceCapacity) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        session.isFull ? 'text-red-600' : 
                        session.availableSpots <= 5 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {session.availableSpots} available
                      </span>
                    </div>

                    {session.sessionDetails && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Details:</p>
                        <p className="text-sm text-gray-600">{session.sessionDetails}</p>
                      </div>
                    )}

                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-700">Products Available</p>
                        <p className="text-sm font-bold text-blue-600">
                          {session.productSessionMaps?.length || 0}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-700">Registration Status</p>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {session.currentRegistrations} / {session.sessionBalanceCapacity}
                          </p>
                          <p className={`text-xs ${
                            session.isFull ? 'text-red-600' : 
                            session.availableSpots <= 5 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {session.isFull ? 'Full' : 
                             session.availableSpots <= 5 ? 'Nearly Full' : 
                             'Available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sessionsQuery.data?.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-600 mb-4">
              {selectedEventId ? "No sessions found for the selected event." : "Get started by creating your first session."}
            </p>
            {user.role === "ADMIN" && (
              <button
                onClick={openCreateModal}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Add Session
              </button>
            )}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSession ? "Edit Session" : "Create Session"}
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
                    Session Name *
                  </label>
                  <input
                    {...register("sessionName")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter session name..."
                  />
                  {errors.sessionName && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessionName.message}</p>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Session Date *
                  </label>
                  <input
                    {...register("sessionDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.sessionDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessionDate.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Time *
                    </label>
                    <input
                      {...register("startTime")}
                      type="time"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    {errors.startTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Time *
                    </label>
                    <input
                      {...register("endTime")}
                      type="time"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    {errors.endTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Capacity *
                  </label>
                  <input
                    {...register("sessionBalanceCapacity", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter capacity..."
                  />
                  {errors.sessionBalanceCapacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessionBalanceCapacity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Session Details
                  </label>
                  <textarea
                    {...register("sessionDetails")}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter session details..."
                  />
                  {errors.sessionDetails && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessionDetails.message}</p>
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
                    disabled={createSessionMutation.isPending || updateSessionMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createSessionMutation.isPending || updateSessionMutation.isPending
                      ? "Saving..."
                      : editingSession
                      ? "Update"
                      : "Create"}
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
