# FlowLink API/SDK/MCP Code Review

**Scope:** `apps/api/src/**/*.ts`, `packages/sdk/src/**/*.ts`, `packages/mcp-server/src/**/*.ts`
**Reviewed:** 2026-03-21

---

## CRITICAL

---

### C-1: Signature verification excludes request body — bypassable
**File:** `apps/api/src/middleware/auth.ts:177`

The request signing scheme hashes only `timestamp + method + path`; the body is explicitly excluded with the comment "We can't read the body synchronously here". An attacker who intercepts a valid signed request can replay it with an entirely different body. Any mutation endpoint (compliance check, invoice creation, KYA issuance) is affected.

```ts
// current
const message = `${timestamp}.${c.req.method}.${c.req.path}`;
```

Fix: In Hono, `await c.req.text()` buffers the body and does not consume it — subsequent `c.req.json()` still works. Include the body in the signed message:

```ts
const rawBody = await c.req.text();
const message = `${timestamp}.${c.req.method}.${c.req.path}.${rawBody}`;
```

---

### C-2: WebSocket auth never queries the database — any non-empty string passes
**File:** `apps/api/src/routes/ws.ts:128-133`

`authenticateWs` hashes the supplied key and returns the hash as `apiKeyId`. It never checks the DB to confirm the key exists, is active, or is unexpired. Any string produces a non-null return value, so WebSocket connections are completely unprotected.

```ts
function authenticateWs(apiKey: string | null): string | null {
  if (!apiKey) return null;
  return hashApiKey(apiKey);  // always non-null for any non-empty string
}
```

Fix: Make `authenticateWs` async and perform the same `db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash))` lookup used in `authMiddleware`.

---

### C-3: SSE transport routes all POST messages to the first connected client
**File:** `packages/mcp-server/src/transports/sse.ts:113-119`

The `POST /message` handler finds the correct transport via `sessionId` into `matchedTransport`, then ignores it and dispatches to `firstConn` instead. With multiple MCP clients connected, every client's messages execute against the first client's session — cross-client command injection.

```ts
// current — matchedTransport is never used
if (connections.size > 0) {
  const firstConn = connections.values().next().value;
  if (firstConn) {
    await firstConn.transport.handlePostMessage(req, res);  // wrong transport
    return;
  }
}
```

Fix: Remove the `connections.size > 0` early-return block entirely and rely solely on the `matchedTransport` branch:

```ts
if (!matchedTransport) {
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Session not found" }));
  return;
}
await matchedTransport.handlePostMessage(req, res);
```

---

### C-4: CORS wildcard on MCP SSE transport — any origin can connect
**File:** `packages/mcp-server/src/transports/sse.ts:57`

```ts
res.setHeader("Access-Control-Allow-Origin", "*");
```

The MCP SSE endpoint accepts connections from any origin with no restriction. This allows any webpage to open a persistent SSE connection and send compliance tool invocations (check_sanctions, pay_with_compliance, register_agent) with no same-origin restriction. The REST API correctly uses a configurable allowlist.

Fix: Accept `corsOrigin: string | string[]` in `SSETransportOptions` and mirror the REST API's origin-matching logic.

---

### C-5: `identity.ts` GET — `kycVerified: true` hardcoded for every agent
**File:** `apps/api/src/routes/identity.ts:104`

```ts
operatorStatus: {
  sanctionsCleared: isValid,
  kycVerified: true,   // always true, regardless of stored data
},
```

The `GET /identity/:agentId` endpoint reports `kycVerified: true` for every agent regardless of whether their operator was actually KYC-verified at registration time. Any caller using this field for compliance decisions receives incorrect data.

Fix: Store a `kycVerified` boolean in the `agents` table (e.g., as part of `delegationScope` or a new column) and read it here.

---

