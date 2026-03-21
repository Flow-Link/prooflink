# SDK Quality & Developer Experience Research

**Analyst:** Research Agent (claude-sonnet-4-6)
**Date:** 2026-03-21
**Scope:** `packages/sdk/src/` and `packages/shared/src/`
**Method:** Full source read + cross-reference against live API routes in `apps/api/src/routes/`

---

## 1. SDK Client (`packages/sdk/src/client.ts`)

### Usability

The client is clean and immediately usable. The constructor validates `apiKey` at construction time and throws `FlowLinkValidationError` with a `field` property, which is the right pattern. The JSDoc example on the class is minimal but correct. Defaults (30s timeout, 3 retries, production base URL) are sensible.

Each public method has a JSDoc describing its contract, the state transitions it targets, and which shared type it returns. This is a solid baseline.

### API Coverage Gaps — Critical

Cross-referencing the SDK against live API route files reveals **five API surface areas with zero SDK coverage**:

| API Endpoint | HTTP | File | SDK Method |
|---|---|---|---|
| `POST /v1/compliance/batch` | POST | `compliance.ts:246` | **Missing** |
| `GET /v1/compliance/stats` | GET | `compliance.ts:429` | **Missing** |
| `POST /v1/identity/agents` | POST | `identity.ts:379` | **Missing** (SDK uses `/identity/kya/issue` for registration) |
| `PUT /v1/identity/agents/:id/delegation` | PUT | `identity.ts:456` | **Missing** |
| `GET /v1/analytics/*` (volume, compliance, risk, agents) | GET | `analytics.ts` | **Entire analytics namespace missing** |
| `POST /v1/webhooks`, `GET /v1/webhooks`, `DELETE /v1/webhooks/:id`, `PUT /v1/webhooks/:id`, `POST /v1/webhooks/:id/test` | CRUD | `webhooks.ts` | **Entire webhook namespace missing** |
| `GET /v1/ws` | WS | `ws.ts` | **WebSocket client missing** |

The **batch compliance** endpoint (`POST /v1/compliance/batch`, accepting 1–50 checks) is particularly important for performance-sensitive agentic workloads. Calling the SDK 50 times sequentially for a batch would be dramatically slower and consume 50x the API key quota than a single batch call.

### Registration Endpoint Inconsistency

The SDK's `registerAgent()` posts to `/identity/kya/issue` (line 258 of `client.ts`), which is the KYA issuance endpoint. The API has a **separate** `POST /identity/agents` endpoint specifically for registration (`identity.ts:379`). The two differ in expected body shape:
- `/identity/agents` requires a `name` field (mandatory), returns a raw agent record.
- `/identity/kya/issue` accepts a VC-centric body, returns `{ agent, credential }`.

The SDK's `registerAgent()` maps `AgentRegistration` to `/identity/kya/issue`, meaning the `name` field (required by the real registration endpoint) is absent from `AgentRegistration` in `types.ts:201`. This is a shape mismatch against the actual API.

**Evidence:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/src/client.ts` line 258
- `/home/akash/PROJECTS/FLOW-LINK/apps/api/src/routes/identity.ts` lines 52–71 (RegisterAgentRequest schema requires `name`)
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/src/types.ts` lines 201–222 (AgentRegistration has no `name` field)

---

## 2. Type Exports

### Coverage — Strong

`packages/sdk/src/types.ts` and `packages/sdk/src/index.ts` re-export ~40 types from `@flowlink/shared`. The pattern (import from shared, re-export from sdk) is correct for a bundled SDK. Consumers only need to import from `@flowlink/sdk`, not from `@flowlink/shared` directly.

### Gaps

