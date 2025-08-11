import { defineEventHandler, toWebRequest } from "@tanstack/react-start/server";

export default defineEventHandler(async (event) => {
  const req = toWebRequest(event);
  let payload: any = null;

  try {
    // Be tolerant of empty/invalid JSON
    try { payload = await req.json(); } catch { payload = null; }
    const { level = "log", args = [] } = (payload ?? {}) as { level?: string; args?: unknown[] };
    const allow: Record<string, (...a: any[]) => void> = {
      log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug,
    };
    (allow[level] ?? console.log)("[client]", ...args);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[client-logs] failed", err);
    // Still return JSON so the client never chokes on HTML
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
});
