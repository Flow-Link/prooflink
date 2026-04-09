# ProofLink API Completeness & Design Review

**Date:** 2026-03-21
**Scope:** `apps/api/src/` — all routes, middleware, DB schema, tests
**Reviewer:** Research Agent

---

## Executive Summary

The ProofLink API is structurally sound and has made the right foundational choices (Hono on Node, Drizzle ORM, Zod validation, HMAC auth). The core compliance, identity, invoice, and webhook flows are implemented and tested. However, there are significant gaps in production-readiness: the rate limiter is in-memory, webhooks are in-memory, the WS upgrade path is broken for Node, the HMAC signature skips the body, the OpenAPI spec is hand-maintained and already stale, the audit log table exists but has no routes, and critical resources (API key management, payments, wallet management, user management) have zero routes.

---

## 1. RESTful Design Quality

**Finding:** Generally good. Resources are noun-based, HTTP verbs are used correctly, and state transitions use the dedicated `/state` sub-resource pattern. One inconsistency: the OpenAPI spec documents `PUT /webhooks/{id}` while the implementation has `PUT` (correct), but the webhook update endpoint re-registers the webhook with a new ID, breaking idempotency expectations of `PUT`.

**Evidence:**
- `apps/api/src/routes/webhooks.ts:172-179` — `mgr.remove(id)` then `mgr.register(...)` creates a new UUID, so the returned `id` differs from the path `id`.
- `apps/api/src/routes/invoices.ts:78-85` — `STATE_TRANSITIONS` map is correct and well-modeled.
- `apps/api/src/app.ts:117-126` — Both `/v1` and `/api/v1` mount the same router; this is fine but introduces redundancy.

**Pagination inconsistency:** `invoices.ts` uses `{ page, limit, total, totalPages }` while `compliance.ts` and `identity.ts` use `{ page, pageSize, total, totalPages }`. The `limit` vs `pageSize` field name diverges across routes.

**Evidence:** `apps/api/src/routes/invoices.ts:264` vs `apps/api/src/routes/compliance.ts:416-420`.

**Risks:**
- Webhook PUT breaking idempotency is a P1 bug for any client that stores the webhook ID.
- Pagination field naming inconsistency breaks any SDK or client that normalizes pagination.

**Priority:** P1 (webhook ID bug), P2 (pagination naming).

---

## 2. Request/Response Validation

**Finding:** Validation is uniformly applied via the `validate()` middleware using Zod. All POST/PATCH/PUT routes validate body, all list routes validate query, all routes with `:id` parameters validate params. Error format is consistent (`VALIDATION_ERROR` code with `details` array).

**Evidence:** `apps/api/src/middleware/validate.ts:56-125` — validates body, query, and params, stores parsed results in context.

**Gaps:**

1. **Body not part of HMAC signature.** The request signing in `auth.ts:177` only signs `timestamp.method.path`, not the body. A MITM can replay the signature with a modified body.

   Evidence: `apps/api/src/middleware/auth.ts:177`:
   ```
   const message = `${timestamp}.${c.req.method}.${c.req.path}`;
   ```
   The comment at line 175 acknowledges this: "We can't read the body synchronously here."

2. **Response schemas not validated.** There is no response validation or serialization schema. Routes return raw DB rows (e.g., `invoices.ts:135: c.json({ success: true, data: invoice })`), leaking internal fields like `invoiceData` JSONB blob and `apiKeyId`.

3. **No input sanitization for address fields.** Wallet addresses accepted as raw strings without checksum validation (EIP-55) or format verification.

**Priority:** P0 (body excluded from HMAC), P1 (response schema leaks), P2 (address validation).

---

## 3. Authentication Robustness

**Finding:** The three-layer auth (API key via X-API-Key or Bearer, JWT HS256, optional HMAC request signing) is well-structured. The scope hierarchy (`admin > write > read`) and `requireScope()` middleware exist but are never called on any route — all routes accept any authenticated request regardless of scope.

**Evidence:**
- `apps/api/src/middleware/auth.ts:43-71` — `requireScope()` defined and exported.
- No `grep` of `requireScope` in any route file — confirmed by reading all route files. Zero invocations.

**Specific auth issues:**

1. **JWT has no `jti` (JWT ID) claim and no revocation mechanism.** A stolen JWT is valid until expiry. No token blacklist exists.

