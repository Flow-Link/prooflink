# x402 Compliance Middleware Architecture

**Version:** 1.0
**Date:** March 20, 2026
**Status:** Architecture Design (Pre-Implementation)
**Package:** `@flowlink/x402-compliance`
**Target:** 4-6 week implementation by one engineer familiar with x402

---

## 1. Problem Statement

x402 processes 75M+ transactions per month with zero built-in compliance infrastructure. The protocol explicitly excludes KYC, sanctions screening, AML monitoring, Travel Rule compliance, and structured invoicing. The Coinbase CDP facilitator runs basic OFAC checks, but enterprises operating in regulated jurisdictions (US GENIUS Act, EU MiCA, FATF Travel Rule) cannot adopt x402 without a compliance layer that intercepts every payment and produces auditable proof of screening.

FlowLink must intercept the x402 payment flow at the facilitator level -- between payment signature verification and on-chain settlement -- injecting compliance checks that add less than 200ms to total round-trip while producing cryptographic compliance receipts (ProofLinks) that satisfy regulatory audit requirements.

---

## 2. Research & Context

### 2.1 x402 V2 SDK Architecture (validated from source)

The x402 TypeScript SDK (V2) uses a plugin-driven architecture with three composable layers:

```
@x402/core
  ├── x402ResourceServer        -- protocol logic, hook system, facilitator routing
  ├── x402HTTPResourceServer    -- HTTP adapter layer (Express, Hono, Next)
  ├── HTTPFacilitatorClient     -- facilitator /verify, /settle, /supported calls
  └── types/                    -- PaymentPayload, PaymentRequirements, VerifyResponse, SettleResponse

@x402/express                   -- Express.js middleware: paymentMiddleware(), ExpressAdapter
@x402/evm                       -- ExactEvmScheme (EIP-3009, Permit2, ERC-7710)
@x402/svm                       -- ExactSvmScheme (Solana SPL)
```

### 2.2 Hook System (critical integration surface)

`x402ResourceServer` exposes six lifecycle hooks, registered via builder pattern:

```typescript
server.onBeforeVerify(hook)    // (VerifyContext) => void | { abort, reason }
server.onAfterVerify(hook)     // (VerifyResultContext) => void
server.onVerifyFailure(hook)   // (VerifyFailureContext) => void | { recovered, result }
server.onBeforeSettle(hook)    // (SettleContext) => void | { abort, reason }
server.onAfterSettle(hook)     // (SettleResultContext) => void
server.onSettleFailure(hook)   // (SettleFailureContext) => void | { recovered, result }
```

Each hook receives the full `PaymentPayload` and `PaymentRequirements`, which contain:
- `payload.accepted.payTo` -- recipient wallet address
- `payload.payload.authorization.from` -- sender wallet address (EVM EIP-3009)
- `payload.accepted.network` -- CAIP-2 chain identifier
- `payload.accepted.amount` -- transaction amount in base units
- `payload.accepted.asset` -- token contract address

### 2.3 Extension System

`ResourceServerExtension` provides three enrichment hooks:
- `enrichDeclaration` -- modify route-level extension data
- `enrichPaymentRequiredResponse` -- add data to the 402 response
- `enrichSettlementResponse` -- add data to the settlement receipt

Extensions are keyed by string and registered via `server.registerExtension()`.

### 2.4 Facilitator API (validated from types)

```
POST /verify   -- { x402Version, paymentPayload, paymentRequirements } => VerifyResponse
POST /settle   -- { x402Version, paymentPayload, paymentRequirements } => SettleResponse
GET  /supported -- => SupportedResponse { kinds[], extensions[], signers }
```

`VerifyResponse`: `{ isValid, invalidReason?, payer?, extensions? }`
`SettleResponse`: `{ success, transaction, network, payer?, errorReason?, extensions? }`

### 2.5 Constraints from FlowLink Technical Architecture

From `/home/akash/PROJECTS/FLOW-LINK/architecture/technical_design.md`:
- ProofLink Engine latency budget: <500ms total compliance pipeline
- Sanctions screening: <100ms per address (Chainalysis API)
- AML risk scoring: <50ms
- Travel Rule (Notabene): <200ms
- The x402 facilitator is a component within the Payment Protocol Router

### 2.6 Technology Selection

| Choice | Selection | Rationale |
|--------|-----------|-----------|
| Language | TypeScript (strict) | x402 SDK is TypeScript-first; hook system is TypeScript-native |
| Runtime | Node.js 20+ | Matches x402 ecosystem |
| Package manager | pnpm | x402 monorepo uses pnpm |
| HTTP framework | Express.js (primary), Hono adapter (secondary) | Express is dominant x402 deployment pattern |
| Compliance API client | Chainalysis KYT v3, Notabene v2 | Industry standard for sanctions + Travel Rule |
| Cache | Redis (via ioredis) | Sub-ms screening result cache, required by FlowLink architecture |
| Attestation | EAS (Ethereum Attestation Service) | On-chain compliance receipt anchoring |

### 2.7 Assumptions

| Assumption | Risk Level | Mitigation |
|------------|-----------|------------|
| x402 hook system is stable API | Low | Pinned to exact @x402/core version; adapter pattern isolates breakage |
| Chainalysis KYT v3 API available | Low | Already selected vendor; fallback to OFAC SDN list offline check |
| Facilitator `/verify` is called before resource delivery | None | This is the x402 spec; verified in source |
| `PaymentPayload.payload.authorization.from` is always present for EVM | Low | EIP-3009 and Permit2 both include `from`; Solana has different path |
| Redis available in deployment | Low | Graceful degradation to in-memory LRU if Redis unavailable |

---

## 3. Proposed Architecture

### 3.1 High-Level Design

