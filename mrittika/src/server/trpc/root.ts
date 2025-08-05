import {
  createCallerFactory,
  createTRPCRouter,
  baseProcedure,
} from "~/server/trpc/main";

// Authentication procedures
import { login } from "~/server/trpc/procedures/login";
import { register } from "~/server/trpc/procedures/register";
import { getMe } from "~/server/trpc/procedures/getMe";

// User management procedures
import { createUser } from "~/server/trpc/procedures/createUser";
import { getUsers } from "~/server/trpc/procedures/getUsers";
import { updateUser } from "~/server/trpc/procedures/updateUser";
import { deleteUser } from "~/server/trpc/procedures/deleteUser";

// Venue management procedures
import { createVenue } from "~/server/trpc/procedures/createVenue";
import { getVenues } from "~/server/trpc/procedures/getVenues";
import { updateVenue } from "~/server/trpc/procedures/updateVenue";
import { deleteVenue } from "~/server/trpc/procedures/deleteVenue";

// Event management procedures
import { createEvent } from "~/server/trpc/procedures/createEvent";
import { getEvents } from "~/server/trpc/procedures/getEvents";
import { updateEvent } from "~/server/trpc/procedures/updateEvent";
import { deleteEvent } from "~/server/trpc/procedures/deleteEvent";

// Session management procedures
import { createSession } from "~/server/trpc/procedures/createSession";
import { getSessions } from "~/server/trpc/procedures/getSessions";
import { updateSession } from "~/server/trpc/procedures/updateSession";
import { deleteSession } from "~/server/trpc/procedures/deleteSession";

// Product management procedures
import { createProduct } from "~/server/trpc/procedures/createProduct";
import { getProducts } from "~/server/trpc/procedures/getProducts";
import { updateProduct } from "~/server/trpc/procedures/updateProduct";
import { deleteProduct } from "~/server/trpc/procedures/deleteProduct";
import { createProductType } from "~/server/trpc/procedures/createProductType";
import { updateProductType } from "~/server/trpc/procedures/updateProductType";
import { deleteProductType } from "~/server/trpc/procedures/deleteProductType";
import { addProductToSession } from "~/server/trpc/procedures/addProductToSession";
import { removeProductFromSession } from "~/server/trpc/procedures/removeProductFromSession";

// Expense management procedures
import { createExpense } from "~/server/trpc/procedures/createExpense";
import { getExpenses } from "~/server/trpc/procedures/getExpenses";
import { updateExpenseStatus } from "~/server/trpc/procedures/updateExpenseStatus";

// Order management procedures
import { getOrders } from "~/server/trpc/procedures/getOrders";
import { updateOrder } from "~/server/trpc/procedures/updateOrder";
import { deleteOrder } from "~/server/trpc/procedures/deleteOrder";

// Guest registration
import { guestRegistration } from "~/server/trpc/procedures/guestRegistration";

// Member registration
import { memberRegistration } from "~/server/trpc/procedures/memberRegistration";

// Registration count
import { getRegistrationCount } from "~/server/trpc/procedures/getRegistrationCount";

// Public endpoints for guest registration
import { getPublicEvents } from "~/server/trpc/procedures/getPublicEvents";
import { getPublicMembers } from "~/server/trpc/procedures/getPublicMembers";
import { getPublicProducts } from "~/server/trpc/procedures/getPublicProducts";
import { getPublicSessions } from "~/server/trpc/procedures/getPublicSessions";

// File upload and export procedures
import { getPresignedUrlForUpload } from "~/server/trpc/procedures/getPresignedUrlForUpload";
import { exportToExcel } from "~/server/trpc/procedures/exportToExcel";

export const appRouter = createTRPCRouter({
  // Authentication
  login,
  register,
  getMe,
  
  // User Management
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  
  // Venue Management
  createVenue,
  getVenues,
  updateVenue,
  deleteVenue,
  
  // Event Management
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  
  // Session Management
  createSession,
  getSessions,
  updateSession,
  deleteSession,
  
  // Product Management
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  createProductType,
  updateProductType,
  deleteProductType,
  addProductToSession,
  removeProductFromSession,
  
  // Expense Management
  createExpense,
  getExpenses,
  updateExpenseStatus,
  
  // Order Management
  getOrders,
  updateOrder,
  deleteOrder,
  
  // Guest Registration
  guestRegistration,
  
  // Member Registration
  memberRegistration,
  
  // Public endpoints
  getPublicEvents,
  getPublicMembers,
  getPublicProducts,
  getPublicSessions,
  
  // File upload and export
  getPresignedUrlForUpload,
  exportToExcel,
  
  // Registration count
  getRegistrationCount,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
