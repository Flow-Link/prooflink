# SDK Client Verification Report

**Date:** 2026-03-21
**Package:** `@flowlink/sdk` (v0.1.0)
**Files reviewed:** `packages/sdk/src/{client,http,types,errors,index}.ts`
**Compared against:** `apps/api/src/routes/{compliance,identity,invoices,receipts,analytics,webhooks,health}.ts`

---

## 1. Test Results

```
 Test Files  3 passed (3)
      Tests  111 passed (111)
   Duration  5.56s
```

All 111 tests pass. Coverage includes:
- Constructor validation (missing apiKey)
- Every client method's HTTP verb, path, and parameter passing
- Client-side validation for required fields (address, chain, receiptId, invoiceId, agentId)
- Error hierarchy (FlowLinkError, FlowLinkAPIError, FlowLinkValidationError, FlowLinkTimeoutError, FlowLinkNetworkError)
- Retry logic: 500/502/503/408/429 retry, Retry-After header respect, retry exhaustion
- Request structure: headers, Content-Type, URL encoding, query param omission

---

## 2. Method Inventory (SDK Method -> API Endpoint)

| SDK Method | HTTP | API Endpoint | Covered in API? |
|---|---|---|---|
| `checkCompliance(params)` | POST | `/compliance/check` | YES |
| `screenAddress(address, chain)` | POST | `/compliance/screen` | YES |
| `calculateRiskScore(context)` | POST | `/compliance/risk-score` | NO (no API route) |
| `checkTravelRule(data)` | POST | `/compliance/travel-rule` | NO (no API route) |
| `getComplianceReceipt(receiptId)` | GET | `/compliance/receipt/:id` | YES |
| `getComplianceHistory(params)` | GET | `/compliance/history` | YES |
| `createInvoice(params)` | POST | `/invoices` | YES |
| `getInvoice(id)` | GET | `/invoices/:id` | YES |
| `listInvoices(params)` | GET | `/invoices` | YES |
| `updateInvoiceState(id, state, reason?)` | PATCH | `/invoices/:id/state` | YES |
| `verifyAgent(agentId)` | POST | `/identity/verify` | YES |
| `registerAgent(agent)` | POST | `/identity/kya/issue` | YES (issues KYA, not same as POST /identity/agents) |
| `getAgentIdentity(agentId)` | GET | `/identity/:agentId` | YES |
| `listAgents(params)` | GET | `/identity/agents` | YES |
| `issueKYA(params)` | POST | `/identity/kya/issue` | YES |

---

## 3. Missing SDK Methods (API endpoints with no SDK coverage)

| API Endpoint | HTTP | Route File | Description |
|---|---|---|---|
| `/compliance/batch` | POST | compliance.ts | Batch compliance check (up to 50) |
| `/compliance/stats` | GET | compliance.ts | Aggregate compliance statistics |
| `/receipts/:id` | GET | receipts.ts | Get receipt by ID (dedicated receipts route) |
| `/receipts` | GET | receipts.ts | List receipts with pagination |
| `/receipts/:id/verify` | POST | receipts.ts | Verify receipt integrity |
| `/identity/agents` | POST | identity.ts | Register agent (different schema from KYA issue) |
| `/identity/agents/:id/delegation` | PUT | identity.ts | Update agent delegation scope |
| `/analytics/volume` | GET | analytics.ts | Transaction volume over time |
| `/analytics/compliance` | GET | analytics.ts | Compliance decision breakdown |
| `/analytics/risk` | GET | analytics.ts | Risk score distribution |
| `/analytics/agents` | GET | analytics.ts | Top agents by transaction volume |
| `/webhooks` | POST | webhooks.ts | Register webhook |
| `/webhooks` | GET | webhooks.ts | List webhooks |
| `/webhooks/:id` | PUT | webhooks.ts | Update webhook |
| `/webhooks/:id` | DELETE | webhooks.ts | Delete webhook |
| `/webhooks/:id/test` | POST | webhooks.ts | Test webhook delivery |
| `/health` | GET | health.ts | Health check |
| `/health/ready` | GET | health.ts | Readiness probe |
| `/health/live` | GET | health.ts | Liveness probe |
| `/ws` | WS | ws.ts | WebSocket real-time events |