Types that exist in `@flowlink/shared` but are **not re-exported** from the SDK:
- `APIKey`, `APIKeyScope`, `RateLimitInfo`, `APISuccessResponse`, `APIErrorDetail`, `APIErrorResponse` — from `types/api.ts`. Relevant once webhook and analytics methods are added.
- `WebhookConfig`, `WebhookEvent`, `WebhookSubscription`, `WebhookDelivery`, `WebhookDeliveryStatus`, `WebhookEventType` — the entire webhook namespace.
- `AnalyticsDashboard`, `VolumeStats`, `RiskDistribution`, `ComplianceBreakdown`, `TimePeriod`, `RiskBucket` — the entire analytics namespace.
- `PluginManifest`, `PluginRegistration`, `PluginHookPoint`, `PluginHookContext`, `PluginHookResult` — plugin types.
- `MCPToolError`, `CheckSanctionsInput/Output`, `VerifyKYAInput/Output`, `SubmitTravelRuleInput/Output`, `PayWithComplianceInput/Output` — MCP tool I/O types.
- `PaginatedMeta` — the shared pagination type is richer than the SDK's own `PaginatedResponse`. The SDK defines its own simpler envelope (`{ items, pagination }`) without `hasNextPage` / `hasPrevPage`, while the shared `PaginatedMeta` has both.

### Pagination Shape Mismatch

The SDK defines `PaginatedResponse<T>` with shape `{ items: T[], pagination: { page, limit, total, totalPages } }` (types.ts:81). The shared `PaginatedMeta` (types/api.ts:15) includes `hasNextPage: boolean` and `hasPrevPage: boolean`. The API responses for compliance history (`compliance.ts:412`) use `pageSize` instead of `limit` as the key. None of these three shapes match each other:

| Field | SDK `PaginatedResponse` | Shared `PaginatedMeta` | Actual API response |
|---|---|---|---|
| Items key | `items` | `data` | `items` |
| Page size key | `limit` | `limit` | `pageSize` |
| Has next page | absent | `hasNextPage` | absent |
| Total pages | `totalPages` | `totalPages` | `totalPages` |

The SDK's `PaginatedResponse` shape matches the API's actual `items` field but not `pageSize` vs `limit`. The shared `PaginatedResponse` (a Zod schema) uses `data` as the array key, matching neither the SDK's `items` nor the API's `items`.

**Evidence:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/src/types.ts` lines 81–89
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/api.ts` lines 15–30
- `/home/akash/PROJECTS/FLOW-LINK/apps/api/src/routes/compliance.ts` lines 410–425 (`pageSize`)
- `/home/akash/PROJECTS/FLOW-LINK/apps/api/src/routes/invoices.ts` line 263 (`limit` — inconsistently uses `limit` while compliance uses `pageSize`)

---

## 3. Error Handling (`packages/sdk/src/errors.ts`)

### Hierarchy — Good

Four specialized error classes extend `FlowLinkError`:
- `FlowLinkAPIError(status, body, headers)` — preserves HTTP status code, parsed error body, and full response headers. The `headers` field enables consumers to read `X-Request-ID`, `Retry-After`, or rate limit headers from the thrown error.
- `FlowLinkValidationError(message, field?)` — pre-flight client-side validation with optional field name. Field name is exposed as a public property and is JSON-serializable.
- `FlowLinkTimeoutError(timeoutMs, url)` — structured timeout with duration and URL for observability.
- `FlowLinkNetworkError(message, cause?)` — wraps underlying `TypeError` or similar via `ErrorOptions.cause`.

All classes correctly set `this.name`, which is the pattern needed for `instanceof` checks to work correctly across module boundaries in ESM.

### Missing: Request ID

`FlowLinkAPIError` stores `headers: Headers` but there is no convenience getter for the request ID (`X-Request-ID` or similar). Stripe's SDK provides `error.requestId` as a first-class field. Without this, callers must write `err.headers.get("x-request-id")`, which is not obvious and requires knowing the header name.

### Missing: Error Code Bridging

The SDK's `ApiErrorBody.code` is typed as `string`, not as `ErrorCode` from `@flowlink/shared`. Callers cannot do exhaustive pattern matching on error codes without importing the shared enum separately. The shared package has `ErrorCode` with 30+ named codes. These should be linked.

### Missing: Rate-limit Error

`FlowLinkAPIError` is thrown on 429 responses, but there is no specialized `FlowLinkRateLimitError` subclass that exposes a parsed `retryAfterSeconds` field. The `Retry-After` header is read by the HTTP client for automatic backoff, but if retries are exhausted, the caller receives a generic `FlowLinkAPIError` with `status === 429` and must manually parse `headers.get("Retry-After")`. The shared package has a `RateLimitError` with `retryAfterSeconds` already (shared/src/errors.ts:322) but it is not exposed through the SDK error hierarchy.

