import { createLogger } from "vite";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
  url?: string;
  userAgent?: string;
  stacks?: string[];
  extra?: any;
}

interface ClientLogRequest {
  logs: LogEntry[];
}

export interface ConsoleForwardOptions {
  /**
   * Whether to enable console forwarding (default: true in dev mode)
   */
  enabled?: boolean;
  /**
   * API endpoint path (default: '/api/debug/client-logs')
   */
  endpoint?: string;
  /**
   * Console levels to forward (default: ['log', 'warn', 'error', 'info', 'debug'])
   */
  levels?: ("log" | "warn" | "error" | "info" | "debug")[];
}

const logger = createLogger("info", {
  prefix: "[browser]",
});

export function consoleForwardPlugin(
  options: ConsoleForwardOptions = {},
): Plugin {
  const {
    enabled = true,
    endpoint = "/api/debug/client-logs",
    levels = ["log", "warn", "error", "info", "debug"],
  } = options;

  const virtualModuleId = "virtual:console-forward";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;

  return {
    name: "console-forward",

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!enabled) {
          return html;
        }

        // Check if the virtual module is already imported
        if (html.includes("virtual:console-forward")) {
          return html;
        }

        // Inject the import script in the head section
        return html.replace(
          /<head[^>]*>/i,
          (match) =>
            `${match}\n    <script type="module">import "virtual:console-forward";</script>`,
        );
      },
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        if (!enabled) {
          return "export default {};";
        }

        // Create the console forwarding code
        return `
// Console forwarding module
const originalMethods = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

const logBuffer = [];
let flushTimeout = null;
const FLUSH_DELAY = 100;
const MAX_BUFFER_SIZE = 50;
let isUnloading = false;
const abortController = new AbortController();

function createLogEntry(level, args) {
  const stacks = [];
  const extra = [];

  const message = args.map((arg) => {
    if (arg === undefined) return "undefined";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error || typeof arg.stack === "string") {
      let stringifiedError = arg.toString();
      if (arg.stack) {
        let stack = arg.stack.toString();
        if (stack.startsWith(stringifiedError)) {
          stack = stack.slice(stringifiedError.length).trimStart();
        }
        if (stack) {
          stacks.push(stack);
        }
      }
      return stringifiedError;
    }
    if (typeof arg === "object" && arg !== null) {
      try {
        extra.push(JSON.parse(JSON.stringify(arg)));
      } catch {
        extra.push(String(arg));
      }
      return "[extra#" + extra.length + "]";
    }
    return String(arg);
  }).join(" ");

  return {
    level,
    message,
    timestamp: new Date(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    stacks,
    extra,
  };
}

let isFlushing = false;

async function sendLogs(logs, useBeacon = false) {
  if (isFlushing) return; // Prevent concurrent flush operations
  isFlushing = true;

  try {
    if (isUnloading && useBeacon && navigator.sendBeacon) {
      // Use sendBeacon for final logs during page unload - it's designed for this
      try {
        const success = navigator.sendBeacon("${endpoint}", JSON.stringify({ logs }));
        if (!success) {
          // Fall back to fetch with keepalive if sendBeacon fails
          await fetch("${endpoint}", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logs }),
            keepalive: true,
          });
        }
      } catch (error) {
        // Fail silently during unload
      }
      return;
    }

    await fetch("${endpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
      signal: abortController.signal,
      keepalive: useBeacon,
    });
  } catch (error) {
    // Only log errors in development, fail silently in production
    if (error.name !== 'AbortError') {
      // Fail silently for non-abort errors too
    }
  } finally {
    isFlushing = false;
  }
}

function flushLogs(useBeacon = false) {
  if (logBuffer.length === 0 || isFlushing) return;
  
  const logsToSend = [...logBuffer];
  logBuffer.length = 0;
  
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  // During unload, we need to avoid creating promises that might not resolve
  if (isUnloading && useBeacon) {
    // Synchronous beacon send to avoid promise issues during unload
    try {
      const success = navigator.sendBeacon("${endpoint}", JSON.stringify({ logs: logsToSend }));
      if (!success) {
        // If sendBeacon fails, try a synchronous fetch with keepalive
        // This might still fail but won't create unhandled promises
        fetch("${endpoint}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: logsToSend }),
          keepalive: true,
        }).catch(() => {
          // Fail silently
        });
      }
    } catch (error) {
      // Fail silently
    }
  } else {
    // Normal async send for non-unload scenarios
    sendLogs(logsToSend, useBeacon).catch(() => {
      // Fail silently to avoid unhandled promise rejections
    });
  }
}

function addToBuffer(entry) {
  if (isUnloading) return; // Don't add new logs during unload
  
  logBuffer.push(entry);
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    flushLogs();
    return;
  }
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushLogs, FLUSH_DELAY);
  }
}

// Patch console methods
${levels
  .map(
    (level) => `