```
                              ┌─────────────────────────────────────────┐
                              │         Resource Server (Express)        │
                              │                                         │
                              │  app.use(paymentMiddleware(routes, server))
                              │                                         │
                              │  ┌───────────────────────────────────┐  │
                              │  │       x402ResourceServer          │  │
                              │  │                                   │  │
                              │  │  ┌─ onBeforeVerify ────────────┐  │  │
                              │  │  │  FlowLink Compliance Hook   │  │  │
                              │  │  │  1. Extract sender/receiver │  │  │
                              │  │  │  2. Sanctions screen (both) │  │  │
                              │  │  │  3. AML risk score          │  │  │
                              │  │  │  4. Jurisdiction check      │  │  │
                              │  │  │  5. Return PASS or ABORT    │  │  │
                              │  │  └─────────────────────────────┘  │  │
                              │  │                                   │  │
                              │  │  ┌─ onBeforeSettle ────────────┐  │  │
                              │  │  │  Travel Rule Hook           │  │  │
                              │  │  │  1. Check threshold         │  │  │
                              │  │  │  2. Transmit IVMS101 packet │  │  │
                              │  │  │  3. Return PASS or ABORT    │  │  │
                              │  │  └─────────────────────────────┘  │  │
                              │  │                                   │  │
                              │  │  ┌─ onAfterSettle ─────────────┐  │  │
                              │  │  │  ProofLink Receipt Hook     │  │  │
                              │  │  │  1. Generate compliance hash│  │  │
                              │  │  │  2. Attest on-chain (EAS)   │  │  │
                              │  │  │  3. Store audit record      │  │  │
                              │  │  │  4. Generate invoice        │  │  │
                              │  │  └─────────────────────────────┘  │  │
                              │  │                                   │  │
                              │  │  ┌─ Extension: "flowlink" ─────┐  │  │
                              │  │  │  enrichPaymentRequired:     │  │  │
                              │  │  │    compliance policy in 402 │  │  │
                              │  │  │  enrichSettlementResponse:  │  │  │
                              │  │  │    proofLink hash in receipt│  │  │
                              │  │  └─────────────────────────────┘  │  │
                              │  └───────────────────────────────────┘  │
                              │                    │                    │
                              │         ┌──────────┴──────────┐        │
                              │         │  Upstream Facilitator│        │
                              │         │  (CDP / self-hosted) │        │
                              │         └─────────────────────┘        │
                              └─────────────────────────────────────────┘
```

### 3.2 Integration Strategy: Hook-Based, Not Proxy-Based

**Recommendation: Use the x402 hook system, not a proxy facilitator.**

Two architectural options were evaluated:

| Approach | Pros | Cons |
|----------|------|------|
| **A. Hook injection** (recommended) | Zero network hops; runs in-process; uses stable SDK API; composable with any facilitator; no separate deployment | Requires TypeScript; coupled to x402 SDK version |
| **B. Proxy facilitator** | Language-agnostic; decoupled deployment; works with any x402 server | Adds network hop (+50-100ms); requires running a separate service; must reimplement facilitator protocol |

Hook-based injection is strictly superior for the TypeScript ecosystem. For non-TypeScript deployments (Python, Rust), we provide a proxy facilitator as a secondary package (`@flowlink/x402-facilitator-proxy`), but this document focuses on the primary hook-based approach.

### 3.3 Data Flow: Happy Path

```
Step 1:  Client sends GET /api/data
Step 2:  Express middleware matches route, finds no payment header
Step 3:  x402HTTPResourceServer returns 402 with PAYMENT-REQUIRED header
         ↳ FlowLink extension enriches 402 with compliance policy metadata
Step 4:  Client signs payment, retries with PAYMENT-SIGNATURE header
Step 5:  x402HTTPResourceServer extracts payment payload
Step 6:  ──── onBeforeVerify (FlowLink Compliance Hook) ────
         │  a. Extract `from` address from payload (EVM: authorization.from)
         │  b. Extract `payTo` address from requirements
         │  c. Parallel: sanctions_screen(from) + sanctions_screen(payTo)  [<100ms]
         │  d. aml_risk_score(from, amount, network)                       [<50ms]
         │  e. jurisdiction_check(from, payTo, amount)                     [<10ms]
         │  f. If any FAIL → return { abort: true, reason: "compliance_rejected" }
         │  g. If PASS → return void (continue to facilitator verify)
         └──────────────────────────────────────────────────
Step 7:  Facilitator /verify validates signature, balance, nonce
Step 8:  Resource server runs request handler, generates response
Step 9:  ──── onBeforeSettle (Travel Rule Hook) ────
         │  a. Check if amount exceeds Travel Rule threshold ($3,000 USD)
         │  b. If above threshold: transmit IVMS101 via Notabene
         │  c. If Notabene transmission fails → { abort: true }
         └──────────────────────────────────────────
Step 10: Facilitator /settle submits on-chain transaction
Step 11: ──── onAfterSettle (ProofLink Receipt Hook) ────
         │  a. Receive SettleResultContext { transaction, network, payer }
         │  b. Generate compliance receipt (ProofLink hash)
         │  c. Async: attest on-chain via EAS (non-blocking)
         │  d. Async: store in PostgreSQL audit log
         │  e. Async: generate structured invoice (if configured)
         │  f. Enrich settlement response extensions with proofLink hash
         └────────────────────────────────────────────────
Step 12: Server returns 200 with PAYMENT-RESPONSE header
         ↳ Contains x402 transaction hash + FlowLink proofLink hash
```

### 3.4 Key Interfaces and Contracts

