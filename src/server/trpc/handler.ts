import { defineEventHandler, toWebRequest } from "@tanstack/react-start/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";

export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);

  try {
    return await fetchRequestHandler({
      endpoint: "/trpc",
      router: appRouter,
      req,
      // optional – add context if you need it
      createContext: () => ({} as any),
      // helpful logs while we’re stabilizing prod
      onError({ error, path }) {
        console.error("[tRPC] onError", { path, error: error.message });
      },
      // makes responses fully buffered (safer on some hosts)
      // @ts-expect-error v11 accepts this
      responseMeta() { return { headers: { "content-type": "application/json" } }; },
    });
  } catch (err) {
    console.error("[tRPC] unhandled", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_SERVER_ERROR" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});
