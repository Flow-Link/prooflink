# FlowLink Integration Completeness Review

**Reviewed by:** Research Agent
**Date:** 2026-03-21
**Scope:** `packages/integrations/`, `packages/x402-compliance/`, `packages/mcp-server/`

---

## 1. EAS Integration (`integrations/src/eas/`)

### Finding: Functionally Complete, But ABI Encoding Delegated to Consumer

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/eas/client.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/eas/schema.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/eas/types.ts`

**What Works:**
- `EASClient` implements the full lifecycle: `attest()`, `verify()`, `revoke()`, `getAttestationsByRecipient()`
- Schema definition (`PROOFLINK_SCHEMA`) is complete with all 13 Solidity-typed fields matching the architecture spec
- Revocability flag is set correctly (`PROOFLINK_SCHEMA_REVOCABLE = true`)
- `buildSanctionsFlags()` correctly maps sanctions check results to a 16-bit bitmask (screened bits 0-3, matched bits 8-11)
- Interfaces (`EASSigner`, `EASReader`) are properly abstracted to avoid hard dependencies on ethers or viem

**Critical Issue — ABI Encoding Bypass:**
The `attest()` method passes `JSON.stringify(attestationData)` as the `data` field to the signer (client.ts:55). EAS expects ABI-encoded bytes per the schema definition, not JSON strings. This means the current implementation stores human-readable JSON in the attestation data field instead of ABI-encoded binary. The schema registered on-chain will not decode correctly with standard EAS tooling (e.g., EASScan) unless the consumer's `EASSigner` re-encodes it. The comment "actual ABI encoding into bytes should be done by the consumer" (schema.ts:113) acknowledges this but leaves a critical integration gap undocumented.

**Hardcoded Placeholder Fields:**
`encodeReceiptForAttestation()` returns zero-value placeholders for `chainId`, `payer`, `payee`, `amount`, `token`, `flowType`, and `agentIdHash` (schema.ts:124-134) with comments saying "caller should override." There is no enforcement mechanism — callers receive a struct with these zeroed out and may not notice.

**Missing:**
- No retry logic for transient RPC failures
- `getAttestationsByRecipient()` returns `txHash: ""` (client.ts:123) — callers wanting the tx hash need a separate lookup with no helper provided
- No batch attestation support (EAS supports multicall)

---

## 2. IPFS Integration (`integrations/src/ipfs/`)

### Finding: Complete for All Three Providers; web3.storage Stale API

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/ipfs/client.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/ipfs/types.ts`

**What Works:**
- All three providers implemented: Pinata (JWT auth via `pinJSONToIPFS`), web3.storage (Bearer upload), Infura (Basic auth multipart)
- Consistent timeout-via-`AbortController` on every HTTP call
- `pin()`, `get()`, `unpin()`, `list()` all implemented for every provider
- Injectable `IPFSHttpClient` interface enables deterministic unit testing without mocking globals
- `PinStatus` type is defined but not returned by `list()` — there is no `getStatus(cid)` method

**Stale API Issue — web3.storage:**
The `pinToWeb3Storage()` method uses `POST /upload` (client.ts:219) and `listW3S()` uses `GET /user/uploads` (client.ts:255). web3.storage deprecated its original HTTP API in favor of the w3up protocol (Storacha). The `W3S_BASE_URL = "https://api.web3.storage"` endpoint was shut down in late 2024. Any consumer using `pinningService: "web3storage"` against the default base URL will receive connection errors. The `baseUrl` override in config can work around this if pointed at a w3up-compatible endpoint, but this is not documented.

**Missing:**
- No CID version normalization (CIDv0 vs CIDv1) — callers must handle this
- No redundant pinning (pin to multiple services simultaneously)
- `listPinata()` hardcodes `pageLimit=1000` (client.ts:197) with no pagination cursor support
- `size` is returned as `0` for web3.storage list results (client.ts:259) — documented but lossy

---

## 3. Notabene Integration (`integrations/src/notabene/`)

