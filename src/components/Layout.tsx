import { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/auth";
import { 
  Users, 
  Calendar, 
  MapPin, 
  Package, 
  Clock, 
  Receipt, 
  BarChart3, 
  UserPlus,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, clearAuth, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/" });
  };

  // Handle conditional rendering after all hooks are called
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  const menuItems = [
    ...(user.role === "ADMIN" ? [
      { name: "User Management", href: "/admin/users", icon: Users },
      { name: "Registration Management", href: "/admin/orders", icon: Receipt },
      { name: "Venue Management", href: "/admin/venues", icon: MapPin },
    ] : []),
    { name: "Event Management", href: "/admin/events", icon: Calendar },
    { name: "Session Management", href: "/admin/sessions", icon: Clock },
    { name: "Product Management", href: "/admin/products", icon: Package },
    { name: "Expense Management", href: "/admin/expenses", icon: Receipt },
    { name: "My Account", href: "/admin/users", icon: Users },
    { name: "Registrations", href: "/member/orders/", icon: Receipt },
    ...(user.role === "ADMIN" ? [
      { name: "Reporting", href: "/admin/reporting", icon: BarChart3 },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <Link to="/" className="flex items-center ml-2 lg:ml-0">
                <img 
                  src="/mrittika.png" 
                  alt="Mrittika Canada Logo" 
                  className="h-12 w-auto mr-3"
                />
                <h1 className="text-2xl font-bold text-red-600">
                  Event Management
                </h1>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/register"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Guest Registration
              </Link>
              
              {user?.member && (
                <Link
                  to="/member-register"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Member Registration
                </Link>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.member?.memberName || user.email}
                  </p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 transition-transform duration-200 ease-in-out
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200
          lg:block
        `}>
          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