2. **API key is hashed in-process at auth time** (HMAC-SHA256) — correct. But `lastUsedAt` is fire-and-forget with no error tracking; a crash after the auth check means audit trail gaps.

   Evidence: `apps/api/src/middleware/auth.ts:332-338`.

3. **WebSocket duplicates auth logic.** `ws.ts:123-162` re-implements `hashApiKey()` and the DB lookup that already exists in `auth.ts`. Any security fix must be applied to both files.

   Evidence: `apps/api/src/routes/ws.ts:123-129` vs `apps/api/src/middleware/auth.ts:81-91`.

4. **JWT payload's `sub` is used as both `apiKeyId` and `ownerId`** (`auth.ts:268-274`), which conflates the token subject with a database key ID. Admin endpoints or audit log queries joining on `apiKeyId` will produce wrong results for JWT-authenticated requests.

5. **Request signature excludes body.** (Also noted in §2.) This means the signing provides replay protection but not content integrity.

**Priority:** P0 (requireScope never called), P1 (JWT lacks revocation/jti), P1 (WS duplicates auth), P2 (JWT sub/apiKeyId conflation).

---

## 4. Rate Limiting

**Finding:** Rate limiting is in-memory using a sliding window (`Map<string, RateLimitEntry>`). It reads the authenticated API key's `rateLimitPerMinute` field, allowing per-key limits. The implementation is correct for a single process.

**Evidence:** `apps/api/src/middleware/rate-limit.ts:46-98`.

**Critical gaps:**

1. **In-memory store does not survive restarts and does not work across multiple instances.** This is explicitly noted in the comment at line 7: "Production: replace with Redis-backed implementation." No Redis implementation exists anywhere in the codebase.

2. **No per-route limit overrides.** The `rateLimitMiddleware({ defaultLimit: 60 })` is applied globally at the `v1` router level. High-cost endpoints like `POST /compliance/check` and `POST /compliance/batch` cannot be given lower limits than read endpoints.

   Evidence: `apps/api/src/app.ts:115`.

3. **Rate limit key for JWT auth uses `sub` claim, which may collide across different users** sharing a service account token.

4. **`X-RateLimit-Reset` header is missing on non-429 responses.** RFC 6585 and common conventions expect this header on every response, not just when rate-limited.

   Evidence: `apps/api/src/middleware/rate-limit.ts:92-96` — only sets `X-RateLimit-Limit` and `X-RateLimit-Remaining` on pass.

**Priority:** P0 (in-memory in production), P1 (no per-route override), P2 (missing Reset header on pass).

---

## 5. Database Schema Coverage

**Finding:** The schema covers 5 tables: `api_keys`, `agents`, `compliance_checks`, `compliance_receipts`, `invoices`, and `audit_log`. The `audit_log` has a hash-chain design (`logHash`, `previousLogHash`) which is an advanced feature.

**Evidence:** `apps/api/src/db/schema.ts:1-182`.

**Missing tables:**

| Missing Table | Needed For | Evidence of Need |
|---|---|---|
| `webhooks` | Persistent webhook storage | `webhooks.ts` uses in-memory singleton |
| `webhook_deliveries` | Delivery retry tracking | No persistence |
| `users` / `organizations` | Multi-tenant account management | `ownerId` is a raw string with no FK |
| `payments` | Payment record tracking | Schema has no payment primitives |
| `wallet_registry` | Wallet ownership verification | Wallet addresses stored as strings on invoices |
| `api_key_events` | Key rotation audit | `lastUsedAt` but no event log |

**Schema-level issues:**

1. **`agents.walletAddress` is required (`notNull()`) but `agents.name` is nullable.** For KYA/identity, name is more meaningful than wallet address as a display identifier. This is backwards.

   Evidence: `apps/api/src/db/schema.ts:50-51`.

2. **`complianceChecks` and `invoices` both use `apiKeyId` as their tenant isolation key.** This creates problems when a tenant rotates API keys — historical records become inaccessible because the old `apiKeyId` no longer matches.

3. **`auditLog` has `serial` PK** (sequential integer), not UUID. This exposes enumeration of audit records.

   Evidence: `apps/api/src/db/schema.ts:149`.

4. **`invoices.invoiceData` JSONB column duplicates all invoice fields.** At creation time, `invoiceData` is populated with `{ seller, buyer, lineItems, currency, totalAmount, paymentProtocol }` which is already present as typed columns. This wastes storage and creates a consistency risk.

   Evidence: `apps/api/src/routes/invoices.ts:117-125`.