### Finding: Core API Complete; Missing VASP Discovery and Status Polling

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/notabene/client.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/notabene/provider.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/notabene/types.ts`

**What Works:**
- `submitTransfer()` correctly maps `TravelRuleData` to the Notabene IVMS101 transfer payload with proper nested structure
- `getTransfer()` and `listTransfers()` are implemented with pagination and filtering support
- Testnet/mainnet URL switching via `config.testnet` boolean
- `NotabeneTravelRuleProvider` correctly implements `TravelRuleProvider` from `@flowlink/core`
- Error handling via Error constructor with HTTP status in message

**Missing Critical VASP Operations:**
- No VASP directory lookup (`GET /vaspservice/query` for finding counterparty VASPs by wallet address or DID)
- No beneficiary VASP matching — `submitTransfer()` sends without `beneficiaryVASPdid` unless the caller sets it manually on the body (not exposed in `TravelRuleData`)
- No webhook registration for receiving incoming Travel Rule requests from other VASPs
- No status polling loop or callback handler for `ACK` / `REJECTED` responses
- No pre-transaction validation API call (Notabene supports this pre-blockchain)

**IVMS101 Completeness Gap:**
The `naturalPerson` mapping in `submitTransfer()` only maps `primaryIdentifier` (last name equivalent) but omits `secondaryIdentifier` (first name) per IVMS101 spec. This will cause compliance rejections from strict VASP counterparties.

**API Version:**
Uses `DEFAULT_BASE_URL = "https://api.notabene.id/v1"` — this is the correct current production endpoint.

---

## 4. TRM Labs Integration (`integrations/src/trm/`)

### Finding: v2 Screening API Used; Account Endpoint Uses Legacy v1

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/trm/client.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/trm/provider.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/trm/types.ts`

**What Works:**
- `screenAddress()` correctly uses `/public/v2/screening/addresses` (client.ts:85) — the current TRM v2 batch screening endpoint
- Risk score normalization is reasonable: `maxLevel * 10` maps 0-10 TRM levels to 0-100
- `categorizeRisk()` produces correct `TRMRiskCategory` mapping
- `TRMSanctionsProvider` implements the `SanctionsProvider` interface cleanly
- Injectable `TRMHttpClient` for testing

**API Version Mismatch:**
`getAddressReport()` fetches counterparty exposure from `/public/v1/accounts/{address}` (client.ts:149) — this is the v1 endpoint and returns a different schema than v2. TRM's v1 account endpoint may return `counterpartyVolume`, `totalReceivedUsd` etc., but this is not guaranteed for all account types and TRM may deprecate v1. The correct v2 approach would use `/public/v2/blockchain-entities`.

**Sanctions Provider Fabrication:**
`TRMSanctionsProvider.screenAddress()` fabricates a single match detail with `entryId: trm-${address.slice(0, 10)}` (provider.ts:69) regardless of which actual sanctions list was matched. This loses match granularity — TRM returns per-indicator data that is discarded at the provider boundary.

**Missing:**
- No transaction-level screening (TRM supports `POST /v2/screening/transactions`)
- No entity screening (off-chain name/entity matching)
- No cluster analysis (follow-the-entity across wallets)
- `terrorism_financing` is defined in `TRMRiskCategory` type (types.ts:21) but `categorizeRisk()` never returns it

---

## 5. Slack Integration (`integrations/src/slack/`)

### Finding: Three Core Notification Types Present; Missing Operational Alerts

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/slack/webhook.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/src/slack/types.ts`

**What Works:**
- `sendComplianceAlert()`, `sendSanctionsAlert()`, `sendEscalation()` all implemented with Block Kit formatting
- Color-coded by outcome: green (approved), red (blocked/sanctions), yellow (escalated)
- `sendEscalation()` separates failed vs. skipped checks for reviewer context
- Injectable `SlackHttpClient` for testing
- `SlackWebhook = SlackNotifier` deprecated alias maintained

**Missing Notification Types:**
- No `sendSystemAlert()` for infrastructure/service failures (rate limit hit, TRM/Notabene unreachable)
- No `sendTravelRuleAlert()` for VASP counterparty responses (ACK received, REJECTED)
- No `sendAgentActivity()` for high-value agent payment events
- No `sendAuditSummary()` for daily/weekly compliance digest
- No retry on Slack webhook failure (5xx from Slack)

**Template Issues:**
- `sendComplianceAlert()` shows receipt hash truncated to 16 chars (webhook.ts:143) — not enough to be useful for lookup. Should be full hash or a deep link to the compliance dashboard
- No `@mention` support for escalations — reviewers won't be pinged
- Channel override is passed to payload (webhook.ts:155) but Slack ignores `channel` on incoming webhook URLs (channel is fixed at webhook creation time)

---

## 6. x402 Compliance (`x402-compliance/src/`)

### Finding: Spec-Compliant and Well-Architected; Two Production Gaps

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/middleware.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-verify.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-settle.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/after-settle.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/adapters/express.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/adapters/hono.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/extension.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/receipt.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/rate-limiter.ts`

