# x402 Compliance Package Verification

**Package:** `@flowlink/x402-compliance` v0.2.0
**Path:** `packages/x402-compliance/`
**Date:** 2026-03-21
**Verdict:** PASS — 67/67 tests passing, architecture is sound

---

## Architecture Overview

The package implements a compliance middleware layer that hooks into the x402 payment protocol's lifecycle. It follows a dependency-injection pattern where all external services (sanctions screening, AML scoring, KYA verification, travel rule, etc.) are injected as interfaces, with default stubs that warn at startup when used.

### Core Flow

```
Client Payment Request
        |
        v
  ┌─────────────────┐
  │ onBeforeVerify   │  Sanctions screening, AML scoring, KYA check
  │ (before-verify)  │  Result cached in pendingDecisions map
  └────────┬────────┘
           │ pass
           v
  ┌─────────────────┐
  │ onBeforeSettle   │  Re-screen receiver, Travel Rule if amount > threshold
  │ (before-settle)  │  Updates pendingDecision with travel rule ref
  └────────┬────────┘
           │ pass
           v
  ┌─────────────────┐
  │ onAfterSettle    │  ProofLink receipt generation, EAS attestation,
  │ (after-settle)   │  audit storage, invoice generation (all async/non-blocking)
  └────────┬────────┘
           │
           v
  Extension enriches settlement response with proofLinkHash
```

### Key Design Decisions

- **Evicting maps** with TTL (5 min for decisions, 30s for proof links) prevent unbounded memory growth
- **Payload correlation** uses first 128 chars of the payment signature as a deterministic key across hooks
- **Parallel execution** — sanctions screening (sender + receiver), AML scoring, and KYA lookup all run via `Promise.all`
- **Non-blocking post-settlement** — audit storage, EAS attestation, and invoice generation are fire-and-forget with error logging
- **Interval timers are unrefed** so they don't prevent Node.js process exit

---

## Hook Lifecycle

### 1. `onBeforeVerify(ctx: VerifyContext) -> BeforeHookResult`

Order of checks:
1. Extract sender address from payment payload (EIP-3009 / Permit2 / Solana / custom extractor)
2. **Allowlist short-circuit** — if both sender and receiver are allowlisted, pass immediately (zero latency)
3. **Blocklist check** — reject blocklisted sender/receiver before any API calls
4. **EVM address format validation** — rejects malformed `0x`-prefixed addresses (non-EVM skipped)
5. **Parallel: Sanctions screening + AML scoring + KYA registry lookup**
6. **Sanctions evaluation** — sender first, then receiver
7. **AML risk score** — reject if score > `config.policy.maxRiskScore`
8. **KYA verification** — if sender has an agent credential, verify it; skip for regular wallets
9. Cache `PendingDecision` in the evicting map for settle phase correlation

### 2. `onBeforeSettle(ctx: SettleContext) -> BeforeHookResult`

1. Look up cached decision from verify phase
2. **Re-screen receiver** — guards against dynamic payTo changes in x402 v2
3. **Travel Rule check** — if `priceConverter.toUsd(amount)` >= `travelRuleThresholdUsd`, transmit via `TravelRuleService`
4. Records travel rule reference in pending decision

### 3. `onAfterSettle(ctx: SettleResultContext) -> AfterHookResult`

1. Build `ProofLinkReceipt` with all compliance check entries and deterministic hash
2. Emit `compliance:settle:completed` event
3. Store audit record (async, non-blocking)
4. If EAS config present, anchor receipt on-chain (async, non-blocking)
5. If invoice service configured, generate invoice (async, non-blocking)
6. Store proofLink hash for extension enrichment; delete pending decision

---

## Adapter Compatibility

### Express Adapter

- **File:** `src/adapters/express.ts`
- Uses minimal interface types (`ExpressRequest`, `ExpressResponse`, `ExpressNextFunction`) — no dependency on `express` package
- Default extraction: `req.body.paymentPayload` and `req.body.requirements`
- Custom extractors supported via `extractPayload` and `extractRequirements` options
- On compliance failure: responds with 403 + JSON `{ error, reason, message }`
- On missing payload/requirements: calls `next()` (pass-through)

### Hono Adapter