**Evidence:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/src/errors.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/errors.ts` lines 322–338

---

## 4. HTTP Client (`packages/sdk/src/http.ts`)

### Retry Logic — Solid

Retryable status codes: `{408, 429, 500, 502, 503, 504}`. This is a well-established set. The retry loop:
- Uses exponential backoff: `min(500ms * 2^attempt, 8s)` with 25% jitter capped at 8s.
- Respects `Retry-After` header on 429 (integer seconds, numeric parsing).
- Rebuilds `AbortSignal.timeout()` per attempt so each attempt gets a fresh timeout.
- Distinguishes `DOMException { name: "TimeoutError" }` from generic network errors.
- Stores the most recent `FlowLinkAPIError` and re-throws it when retries are exhausted.

The jitter calculation (`base + Math.random() * base * 0.25`) can slightly exceed the 8s cap when `base === 8000` because `jitter` up to 2000ms is added before the outer `Math.min`. The outer cap corrects this, so actual behavior is correct, but the comment "capped at 8s" is slightly misleading — the cap is applied after jitter, not before.

### Missing: Request Interceptors / Middleware

There is no hook point for consumers to inject custom headers (e.g. `X-Idempotency-Key`, `X-Request-ID`), modify the request before it fires, or log outgoing requests. Stripe's SDK supports `stripeClient.on('request', ...)` and `'response'` event hooks. Coinbase's SDK exposes interceptors via axios. Without this, consumers wanting to add idempotency keys, correlation IDs, or custom telemetry must fork the `HttpClient` or wrap every method call.

### Missing: Retry-After Date Format

The `Retry-After` header can be either an integer (seconds) or an HTTP date string (`Thu, 21 Mar 2026 12:00:00 GMT`). The current implementation handles only the integer case (`Number(retryAfterHeader)`). If the server responds with a date-format `Retry-After`, `Number("Thu, 21 Mar 2026...")` returns `NaN` and the header is silently ignored, reverting to exponential backoff.

**Evidence:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/src/http.ts` lines 52–58 (backoff), 180–186 (Retry-After parsing)

### Missing: Idempotency Key Support

POST and PATCH requests that create or mutate records (create invoice, register agent, issue KYA) should support idempotency keys so that network retries do not create duplicate records. The HTTP client has no mechanism for passing or auto-generating `Idempotency-Key` headers.

---

## 5. Pagination Support

The SDK has `PaginationParams` and `PaginatedResponse<T>` types, and list methods (`listInvoices`, `listAgents`, `getComplianceHistory`) accept pagination params. However:

**No auto-pagination / async iterator.** Stripe's SDK provides `autoPagingEach()` and `autoPagingToArray()`. Coinbase's SDK yields pages as async iterables. The FlowLink SDK requires callers to write their own page loop:

```ts
// Current approach — caller manages pagination manually
let page = 1;
let hasMore = true;
while (hasMore) {
  const res = await client.listInvoices({ page, limit: 100 });
  // process res.items
  hasMore = page < res.pagination.totalPages;
  page++;
}
```

This is boilerplate that every caller must re-implement. An `asyncPages()` helper or `Symbol.asyncIterator` implementation on paginated list methods would eliminate this. The missing `hasNextPage` field (discussed in section 2) compounds this — callers cannot even easily tell if there is a next page without computing `page < totalPages`.

---

## 6. Streaming / WebSocket Client

The API exposes a WebSocket endpoint at `GET /v1/ws` (`apps/api/src/routes/ws.ts`) with:
- Authentication via `X-API-Key` or `Authorization: Bearer` header
- Topic subscription/unsubscription via JSON messages
- Heartbeat ping/pong
- 8 event types: compliance checks, sanctions alerts, invoices, receipt anchoring

**The SDK has no WebSocket client.** There is no `FlowLinkStreamClient`, `client.events.subscribe()`, or any WebSocket abstraction. Consumers must implement raw WebSocket handling including reconnect, heartbeat responses, JSON parsing, and event routing themselves. This is a significant DX gap for real-time compliance monitoring use cases.

---