**HTTP 402 Spec Compliance:**
The middleware returns `403` on compliance blocks (express.ts:100, hono.ts:113), not `402`. The x402 protocol uses 402 for payment required and separate error channels for compliance rejection. Whether returning 403 vs. a custom 402 with compliance error extension is correct depends on the x402 spec version targeted — if the facilitator handles 402 and compliance is a pre-step, 403 is appropriate. This is borderline acceptable but worth confirming against the x402 spec.

**Hook Lifecycle — Complete:**
- `onBeforeVerify`: sanctions screening (both sender+receiver in parallel), AML scoring, KYA lookup, allowlist/blocklist short-circuit — all present and correctly ordered
- `onBeforeSettle`: receiver sanctions re-check (correctly handles dynamic payTo in x402 v2), travel rule threshold check — complete
- `onAfterSettle`: ProofLink receipt generation, hash computation, async EAS attestation, async invoice generation, extension enrichment — complete and correctly non-blocking for async operations

**Extension System — Correct:**
`createFlowLinkExtension()` enriches the 402 payment-required response with compliance policy info and the settlement response with the `proofLinkHash`. The one-time-read pattern (delete after consumption at extension.ts:52) correctly prevents stale hashes being returned for subsequent payments.

**Critical Gap — Default Stubs Allow All Payments:**
`DefaultSanctionsScreener` always returns `{ clean: true }` and `DefaultAmlScorer` always returns `{ score: 0 }` (middleware.ts:76-85). A warning is emitted once but only if a logger is provided. A production deployment that omits `services.screener` and `services.amlScorer` will silently bypass all compliance screening. This should fail-closed (throw) rather than fail-open.

**Rate Limiter — Correct but In-Memory Only:**
`RateLimiter` implements sliding window correctly with cleanup timers and `unref()`. But it is in-memory per-process — horizontal scaling will result in each pod maintaining separate rate limit state. No Redis-backed implementation exists despite `RedisConfig` being defined in `types.ts` (types.ts:178).

**Receipt Builder — Well Implemented:**
`ProofLinkReceiptBuilder` uses HMAC-SHA256 with constant-time comparison (receipt.ts:196-200). Canonical serialization excludes `signature` and `proofLinkHash` to avoid circular dependency — correct. `InMemoryReceiptStore` is appropriate for development but production needs a persistent implementation (no PostgreSQL/Redis store provided).

**Express Adapter Gap:**
`createExpressComplianceMiddleware()` only runs `onBeforeVerify` (express.ts:93). The `onBeforeSettle` and `onAfterSettle` hooks are not wired up. This means the Express adapter only provides the verify-phase check — no travel rule at settlement, no receipt generation. The Hono adapter has the same gap (hono.ts:102). Both adapters need a complete integration pattern with the x402 facilitator client.

**Hono Adapter Issue:**
The default `extractPayload` and `extractRequirements` both parse the request body via `ctx.req.json()` independently (hono.ts:73-89). In Hono, calling `req.json()` twice will fail because the body stream is consumed on first read. This is a functional bug — the second `json()` call will throw or return empty.

---

## 7. MCP Server (`mcp-server/src/`)