- **File:** `src/adapters/hono.ts`
- Uses minimal `HonoContext` interface — no dependency on `hono` package
- Async extractors (Hono body parsing is async)
- On compliance failure: returns `ctx.json({...}, 403)`
- On internal error: returns `ctx.json({error: "internal_compliance_error"}, 500)`

Both adapters only run `onBeforeVerify`. Settlement hooks must be registered separately on the x402 resource server via `compliance.register(server)`.

---

## Test Results

```
Test Files  2 passed (2)
     Tests  67 passed (67)
  Duration  1.02s
```

### Coverage by Area

| Area | Tests | Status |
|---|---|---|
| Allowlist short-circuit | 2 | PASS |
| Blocklist check | 2 | PASS |
| Sanctions screening | 4 | PASS |
| AML risk scoring | 3 | PASS |
| KYA verification | 5 | PASS |
| Error handling | 2 | PASS |
| Pending decisions cache | 2 | PASS |
| Event emission | 2 | PASS |
| Before-settle hook | 6 | PASS |
| After-settle hook | 7 | PASS |
| Payload key | 3 | PASS |
| Constructor & registration | 3 | PASS |
| Factory | 1 | PASS |
| Full happy-path flow | 1 | PASS |
| Sanctions (integration) | 4 | PASS |
| AML (integration) | 2 | PASS |
| Travel Rule | 3 | PASS |
| KYA (integration) | 4 | PASS |
| Extension enrichment | 2 | PASS |
| Address extraction | 4 | PASS |
| Event system | 2 | PASS |
| Allowlist (integration) | 1 | PASS |
| EAS attestation | 1 | PASS |

---

## Additional Components

### ProofLinkReceiptBuilder (`receipt.ts`)
- Deterministic SHA-256 hashing with canonical serialization (excludes `signature` and `proofLinkHash` fields)
- HMAC-SHA256 signing with provider key
- Constant-time signature verification to prevent timing attacks
- `InMemoryReceiptStore` for dev/test; `ReceiptStore` interface for production implementations

### RateLimiter (`rate-limiter.ts`)
- Sliding window algorithm with per-key tracking
- Configurable tiers (named rate limit profiles)
- `check()` records and enforces, `peek()` reads without recording
- Periodic pruning of stale entries with unrefed timer
- Returns `RateLimitResult` with `remaining`, `retryAfterSeconds`, `resetAt`

### ComplianceLogger (`logger.ts`)
- Structured event logging with `ComplianceLogEntry` format
- `LogTransport` interface for external aggregators (DataDog, Loki, etc.)
- `ConsoleJsonTransport` for development (JSON lines to stdout)
- `BufferedTransport` for batched HTTP delivery with configurable flush interval
- Event filtering and correlation ID extraction from tx/proofLink hashes

### Address Utilities (`address.ts`)
- Multi-chain support: EVM + Solana with CAIP-2 identifiers
- Known chains registry (Ethereum, Base, Polygon, Arbitrum, Optimism, Sepolia, Solana)
- `registerAddressExtractor()` for extending to custom chains (e.g., Aptos)
- Address validation, normalization (EVM lowercase, Solana case-sensitive)

### Testing Utilities (`testing.ts`)
- Fixture generators: `createTestPaymentPayload`, `createTestPaymentRequirements`, `createTestSettleResponse`, `createTestConfig`
- Mock services: `MockSanctionsScreener`, `MockAmlScorer`, `MockKYAVerifier`, `MockKYARegistry`, `MockTravelRuleService`, `MockPriceConverter`, `MockProofLinkService`, `MockInvoiceService`
- `EventCollector` for assertion helpers
- `MockResourceServer` with `simulatePayment()` for full-cycle testing

---

## Missing Features / Gaps

1. **No Redis-backed rate limiter** — `RateLimiter` is in-memory only. The config schema defines `RedisConfig` but there is no Redis implementation. Multi-instance deployments will not share rate limit state.

2. **No Redis-backed screening cache** — `RedisConfig` defines `cleanCacheTtlSeconds` and `flaggedCacheTtlSeconds` but no caching layer exists between the middleware and the sanctions/AML services.