**Summary:** SDK covers 12 of ~30 API endpoints. Missing entire modules: analytics, webhooks, receipts (standalone), health. Two compliance endpoints exist in SDK but not API (`/risk-score`, `/travel-rule`) -- forward-looking stubs.

---

## 4. Type Alignment (SDK vs API Response Types)

### Issues Found

#### 4a. Pagination field mismatch

SDK `PaginatedResponse` uses `limit` in pagination:
```ts
pagination: { page: number; limit: number; total: number; totalPages: number; }
```

API compliance history and receipts routes use `pageSize`:
```ts
pagination: { page, pageSize: limit, total, totalPages }
```

API invoices route uses `limit`:
```ts
pagination: { page, limit, total, totalPages }
```

**Verdict:** Inconsistency across API routes. SDK matches invoices but not compliance/identity/receipts routes.

#### 4b. `registerAgent()` route mismatch

SDK `registerAgent()` posts to `/identity/kya/issue` (same as `issueKYA()`), but the API has a dedicated `POST /identity/agents` route with a different schema (includes `name` field, different `controllingEntity` shape). The SDK's `AgentRegistration` type closely matches the KYA issue schema, not the agent registration schema.

#### 4c. API response envelope

All API routes wrap responses in `{ success: true, data: ... }`. The SDK types assume the response IS the data directly (e.g., `Promise<ComplianceDecision>`). The HTTP client must unwrap this envelope, but `http.ts` does `return (await response.json()) as T` with no unwrapping. **This means the SDK will return `{ success, data }` when the caller expects just the data.**

This is a **critical bug** unless the API strips the envelope before the SDK receives it, or tests mock the raw data shape.

#### 4d. Forward-declared endpoints

`calculateRiskScore` (POST `/compliance/risk-score`) and `checkTravelRule` (POST `/compliance/travel-rule`) have no corresponding API routes. These are stubs for future implementation.

---

## 5. Error Hierarchy

```
FlowLinkError (base)
├── FlowLinkAPIError        — non-2xx HTTP, includes status, parsed body, headers
├── FlowLinkValidationError — client-side param validation, includes field name
├── FlowLinkTimeoutError    — request timeout, includes timeoutMs and URL
└── FlowLinkNetworkError    — DNS/connection failures after retry exhaustion
```

**Assessment:** Well-structured. Errors are specific, informative, and catchable at any level of the hierarchy. `ApiErrorBody` includes `code`, `message`, and optional `details`.

---

## 6. HTTP Client Assessment

**File:** `packages/sdk/src/http.ts`

- **Auth:** Bearer token via `Authorization` header on every request
- **Retry:** Exponential backoff (500ms, 1s, 2s, ... capped 8s) with 25% jitter
- **Retryable codes:** 408, 429, 500, 502, 503, 504
- **Retry-After:** Respected on 429 responses
- **Timeout:** `AbortSignal.timeout()` per attempt (fresh signal each retry)
- **Error parsing:** Attempts JSON parse of error bodies, falls back to `{ code: "UNKNOWN", message: stringified }` or null
- **204 handling:** Returns `undefined as T` for no-content responses
- **Methods:** GET, POST, PUT, PATCH, DELETE

**Quality:** Solid. No issues found in retry/timeout/error logic.

---

## 7. Public API (index.ts exports)

**Classes:** `FlowLinkClient`, `HttpClient`
**Errors:** `FlowLinkError`, `FlowLinkAPIError`, `FlowLinkValidationError`, `FlowLinkTimeoutError`, `FlowLinkNetworkError`
**SDK types:** `FlowLinkClientConfig`, `ComplianceCheckParams`, `ComplianceHistoryParams`, `CreateInvoiceParams`, `ListInvoicesParams`, `AgentRegistration`, `IssueKYAParams`, `PaginatedResponse`, `PaginationParams`, `ScreenAddressParams`, `TransactionContext`, `TravelRuleResult`
**Re-exported shared types:** 34 types from `@flowlink/shared/types`

`ScreenAddressParams` is exported but never used by any client method (screenAddress takes positional args).

---

## 8. Usage Examples

### Installation

```bash
pnpm add @flowlink/sdk
```

### Basic Usage

```ts
import { FlowLinkClient } from "@flowlink/sdk";

const client = new FlowLinkClient({
  apiKey: "fl_live_your_key_here",
  // baseUrl: "http://localhost:3000/v1",  // optional, for local dev
  // timeout: 15_000,                       // optional, default 30s
  // maxRetries: 2,                         // optional, default 3
});
```

