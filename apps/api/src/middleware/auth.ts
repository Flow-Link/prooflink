import { eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getDb } from "../db/index.js";
import { apiKeys } from "../db/schema.js";
import { logger } from "../utils/logger.js";

// ---------------------------------------------------------------------------
// Auth context attached to every authenticated request
// ---------------------------------------------------------------------------

export interface AuthContext {
  apiKeyId: string;
  ownerId: string;
  scopes: string[];
  rateLimitPerMinute: number;
  /** "api_key" or "jwt" */
  authMethod: "api_key" | "jwt";
}

// ---------------------------------------------------------------------------
// Scope helpers
// ---------------------------------------------------------------------------

export type ApiScope = "read" | "write" | "admin";

const SCOPE_HIERARCHY: Record<ApiScope, ApiScope[]> = {
  admin: ["admin", "write", "read"],
  write: ["write", "read"],
  read: ["read"],
};

/** Check if the granted scopes satisfy the required scope. */
export function hasScope(grantedScopes: string[], required: ApiScope): boolean {
  return grantedScopes.some((scope) => {
    const hierarchy = SCOPE_HIERARCHY[scope as ApiScope];
    return hierarchy?.includes(required) ?? false;
  });
}

/** Middleware that enforces a required scope. Must be used after authMiddleware. */
export function requireScope(scope: ApiScope): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get("auth") as AuthContext | undefined;
    if (!auth) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
      );
    }

    if (!hasScope(auth.scopes, scope)) {
      return c.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Insufficient scope. Required: ${scope}. Granted: ${auth.scopes.join(", ") || "none"}.`,
          },
        },
        403,
      );
    }

    await next();
  };
}

// ---------------------------------------------------------------------------
// API key hashing
// ---------------------------------------------------------------------------

/**
 * Hash an API key for comparison against stored hashes.
 * Keys are stored as HMAC-SHA256 hex digests keyed by API_KEY_SECRET.
 */
function hashApiKey(key: string): string {
  const secret = process.env["API_KEY_SECRET"];
  if (!secret) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("API_KEY_SECRET environment variable is required in production.");
    }
    logger.warn("API_KEY_SECRET is not set — using bare SHA-256 (insecure in production)");
    return createHash("sha256").update(key).digest("hex");
  }
  return createHmac("sha256", secret).update(key).digest("hex");
}

// ---------------------------------------------------------------------------
// JWT verification (lightweight — validates HS256 JWTs)
// ---------------------------------------------------------------------------

interface JwtPayload {
  sub: string;
  scopes: string[];
  rateLimitPerMinute?: number;
  exp?: number;
  iat?: number;
}

function base64UrlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function verifyJwt(token: string): JwtPayload | null {
  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) {
    logger.warn("JWT_SECRET is not set — JWT authentication disabled");
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  // Verify signature (HS256)
  const expectedSig = createHmac("sha256", jwtSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  const actualSig = base64UrlDecode(signatureB64);

  if (expectedSig.length !== actualSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  // Parse header
  const header = JSON.parse(base64UrlDecode(headerB64).toString()) as Record<string, unknown>;
  if (header["alg"] !== "HS256") return null;

  // Parse payload
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString()) as JwtPayload;

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Request signing verification (optional)
// ---------------------------------------------------------------------------

/**
 * Verify request signature if X-Signature header is present.
 * Signature format: HMAC-SHA256(timestamp + method + path + body, signingSecret)
 * Headers: X-Signature, X-Signature-Timestamp
 */
function verifyRequestSignature(c: Context): boolean {
  const signature = c.req.header("X-Signature");
  if (!signature) return true; // Signing is optional

  const signingSecret = process.env["REQUEST_SIGNING_SECRET"];
  if (!signingSecret) {
    logger.warn("REQUEST_SIGNING_SECRET not set — skipping signature verification");
    return true;
  }

  const timestamp = c.req.header("X-Signature-Timestamp");
  if (!timestamp) return false;

  // Reject if timestamp is older than 5 minutes
  const timestampMs = Number(timestamp) * 1000;
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 300_000) {
    return false;
  }

  // We can't read the body synchronously here, so we verify what we can
  const message = `${timestamp}.${c.req.method}.${c.req.path}`;
  const expectedSig = createHmac("sha256", signingSecret).update(message).digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSig, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

interface ExtractedCredential {
  type: "api_key" | "jwt";
  value: string;
}

function extractCredential(c: Context): ExtractedCredential | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // JWT tokens have 3 dot-separated parts; API keys do not
    if (token.split(".").length === 3) {
      return { type: "jwt", value: token };
    }
    return { type: "api_key", value: token };
  }

  const xApiKey = c.req.header("X-API-Key");
  if (xApiKey) {
    return { type: "api_key", value: xApiKey };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

/**
 * Unified authentication middleware.
 * Supports API key (via X-API-Key or Bearer) and JWT (via Bearer).
 * Optionally verifies request signatures.
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    // Verify request signature if present
    if (!verifyRequestSignature(c)) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid request signature." },
        },
        401,
      );
    }

    const credential = extractCredential(c);

    if (!credential) {
      return c.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing credentials. Provide via Authorization header (Bearer token/key) or X-API-Key header.",
          },
        },
        401,
      );
    }

    // --- JWT auth path ---
    if (credential.type === "jwt") {
      const payload = verifyJwt(credential.value);
      if (!payload) {
        return c.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Invalid or expired JWT." },
          },
          401,
        );
      }

      const auth: AuthContext = {
        apiKeyId: payload.sub,
        ownerId: payload.sub,
        scopes: payload.scopes ?? [],
        rateLimitPerMinute: payload.rateLimitPerMinute ?? 60,
        authMethod: "jwt",
      };

      c.set("auth", auth);
      await next();
      return;
    }

    // --- API key auth path ---
    const keyHash = hashApiKey(credential.value);

    try {
      const db = getDb();
      const [keyRecord] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);

      if (!keyRecord) {
        return c.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Invalid API key." },
          },
          401,
        );
      }

      if (!keyRecord.isActive) {
        return c.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "API key is deactivated." },
          },
          403,
        );
      }

      if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        return c.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "API key has expired." },
          },
          403,
        );
      }

      const auth: AuthContext = {
        apiKeyId: keyRecord.id,
        ownerId: keyRecord.ownerId,
        scopes: keyRecord.scopes ?? [],
        rateLimitPerMinute: keyRecord.rateLimitPerMinute,
        authMethod: "api_key",
      };

      c.set("auth", auth);

      // Fire-and-forget: update lastUsedAt
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRecord.id))
        .catch(() => {
          /* best-effort */
        });

      await next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Database error during auth", { error: message });
      return c.json(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Authentication service unavailable." },
        },
        500,
      );
    }
  };
}