### Finding: 11 Tools, 3 Resources Registered; Several Are Partially Stubbed

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/mcp-server/src/server.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/mcp-server/src/context.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/mcp-server/src/transports/sse.ts`
- All tool and resource files

### Tool Completeness Matrix

| Tool | Schema | Real Logic | Status |
|---|---|---|---|
| `check_sanctions` | Complete | Real `SanctionsScreener` | Production-ready |
| `verify_kya` | Complete | Real `KYAVerifier` | Partial — trust score hardcoded (87/15) |
| `create_compliant_invoice` | Complete | Simulated sanctions | Stub — comment says "In production" |
| `submit_travel_rule` | Complete | Simulated submission | Stub — IVMS101 not called |
| `get_compliance_receipt` | Complete | Hardcoded mock receipt | Stub — no receipt store lookup |
| `pay_with_compliance` | Complete | Real sanctions+KYA, simulated tx | Mixed |
| `batch_compliance_check` | Complete | Real `SanctionsScreener` | Production-ready |
| `get_risk_report` | Complete | Real screening+AML scoring | Partial — tx patterns stubbed |
| `list_invoices` | Complete | Hardcoded sample data | Stub — no invoice store |
| `get_compliance_metrics` | Complete | Hardcoded sample metrics | Stub — no metrics store |
| `register_agent` | Complete | Simulated, no on-chain write | Stub — ERC-8004 not called |

### Resources

| Resource | URI | Status |
|---|---|---|
| `compliance-policy` | `flowlink://compliance/policy` | Hardcoded policy values, not read from config |
| `compliance-stats` | `flowlink://compliance/stats` | Hardcoded sample numbers |
| `registered-agents` | `flowlink://agents/registered` | Two hardcoded sample agents |

**Compliance-policy resource does not reflect the live `FlowLinkConfig`** — it returns static values regardless of how the server is configured (compliance-policy.ts:22-35). If `maxRiskScore` is set to 50 in config, the resource still reports the hardcoded thresholds from `@flowlink/shared` constants.

### SSE Transport

The SSE transport is functional for single-client scenarios. A critical bug exists at sse.ts:104: when routing POST `/message` requests, the implementation routes to `connections.values().next().value` — the first active connection. With multiple concurrent clients, messages from any client will be routed to whichever connection happens to be first in the Map. The MCP spec's SSE transport expects session-based routing via a `sessionId` query parameter. The SDK's `SSEServerTransport` supports this but the implementation ignores it.

**CORS:**
CORS `Access-Control-Allow-Origin` defaults to `"*"` in non-production environments (sse.ts:58). In production it reads from `CORS_ORIGIN` env var — but if that var is empty string, the header will be an empty string (which browsers treat as blocking). Should default to `null` (omit header) rather than empty string when no origin is configured.

### Context and Singleton Services

`context.ts` correctly initializes `SanctionsScreener`, `AMLScorer`, and `KYAVerifier` as singletons from `@flowlink/core`. The `failOpen` default (`true` unless `FLOWLINK_FAIL_OPEN=false`) means the MCP server will pass all screenings if the Chainalysis API is unreachable. This is documented but is the opposite of the fail-closed behavior appropriate for a production compliance system.

---

## 8. Request Network Integration (`integrations/request-finance/`)

### Finding: Complete and Well-Designed; Compliance Bridge Has Missing Link