### Compliance Check

```ts
const decision = await client.checkCompliance({
  sender: { address: "0xAlice", chain: "base" },
  receiver: { address: "0xBob", chain: "base" },
  amount: "5000",
  asset: "USDC",
  protocol: "x402",
});
console.log(decision.status); // "APPROVED" | "REJECTED" | "ESCALATED"
```

### Sanctions Screening

```ts
const result = await client.screenAddress("0xSuspect", "ethereum");
console.log(result.matched, result.riskScore);
```

### Invoice Lifecycle

```ts
// Create
const invoice = await client.createInvoice({
  seller: { walletAddress: "0xSeller" },
  buyer: { walletAddress: "0xBuyer" },
  lineItems: [{ description: "API calls", quantity: 1000, unitPrice: 0.01, total: 10 }],
  currency: "USDC",
  totalAmount: 10,
});

// List
const invoices = await client.listInvoices({ state: "DRAFT", limit: 10 });

// Get
const fetched = await client.getInvoice(invoice.id);

// Transition state
const issued = await client.updateInvoiceState(invoice.id, "ISSUED");
```

### Agent Identity & KYA

```ts
// Verify
const verification = await client.verifyAgent("did:example:agent123");

// Register (currently hits /identity/kya/issue)
const agent = await client.registerAgent({
  agentDid: "did:example:new-agent",
  agentType: "autonomous",
  controllingEntity: { name: "Acme Corp", kybVerified: true },
  walletAddress: "0xAgent",
  delegationScope: {
    maxTransactionValue: 10000,
    expiresAt: "2027-01-01T00:00:00Z",
  },
});

// List agents
const agents = await client.listAgents({ page: 1, limit: 20 });
```

### Error Handling

```ts
import {
  FlowLinkAPIError,
  FlowLinkTimeoutError,
  FlowLinkNetworkError,
  FlowLinkValidationError,
  FlowLinkError,
} from "@flowlink/sdk";

try {
  await client.screenAddress("0xAddr", "ethereum");
} catch (err) {
  if (err instanceof FlowLinkValidationError) {
    console.error(`Validation: ${err.message} (field: ${err.field})`);
  } else if (err instanceof FlowLinkAPIError) {
    console.error(`API ${err.status}: ${err.body?.code} — ${err.body?.message}`);
  } else if (err instanceof FlowLinkTimeoutError) {
    console.error(`Timeout after ${err.timeoutMs}ms on ${err.url}`);
  } else if (err instanceof FlowLinkNetworkError) {
    console.error(`Network: ${err.message}`);
  } else if (err instanceof FlowLinkError) {
    console.error(`SDK error: ${err.message}`);
  }
}
```

---

## 9. Critical Issues Summary

| # | Severity | Issue |
|---|---|---|
| 1 | **CRITICAL** | HTTP client does not unwrap `{ success, data }` envelope -- SDK returns the raw API response, not the typed data object |
| 2 | **HIGH** | `registerAgent()` posts to `/identity/kya/issue` (same as `issueKYA()`), should probably use `POST /identity/agents` |
| 3 | **MEDIUM** | Pagination field mismatch: SDK uses `limit`, API compliance/identity/receipts use `pageSize` |
| 4 | **MEDIUM** | 18+ API endpoints have no SDK coverage (analytics, webhooks, receipts, health, batch compliance, stats, delegation updates) |
| 5 | **LOW** | `ScreenAddressParams` type exported but unused by any method |
| 6 | **LOW** | `calculateRiskScore` and `checkTravelRule` are forward stubs with no API backend |

---

## 10. Recommendations

1. **Add response envelope unwrapping** in `HttpClient.request()`:
   ```ts
   const json = await response.json();
   if (json.data !== undefined) return json.data as T;
   return json as T;
   ```

2. **Fix `registerAgent()`** to POST to `/identity/agents` with the correct schema, or rename to clarify it issues KYA.

3. **Standardize pagination** field naming across all API routes (pick `limit` or `pageSize`, not both).

4. **Add SDK methods** for high-value missing endpoints: batch compliance, receipts, webhooks, analytics.

5. **Remove or mark** `ScreenAddressParams` as internal since no method uses it.
