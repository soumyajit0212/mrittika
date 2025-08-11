// src/trpc/client.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/trpc/root";

// Expose the React bindings (Provider + hooks are on this object)
export const trpc = createTRPCReact<AppRouter>();