5. **No `CHECK` constraints on status/state columns.** `complianceChecks.status` accepts any varchar(20). Drizzle does not enforce enum constraints at the DB level unless a PG enum type or CHECK constraint is added.

**Priority:** P0 (no webhooks table — data loss on restart), P1 (tenant isolation via rotating API keys), P2 (invoiceData duplication).

---

## 6. CRUD Completeness by Resource

| Resource | Create | Read (single) | List | Update | Delete | Notes |
|---|---|---|---|---|---|---|
| Compliance Checks | POST /check, /batch | GET /receipt/:id | GET /history | — | — | No update/delete — correct for audit trail |
| Compliance Receipts | (auto) | GET /receipt/:id (via compliance), GET /receipts/:id | GET /receipts | — | — | Duplicate: receipts accessible at two paths |
| Invoices | POST / | GET /:id | GET / | PATCH /:id/state | — | No full update (PUT), no delete |
| Agents | POST /agents, POST /kya/issue | GET /:agentId, POST /verify | GET /agents | PUT /agents/:id/delegation | — | No deactivate/delete endpoint |
| API Keys | **MISSING** | **MISSING** | **MISSING** | **MISSING** | **MISSING** | No management routes at all |
| Webhooks | POST / | **MISSING** | GET / | PUT /:id | DELETE /:id | No GET /:id |
| Users/Orgs | **MISSING** | **MISSING** | **MISSING** | **MISSING** | **MISSING** | No user management |
| Payments | **MISSING** | **MISSING** | **MISSING** | **MISSING** | **MISSING** | No payment routes |
| Audit Log | (auto) | **MISSING** | **MISSING** | — | — | Table exists, no routes |
| Wallet | **MISSING** | **MISSING** | **MISSING** | **MISSING** | **MISSING** | No wallet management |

**Priority:** P0 (API key management — users cannot create/rotate keys via API), P0 (audit log routes — table is unusable without read access), P1 (payments), P1 (wallet management).

---

## 7. WebSocket Route

**Finding:** The WebSocket route (`GET /v1/ws`) has a well-designed protocol (subscribe/unsubscribe/ping messages, heartbeat, per-client subscriptions, typed event broadcasting via `broadcastWsEvent()`). However, the upgrade mechanism is broken for the `@hono/node-server` adapter.

**Evidence:** `apps/api/src/routes/ws.ts:218-233`:
```ts
// @ts-expect-error — Hono's env.upgrade is injected by the server adapter
const pair = c.env?.upgrade?.(c.req.raw);
if (!pair) {
  return c.json({ ... }, 500);
}
return new Response(null, { status: 101 });
```

This uses a Cloudflare Workers-style `env.upgrade()` pattern that does not exist in `@hono/node-server`. The Node adapter requires `createNodeWebSocket()` from `@hono/node-ws` (a separate package not in `package.json`). Every WebSocket connection attempt will return a 500 error.

Additionally:
- `handleWsConnection()` (`ws.ts:239`) is exported but never called — there is no server-side hook to invoke it after a successful upgrade.
- `broadcastWsEvent()` is exported but never called from compliance or invoice routes. Events are never actually broadcast.
- The client registry is in-memory (no Redis pub/sub), so multi-instance deployments cannot broadcast to all clients.

**Priority:** P0 (WS connection always returns 500 in production), P1 (broadcast never called), P1 (in-memory registry).

---

## 8. Error Response Consistency

**Finding:** Error responses follow a consistent shape: `{ success: false, error: { code, message, details? } }`. The global error handler correctly maps `ZodError`, `HTTPException`, and unhandled errors. In development, raw error messages are exposed; in production, generic messages are used.

**Evidence:** `apps/api/src/middleware/error-handler.ts:1-73`.

**Issues:**

1. **`HTTP_${err.status}` is a poor error code** for HTTPExceptions. For example, a 404 from Hono's built-in validator produces `{ code: "HTTP_404" }` instead of `{ code: "NOT_FOUND" }`.

   Evidence: `apps/api/src/middleware/error-handler.ts:43-53`.

2. **`compliance.ts` stats endpoint** (`GET /v1/compliance/stats`) has no input validation middleware applied to it, though it has no query params to validate currently. More importantly, it is undocumented in the OpenAPI spec.

   Evidence: `apps/api/src/routes/compliance.ts:429`.