```typescript
// ─── Configuration ───

interface FlowLinkConfig {
  /** Chainalysis KYT API key */
  chainalysisApiKey: string;

  /** Notabene API credentials (optional, for Travel Rule) */
  notabene?: {
    apiKey: string;
    vaspDID: string;
    testnet?: boolean;
  };

  /** Redis connection for caching screening results */
  redis?: {
    url: string;
    /** Cache TTL for clean addresses (default: 3600s / 1 hour) */
    cleanCacheTtlSeconds?: number;
    /** Cache TTL for flagged addresses (default: 300s / 5 minutes) */
    flaggedCacheTtlSeconds?: number;
  };

  /** Compliance policy */
  policy: CompliancePolicy;

  /** EAS attestation config (optional) */
  eas?: {
    schemaUid: `0x${string}`;
    privateKey: `0x${string}`;
    rpcUrl: string;
  };

  /** Invoice generation config (optional) */
  invoicing?: {
    enabled: boolean;
    companyName: string;
    companyAddress: string;
    taxId?: string;
    webhookUrl?: string;
  };

  /** Logging and observability */
  logger?: Logger;
  metricsPrefix?: string;
}

interface CompliancePolicy {
  /** Sanctions lists to screen against */
  sanctionsLists: ("OFAC_SDN" | "OFAC_CONS" | "UN" | "EU" | "HMT")[];

  /** Maximum AML risk score (0-100) before rejection */
  maxRiskScore: number;

  /** Travel Rule threshold in USD */
  travelRuleThresholdUsd: number;

  /** Jurisdictions that require enhanced due diligence */
  eddJurisdictions?: string[];

  /** Wallet addresses that bypass compliance (e.g., known treasury addresses) */
  allowlist?: string[];

  /** Wallet addresses that are always blocked */
  blocklist?: string[];
}

// ─── Compliance Decision ───

interface ComplianceDecision {
  pass: boolean;
  riskScore: number;
  checks: ComplianceCheck[];
  proofLinkHash: string;
  timestamp: number;
  latencyMs: number;
}

interface ComplianceCheck {
  type: "sanctions" | "aml" | "travel_rule" | "jurisdiction" | "allowlist" | "blocklist";
  target: string;           // address screened
  result: "pass" | "fail" | "skip";
  detail?: string;
  latencyMs: number;
}

// ─── ProofLink Receipt ───

interface ProofLinkReceipt {
  version: 1;
  transactionHash: string;
  network: string;
  sender: string;
  receiver: string;
  amount: string;
  asset: string;
  complianceDecision: ComplianceDecision;
  invoiceId?: string;
  attestationUid?: string;
  createdAt: string;
}
```

### 3.5 Extracting Wallet Addresses by Chain

The `from` address is located differently depending on the chain family:

```typescript
function extractSenderAddress(payload: PaymentPayload): string | null {
  const inner = payload.payload;

  // EVM EIP-3009: authorization.from
  if (inner.authorization && typeof inner.authorization === "object") {
    return (inner.authorization as { from: string }).from;
  }

  // EVM Permit2: permit2Authorization.from
  if (inner.permit2Authorization && typeof inner.permit2Authorization === "object") {
    return (inner.permit2Authorization as { from: string }).from;
  }

  // Solana: payload contains sender pubkey
  if (inner.sender && typeof inner.sender === "string") {
    return inner.sender;
  }

  return null;
}
```

---

## 4. Affected Areas

| File/Module | Action | Description | Dependencies |
|-------------|--------|-------------|--------------|
| `packages/core/src/hooks/` | New | Compliance hook implementations (beforeVerify, beforeSettle, afterSettle) | Chainalysis client, Redis, compliance policy |
| `packages/core/src/extension/` | New | FlowLink ResourceServerExtension (enriches 402 and settlement responses) | @x402/core types |
| `packages/core/src/screening/` | New | Sanctions screening client (Chainalysis KYT v3 wrapper) | Chainalysis API, Redis cache |
| `packages/core/src/aml/` | New | AML risk scoring engine | Chainalysis KYT, behavioral model |
| `packages/core/src/travel-rule/` | New | FATF Travel Rule IVMS101 transmission via Notabene | Notabene SDK |
| `packages/core/src/prooflink/` | New | ProofLink receipt generation, hashing, EAS attestation | ethers.js/viem, EAS SDK |
| `packages/core/src/invoice/` | New | Structured invoice generation from x402 settlement data | Receipt data |
| `packages/core/src/cache/` | New | Redis cache layer for screening results | ioredis |
| `packages/core/src/config.ts` | New | Configuration validation (zod schema) | zod |
| `packages/core/src/index.ts` | New | Public API: `createFlowLinkCompliance()` factory | All above |
| `packages/core/src/address.ts` | New | Multi-chain address extraction from PaymentPayload | @x402/core types |
| `packages/core/src/metrics.ts` | New | Prometheus-compatible metrics for compliance latency | prom-client |
| `packages/express/src/index.ts` | New | Express-specific convenience wrapper | @flowlink/x402-compliance core |
| `packages/facilitator-proxy/` | New (Phase 3) | Standalone proxy facilitator for non-TypeScript servers | fastify, core |

---

## 5. Express.js Middleware Implementation

### 5.1 Primary API: Hook Registration

The FlowLink compliance layer registers itself onto an existing `x402ResourceServer` instance via hooks. It does not replace the x402 middleware -- it composes with it.

```typescript
// ─── Public API ───

import { x402ResourceServer } from "@x402/core/server";
import { createFlowLinkCompliance, type FlowLinkConfig } from "@flowlink/x402-compliance";

// Create compliance instance
const compliance = createFlowLinkCompliance({
  chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
  policy: {
    sanctionsLists: ["OFAC_SDN", "EU", "UN"],
    maxRiskScore: 70,
    travelRuleThresholdUsd: 3000,
    allowlist: ["0xKnownTreasuryAddress"],
  },
  redis: { url: process.env.REDIS_URL! },
  logger: console,
});

// Create x402 server
const server = new x402ResourceServer(facilitatorClient);
server.register("eip155:*", new ExactEvmScheme());

// Register FlowLink compliance (one line)
compliance.register(server);

// Use standard x402 middleware — FlowLink is now active
app.use(paymentMiddleware(routes, server));
```

### 5.2 Factory Implementation

```typescript
function createFlowLinkCompliance(config: FlowLinkConfig): FlowLinkCompliance {
  // Validate config with zod
  const validated = flowLinkConfigSchema.parse(config);

  // Initialize services
  const screeningService = new SanctionsScreeningService(validated);
  const amlService = new AmlRiskService(validated);
  const travelRuleService = validated.notabene
    ? new TravelRuleService(validated.notabene)
    : null;
  const proofLinkService = new ProofLinkService(validated);
  const invoiceService = validated.invoicing?.enabled
    ? new InvoiceService(validated.invoicing)
    : null;
  const cacheService = validated.redis
    ? new RedisCacheService(validated.redis)
    : new InMemoryCacheService();
  const metricsService = new MetricsService(validated.metricsPrefix);

  return new FlowLinkCompliance({
    screeningService,
    amlService,
    travelRuleService,
    proofLinkService,
    invoiceService,
    cacheService,
    metricsService,
    config: validated,
  });
}
```