### C-6: MCP compliance tools all return hardcoded "cleared/verified/completed" — fail-open stubs in production code
**Files:**
- `packages/mcp-server/src/tools/check-sanctions.ts:83` — `cleared = true`
- `packages/mcp-server/src/tools/pay-with-compliance.ts:97` — `sanctions_cleared = true`
- `packages/mcp-server/src/tools/batch-check.ts:76` — `cleared: true`
- `packages/mcp-server/src/tools/register-agent.ts:103` — `sanctions_cleared: true`
- `packages/mcp-server/src/tools/verify-kya.ts:55` — `verified: true`

Every MCP compliance tool unconditionally returns approval. An AI agent calling `pay_with_compliance` with a sanctioned recipient wallet will receive `status: "COMPLETED"`. These are not behind a feature flag or a stub guard — they are the production code path.

Fix: Either wire to the real FlowLink HTTP client (guarded by `FLOWLINK_API_KEY` being set), or return `isError: true` with code `INTERNAL_ERROR` and message `"Compliance engine not connected"` to fail closed rather than fail open.

---

## WARNING

---

### W-1: Rate limiter falls back to `X-Forwarded-For` — trivially bypassed
**File:** `apps/api/src/middleware/rate-limit.ts:54`

When `auth.apiKeyId` is absent (JWT path sets `apiKeyId = payload.sub`, a free-form string), or for any reason the auth context is missing, the limiter keys on `X-Forwarded-For`. This header is attacker-controlled unless overwritten by a trusted proxy. A client can rotate this header per request to bypass the limit entirely.

Fix: Key only on `auth.apiKeyId` for authenticated routes. Fail closed (block) for requests without a resolvable key rather than falling back to an untrustworthy header.

---

### W-2: `compliance/history` tenant isolation silently skipped for JWT auth
**File:** `apps/api/src/routes/compliance.ts:267-269`

```ts
if (auth?.apiKeyId) {
  conditions.push(eq(complianceChecks.apiKeyId, auth.apiKeyId));
}
```

For JWT-authenticated requests, `auth.apiKeyId = payload.sub` (a free-form string). The `complianceChecks.apiKeyId` column is a UUID FK to `api_keys.id`. A JWT sub will never equal a real UUID, so the condition is silently omitted and **all compliance records across all tenants are returned**.

Fix: Add an `ownerId` column to `complianceChecks` (populated from `auth.ownerId`, which is set correctly for both auth methods) and scope by `ownerId` instead of `apiKeyId`.

---

### W-3: Invoice list — no ownership scoping
**File:** `apps/api/src/routes/invoices.ts:220-263`

`GET /invoices` has no tenant isolation. Any authenticated API key can list every invoice in the system regardless of who created them.

Fix: Add a `createdByOwnerId` column to `invoices` and add `eq(invoices.createdByOwnerId, auth.ownerId)` to the where clause unconditionally.

---

### W-4: Invoice state mutation — no ownership check
**File:** `apps/api/src/routes/invoices.ts:161-217`

`PATCH /invoices/:id/state` fetches and mutates any invoice by ID with no check that the caller owns it. Any authenticated key can cancel or settle any invoice.

Fix: After fetching `existing`, verify `existing.createdByOwnerId === auth.ownerId` and return 403 on mismatch.

---

### W-5: Default database credentials in code
**File:** `apps/api/src/db/index.ts:18-19`

```ts
user: process.env["DB_USER"] ?? "flowlink",
password: process.env["DB_PASSWORD"] ?? "flowlink",
```

Defaults to `flowlink`/`flowlink` silently. In a misconfigured production deployment this will connect to the DB with a known credential and log no warning.

Fix: Guard in production the same way `API_KEY_SECRET` is guarded in `auth.ts`:
```ts
if (process.env["NODE_ENV"] === "production" && !process.env["DB_PASSWORD"]) {
  throw new Error("DB_PASSWORD is required in production");
}
```

---

### W-6: Compliance check and receipt inserted without a transaction
**File:** `apps/api/src/routes/compliance.ts:126-175`

Two sequential `await db.insert()` calls with no wrapping transaction. A crash or DB error between them leaves a `complianceChecks` row with no corresponding `complianceReceipts` row, violating the intended invariant that every check has a receipt.

Fix: Wrap both inserts in `db.transaction(async (tx) => { ... })`.