3. **`receipts.ts` verify endpoint** (`POST /v1/receipts/:id/verify`) checks if `receipt.receiptHash === computedHash` but the computed hash uses a different algorithm than the one used when creating the receipt. Receipt creation uses `randomUUID()` as the hash (`0x${randomUUID().replace(/-/g, "")}`), not SHA-256. The verify endpoint will always return `hashValid: false`.

   Evidence:
   - Creation: `apps/api/src/routes/compliance.ts:157` — `receiptHash = \`0x${randomUUID().replace(/-/g, "")}\``
   - Verification: `apps/api/src/routes/receipts.ts:192` — SHA-256 of payload

4. **404 handler uses dynamic string interpolation** (`Route ${c.req.method} ${c.req.path} not found`) which could expose internal path structure. Minor.

**Priority:** P0 (receipt hash verification always returns false — misleading integrity signal), P2 (HTTP_NNN codes), P2 (stats endpoint undocumented).

---

## 9. OpenAPI Specification

**Finding:** The spec at `routes/openapi.ts` is a hand-maintained static JSON object (1,073 lines). It is served at `/openapi.json`, `/docs/openapi.json`, and rendered via Swagger UI at `/docs`. The package.json includes `@hono/zod-openapi` which would auto-generate the spec, but it is not used — the hand-maintained spec is used instead.

**Evidence:** `apps/api/package.json:22` — `"@hono/zod-openapi": "^0.18.0"` is installed but never imported in any source file.

**Staleness gaps (spec vs implementation):**

| Route in Implementation | In OpenAPI Spec? |
|---|---|
| POST /compliance/batch | No |
| GET /compliance/stats | No |
| GET /identity/agents (list) | No |
| POST /identity/agents (register) | No |
| PUT /identity/agents/:id/delegation | No |
| GET /receipts | No |
| GET /receipts/:id | No |
| POST /receipts/:id/verify | No |
| GET /ws | No |
| GET /health, /health/ready, /health/live | No (public, reasonable) |
| GET /metrics | No (public, reasonable) |

**10 of ~22 implemented routes are absent from the spec.**

The Swagger UI at `/docs` loads the spec from `/openapi.json`, which is the root-mounted path, but the Swagger UI is configured to point to this path without the `/v1` prefix. Routes tested via Swagger UI will 404 because the spec's `servers[].url` points to `{baseUrl}/v1` but the OpenAPI spec itself is served at the root.

**Priority:** P1 (spec-code drift for 10 routes), P1 (switch to auto-generation with `@hono/zod-openapi`), P2 (Swagger UI server URL alignment).

---

## 10. Missing Routes Summary

### P0 — Must Have Before Production

**API Key Management** (`/v1/api-keys`)
No mechanism exists for users to create, list, rotate, or revoke their own API keys via the API. Currently keys must be inserted directly into the database. Required routes:
```
POST   /v1/api-keys              # create key (returns plaintext once)
GET    /v1/api-keys              # list keys (scoped to owner)
GET    /v1/api-keys/:id          # get key metadata (never plaintext)
PATCH  /v1/api-keys/:id          # update name, scopes, rate limit
DELETE /v1/api-keys/:id          # revoke key
```

**Audit Log** (`/v1/audit-log`)
The `audit_log` table exists with a hash-chain design but has zero routes. The compliance receipt integrity check is effectively useless without read access to the underlying audit entries:
```
GET    /v1/audit-log             # paginated, scoped to caller's key
GET    /v1/audit-log/:id         # single entry
```

### P1 — Required for MVP

**Payment Tracking** (`/v1/payments`)
ProofLink's core value proposition is agentic payments. There is no payment record, no link between a compliance receipt and an on-chain transaction, and no payment status tracking. The `invoices.onChainTxHash` field exists but there is no way to record or query it:
```
POST   /v1/payments              # record a payment (invoice + tx hash)
GET    /v1/payments/:id
GET    /v1/payments              # list, filterable by invoice/status
PATCH  /v1/payments/:id/status   # update settlement status
```

**Wallet Management** (`/v1/wallets`)
Wallet addresses appear on agents and invoices as raw strings. There is no registry, no ownership verification, and no way to query invoices or compliance history by wallet:
```
POST   /v1/wallets               # register wallet (with signature proof)
GET    /v1/wallets/:address
GET    /v1/wallets/:address/history
```

