import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/auth";
import { Layout } from "~/components/Layout";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const Route = createFileRoute("/")({
  component: Home,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  memberName: z.string().min(1, "Name is required"),
  memberEmail: z.string().email("Invalid email address"),
  memberPhone: z.string().optional(),
  adults: z.number().min(1, "At least 1 adult required"),
  children: z.number().min(0),
  infants: z.number().min(0),
  elder: z.number().min(0),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function Home() {
  const { isAuthenticated, user, setAuth, token } = useAuthStore();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const trpc = useTRPC();

  const loginMutation = useMutation(trpc.login.mutationOptions());
  const registerMutation = useMutation(trpc.register.mutationOptions());

  // Fetch registration count for authenticated users
  const registrationCountQuery = useQuery(
    trpc.getRegistrationCount.queryOptions(
      { authToken: token! },
      { enabled: isAuthenticated && !!token }
    )
  );

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      adults: 1,
      children: 0,
      infants: 0,
      elder: 0,
    }
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "ADMIN") {
        navigate({ to: "/admin/users" });
      } else {
        navigate({ to: "/admin/events" });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const onLogin = async (data: LoginForm) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      setAuth(result.token, result.user);
      toast.success("Login successful!");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      const result = await registerMutation.mutateAsync(data);
      setAuth(result.token, result.user);
      toast.success("Registration successful!");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
  };

  // Handle conditional rendering after all hooks are called
  if (isAuthenticated && user) {
    return (
      <Layout>
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome, {user.member?.memberName || user.email}!
          </h2>
          <p className="text-gray-600">
            Use the navigation menu to access different features.
          </p>

          {/* Registration count placeholder */}
          <div className="bg-white rounded-lg shadow p-6 max-w-sm mx-auto">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Total Registrations</p>
                {registrationCountQuery.isLoading ? (
                  <div className="text-2xl font-bold text-gray-400">Loading...</div>
                ) : registrationCountQuery.error ? (
                  <div className="text-2xl font-bold text-red-600">Error</div>
                ) : (
                  <div className="text-3xl font-bold text-red-600">
                    {registrationCountQuery.data?.count || 0}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Active registrations in system</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img
            src="/mrittika.png"
            alt="Mrittika Canada Logo"
            className="h-20 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Event Management System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? "Sign in to your account" : "Create a new member account"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isLogin ? (
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...registerLogin("email")}
                    type="email"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {loginErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{loginErrors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    {...registerLogin("password")}
                    type="password"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {loginErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{loginErrors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-6">
              <div>
                <label htmlFor="memberName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    {...registerRegister("memberName")}
                    type="text"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {registerErrors.memberName && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.memberName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...registerRegister("memberEmail")}
                    type="email"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {registerErrors.memberEmail && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.memberEmail.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="memberPhone" className="block text-sm font-medium text-gray-700">
                  Phone Number (Optional)
                </label>
                <div className="mt-1">
                  <input
                    {...registerRegister("memberPhone")}
                    type="tel"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {registerErrors.memberPhone && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.memberPhone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Family Details</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="adults" className="block text-sm font-medium text-gray-700">
                      Adults
                    </label>
                    <input
                      {...registerRegister("adults", { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    {registerErrors.adults && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.adults.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="children" className="block text-sm font-medium text-gray-700">
                      Children (5-13)
                    </label>
                    <input
                      {...registerRegister("children", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    {registerErrors.children && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.children.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="infants" className="block text-sm font-medium text-gray-700">
                      Infants (0-5)
                    </label>
                    <input
                      {...registerRegister("infants", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    {registerErrors.infants && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.infants.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="elder" className="block text-sm font-medium text-gray-700">
                      Elders (60+)
                    </label>
                    <input
                      {...registerRegister("elder", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                    {registerErrors.elder && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.elder.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    {...registerRegister("password")}
                    type="password"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  {registerErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {registerMutation.isPending ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          )}


        </div>
      </div>
    </div>
  );
}
