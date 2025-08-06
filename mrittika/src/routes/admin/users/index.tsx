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
import { Plus, Edit, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin/users/")({
  component: UsersPage,
});

const userFormSchema = z.object({
  memberName: z.string().min(1, "Name is required"),
  memberEmail: z.string().email("Invalid email address"),
  memberPhone: z.string().optional(),
  adults: z.number().min(1, "At least 1 adult required"),
  children: z.number().min(0),
  infants: z.number().min(0),
  elder: z.number().min(0),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

type UserForm = z.infer<typeof userFormSchema>;

function UsersPage() {
  const { token, user } = useAuthStore();
  const trpc = useTRPC();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const usersQuery = useQuery(
    trpc.getUsers.queryOptions({ authToken: token! })
  );

  const createUserMutation = useMutation(trpc.createUser.mutationOptions({
    onSuccess: () => {
      toast.success("User created successfully");
      setIsModalOpen(false);
      reset();
      usersQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create user");
    },
  }));

  const updateUserMutation = useMutation(trpc.updateUser.mutationOptions({
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsModalOpen(false);
      setEditingUser(null);
      reset();
      usersQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user");
    },
  }));

  const deleteUserMutation = useMutation(trpc.deleteUser.mutationOptions({
    onSuccess: () => {
      toast.success("User deleted successfully");
      usersQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete user");
    },
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
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

  const openCreateModal = () => {
    setEditingUser(null);
    reset();
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setValue("memberName", user.member?.memberName || "");
    setValue("memberEmail", user.email);
    setValue("memberPhone", user.member?.memberPhone || "");
    setValue("adults", user.member?.adults || 1);
    setValue("children", user.member?.children || 0);
    setValue("infants", user.member?.infants || 0);
    setValue("elder", user.member?.elder || 0);
    setValue("role", user.role);
    setValue("password", ""); // Don't pre-fill password
    setIsModalOpen(true);
  };

  const onSubmit = async (data: UserForm) => {
    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({
          authToken: token!,
          userId: editingUser.id,
          ...data,
          password: data.password || undefined,
        });
      } else {
        await createUserMutation.mutateAsync({
          authToken: token!,
          ...data,
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await deleteUserMutation.mutateAsync({
        authToken: token!,
        userId,
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <button
            onClick={openCreateModal}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>

        {usersQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {usersQuery.data?.map((user) => (
                <li key={user.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.member?.memberName || "No Name"}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.member?.memberPhone && (
                            <p className="text-sm text-gray-500">{user.member.memberPhone}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "ADMIN" 
                              ? "bg-red-100 text-red-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
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

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUser ? "Edit User" : "Create User"}
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
                    Full Name
                  </label>
                  <input
                    {...register("memberName")}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.memberName && (
                    <p className="mt-1 text-sm text-red-600">{errors.memberName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    {...register("memberEmail")}
                    type="email"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.memberEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.memberEmail.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone (Optional)
                  </label>
                  <input
                    {...register("memberPhone")}
                    type="tel"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.memberPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.memberPhone.message}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Family Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Adults
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
                      {errors.children && (
                        <p className="mt-1 text-sm text-red-600">{errors.children.message}</p>
                      )}
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
                      {errors.infants && (
                        <p className="mt-1 text-sm text-red-600">{errors.infants.message}</p>
                      )}
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
                      {errors.elder && (
                        <p className="mt-1 text-sm text-red-600">{errors.elder.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    {...register("role")}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {editingUser && "(Leave blank to keep current)"}
                  </label>
                  <input
                    {...register("password")}
                    type="password"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
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
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {createUserMutation.isPending || updateUserMutation.isPending
                      ? "Saving..."
                      : editingUser
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