**User/Organization Management** (`/v1/users`, `/v1/organizations`)
`ownerId` is a raw string with no FK reference. Multi-tenant isolation relies on API key IDs but there is no user model:
```
GET    /v1/users/me
PATCH  /v1/users/me
GET    /v1/organizations/:id
PATCH  /v1/organizations/:id
```

### P2 — Quality of Life

**Agent Deactivation**
```
PATCH  /v1/identity/agents/:id   # set isActive = false
```

**Invoice Full Update**
DRAFT invoices have no way to correct line items after creation:
```
PUT    /v1/invoices/:id          # only allowed in DRAFT state
```

**Webhook Single-Resource Fetch**
```
GET    /v1/webhooks/:id
```

**Compliance Check Single Fetch**
```
GET    /v1/compliance/checks/:id  # fetch single check (not just receipt)
```

---

## Risk Register

| Risk | Severity | File | Line |
|---|---|---|---|
| WebSocket always returns 500 — `env.upgrade` not available in Node adapter | P0 | `routes/ws.ts` | 219 |
| `requireScope()` defined but never applied — all authenticated endpoints effectively have no scope enforcement | P0 | `middleware/auth.ts` | 43 |
| Webhook state lost on process restart — no DB persistence | P0 | `routes/webhooks.ts` | 37 |
| Receipt hash verification always returns `hashValid: false` — UUID vs SHA-256 mismatch | P0 | `routes/receipts.ts` | 192 |
| HMAC request signing excludes body — provides replay protection only, not content integrity | P0 | `middleware/auth.ts` | 177 |
| No API key management routes — keys can only be provisioned via DB | P0 | — | — |
| Rate limiter is in-memory — does not survive restarts or work across replicas | P0 | `middleware/rate-limit.ts` | 14 |
| Webhook PUT creates a new webhook ID, breaking idempotency | P1 | `routes/webhooks.ts` | 172 |
| `broadcastWsEvent()` is never called from business logic routes | P1 | `routes/ws.ts` | 101 |
| Auth logic duplicated in WS route — security fixes need to be applied twice | P1 | `routes/ws.ts` | 123 |
| Response schemas leak raw DB rows including `invoiceData` blob and `apiKeyId` | P1 | `routes/invoices.ts` | 135 |
| 10 routes absent from OpenAPI spec — `@hono/zod-openapi` installed but unused | P1 | `routes/openapi.ts` | — |
| Tenant isolation via `apiKeyId` breaks on key rotation — historical records become inaccessible | P1 | `db/schema.ts` | 134 |
| `audit_log` table exists but has no read routes | P1 | `db/schema.ts` | 148 |
| `complianceChecks.status` has no DB-level enum constraint | P2 | `db/schema.ts` | 80 |
| Pagination field `limit` vs `pageSize` inconsistency across routes | P2 | Multiple | — |
| `invoices.invoiceData` JSONB duplicates typed columns | P2 | `db/schema.ts` | 135 |
| `audit_log` uses serial (int) PK — enumerable | P2 | `db/schema.ts` | 149 |
| Compliance stats endpoint undocumented in OpenAPI | P2 | `routes/compliance.ts` | 429 |
| HTTP_NNN error codes from global handler are machine-unfriendly | P2 | `middleware/error-handler.ts` | 48 |

---

## Implementation Priority Order

**Sprint 1 (P0 — Blocking)**
1. Fix WebSocket upgrade for Node adapter (`@hono/node-ws`)
2. Apply `requireScope()` to write endpoints across all routes
3. Add `webhooks` table to DB schema; migrate WebhookManager to DB
4. Fix receipt hash: use SHA-256 at creation time, not UUID
5. Include request body in HMAC signature (buffer body once, set on context)
6. Replace in-memory rate limiter with Redis-backed sliding window

**Sprint 2 (P1 — MVP)**
7. Add `/v1/api-keys` CRUD routes
8. Add `/v1/audit-log` read routes
9. Call `broadcastWsEvent()` from compliance and invoice route handlers
10. Fix webhook PUT to update in-place without changing ID
11. Add response serialization layer (strip `apiKeyId`, `invoiceData` from responses)
12. Migrate spec to `@hono/zod-openapi` auto-generation
13. Add `/v1/payments` routes with schema

**Sprint 3 (P2 — Polish)**
14. Add wallet management routes
15. Normalize pagination field names to `{ page, limit, total, totalPages }`
16. Add `GET /v1/webhooks/:id`
17. Add agent deactivation endpoint
18. Add DB enum types or CHECK constraints for status columns