## 7. Builder Patterns / Fluent API

There are no builder patterns in the SDK. Complex operations like `checkCompliance` accept a flat params object, which is fine for simple cases. However:

- **No request builder for batch compliance.** When the batch endpoint is exposed, a `ComplianceBatchBuilder` that accumulates checks and sends them in one call would prevent N×1 anti-patterns.
- **No invoice builder.** `CreateInvoiceParams` has 6+ required fields. A fluent `InvoiceBuilder` would improve discoverability.
- **No idempotency key chaining.** Stripe's approach: `stripe.invoices.create(params, { idempotencyKey: '...' })` — a per-call options argument for request-level overrides (idempotency, timeout, retries).

The absence of builder patterns is acceptable at early stage, but the absence of **per-call options** (idempotency, timeout override) is a concrete gap.

---

## 8. Tree-Shakeability

The SDK is structured as a single `FlowLinkClient` class in a single `client.ts` file. All methods are loaded together. For frontend/browser use:

- The `HttpClient` is exported separately from `index.ts`, which is good — advanced users can compose their own transport.
- `isolatedModules: true` is set in `tsconfig.base.json`, ensuring type-only imports compile correctly.
- The package uses `"type": "module"` and ESM-only exports (no `require` / CommonJS path in `package.json:exports`). This is correct for tree-shaking.
- However, because all API methods live on a single class, importing `FlowLinkClient` always pulls in all domain modules. There is no way to import only the compliance methods without the invoice and identity methods. For a browser bundle where only compliance is needed, this means unnecessary code.
- `@flowlink/shared` re-exports its entire surface via `export * from "./types/index.js"` in `index.ts`. This means importing from `@flowlink/shared` in any SDK module loads all type definitions (analytics, MCP, plugin, webhook) even if only compliance types are used.

For a compliance-only frontend micro-bundle, the optimal pattern would be sub-path exports on the SDK (e.g., `@flowlink/sdk/compliance`), which currently does not exist.

**Evidence:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/package.json` — single export entry `.`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/index.ts` — glob re-exports

---

## 9. Comparison with Industry-Standard SDKs

### Stripe SDK Patterns Missing from FlowLink SDK

| Pattern | Stripe | FlowLink SDK | Gap |
|---|---|---|---|
| Per-call options (idempotency, timeout, API key override) | `stripe.method(params, opts)` | Not supported | Add `RequestOptions` as second arg |
| Auto-pagination | `autoPagingEach()` / `autoPagingToArray()` | Manual | Add async iterator |
| Request / response event hooks | `stripe.on('request', ...)` | Not supported | Add `HttpClient` interceptors |
| Request ID on errors | `err.requestId` | Must read `err.headers.get(...)` | First-class field |
| Telemetry / usage reporting | `stripe._platformFunctions` | None | Optional for v1 |
| Webhook signature verification | `stripe.webhooks.constructEvent()` | Not in SDK | Should be in SDK |
| Idempotency key auto-generation | Supported | Not supported | Add |

### Coinbase CDP SDK Patterns Missing

| Pattern | Coinbase CDP | FlowLink SDK | Gap |
|---|---|---|---|
| Async iterator for pages | `for await (const page of list)` | Not supported | Add |
| Sub-path imports by domain | `@coinbase/cdp-sdk/payments` | Not supported | Add package exports |
| Configurable serialization | Pluggable | Not supported | Optional |
| Client-side type guards | `isPayment(x)` | Not exported | Validators exist in shared but not SDK |

### Key Missing Pattern: Webhook Signature Verification

Both Stripe and Coinbase expose webhook verification as a first-class SDK method. For FlowLink, consumers receiving webhook events (15 event types, defined in `shared/src/types/webhook.ts`) need to verify HMAC-SHA256 signatures. The `WebhookManager` in `@flowlink/core` handles delivery signing, but there is no SDK-level `FlowLinkClient.webhooks.verify(payload, signature, secret)` method. Without this, any consumer building a webhook receiver must implement raw crypto themselves, or import from `@flowlink/core` (which is a server-side package not suitable for browser use).

---

## 10. CLI Wrapper / Code Generation