### 5.3 Hook Implementations

```typescript
class FlowLinkCompliance {
  register(server: x402ResourceServer): void {
    // Register hooks
    server.onBeforeVerify(this.complianceScreeningHook.bind(this));
    server.onBeforeSettle(this.travelRuleHook.bind(this));
    server.onAfterSettle(this.proofLinkReceiptHook.bind(this));

    // Register extension for 402 and settlement enrichment
    server.registerExtension(this.flowLinkExtension);
  }

  // ─── Hook: Compliance Screening (onBeforeVerify) ───
  //
  // Runs BEFORE the facilitator /verify call.
  // Can abort the entire payment flow if compliance fails.
  //
  private async complianceScreeningHook(
    context: VerifyContext
  ): Promise<void | { abort: true; reason: string; message?: string }> {
    const startTime = Date.now();
    const { paymentPayload, requirements } = context;

    const sender = extractSenderAddress(paymentPayload);
    const receiver = requirements.payTo;

    if (!sender) {
      return { abort: true, reason: "compliance_error", message: "Cannot extract sender address" };
    }

    // Check allowlist/blocklist first (zero latency)
    if (this.config.policy.allowlist?.includes(sender)) {
      this.metrics.complianceCheckDuration.observe(Date.now() - startTime);
      return; // pass
    }
    if (this.config.policy.blocklist?.includes(sender) ||
        this.config.policy.blocklist?.includes(receiver)) {
      return { abort: true, reason: "compliance_blocked", message: "Address is blocklisted" };
    }

    // Parallel: sanctions screening + AML risk scoring
    const [senderScreen, receiverScreen, amlScore] = await Promise.all([
      this.screeningService.screen(sender, requirements.network),
      this.screeningService.screen(receiver, requirements.network),
      this.amlService.score(sender, requirements.amount, requirements.network),
    ]);

    // Evaluate results
    if (!senderScreen.clean) {
      this.metrics.complianceRejections.inc({ reason: "sanctions_sender" });
      return {
        abort: true,
        reason: "sanctions_hit",
        message: `Sender address flagged: ${senderScreen.matchedList}`,
      };
    }
    if (!receiverScreen.clean) {
      this.metrics.complianceRejections.inc({ reason: "sanctions_receiver" });
      return {
        abort: true,
        reason: "sanctions_hit",
        message: `Receiver address flagged: ${receiverScreen.matchedList}`,
      };
    }
    if (amlScore.score > this.config.policy.maxRiskScore) {
      this.metrics.complianceRejections.inc({ reason: "aml_risk" });
      return {
        abort: true,
        reason: "aml_risk_exceeded",
        message: `Risk score ${amlScore.score} exceeds threshold ${this.config.policy.maxRiskScore}`,
      };
    }

    // Store decision for later use by proofLink hook
    this.pendingDecisions.set(this.payloadKey(paymentPayload), {
      pass: true,
      riskScore: amlScore.score,
      checks: [
        { type: "sanctions", target: sender, result: "pass", latencyMs: senderScreen.latencyMs },
        { type: "sanctions", target: receiver, result: "pass", latencyMs: receiverScreen.latencyMs },
        { type: "aml", target: sender, result: "pass", detail: `score=${amlScore.score}`, latencyMs: amlScore.latencyMs },
      ],
      proofLinkHash: "", // filled at receipt time
      timestamp: Date.now(),
      latencyMs: Date.now() - startTime,
    });

    this.metrics.complianceCheckDuration.observe(Date.now() - startTime);
    return; // pass — continue to facilitator verify
  }

  // ─── Hook: Travel Rule (onBeforeSettle) ───
  //
  // Runs AFTER verify succeeds but BEFORE on-chain settlement.
  // Checks if the amount exceeds Travel Rule threshold.
  //
  private async travelRuleHook(
    context: SettleContext
  ): Promise<void | { abort: true; reason: string; message?: string }> {
    if (!this.travelRuleService) return;

    const { paymentPayload, requirements } = context;
    const amountUsd = await this.convertToUsd(requirements.amount, requirements.asset, requirements.network);

    if (amountUsd < this.config.policy.travelRuleThresholdUsd) {
      return; // below threshold, no Travel Rule obligation
    }

    const sender = extractSenderAddress(paymentPayload)!;
    const result = await this.travelRuleService.transmit({
      originatorAddress: sender,
      beneficiaryAddress: requirements.payTo,
      amount: requirements.amount,
      asset: requirements.asset,
      network: requirements.network,
    });

    if (!result.success) {
      return {
        abort: true,
        reason: "travel_rule_failed",
        message: `Travel Rule transmission failed: ${result.error}`,
      };
    }

    // Append to pending decision
    const key = this.payloadKey(paymentPayload);
    const decision = this.pendingDecisions.get(key);
    if (decision) {
      decision.checks.push({
        type: "travel_rule",
        target: sender,
        result: "pass",
        detail: `notabene_ref=${result.referenceId}`,
        latencyMs: result.latencyMs,
      });
    }
    return;
  }

  // ─── Hook: ProofLink Receipt (onAfterSettle) ───
  //
  // Runs AFTER successful on-chain settlement.
  // Generates compliance receipt, attests on-chain, stores audit record.
  // All operations are non-blocking (fire-and-forget with error logging).
  //
  private async proofLinkReceiptHook(context: SettleResultContext): Promise<void> {
    const { paymentPayload, requirements, result } = context;
    const key = this.payloadKey(paymentPayload);
    const decision = this.pendingDecisions.get(key);

    if (!decision) {
      this.config.logger?.warn("No compliance decision found for settled payment");
      return;
    }

    const receipt: ProofLinkReceipt = {
      version: 1,
      transactionHash: result.transaction,
      network: result.network,
      sender: extractSenderAddress(paymentPayload) ?? "unknown",
      receiver: requirements.payTo,
      amount: requirements.amount,
      asset: requirements.asset,
      complianceDecision: decision,
      createdAt: new Date().toISOString(),
    };

    // Generate deterministic hash
    receipt.complianceDecision.proofLinkHash =
      this.proofLinkService.computeHash(receipt);

    // Non-blocking: attest on-chain, store audit log, generate invoice
    void this.proofLinkService.attestOnChain(receipt).catch(err =>
      this.config.logger?.error("EAS attestation failed", err)
    );
    void this.proofLinkService.storeAuditRecord(receipt).catch(err =>
      this.config.logger?.error("Audit record storage failed", err)
    );
    if (this.invoiceService) {
      void this.invoiceService.generate(receipt).catch(err =>
        this.config.logger?.error("Invoice generation failed", err)
      );
    }

    // Store proofLink hash for extension enrichment
    this.settledProofLinks.set(key, receipt.complianceDecision.proofLinkHash);

    // Cleanup pending decision
    this.pendingDecisions.delete(key);
  }
}
```