console.${level} = function(...args) {
  originalMethods.${level}(...args);
  const entry = createLogEntry("${level}", args);
  addToBuffer(entry);
};`,
  )
  .join("")}

// Cleanup handlers with better promise handling
let hasUnloadHandlerRun = false;

window.addEventListener("beforeunload", () => {
  if (hasUnloadHandlerRun) return;
  isUnloading = true;
  flushLogs(true); // This is now synchronous during unload
});

// Also handle visibility change for better reliability
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && !isUnloading && !hasUnloadHandlerRun) {
    flushLogs(true); // Use beacon when page becomes hidden
  }
});

// Periodic flush (less frequent to reduce requests)
const flushInterval = setInterval(() => {
  if (!isUnloading && !hasUnloadHandlerRun) {
    flushLogs();
  }
}, 10000);

// Cleanup on page unload - abort any pending requests and clear interval
window.addEventListener("unload", () => {
  hasUnloadHandlerRun = true;
  clearInterval(flushInterval);
  // Give a small delay before aborting to allow any final beacon sends
  setTimeout(() => {
    abortController.abort();
  }, 10);
});

export default { flushLogs };
        `;
      }
    },
    configureServer(server) {
      // Add API endpoint to handle forwarded console logs
      server.middlewares.use(endpoint, (req, res, next) => {
        const request = req as IncomingMessage & { method?: string };
        if (request.method !== "POST") {
          return next();
        }

        let body = "";
        request.setEncoding("utf8");

        request.on("data", (chunk: string) => {
          body += chunk;
        });

        request.on("end", () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const { logs }: ClientLogRequest = JSON.parse(body);

            // Forward each log to the Vite dev server console using Vite's logger
            logs.forEach((log) => {
              const location = log.url ? ` (${log.url})` : "";
              let message = `[${log.level}] ${log.message}${location}`;

              // Add stack traces if available
              if (log.stacks && log.stacks.length > 0) {
                message +=
                  "\n" +
                  log.stacks
                    .map((stack) =>
                      stack
                        .split("\n")
                        .map((line) => `    ${line}`)
                        .join("\n"),
                    )
                    .join("\n");
              }

              // Add extra data if available
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (log.extra && log.extra.length > 0) {
                message +=
                  "\n    Extra data: " +
                  JSON.stringify(log.extra, null, 2)
                    .split("\n")
                    .map((line) => `    ${line}`)
                    .join("\n");
              }

              // Use Vite's logger for consistent formatting
              const logOptions = { timestamp: true };
              switch (log.level) {
                case "error": {
                  const error =
                    log.stacks && log.stacks.length > 0
                      ? new Error(log.stacks.join("\n"))
                      : null;
                  logger.error(message, { ...logOptions, error });
                  break;
                }
                case "warn":
                  logger.warn(message, logOptions);
                  break;
                case "info":
                  logger.info(message, logOptions);
                  break;
                case "debug":
                  logger.info(message, logOptions);
                  break;
                default:
                  logger.info(message, logOptions);
              }
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            server.config.logger.error("Error processing client logs:", {
              timestamp: true,
              error: error as Error,
            });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
      });
    },
  };
}
