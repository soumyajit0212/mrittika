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
  // members can update without password; admins need password on create
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  // hide from members in UI; admins can set it
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});
type UserForm = z.infer<typeof userFormSchema>;

function UsersPage() {
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const trpc = useTRPC();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Only admins fetch the list
  const usersQuery = useQuery({
    ...trpc.getUsers.queryOptions({ authToken: token! }),
    enabled: !!isAdmin,
  });

  const createUserMutation = useMutation(
    trpc.createUser.mutationOptions({
      onSuccess: () => {
        toast.success("User created successfully");
        setIsModalOpen(false);
        reset();
        usersQuery.refetch();
      },
      onError: (error: any) => {
        toast.error(error?.message ?? "Failed to create user");
      },
    })
  );

  const updateUserMutation = useMutation(
    trpc.updateUser.mutationOptions({
      onSuccess: () => {
        toast.success("User updated successfully");
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
        usersQuery.refetch();
      },
      onError: (error: any) => {
        toast.error(error?.message ?? "Failed to update user");
      },
    })
  );

  const deleteUserMutation = useMutation(
    trpc.deleteUser.mutationOptions({
      onSuccess: () => {
        toast.success("User deleted successfully");
        usersQuery.refetch();
      },
      onError: (error: any) => {
        toast.error(error?.message ?? "Failed to delete user");
      },
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UserForm>({ resolver: zodResolver(userFormSchema) });

  const openCreateModal = () => {
    setEditingUser(null);
    reset({
      memberName: "",
      memberEmail: "",
      memberPhone: "",
      adults: 1,
      children: 0,
      infants: 0,
      elder: 0,
      password: "",
      role: "MEMBER",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setValue("memberName", u.member?.memberName || "");
    setValue("memberEmail", u.email);
    setValue("memberPhone", u.member?.memberPhone || "");
    setValue("adults", u.member?.adults ?? 1);
    setValue("children", u.member?.children ?? 0);
    setValue("infants", u.member?.infants ?? 0);
    setValue("elder", u.member?.elder ?? 0);
    setValue("role", u.role);
    setValue("password", ""); // never prefill
    setIsModalOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this user?")) return;
    deleteUserMutation.mutateAsync({
      authToken: token!,
      userId,
    });
  };

  // IMPORTANT: fully closed function BEFORE return
  const onSubmit = (data: UserForm) => {
    try {
      if (editingUser) {
        // Members can self-update; Admins can update anyone.
        const payload: any = {
          authToken: token!,
          userId: editingUser.id,
          memberName: data.memberName,
          memberEmail: data.memberEmail,
          memberPhone: data.memberPhone,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          elder: data.elder,
        };
        if (data.password) payload.password = data.password;
        if (isAdmin && data.role) payload.role = data.role;
        updateUserMutation.mutateAsync(payload);
      } else {
        // Create is ADMIN-only
        if (!isAdmin) {
          toast.error("Only admins can create users.");
          return;
        }
        if (!data.password || data.password.length < 6) {
          toast.error("Password (min 6) is required to create a user.");
          return;
        }
        if (!data.role) {
          toast.error("Role is required.");
          return;
        }
        createUserMutation.mutateAsync({
          authToken: token!,
          memberName: data.memberName,
          memberEmail: data.memberEmail,
          memberPhone: data.memberPhone,
          adults: data.adults,
          children: data.children,
          infants: data.infants,
          elder: data.elder,
          password: data.password,
          role: data.role,
        });
      }
    } catch {
      // handled by mutation callbacks
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          {isAdmin ? (
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          )}

          {isAdmin ? (
            <button
              onClick={openCreateModal}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </button>
          ) : (
            <button
              onClick={() =>
                openEditModal({
                  id: user!.id,
                  email: user!.email,
                  role: user!.role,
                  member: user!.member,
                })
              }
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Edit My Account
            </button>
          )}
        </div>

        {/* Member self card */}
        {!isAdmin && user && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.member?.memberName || "No Name"}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
                {user.member?.memberPhone && (
                  <p className="text-sm text-gray-500">{user.member.memberPhone}</p>
                )}
              </div>
              <button
                onClick={() =>
                  openEditModal({
                    id: user!.id,
                    email: user!.email,
                    role: user!.role,
                    member: user!.member,
                  })
                }
                className="text-blue-600 hover:text-blue-900"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Admin list */}
        {isAdmin ? (
          usersQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" />
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {usersQuery.data?.map((u) => (
                  <li key={u.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {u.member?.memberName || "No Name"}
                            </p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                            {u.member?.memberPhone && (
                              <p className="text-sm text-gray-500">{u.member.memberPhone}</p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.role === "ADMIN"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
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
          )
        ) : null}

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
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
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
                  <label className="block text-sm font-medium text-gray-700">Email</label>
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
                  <label className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
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
                      <label className="block text-sm font-medium text-gray-700">Adults</label>
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
                      <label className="block text-sm font-medium text-gray-700">Children (5-13)</label>
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
                      <label className="block text-sm font-medium text-gray-700">Infants (0-5)</label>
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
                      <label className="block text-sm font-medium text-gray-700">Elders (60+)</label>
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

                {/* Role - admins only */}
                {isAdmin && (
                  <>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
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
                  </>
                )}

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

export default UsersPage;