### 5.4 FlowLink Extension (enriches x402 responses)

```typescript
const flowLinkExtension: ResourceServerExtension = {
  key: "flowlink",

  // Enrich 402 response with compliance policy information
  enrichPaymentRequiredResponse: async (declaration, context) => {
    return {
      complianceRequired: true,
      sanctionsLists: this.config.policy.sanctionsLists,
      travelRuleThresholdUsd: this.config.policy.travelRuleThresholdUsd,
      maxRiskScore: this.config.policy.maxRiskScore,
    };
  },

  // Enrich settlement response with proofLink hash
  enrichSettlementResponse: async (declaration, context) => {
    const key = this.payloadKey(context.paymentPayload);
    const proofLinkHash = this.settledProofLinks.get(key);
    this.settledProofLinks.delete(key);

    return {
      proofLinkHash: proofLinkHash ?? null,
      complianceVerified: true,
    };
  },
};
```

---

## 6. Configuration: How a Server Operator Adds FlowLink

### 6.1 Minimal Setup (sanctions screening only)

```typescript
import express from "express";
import { paymentMiddleware } from "@x402/express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { createFlowLinkCompliance } from "@flowlink/x402-compliance";

const app = express();

const compliance = createFlowLinkCompliance({
  chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
  policy: {
    sanctionsLists: ["OFAC_SDN"],
    maxRiskScore: 80,
    travelRuleThresholdUsd: 3000,
  },
});

const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const server = new x402ResourceServer(facilitator);
server.register("eip155:*", new ExactEvmScheme());

compliance.register(server); // <── one line

app.use(paymentMiddleware({
  "GET /api/data": {
    accepts: { payTo: "0x...", scheme: "exact", price: "$0.01", network: "eip155:8453" },
  },
}, server));

app.get("/api/data", (req, res) => res.json({ data: "value" }));
app.listen(3000);
```

### 6.2 Full Enterprise Setup

```typescript
const compliance = createFlowLinkCompliance({
  chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
  notabene: {
    apiKey: process.env.NOTABENE_API_KEY!,
    vaspDID: "did:ethr:0xYourVASPDID",
  },
  redis: {
    url: process.env.REDIS_URL!,
    cleanCacheTtlSeconds: 3600,
    flaggedCacheTtlSeconds: 300,
  },
  policy: {
    sanctionsLists: ["OFAC_SDN", "OFAC_CONS", "EU", "UN", "HMT"],
    maxRiskScore: 60,
    travelRuleThresholdUsd: 3000,
    eddJurisdictions: ["IR", "KP", "SY", "CU"],
    allowlist: ["0xKnownTreasuryA", "0xKnownTreasuryB"],
    blocklist: ["0xKnownBadActor"],
  },
  eas: {
    schemaUid: "0xFlowLinkComplianceSchemaUID",
    privateKey: process.env.EAS_PRIVATE_KEY! as `0x${string}`,
    rpcUrl: process.env.BASE_RPC_URL!,
  },
  invoicing: {
    enabled: true,
    companyName: "Acme Corp",
    companyAddress: "123 Main St, DE, USA",
    taxId: "EIN-12-3456789",
    webhookUrl: "https://erp.acme.com/webhooks/invoices",
  },
});
```

### 6.3 Environment Variables

```env
# Required
CHAINALYSIS_API_KEY=your_key_here

# Optional: Travel Rule
NOTABENE_API_KEY=your_key_here
NOTABENE_VASP_DID=did:ethr:0x...

# Optional: Caching
REDIS_URL=redis://localhost:6379

# Optional: On-chain attestation
EAS_PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org

# Optional: Invoice webhook
FLOWLINK_INVOICE_WEBHOOK=https://erp.example.com/webhooks/invoices
```

---

## 7. SDK Extension: Extending @x402/core

### 7.1 Client-Side Awareness

The FlowLink extension enriches the 402 response. x402 clients that use `@x402/fetch` or `@x402/axios` will receive this data automatically in the `extensions.flowlink` field of the `PaymentRequired` response. This enables:

- Agents to know that compliance screening is active before paying
- Client-side UX to display compliance requirements
- Agent autonomy frameworks to include compliance metadata in decision-making

No changes to `@x402/fetch` or `@x402/axios` are required -- the extensions field is already part of the standard response.

### 7.2 Custom Scheme Server Integration

For servers that use custom schemes (not just `exact`), FlowLink hooks are scheme-agnostic. They operate on `PaymentPayload` and `PaymentRequirements` which are universal across all schemes.

The only scheme-specific logic is address extraction (section 3.5), which handles EIP-3009, Permit2, and Solana. New chains require adding an extraction path -- this is the only extension point.

```typescript
// Register a custom address extractor for a new chain family
compliance.registerAddressExtractor("aptos:*", (payload) => {
  return (payload.payload as { sender: string }).sender;
});
```

---

## 8. Modified Facilitator: FlowLink as Compliance-Enriched Facilitator

For deployments that cannot modify the x402 server code (e.g., using a third-party x402 server), FlowLink can operate as a proxy facilitator.

### 8.1 Proxy Facilitator Architecture

