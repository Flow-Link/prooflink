import type { MiddlewareHandler } from "hono";

import type { AuthContext } from "./auth.js";

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter.
// Production: replace with Redis-backed implementation.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Purge expired entries every 60s to prevent unbounded growth. */
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow the process to exit even if the timer is still active
  cleanupTimer.unref();
}

export interface RateLimitConfig {
  /** Default requests per minute when not set by the API key. */
  defaultLimit: number;
  /** Key derivation: how to identify the client. */
  keyFn?: (c: { req: { header: (name: string) => string | undefined }; get: (key: string) => unknown }) => string;
}

/**
 * Sliding-window rate limiter middleware.
 * Uses the authenticated API key's rate limit or falls back to defaultLimit.
 */
export function rateLimitMiddleware(config: RateLimitConfig = { defaultLimit: 60 }): MiddlewareHandler {
  startCleanup();

  return async (c, next) => {
    const auth = c.get("auth") as AuthContext | undefined;

    const clientKey = config.keyFn
      ? config.keyFn(c)
      : auth?.apiKeyId ?? "anonymous";

    const limit = auth?.rateLimitPerMinute ?? config.defaultLimit;
    const windowMs = 60_000;
    const now = Date.now();

    let entry = store.get(clientKey);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(clientKey, entry);
    }

    // Slide the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = entry.timestamps[0]!;
      const retryAfterMs = windowMs - (now - oldestInWindow);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(Math.ceil((oldestInWindow + windowMs) / 1000)));
      c.header("Retry-After", String(retryAfterSec));

      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Rate limit exceeded. Try again in ${retryAfterSec}s.`,
          },
        },
        429,
      );
    }

    entry.timestamps.push(now);

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(limit - entry.timestamps.length));

    await next();
  };
}

/** Reset the in-memory store. Useful for testing. */
export function resetRateLimitStore(): void {
  store.clear();
}