---

### W-7: Webhook secret retrievable in plaintext for `PUT` fallback path
**File:** `apps/api/src/routes/webhooks.ts:260-263`

The `PUT` fallback (when `mgr.update` is absent) calls `mgr.remove(id)` then `mgr.register(url, existing.secret, ...)`. The `existing.secret` retrieved from the manager is the original plaintext secret. Webhook secrets should be write-only (stored hashed, never readable back).

Fix: Store only an HMAC of the secret. On `PUT`, require the caller to re-supply the secret if changing config; otherwise retain the existing hash without exposing it.

---

### W-8: Timestamp replay protection — attacker-controlled `Number()` conversion
**File:** `apps/api/src/middleware/auth.ts:170-173`

`timestamp` is read directly from a request header and converted with `Number(timestamp) * 1000`. While the current logic accidentally rejects degenerate values (empty string → 0 → fails 5-minute window), it is fragile. A timestamp with leading whitespace or scientific notation parses unexpectedly.

Fix:
```ts
const ts = parseInt(timestamp, 10);
if (!Number.isFinite(ts) || ts <= 0) return false;
const timestampMs = ts * 1000;
```

---

### W-9: CORS for non-matching origins returns `allowedOrigins[0]` instead of omitting the header
**File:** `apps/api/src/app.ts:74`

```ts
return allowedOrigins[0] ?? "*";
```

An origin not in the allowlist receives `Access-Control-Allow-Origin: http://localhost:3000` (or `*` if no origins are configured). The correct behavior is to return no header. Some non-browser HTTP clients do not validate the ACAO value and will accept the response, effectively bypassing the CORS restriction.

Fix: Return `null` for non-matching origins (Hono interprets `null` as "do not set this header").

---

### W-10: SDK response bodies are cast with `as T` — no runtime validation
**File:** `packages/sdk/src/http.ts:169`

```ts
return (await response.json()) as T;
```

No shape validation. Schema mismatches (API changes, partial responses, proxied error pages) produce corrupt objects that fail at the call site with undiagnosable errors.

Fix: Add per-endpoint Zod response schemas, or at minimum check that the envelope has `success: true` before casting.

---

### W-11: `identity.ts` GET `/:agentId` — unbounded path param passed to DB
**File:** `apps/api/src/routes/identity.ts:115-117`

Unlike all other parameterized endpoints, `GET /identity/:agentId` passes the raw path parameter directly to the DB query with no length or format validation. Any string of arbitrary length triggers a DB round-trip and appears in logs.

Fix: Add a length guard (`agentId.length > 256`) and return 400 before querying.

---

### W-12: `analytics.ts` uses `sql.raw()` with enum-validated but still interpolated string
**File:** `apps/api/src/routes/analytics.ts:65, 73, 76`

```ts
sql`date_trunc(${sql.raw(`'${truncInterval}'`)}, ${invoices.createdAt})`
```

`truncInterval` is safe today because it comes from a Zod enum. `sql.raw()` is an injection sink — if the validation is ever relaxed or the function is called from a different code path, this becomes a SQL injection point. The pattern is repeated three times.

Fix: Replace with pre-built `sql` template literals keyed by a `const` map, eliminating `sql.raw()` entirely.

---

### W-13: In-memory rate limiter unsafe for multi-process production deployments
**File:** `apps/api/src/middleware/rate-limit.ts:14`

Acknowledged in comments, but no enforcement guard exists. With Kubernetes or pm2 cluster mode, each worker maintains its own store, multiplying the effective rate limit by the number of workers.

Fix: Add a startup assertion that fails loud when `NODE_ENV=production` and no Redis URL is configured.

---

### W-14: `identity.ts` KYA issue — compliance score unconditionally reset to 80 on upsert
**File:** `apps/api/src/routes/identity.ts:203`

```ts
set: {
  ...
  complianceScore: 80,   // overwrites any previously computed score
  ...
}
```

Re-issuing a KYA credential for an existing agent resets their compliance score to 80 regardless of their history.