```
Resource Server ──POST /verify──▶ FlowLink Proxy Facilitator
                                        │
                                   Compliance Check
                                        │
                                   If PASS: proxy to upstream facilitator
                                   If FAIL: return { isValid: false, invalidReason: "compliance" }
                                        │
                                 ◀──────┘

Resource Server ──POST /settle──▶ FlowLink Proxy Facilitator
                                        │
                                   Travel Rule Check (if applicable)
                                        │
                                   If PASS: proxy to upstream facilitator
                                   If FAIL: return { success: false, errorReason: "compliance" }
                                        │
                                   On success: generate ProofLink receipt
                                        │
                                 ◀──────┘
```

### 8.2 Proxy Facilitator Endpoints

```
POST /verify      → compliance check → proxy to upstream /verify
POST /settle      → travel rule check → proxy to upstream /settle → proofLink receipt
GET  /supported   → proxy to upstream /supported (pass-through)
GET  /compliance  → returns FlowLink compliance policy (new endpoint)
```

### 8.3 Deployment

```bash
# Docker
docker run -p 8402:8402 \
  -e UPSTREAM_FACILITATOR_URL=https://x402.org/facilitator \
  -e CHAINALYSIS_API_KEY=... \
  -e REDIS_URL=redis://... \
  ghcr.io/flowlink/x402-facilitator-proxy:latest
```

The server operator changes one environment variable:

```diff
- FACILITATOR_URL=https://x402.org/facilitator
+ FACILITATOR_URL=https://your-flowlink-proxy:8402
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Module | Test Focus | Tooling |
|--------|-----------|---------|
| Address extraction | All chain families (EVM EIP-3009, Permit2, Solana, Aptos) | vitest, mock payloads from x402 e2e test fixtures |
| Sanctions screening | Cache hit/miss, API failure fallback, list matching | vitest, MSW for Chainalysis API mocking |
| AML risk scoring | Score calculation, threshold evaluation | vitest |
| Travel Rule | Threshold logic, Notabene API mocking, transmission failure | vitest, MSW |
| ProofLink hashing | Deterministic hash generation, receipt structure | vitest |
| Hook integration | abort/pass decisions propagate correctly | vitest, mock x402ResourceServer |
| Config validation | Invalid configs rejected, defaults applied | vitest, zod |

### 9.2 Integration Tests (x402 testnet)

Using Base Sepolia (`eip155:84532`) and Solana Devnet:

```typescript
// Integration test: full flow with compliance
describe("FlowLink x402 compliance integration", () => {
  let server: x402ResourceServer;
  let compliance: FlowLinkCompliance;

  beforeAll(async () => {
    compliance = createFlowLinkCompliance({
      chainalysisApiKey: process.env.CHAINALYSIS_API_KEY_TESTNET!,
      policy: {
        sanctionsLists: ["OFAC_SDN"],
        maxRiskScore: 80,
        travelRuleThresholdUsd: 3000,
      },
    });

    const facilitator = new HTTPFacilitatorClient({
      url: "https://x402.org/facilitator",
    });
    server = new x402ResourceServer(facilitator);
    server.register("eip155:*", new ExactEvmScheme());
    compliance.register(server);
  });

  test("clean address passes compliance and settles", async () => {
    // Use x402 e2e test wallet (funded on Base Sepolia)
    // Make actual payment, verify settlement + proofLink receipt
  });

  test("blocklisted address is rejected before verify", async () => {
    // Add test address to blocklist
    // Verify payment is rejected with compliance_blocked reason
  });

  test("payment above Travel Rule threshold triggers Notabene", async () => {
    // Mock Notabene API
    // Verify IVMS101 transmission occurs for $3000+ payments
  });
});
```

### 9.3 Performance Tests

```typescript
describe("Performance budget", () => {
  test("compliance screening adds <100ms for cached addresses", async () => {
    // Pre-warm cache, measure screening latency
    // Assert p99 < 100ms
  });

  test("compliance screening adds <200ms for uncached addresses", async () => {
    // Cold cache, measure full Chainalysis API round-trip
    // Assert p99 < 200ms
  });

  test("full flow (compliance + settlement) adds <200ms to baseline x402", async () => {
    // Measure end-to-end with and without FlowLink
    // Assert delta p99 < 200ms
  });
});
```

### 9.4 E2E Test with x402 Test Infrastructure

The x402 repo provides a full e2e test harness at `e2e/servers/express/`. FlowLink tests should extend this pattern:

1. Start Express server with FlowLink compliance registered
2. Fund a test wallet on Base Sepolia with test USDC
3. Use `@x402/fetch` to make paid requests
4. Verify: payment succeeds, ProofLink receipt is generated, extensions contain compliance data

---

## 10. Performance Budget

### 10.1 Latency Allocation

```
                                  Without FlowLink    With FlowLink
                                  ────────────────    ─────────────
Client → Server (402 response)          ~5ms              ~5ms
Client signs payment                   ~10ms             ~10ms
Client → Server (with payment)          ~5ms              ~5ms
┌── Compliance screening               0ms            +80-150ms ◄─ NEW
│   ├── Cache lookup                                     <1ms
│   ├── Sanctions screen (×2, parallel)                  ~60ms (cached: <1ms)
│   ├── AML risk score                                   ~30ms (cached: <1ms)
│   └── Jurisdiction check                               <1ms
Server → Facilitator /verify           ~50ms             ~50ms
Facilitator verifies                   ~20ms             ~20ms
Server runs handler                   ~varies           ~varies
┌── Travel Rule check                   0ms            +0-150ms ◄─ NEW (only if >$3K)
Server → Facilitator /settle           ~50ms             ~50ms
On-chain settlement                  100-400ms         100-400ms
┌── ProofLink receipt (async)           0ms              +0ms ◄─ non-blocking
Server → Client (200 response)          ~5ms              ~5ms
                                  ────────────────    ─────────────
