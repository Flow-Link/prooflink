import type { MiddlewareHandler } from "hono";

import type { AuthContext } from "./auth.js";
import { logger } from "../utils/logger.js";

// ---------------------------------------------------------------------------
// Pluggable rate-limit store interface (ARCH-1)
// ---------------------------------------------------------------------------

/**
 * Backend store for rate-limit counters.
 * Implementations must be safe for concurrent access within a single process.
 * For multi-process deployments, use a shared store (e.g. Redis).
 */
export interface RateLimitStore {
  /**
   * Increment the counter for `key` within a sliding window of `windowMs`.
   * Returns the current hit count and the absolute timestamp when the window resets.
   */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;

  /** Optional cleanup — called when the store is no longer needed. */
  close?(): void;
}

// ---------------------------------------------------------------------------
// In-memory MapStore (default — single-process only)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  timestamps: number[];
}

export class MapStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Slide the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    entry.timestamps.push(now);

    const oldestInWindow = entry.timestamps[0]!;
    return {
      count: entry.timestamps.length,
      resetAt: oldestInWindow + windowMs,
    };
  }

  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  /** Purge expired entries every 60s to prevent unbounded growth. */
  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
        if (entry.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }, 60_000);
    this.cleanupTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// RedisStore stub — documents the Redis sorted-set pattern for production
// ---------------------------------------------------------------------------

/**
 * Redis-backed rate-limit store using sorted sets.
 *
 * Algorithm (Redis sorted-set sliding window):
 *   MULTI
 *     ZREMRANGEBYSCORE  key  0  (now - windowMs)   // trim expired
 *     ZADD              key  now  <unique-member>   // add this request
 *     ZCARD             key                         // count in window
 *     PEXPIRE           key  windowMs               // auto-cleanup
 *   EXEC
 *
 * This is O(log N) per request and atomic across all pods.
 *
 * To implement:
 *   1. Install `ioredis` (or use the built-in `redis` package)
 *   2. Pass the Redis client to the constructor
 *   3. Implement increment() using the pipeline above
 *
 * Example:
 *   const redis = new Redis(process.env.REDIS_URL);
 *   const store = new RedisStore(redis);
 *   rateLimitMiddleware({ defaultLimit: 60, store });
 */
export class RedisStore implements RateLimitStore {
  async increment(_key: string, _windowMs: number): Promise<{ count: number; resetAt: number }> {
    throw new Error(
      "RedisStore is not yet implemented. Set RATE_LIMIT_STORE=memory or configure a Redis client.",
    );
  }
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

let defaultStore: RateLimitStore | null = null;

function getDefaultStore(): RateLimitStore {
  if (defaultStore) return defaultStore;

  const storeType = process.env["RATE_LIMIT_STORE"] ?? "memory";

  if (storeType === "redis") {
    logger.warn(
      "RATE_LIMIT_STORE=redis but Redis is not configured yet. " +
      "Falling back to in-memory store. Multi-pod rate limiting will NOT be consistent.",
    );
  }

  // Always fall back to MapStore for now
  defaultStore = new MapStore();
  return defaultStore;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Default requests per minute when not set by the API key. */
  defaultLimit: number;
  /** Key derivation: how to identify the client. */
  keyFn?: (c: { req: { header: (name: string) => string | undefined }; get: (key: string) => unknown }) => string;
  /** Pluggable store backend. Defaults to in-memory MapStore. */
  store?: RateLimitStore;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Sliding-window rate limiter middleware.
 * Uses the authenticated API key's rate limit or falls back to defaultLimit.
 */
export function rateLimitMiddleware(config: RateLimitConfig = { defaultLimit: 60 }): MiddlewareHandler {
  const store = config.store ?? getDefaultStore();

  return async (c, next) => {
    const auth = c.get("auth") as AuthContext | undefined;

    const clientKey = config.keyFn
      ? config.keyFn(c)
      : auth?.apiKeyId ?? "anonymous";

    const limit = auth?.rateLimitPerMinute ?? config.defaultLimit;
    const windowMs = 60_000;

    const { count, resetAt } = await store.increment(clientKey, windowMs);

    if (count > limit) {
      const retryAfterMs = resetAt - Date.now();
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));

      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
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

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(Math.max(0, limit - count)));

    await next();
  };
}

/** Reset the default store. Useful for testing. */
export function resetRateLimitStore(): void {
  if (defaultStore) {
    defaultStore.close?.();
    defaultStore = null;
  }
}