There is no CLI. There is no OpenAPI client generation pipeline (though `apps/api/src/routes/openapi.ts` exists and likely serves a spec). The SDK is hand-written.

**Observed:** The `apps/api/src/routes/openapi.ts` file exists, suggesting an OpenAPI spec is served. If that spec is complete and accurate, `openapi-typescript` or `@hey-api/openapi-ts` could generate typed fetch client stubs, reducing maintenance burden as the API surface grows. This is not currently wired.

---

## 11. Shared Package Analysis

### Type Completeness — Strong

Nine type modules cover the full domain:
- `compliance.ts` — sanctions, AML, travel rule, receipt, decision, policy (all Zod-inferred)
- `identity.ts` — agent identity, KYA credential, delegation scope, verification result
- `invoice.ts` — invoice state machine, line items, payment proof, compliance stamp
- `protocol.ts` — payment protocols, chains, tokens, payment intent, settlement result
- `analytics.ts` — volume, risk distribution, compliance breakdown
- `webhook.ts` — webhook config, events, delivery, subscriptions
- `mcp.ts` — MCP tool I/O schemas for all 5 tools
- `plugin.ts` — plugin lifecycle, hooks, manifest, context, result
- `api.ts` — pagination, error envelopes, API key, rate limit info

**Branded types** are used for `ReceiptId`, `TxHash`, `AgentId`, `DID`, `Address`, `CAIP2ChainId` — preventing unsafe string coercions at the TypeScript level.

### Zod as Runtime Source of Truth — Correct

All types are defined as Zod schemas first, with TypeScript types derived via `z.infer<typeof Schema>`. This means runtime validation and compile-time types are always in sync. No separate interface definitions drift from the Zod schema.

### Utility Function Quality — Good

- `address.ts`: EVM/Solana/Bitcoin address validation, normalization, truncation, chain detection.
- `crypto.ts`: SHA-256 hashing, receipt ID generation, deterministic JSON hashing. Explicitly **not** providing keccak256 (which requires Ethereum-specific implementation) — stubs are named `sha3_256Stub` and documented as off-chain only.
- `format.ts`: Amount display formatting (respects token decimals), USD formatting via `Intl.NumberFormat`, date/datetime formatting, duration formatting, receipt ID display.
- `jurisdiction.ts`: EU membership check, FATF restriction check, enhanced monitoring, travel rule threshold lookup with EU/EEA fallback.
- `validation.ts`: EVM/Solana address regex validation, branded `toAddress()` cast, `parseAmount()`/`formatAmount()` with BigInt base-unit arithmetic, chain ID helpers, DID/country code validation.

Notable quality: `parseAmount` uses BigInt arithmetic (not floating-point) and `formatAmount` reverses it correctly, avoiding the classic stablecoin precision bug.

### Validator Index — Comprehensive

`validators/index.ts` generates `parse*` and `parse*Strict` functions for every schema (compliance, protocol, invoice, identity, MCP, webhook, API, plugin). The `createParser` pattern returns `{ success, data | error }` (safe parse), while `createStrictParser` throws. This is the correct dual-mode pattern.

### Constants — Well-Structured

- CAIP-2 chain IDs, numeric EVM IDs, token contract addresses per chain
- Compliance API URLs (Chainalysis, OFAC, EU, UN, HMT, Notabene, EAS)
- Travel rule thresholds by jurisdiction (US: $3k, EU: $0, SG: $1.1k, JP: $0)
- Risk thresholds (REJECT: 85, ESCALATE: 60)
- Contract addresses (all placeholder zeros — pre-deployment)
- EAS schema UIDs (all placeholder zeros — pre-deployment)
- Rate limits by tier, jurisdiction lists, default compliance policy

**Concern:** EAS schema UIDs and contract addresses are all zero-address placeholders. These are exported as constants and could be imported by production code paths without any guard. There is no runtime assertion or build-time check that prevents production usage with undeployed addresses.

### Error Hierarchy — Rich and Well-Structured

`shared/src/errors.ts` provides 14 specialized error classes, all extending `FlowLinkError` with a structured `ErrorCode`, HTTP `statusCode`, and typed `details` object. `toJSON()` is implemented for structured logging. There are two deprecated aliases (`SanctionsMatchError`, `AuthenticationError`) with `@deprecated` JSDoc.

