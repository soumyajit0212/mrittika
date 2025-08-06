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
import { Plus, Edit, Trash2, X, Calendar, MapPin, Clock, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/events/")({
  component: EventsPage,
});

const eventFormSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  eventDetails: z.string().optional(),
  venueId: z.number().min(1, "Please select a venue"),
});

type EventForm = z.infer<typeof eventFormSchema>;

function EventsPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const eventsQuery = useQuery(
    trpc.getEvents.queryOptions({ authToken: token! })
  );

  const venuesQuery = useQuery(
    trpc.getVenues.queryOptions({ authToken: token! })
  );

  const createEventMutation = useMutation(trpc.createEvent.mutationOptions({
    onSuccess: () => {
      toast.success("Event created successfully");
      setIsModalOpen(false);
      reset();
      eventsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create event");
    },
  }));

  const updateEventMutation = useMutation(trpc.updateEvent.mutationOptions({
    onSuccess: () => {
      toast.success("Event updated successfully");
      setIsModalOpen(false);
      setEditingEvent(null);
      reset();
      eventsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update event");
    },
  }));

  const deleteEventMutation = useMutation(trpc.deleteEvent.mutationOptions({
    onSuccess: () => {
      toast.success("Event deleted successfully");
      eventsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete event");
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EventForm>({
    resolver: zodResolver(eventFormSchema),
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
    setEditingEvent(null);
    reset();
    setIsModalOpen(true);
  };

  const openEditModal = (event: any) => {
    setEditingEvent(event);
    setValue("eventName", event.eventName);
    setValue("startDate", new Date(event.startDate).toISOString().slice(0, 10));
    setValue("endDate", new Date(event.endDate).toISOString().slice(0, 10));
    setValue("eventDetails", event.eventDetails || "");
    setValue("venueId", event.venueId);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: EventForm) => {
    try {
      if (editingEvent) {
        await updateEventMutation.mutateAsync({
          authToken: token,
          eventId: editingEvent.id,
          ...data,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      } else {
        await createEventMutation.mutateAsync({
          authToken: token,
          ...data,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (window.confirm("Are you sure you want to delete this event? This will also delete all associated sessions and registrations.")) {
      await deleteEventMutation.mutateAsync({
        authToken: token,
        eventId,
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

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { status: 'upcoming', color: 'bg-blue-100 text-blue-800' };
    } else if (now >= start && now <= end) {
      return { status: 'ongoing', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'completed', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          {user.role === "ADMIN" && (
            <button
              onClick={openCreateModal}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </button>
          )}
        </div>

        {eventsQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading events...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {eventsQuery.data?.map((event) => {
              const eventStatus = getEventStatus(event.startDate, event.endDate);
              const totalExpenses = event.expenses?.reduce((sum, expense) => 
                expense.status === 'APPROVED' ? sum + expense.amount : sum, 0) || 0;
              
              return (
                <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-red-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">{event.eventName}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventStatus.color}`}>
                        {eventStatus.status}
                      </span>
                      {user.role === "ADMIN" && (
                        <>
                          <button
                            onClick={() => openEditModal(event)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
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
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                    </div>

                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium">Venue #{event.venue.id}</p>
                        <p className="text-xs">{event.venue.venueAddress}</p>
                        <p className="text-xs">Capacity: {event.venue.venueCapacity}</p>
                      </div>
                    </div>

                    {event.eventDetails && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Details:</p>
                        <p className="text-sm text-gray-600">{event.eventDetails}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Sessions</p>
                        <p className="text-lg font-bold text-red-600">{event.sessions?.length || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Expenses</p>
                        <p className="text-lg font-bold text-green-600">${totalExpenses.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {eventsQuery.data?.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first event.</p>
            {user.role === "ADMIN" && (
              <button
                onClick={openCreateModal}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Add Event
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
                  {editingEvent ? "Edit Event" : "Create Event"}
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
                    Event Name *
                  </label>
                  <input
                    {...register("eventName")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter event name..."
                  />
                  {errors.eventName && (
                    <p className="mt-1 text-sm text-red-600">{errors.eventName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Venue *
                  </label>
                  <select
                    {...register("venueId", { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select a venue...</option>
                    {venuesQuery.data?.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        Venue #{venue.id} - {venue.venueAddress.split(',')[0]}
                      </option>
                    ))}
                  </select>
                  {errors.venueId && (
                    <p className="mt-1 text-sm text-red-600">{errors.venueId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <input
                    {...register("startDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date *
                  </label>
                  <input
                    {...register("endDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Event Details
                  </label>
                  <textarea
                    {...register("eventDetails")}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter event details..."
                  />
                  {errors.eventDetails && (
                    <p className="mt-1 text-sm text-red-600">{errors.eventDetails.message}</p>
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
                    disabled={createEventMutation.isPending || updateEventMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createEventMutation.isPending || updateEventMutation.isPending
                      ? "Saving..."
                      : editingEvent
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