3. **No webhook delivery** — `WebhookConfig` and `WebhookConfigSchema` are defined in types but there is no webhook transport implementation. Events can be subscribed to via `compliance.on()` but outbound HTTP webhooks are not built.

4. **No retry logic** — `RetryPolicy` and `RetryPolicySchema` are defined but not used anywhere. Sanctions/AML API calls have no retry/backoff.

5. **No metrics integration** — `MetricsCollector` interface is defined and `FlowLinkConfig` accepts a `metrics` field, but no code calls `metrics.increment()` or `metrics.histogram()`.

6. **No route-level policy overrides** — `RouteCompliancePolicy` is defined in types but the middleware does not consult `config.routePolicies` to apply per-route overrides.

7. **Rate limiter not wired into middleware** — `RateLimiter` exists as a standalone utility but is not integrated into the compliance hooks or adapters.

8. **Adapter coverage** — Express and Hono adapters only run `onBeforeVerify`. They do not handle the settle/afterSettle lifecycle. Fastify adapter is mentioned in types (`AdapterRequest`) but not implemented.

9. **No Chainalysis client** — `chainalysisApiKey` is a required config field but there is no actual HTTP client for the Chainalysis API. Users must implement `SanctionsScreener` and `AmlScorer` themselves.

10. **No Notabene client** — `NotabeneConfig` is defined but there is no `TravelRuleService` implementation that calls the Notabene API.

---

## Integration Guide

### Express App

```ts
import express from "express";
import { createFlowLinkCompliance } from "@flowlink/x402-compliance";
import { createExpressComplianceMiddleware } from "@flowlink/x402-compliance/adapters/express";

const app = express();
app.use(express.json());

const compliance = createFlowLinkCompliance({
  chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
  policy: {
    sanctionsLists: ["OFAC_SDN", "EU", "UN"],
    maxRiskScore: 70,
    travelRuleThresholdUsd: 3000,
  },
}, {
  // Inject real service implementations for production
  screener: myChainalysisScreener,
  amlScorer: myChainalysisAmlScorer,
});

// Option A: Standalone middleware on specific routes
app.use("/api/pay", createExpressComplianceMiddleware({ compliance }));

// Option B: Register on an x402 resource server (hooks into full lifecycle)
// compliance.register(x402Server);

// Subscribe to compliance events for monitoring
const unsubscribe = compliance.on((event) => {
  console.log(`[compliance] ${event.type}`, event.payload);
});

// Cleanup on shutdown
process.on("SIGTERM", () => {
  compliance.destroy();
  unsubscribe();
});
```

### Hono App

```ts
import { Hono } from "hono";
import { createFlowLinkCompliance } from "@flowlink/x402-compliance";
import { createHonoComplianceMiddleware } from "@flowlink/x402-compliance/adapters/hono";

const app = new Hono();

const compliance = createFlowLinkCompliance({
  chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
  policy: {
    sanctionsLists: ["OFAC_SDN"],
    maxRiskScore: 70,
    travelRuleThresholdUsd: 3000,
    allowlist: ["0xYourOwnAddress..."],
  },
});

// Apply compliance middleware to payment routes
app.use("/api/pay/*", createHonoComplianceMiddleware({ compliance }));

app.post("/api/pay/verify", async (c) => {
  // Request already passed compliance checks
  return c.json({ verified: true });
});

export default app;
```

### Full Lifecycle with x402 Resource Server

```ts
import { createFlowLinkCompliance } from "@flowlink/x402-compliance";
import { ComplianceLogger, ConsoleJsonTransport } from "@flowlink/x402-compliance/logger";

const compliance = createFlowLinkCompliance(config, services);

// Set up structured logging
const logger = new ComplianceLogger({
  serviceName: "my-payment-api",
  transports: [new ConsoleJsonTransport()],
});
compliance.on(logger.handler());

// Register all 3 hooks + extension on the x402 server
compliance.register(x402ResourceServer);
// This registers:
//   - onBeforeVerify (sanctions, AML, KYA)
//   - onBeforeSettle (receiver re-check, travel rule)
//   - onAfterSettle  (ProofLink receipt, EAS attestation, audit log)
//   - FlowLink extension (enriches 402 and settlement responses)
```
