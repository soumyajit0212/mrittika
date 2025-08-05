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
import { Plus, Edit, Trash2, X, MapPin, Users, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/venues/")({
  component: VenuesPage,
});

const venueFormSchema = z.object({
  venueAddress: z.string().min(1, "Address is required"),
  venueCapacity: z.number().min(1, "Capacity must be at least 1"),
  venueDetails: z.string().optional(),
});

type VenueForm = z.infer<typeof venueFormSchema>;

function VenuesPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any>(null);

  const venuesQuery = useQuery(
    trpc.getVenues.queryOptions({ authToken: token! })
  );

  const createVenueMutation = useMutation(trpc.createVenue.mutationOptions({
    onSuccess: () => {
      toast.success("Venue created successfully");
      setIsModalOpen(false);
      reset();
      venuesQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create venue");
    },
  }));

  const updateVenueMutation = useMutation(trpc.updateVenue.mutationOptions({
    onSuccess: () => {
      toast.success("Venue updated successfully");
      setIsModalOpen(false);
      setEditingVenue(null);
      reset();
      venuesQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update venue");
    },
  }));

  const deleteVenueMutation = useMutation(trpc.deleteVenue.mutationOptions({
    onSuccess: () => {
      toast.success("Venue deleted successfully");
      venuesQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete venue");
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VenueForm>({
    resolver: zodResolver(venueFormSchema),
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
    setEditingVenue(null);
    reset();
    setIsModalOpen(true);
  };

  const openEditModal = (venue: any) => {
    setEditingVenue(venue);
    setValue("venueAddress", venue.venueAddress);
    setValue("venueCapacity", venue.venueCapacity);
    setValue("venueDetails", venue.venueDetails || "");
    setIsModalOpen(true);
  };

  const onSubmit = async (data: VenueForm) => {
    try {
      if (editingVenue) {
        await updateVenueMutation.mutateAsync({
          authToken: token,
          venueId: editingVenue.id,
          ...data,
        });
      } else {
        await createVenueMutation.mutateAsync({
          authToken: token,
          ...data,
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleDeleteVenue = async (venueId: number) => {
    if (window.confirm("Are you sure you want to delete this venue? This will also delete all associated events.")) {
      await deleteVenueMutation.mutateAsync({
        authToken: token,
        venueId,
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
          <button
            onClick={openCreateModal}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Venue
          </button>
        </div>

        {venuesQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading venues...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venuesQuery.data?.map((venue) => (
              <div key={venue.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Venue #{venue.id}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(venue)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(venue.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address:</p>
                    <p className="text-sm text-gray-600">{venue.venueAddress}</p>
                  </div>

                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      Capacity: {venue.venueCapacity}
                    </span>
                  </div>

                  {venue.venueDetails && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Details:</p>
                      <p className="text-sm text-gray-600">{venue.venueDetails}</p>
                    </div>
                  )}

                  {venue.events && venue.events.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Events ({venue.events.length}):
                      </p>
                      <div className="space-y-1">
                        {venue.events.slice(0, 3).map((event: any) => (
                          <p key={event.id} className="text-xs text-gray-500">
                            • {event.eventName}
                          </p>
                        ))}
                        {venue.events.length > 3 && (
                          <p className="text-xs text-gray-400">
                            ... and {venue.events.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {venuesQuery.data?.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first venue.</p>
            <button
              onClick={openCreateModal}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Add Venue
            </button>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingVenue ? "Edit Venue" : "Create Venue"}
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
                    Address *
                  </label>
                  <textarea
                    {...register("venueAddress")}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter venue address..."
                  />
                  {errors.venueAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.venueAddress.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Capacity *
                  </label>
                  <input
                    {...register("venueCapacity", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter maximum capacity..."
                  />
                  {errors.venueCapacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.venueCapacity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Details
                  </label>
                  <textarea
                    {...register("venueDetails")}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter additional venue details..."
                  />
                  {errors.venueDetails && (
                    <p className="mt-1 text-sm text-red-600">{errors.venueDetails.message}</p>
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
                    disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createVenueMutation.isPending || updateVenueMutation.isPending
                      ? "Saving..."
                      : editingVenue
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