**Inconsistency:** The shared `FlowLinkError` (server-side) and the SDK's `FlowLinkError` (client-side) are **different classes** with different constructors:
- Shared: `FlowLinkError(message, code: ErrorCode, statusCode: number, details: Record)`
- SDK: `FlowLinkError(message, options?: ErrorOptions)`

If a consumer imports both `@flowlink/sdk` and `@flowlink/shared` (e.g. in a server-side Node.js integration), `instanceof FlowLinkError` checks from different packages will **not** cross-match — the two classes are distinct despite the same name. This is a known ESM dual-package hazard. There is no shared base class or `[Symbol.for('FlowLinkError')]` brand check to bridge them.

**Evidence:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/errors.ts` lines 67–99
- `/home/akash/PROJECTS/FLOW-LINK/packages/sdk/src/errors.ts` lines 10–15

---

## Summary: Prioritized Issues

### P0 — Breaking Functional Gaps

1. **`registerAgent()` posts to wrong endpoint and missing `name` field** — will fail against the actual API. Route is `/identity/agents` (POST), not `/identity/kya/issue`.
   - File: `packages/sdk/src/client.ts:258`, `packages/sdk/src/types.ts:201`

2. **Pagination shape mismatch between SDK, shared, and API** — `pageSize` vs `limit`, `data` vs `items`. SDK callers will receive responses that don't match their types.
   - Files: `packages/sdk/src/types.ts:81`, `packages/shared/src/types/api.ts:26`, `apps/api/src/routes/compliance.ts:419`

### P1 — Missing API Coverage

3. **Batch compliance endpoint not in SDK** — agentic workloads will make N round trips instead of 1.
4. **Analytics namespace entirely absent** — `GET /v1/analytics/volume`, `/compliance`, `/risk`, `/agents`
5. **Webhook management namespace entirely absent** — `POST/GET/DELETE/PUT /v1/webhooks`
6. **No webhook signature verification method** — breaks webhook consumer use case
7. **No WebSocket/streaming client** — real-time compliance monitoring requires raw WebSocket

### P2 — Developer Experience Deficiencies

8. **No auto-pagination / async iterator** — every caller writes their own page loop
9. **No idempotency key support** — create/mutate operations are not safely retryable by callers
10. **No request interceptors** — cannot inject correlation IDs or custom telemetry
11. **`Retry-After` date format not handled** — silently falls back to exponential backoff
12. **`FlowLinkAPIError` missing `requestId` first-class field**
13. **No specialized `FlowLinkRateLimitError`** — callers must detect 429 and manually parse headers
14. **No per-call options** — cannot override timeout or API key per request

### P3 — Architecture and Maintenance

15. **Dual `FlowLinkError` classes** (sdk vs shared) will cause `instanceof` failures in server-side code that imports both packages
16. **Zero-address EAS schema UIDs and contract addresses exported as constants** — no guard preventing production use with undeployed contracts
17. **No CLI or OpenAPI-based code generation** — as the API grows, hand-maintaining the SDK becomes a maintenance liability
18. **No sub-path exports on SDK** — cannot tree-shake for browser/compliance-only bundles
19. **SDK package.json missing CJS/UMD exports** — no CommonJS path, which blocks use in older toolchains and Next.js pages router without explicit ESM configuration

---

## What Is Working Well

- Error class hierarchy in the SDK is clean, well-named, and serializable.
- HTTP retry logic covers all standard transient cases with proper exponential backoff and jitter.
- `AbortSignal.timeout()` per attempt is the correct pattern (Fetch API native, no external dependency).
- Zod-first types in shared ensure runtime/compile-time sync.
- BigInt-based amount arithmetic is correct (no floating-point stablecoin precision bugs).
- JSDoc on all public methods with `@example` on the client class.
- Test coverage (client.test.ts + client.extended.test.ts) is thorough for what exists: constructor validation, all HTTP methods, all retry scenarios (500/502/503/408/429), timeout vs network error distinction, URL encoding, query param omission when undefined, Retry-After header handling.
- The shared `validators/index.ts` provides safe and strict parse modes for every schema — this is the correct dual-mode pattern for server-side use.