**Files:**
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/request-finance/src/client.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/request-finance/src/adapter.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/request-finance/src/compliance-bridge.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/integrations/request-finance/src/types.ts`

**What Works:**
- `RequestNetworkClient` covers create, get, payment detection, and IPFS content fetch
- `RequestFinanceAdapter` correctly handles bidirectional conversion (FlowLink `AgentInvoice` ↔ Request Network invoice)
- State mapping is complete; `DISPUTED` correctly degrades to `created` (no RN equivalent)
- Stablecoin address registry covers mainnet, base, polygon, arbitrum
- `ComplianceBridge.checkBeforePayment()` correctly wraps the ProofLink API call and enriches the RN invoice with compliance metadata
- `failOpen` behavior is explicit and configurable

**Missing Link in `ComplianceBridge`:**
`callProofLink()` calls `this.postToProofLink("/compliance/check", params)` (compliance-bridge.ts:255) which is the FlowLink compliance REST API. This API is not implemented anywhere in the codebase — there is no HTTP server in `@flowlink/core` or `@flowlink/api` exposing a `/compliance/check` endpoint. The bridge assumes a deployed ProofLink API service exists but no such service is built. This is a hard dependency gap.

**Infra:**
`RequestNetworkClient` correctly uses `AbortSignal.timeout()` (client.ts:154) rather than manual `AbortController` — appropriate for Node.js 18+. Uses `@requestnetwork/request-client.js` is intentionally not imported (as noted in comments) — the implementation wraps their HTTP node API instead, which is the correct decoupling approach.

---

## 9. Missing Integrations

### Chainalysis KYT/Reactor
`FlowLinkConfigSchema` requires `chainalysisApiKey` (types.ts:303) and `context.ts` instantiates `SanctionsScreener` using it. But there is no `integrations/src/chainalysis/` package. Chainalysis integration is entirely within `@flowlink/core` (which is not in scope here). The integrations package does not expose a standalone Chainalysis client, meaning consumers cannot use it without the full core package.

### Circle/USDC Native Integration
No integration exists. `STABLECOIN_ADDRESSES` in the Request Network adapter has hardcoded USDC contract addresses, which is a reasonable substitute, but there is no Circle CCTP bridging support, Circle Accounts API integration, or programmable wallets capability.

### Uniswap / DEX Price Feeds
`DefaultPriceConverter` in the middleware assumes 6-decimal stablecoins and returns `amount / 1_000_000` as USD (middleware.ts:99). No real price oracle or DEX price feed is integrated. ETH, WBTC, or any non-stablecoin payments will be priced incorrectly for Travel Rule threshold calculations.

### Block Explorer APIs (Etherscan, Basescan)
No integration. The `getAttestationsByRecipient()` gap (missing txHash in returned results) cannot be filled without a block explorer API to look up transactions by topic.

### Email Notification Service
No integration. Slack is the only notification channel. No SendGrid, AWS SES, or Resend integration exists.

### PagerDuty / OpsGenie
No integration. High-severity compliance events (sanctions match, system failure) have no paging mechanism.

### Sygna Bridge
Referenced in compliance-policy resource (`vasp_messaging_providers: ["notabene", "sygna_bridge"]`, compliance-policy.ts:32) but not implemented.

---

## Summary Table

| Component | Completeness | Critical Issues |
|---|---|---|
| EAS Client | 85% | ABI encoding delegated; placeholder fields not enforced |
| IPFS Client | 80% | web3.storage API is defunct; no pagination on list |
| Notabene | 70% | Missing VASP discovery; IVMS101 name field incomplete |
| TRM Labs | 75% | v1/v2 API mix; match detail fabrication in provider |
| Slack | 65% | Missing operational alert types; channel override non-functional |
| x402 Compliance | 80% | Default stubs fail-open silently; Hono body double-read bug; adapters missing settle/after-settle |
| MCP Server | 60% | 7 of 11 tools are stubs; SSE multi-client routing broken; resources return hardcoded data |
| Request Network | 75% | ProofLink REST API dependency not implemented |
| Chainalysis | N/A | No standalone package; only in @flowlink/core |
| Circle/USDC | 0% | Not implemented |
| DEX Price Feeds | 0% | Not implemented; default converter silently wrong for non-stablecoins |
| Block Explorers | 0% | Not implemented |
| Email/PagerDuty | 0% | Not implemented |

---

## Prioritized Risk Items

1. **Hono adapter double-read body bug** (x402-compliance/src/adapters/hono.ts:73-89) — functional failure in production with Hono framework
2. **Default stubs silently bypass all compliance** (x402-compliance/src/middleware.ts:76-85) — should throw in production mode without real services injected
3. **SSE multi-client routing** (mcp-server/src/transports/sse.ts:104) — messages misrouted in multi-client deployments
4. **EAS ABI encoding** (integrations/src/eas/client.ts:55) — attestations not decodable by standard EAS tooling
5. **Notabene IVMS101 name mapping** (integrations/src/notabene/client.ts:78) — only `primaryIdentifier` mapped; counterparty VASPs may reject
6. **Travel Rule transmission in MCP and adapters is simulated** — the `submit_travel_rule` tool and `pay_with_compliance` tool both explicitly note they do not call Notabene; an operator reading the tool description may not realize no actual IVMS101 message is sent
7. **ProofLink REST API not implemented** — `ComplianceBridge` in Request Network integration has a hard dependency on a non-existent HTTP endpoint
8. **Price converter incorrect for non-stablecoins** — Travel Rule threshold check will be wrong for ETH or WBTC payments