Total (happy path, cached)            ~250-550ms       ~260-560ms (+10ms)
Total (happy path, uncached)          ~250-550ms       ~400-700ms (+150ms)
Total (Travel Rule triggered)         ~250-550ms       ~550-850ms (+300ms)
```

### 10.2 Caching Strategy

| Data | Cache Key | TTL | Eviction |
|------|-----------|-----|----------|
| Clean sanctions screen | `sanctions:{address}:{list}` | 1 hour | LRU |
| Flagged sanctions screen | `sanctions:{address}:{list}` | 5 minutes | LRU |
| AML risk score | `aml:{address}:{network}` | 15 minutes | LRU |
| USD price conversion | `price:{asset}:{network}` | 60 seconds | TTL |

After the first request from any wallet, subsequent requests hit cache and add <1ms.

### 10.3 Optimization Levers

1. **Parallel screening**: sender + receiver screened concurrently (already in design)
2. **Allowlist short-circuit**: known treasury addresses skip all checks (0ms)
3. **Cache warming**: pre-screen frequent addresses in background
4. **Async receipt generation**: ProofLink, EAS attestation, and invoice generation are all non-blocking

---

## 11. npm Package Design

### 11.1 Package: `@flowlink/x402-compliance`

```
@flowlink/x402-compliance/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── src/
│   ├── index.ts                    # Public API: createFlowLinkCompliance()
│   ├── config.ts                   # FlowLinkConfig type + zod validation
│   ├── compliance.ts               # FlowLinkCompliance class
│   ├── address.ts                  # Multi-chain sender address extraction
│   ├── metrics.ts                  # Prometheus metrics
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── complianceScreening.ts  # onBeforeVerify hook
│   │   ├── travelRule.ts           # onBeforeSettle hook
│   │   └── proofLinkReceipt.ts     # onAfterSettle hook
│   ├── extension/
│   │   ├── index.ts
│   │   └── flowlinkExtension.ts    # ResourceServerExtension implementation
│   ├── screening/
│   │   ├── index.ts
│   │   ├── chainalysis.ts          # Chainalysis KYT v3 client
│   │   ├── ofacSdnFallback.ts      # Offline OFAC SDN list fallback
│   │   └── types.ts
│   ├── aml/
│   │   ├── index.ts
│   │   ├── riskScorer.ts           # AML risk scoring engine
│   │   └── types.ts
│   ├── travel-rule/
│   │   ├── index.ts
│   │   ├── notabene.ts             # Notabene IVMS101 client
│   │   └── types.ts
│   ├── prooflink/
│   │   ├── index.ts
│   │   ├── hash.ts                 # Deterministic receipt hashing
│   │   ├── eas.ts                  # EAS on-chain attestation
│   │   ├── storage.ts              # Audit log persistence
│   │   └── types.ts
│   ├── invoice/
│   │   ├── index.ts
│   │   ├── generator.ts            # Structured invoice from receipt
│   │   └── types.ts
│   └── cache/
│       ├── index.ts
│       ├── redis.ts                # Redis cache adapter
│       └── memory.ts               # In-memory LRU fallback
└── test/
    ├── unit/
    │   ├── address.test.ts
    │   ├── hooks/
    │   │   ├── complianceScreening.test.ts
    │   │   ├── travelRule.test.ts
    │   │   └── proofLinkReceipt.test.ts
    │   ├── screening/
    │   │   └── chainalysis.test.ts
    │   ├── aml/
    │   │   └── riskScorer.test.ts
    │   └── cache/
    │       ├── redis.test.ts
    │       └── memory.test.ts
    └── integration/
        ├── x402Flow.test.ts         # Full x402 + compliance e2e
        └── fixtures/
            └── payloads/            # Real x402 PaymentPayload samples
```

### 11.2 package.json

```json
{
  "name": "@flowlink/x402-compliance",
  "version": "0.1.0",
  "description": "Compliance middleware for x402 payment protocol — sanctions screening, AML, Travel Rule, ProofLink receipts",
  "license": "Apache-2.0",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "engines": { "node": ">=20" },
  "peerDependencies": {
    "@x402/core": "^2.0.0"
  },
  "dependencies": {
    "ioredis": "^5.4.0",
    "zod": "^3.23.0",
    "prom-client": "^15.0.0"
  },
  "devDependencies": {
    "@x402/core": "^2.0.0",
    "@x402/evm": "^2.0.0",
    "vitest": "^2.0.0",
    "tsup": "^8.0.0",
    "msw": "^2.0.0",
    "typescript": "^5.5.0"
  }
}
```

### 11.3 Public API Surface

```typescript
// @flowlink/x402-compliance

export { createFlowLinkCompliance } from "./compliance";
export type { FlowLinkCompliance } from "./compliance";
export type { FlowLinkConfig, CompliancePolicy } from "./config";
export type {
  ComplianceDecision,
  ComplianceCheck,
  ProofLinkReceipt,
} from "./prooflink/types";

// For advanced users: individual services
export { SanctionsScreeningService } from "./screening";
export { AmlRiskService } from "./aml";
export { TravelRuleService } from "./travel-rule";
export { ProofLinkService } from "./prooflink";