Fix: Remove `complianceScore` from the `onConflictDoUpdate.set` block. Only set it on initial insert, or accept it as an optional request parameter.

---

### W-15: Missing `auth.test.ts` — referenced but non-existent
**File:** `apps/api/src/__tests__/compliance.test.ts:27`

```ts
// Bypass auth — tested separately in auth.test.ts
```

This file does not exist in the scanned source tree. Authentication logic (API key hashing, JWT verification, request signing, scope enforcement) has zero test coverage despite being the primary security control.

---

## SUGGESTION

---

### S-1: `app.ts` — 404 handler registered before middleware
**File:** `apps/api/src/app.ts:30-38`

`app.notFound` is registered before global middleware, making it visually misleading. If the handler ever accesses middleware-set context (e.g., `c.get("requestId")`), those values will be undefined. Move `app.notFound` after all middleware registrations.

---

### S-2: `compliance.ts` — `receiptHash` is a truncated UUID, not a content hash
**File:** `apps/api/src/routes/compliance.ts:153`

```ts
const receiptHash = `0x${randomUUID().replace(/-/g, "")}`;
```

For a compliance receipt intended to be cryptographically verifiable, the hash should be derived from the check content (HMAC-SHA256 of the serialized check), not a random value. A random ID cannot be independently verified by a third party.

---

### S-3: `identity.ts` — `receiptId: randomUUID()` returned from GET but never persisted
**File:** `apps/api/src/routes/identity.ts:107`

A new UUID is generated on every `GET /identity/verify` call. This ID is not stored anywhere. Callers who store it and later try to retrieve a receipt will get a 404.

---

### S-4: SDK `http.ts` — `Retry-After` sleep not capped
**File:** `packages/sdk/src/http.ts:179-185`

A server returning `Retry-After: 3600` will cause the client to sleep for 1 hour per retry attempt (up to 3 hours total with default `maxRetries: 3`). Add a cap: `Math.min(retryAfterSeconds * 1000, 60_000)`.

---

### S-5: `ws.ts` — `clientId` uses `Math.random()` instead of `randomUUID()`
**File:** `apps/api/src/routes/ws.ts:211`

`Math.random()` truncated to 6 base-36 chars provides ~31 bits of entropy. Use `randomUUID()` (already imported in the file) for collision-free client IDs.

---

### S-6: `db/index.ts` — pool size hardcoded
**File:** `apps/api/src/db/index.ts:11, 19`

Pool size of 20 is hardcoded with no env override. Add `max: Number(process.env["DB_POOL_MAX"] ?? 20)`.

---

### S-7: `sdk/client.ts` — `registerAgent` and `issueKYA` call the same endpoint with different return types
**File:** `packages/sdk/src/client.ts:256-296`

Both methods call `POST /identity/kya/issue`. `registerAgent` returns `AgentIdentity`; `issueKYA` returns `KYACredential`. The actual server response is `{ agent, credential }` — neither declared return type matches. Remove one method or add a shared response type.

---

### S-8: `error-handler.ts` — uses `console.error` instead of structured logger
**File:** `apps/api/src/middleware/error-handler.ts:54`

The global error handler is the only place in the API that uses `console.error` instead of the structured `logger`. Unhandled errors bypass log aggregation and lack `requestId` correlation.

Fix: Import `logger` from `../utils/logger.js` and replace `console.error` with `logger.error`.

---

### S-9: MCP SSE default port collides with REST API default port
**File:** `packages/mcp-server/src/index.ts:23-24`

Both default to port 3001. Running both in the same environment without explicit configuration causes a port conflict.

Fix: Default MCP SSE to port 3002.

---

### S-10: `batch-check.ts` — risk scores are non-deterministic for the same input
**File:** `packages/mcp-server/src/tools/batch-check.ts:77`

```ts
risk_score: Math.floor(Math.random() * 10),
```

The same address returns different risk scores on every call. Callers that cache or compare results see non-deterministic behavior. Use a stable stub value or connect to the real engine.

---

*6 critical — 15 warnings — 10 suggestions*
