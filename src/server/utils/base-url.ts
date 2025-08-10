/* import assert from "assert";
import { env } from "../env";

export function getBaseUrl({ port }: { port?: number } = {}): string {
  if (port === undefined || port === 8000) {
    // it's the primary port
    return env.BASE_URL ?? "http://localhost:8000";
  }

  // it's a secondary port

  if (env.BASE_URL_OTHER_PORT) {
    return env.BASE_URL_OTHER_PORT.replace("[PORT]", port.toString());
  }

  const primaryBaseUrl = getBaseUrl();
  if (primaryBaseUrl.startsWith("http://")) {
    // it's an http url, so replace the port
    return `${primaryBaseUrl.split("://")[0]}://${primaryBaseUrl.split("://")[1]!.split(":")[0]}:${port}`;
  }

  // it's an https url, so replace the subdomain with subdomain--port
  assert(primaryBaseUrl.startsWith("https://"));
  const primaryBaseUrlParts = primaryBaseUrl.split(".");
  return `${primaryBaseUrlParts[0]}--${port}.${primaryBaseUrlParts.slice(1).join(".")}`;
} */

  // src/server/utils/base-url.ts
import assert from "assert";
import { env } from "../env";

/**
 * Returns an absolute base URL for the server.
 * - On Vercel/Netlify: uses the platform URL (no ports allowed in serverless).
 * - Else: uses env.BASE_URL (default http://localhost:8000).
 * - If a secondary port is requested, uses BASE_URL_OTHER_PORT or rewrites the URL:
 *   - http://host:PORT  -> just swap the port
 *   - https://sub.domain -> https://sub--PORT.domain (same as your original logic)
 */
export function getBaseUrl({ port }: { port?: number } = {}): string {
  // ----- Serverless platforms (ignore custom port logic) -----
  // Vercel sets VERCEL_URL (e.g. my-app.vercel.app) – no scheme
  const vercelUrl = env.VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // Netlify sets NETLIFY plus one of DEPLOY_PRIME_URL / DEPLOY_URL / URL
  if (env.NETLIFY || process.env.NETLIFY) {
    const netlifyUrl =
      env.DEPLOY_PRIME_URL ||
      env.DEPLOY_URL ||
      env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      process.env.DEPLOY_URL ||
      process.env.URL;
    if (netlifyUrl) return netlifyUrl;
  }

  // ----- Local / custom hosting -----
  const primary = env.BASE_URL ?? "http://localhost:8000";

  // Primary port case: return base as-is
  if (port === undefined || port === 8000) {
    return primary;
  }

  // Secondary port: allow explicit override pattern, e.g. "http://localhost:[PORT]"
  if (env.BASE_URL_OTHER_PORT) {
    return env.BASE_URL_OTHER_PORT.replace("[PORT]", port.toString());
  }

  // No explicit override—derive from the primary URL.
  const u = new URL(primary);

  // If http, we can just swap the port
  if (u.protocol === "http:") {
    // If the primary had no port, just set one. If it had, replace it.
    u.port = String(port);
    // URL.origin returns scheme://host[:port]
    return u.origin;
  }

  // If https, use subdomain--PORT.domain style (your original approach)
  assert(u.protocol === "https:");
  const hostParts = u.hostname.split(".");
  // Example: sub.domain.tld  -> sub--3001.domain.tld
  hostParts[0] = `${hostParts[0]}--${port}`;
  const newHost = hostParts.join(".");
  return `${u.protocol}//${newHost}`;
}