// For custom address extractors
export { registerAddressExtractor, extractSenderAddress } from "./address";
```

---

## 12. Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **x402 hook API changes** in a minor version | Medium | Pin `@x402/core` to exact version. Adapter pattern wraps hook registration so internal changes are isolated. CI runs against `latest` to detect breakage early. |
| 2 | **Chainalysis API downtime** blocks all payments | High | Offline OFAC SDN list fallback (`ofacSdnFallback.ts`). Policy config option: `failOpen: boolean` to allow payments when screening API is unreachable (default: false). Circuit breaker pattern on Chainalysis client. |
| 3 | **Latency exceeds 200ms budget** for uncached checks | Medium | Parallel execution of all screening calls. Redis caching with aggressive TTLs. Allowlist for known addresses. Pre-warming cache for high-volume senders. |
| 4 | **Memory leak from pending decisions map** if settlement hooks never fire | Medium | TTL-based eviction on `pendingDecisions` map (5 minute max lifetime). Periodic cleanup sweep. Map size monitoring via metrics. |
| 5 | **ProofLink on-chain attestation fails** (EAS) | Low | Attestation is async and non-blocking. Failure is logged, not propagated. ProofLink hash is still generated locally. Retry queue for failed attestations. |
| 6 | **Protocol-lock to x402** if ACP/AP2 wins | High | Architecture is modular: screening, AML, Travel Rule services are protocol-agnostic. Only hooks and address extraction are x402-specific. Compliance services can be reused for any protocol. |
| 7 | **False positives from sanctions screening** block legitimate payments | Medium | Configurable `maxRiskScore` threshold. Allowlist for known-clean addresses. Dashboard for ops team to review blocked payments and add to allowlist. |
| 8 | **Solana address extraction differs from EVM** | Low | Chain-family-specific extractors with fallback chain. Covered by unit tests per chain family. `registerAddressExtractor()` for extensibility. |

### Fallback / Graceful Degradation

```
Chainalysis API down     → Offline OFAC SDN list check (degraded but functional)
Redis down               → In-memory LRU cache (degraded but functional)
Notabene API down        → Travel Rule check skipped with WARNING log (configurable: fail-open or fail-closed)
EAS attestation fails    → ProofLink hash still generated locally, retry queue
Invoice webhook fails    → Invoice stored locally, retry queue
```

---

## 13. Implementation Phases

### Phase 1: Core Compliance Hook (Weeks 1-2)

**Goal:** Sanctions screening integrated into x402 payment flow via `onBeforeVerify`.

**Deliverables:**
- `@flowlink/x402-compliance` package scaffold (tsup, vitest, CI)
- `FlowLinkConfig` + zod validation
- `SanctionsScreeningService` (Chainalysis KYT v3 client + OFAC SDN fallback)
- `complianceScreeningHook` (onBeforeVerify)
- Multi-chain address extraction (EVM EIP-3009, Permit2, Solana)
- Redis cache layer + in-memory fallback
- Allowlist/blocklist short-circuit
- Unit tests: screening, address extraction, hook abort/pass logic
- Integration test: Express + x402 + FlowLink on Base Sepolia

**Acceptance criteria:**
- Payment from clean address succeeds (settlement + ProofLink hash in response)
- Payment from blocklisted address is rejected before facilitator /verify
- Cached screening adds <5ms
- Uncached screening adds <150ms (p99)

**Parallelizable:** Package scaffold + Chainalysis client can be built simultaneously.

### Phase 2: AML + Travel Rule + ProofLink (Weeks 3-4)

**Goal:** Full compliance pipeline with AML scoring, Travel Rule, and auditable receipts.

**Deliverables:**
- `AmlRiskService` (risk scoring engine)
- `TravelRuleService` (Notabene IVMS101 client)
- `travelRuleHook` (onBeforeSettle)
- `ProofLinkService` (deterministic hashing, audit log storage)
- `proofLinkReceiptHook` (onAfterSettle)
- FlowLink extension (enrichPaymentRequired, enrichSettlementResponse)
- Prometheus metrics for all compliance operations
- Unit tests: AML, Travel Rule, ProofLink hashing
- Integration test: Travel Rule triggers for >$3K payment

**Acceptance criteria:**
- AML risk score above threshold rejects payment
- Payment >$3K triggers Notabene Travel Rule transmission
- Settlement response includes proofLinkHash in extensions
- 402 response includes compliance policy in extensions
- All operations have Prometheus metrics

**Parallelizable:** AML service + Travel Rule service + ProofLink service are independent.

### Phase 3: On-Chain Attestation + Invoice + Proxy Facilitator (Weeks 5-6)

**Goal:** Enterprise features: EAS attestation, structured invoicing, standalone proxy facilitator.

**Deliverables:**
- EAS on-chain attestation (async, non-blocking)
- `InvoiceService` (structured invoice generation, webhook delivery)
- `@flowlink/x402-facilitator-proxy` (standalone HTTP proxy facilitator)
- Docker image for proxy facilitator
- Documentation: README, API reference, deployment guide
- Performance benchmark suite
- E2E test: full flow with attestation + invoice

**Acceptance criteria:**
- EAS attestation created for each settled payment (async)
- Invoice webhook fires on settlement with structured JSON
- Proxy facilitator passes all x402 e2e tests (Base Sepolia)
- Proxy facilitator adds <200ms to baseline facilitator latency
- Documentation covers minimal and enterprise setup

**Parallelizable:** EAS attestation + Invoice service + Proxy facilitator are independent.

---

## 14. Open Questions

1. **Chainalysis API tier.** FlowLink needs Chainalysis KYT v3 API access. What tier? Real-time screening at x402 transaction volumes (potentially millions/month) requires enterprise pricing. Alternative: Elliptic, TRM Labs, or a lighter-weight API for MVP?

2. **Fail-open vs fail-closed default.** When the screening API is unreachable, should payments be allowed (fail-open, logged for later review) or blocked (fail-closed, zero risk tolerance)? Recommendation: fail-closed by default, configurable per policy.

3. **ProofLink hash algorithm.** Use `keccak256` (EVM-native, compatible with on-chain verification) or `SHA-256` (standard, wider tooling)? Recommendation: `keccak256` since ProofLink receipts may be verified on-chain via EAS.

4. **Invoice format.** XML (UBL/Peppol, European standard), JSON (simpler, agent-friendly), or both? Recommendation: JSON as primary, with optional UBL export for EU compliance.

5. **Multi-tenant support.** Should a single FlowLink instance support multiple server operators with different compliance policies? This is relevant for the proxy facilitator. Recommendation: defer to Phase 4; single-tenant for now.

6. **ERC-8004 agent identity integration.** The technical design mentions KYA (Know Your Agent) via ERC-8004. Should the `onBeforeVerify` hook also validate agent identity if an ERC-8004 AgentID is present? Recommendation: yes, but as a separate optional hook, not in the core compliance hook. Target Phase 4.

7. **x402 V2 extension key registration.** The `flowlink` extension key is not registered with the x402 Foundation. Should we propose formal registration? Recommendation: yes, file an issue on coinbase/x402 requesting extension key reservation.

---

*This document is implementation-ready. An engineer familiar with the x402 TypeScript SDK can begin Phase 1 immediately using the interfaces, hook implementations, and test strategy defined above.*
