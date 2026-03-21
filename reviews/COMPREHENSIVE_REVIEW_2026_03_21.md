# FlowLink Comprehensive Review — 2026-03-21

## Executive Summary

**30+ parallel review agents** audited every dimension of the FlowLink codebase. The project has a strong foundation — build passes, typecheck is clean, all 22 test suites pass (all tests green), and the architecture is well-structured. However, **47 critical issues** and **60+ warnings** were identified across security, compliance accuracy, concurrency, API design, type safety, smart contracts, and documentation.

**Build Status:** ✅ All pass (build, typecheck, tests)
**Lint Status:** ⚠️ Dashboard lint broken (Next.js deprecation)

---

## CRITICAL Issues by Category

### 🔴 SECURITY (12 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| S1 | **WebSocket auth accepts ANY string as valid API key** — no DB validation | `apps/api/src/routes/ws.ts:128-133` | Unauthenticated access to all compliance events |
| S2 | **CORS wildcard subdomain bypass** — `origin.endsWith(domain)` matches `evil-flowlink.io` | `apps/api/src/app.ts:71-76` | Cross-origin credential theft |
| S3 | **CORS fallback returns first allowed origin for rejected origins** instead of null | `apps/api/src/app.ts:65,78` | Complete CORS policy negation |
| S4 | **Request signature excludes body** — MITM can replace request body after signing | `apps/api/src/middleware/auth.ts:176-178` | Request tampering |
| S5 | **Receipts/invoices have no tenant scoping** — any API key reads any tenant's data | `apps/api/src/routes/receipts.ts:31-49`, `invoices.ts:136-155` | Data breach across tenants |
| S6 | **API key in WebSocket URL query param** — logged in access logs | `apps/api/src/routes/ws.ts:155` | Credential exposure in logs |
| S7 | **Allowlist bypasses ALL compliance checks including sanctions** | `packages/core/src/engine/prooflink.ts:254-258` | Sanctioned addresses auto-approved |
| S8 | **Webhook secret exposed in plaintext** in list() and register() responses | `packages/core/src/webhooks/manager.ts:58-69` | HMAC secret leakage |
| S9 | **Timing-safe comparison partially broken** — length check leaks timing info | `packages/core/src/webhooks/manager.ts:96-108`, `x402-compliance/src/receipt.ts:196-202` | Timing side-channel |
| S10 | **KYA credential proof never cryptographically verified** | `packages/core/src/identity/kya-verifier.ts:157-335` | Forged agent credentials accepted |
| S11 | **HMAC-SHA256 used for receipt signing** — symmetric, no non-repudiation | `packages/x402-compliance/src/receipt.ts:83-85` | Forgeable compliance receipts |
| S12 | **Private key schema accepts any string** — no format validation | `packages/core/src/config.ts:76` | Runtime crash on invalid key |

### 🔴 COMPLIANCE ACCURACY (8 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| C1 | **EU Travel Rule threshold wrong** — should be €0 for CASP-to-CASP (MiCA/TFR) | `packages/shared/src/constants.ts:126-127` | Missing mandatory reporting |
| C2 | **Singapore threshold wrong** — SGD 1,500 ≠ USD 1,500 | `packages/shared/src/constants.ts:128-129` | Under-reporting |
| C3 | **No name-based sanctions screening** — OFAC requires entity name screening | `packages/core/src/sanctions/screener.ts` (entire) | OFAC non-compliance |
| C4 | **Failed Travel Rule transmission doesn't block transaction** | `packages/core/src/travel-rule/checker.ts` | Regulatory violation |
| C5 | **Jurisdiction defaults to "US"** when DID parsing fails | `packages/core/src/travel-rule/checker.ts:298-333` | Wrong threshold applied |
| C6 | **Chainalysis provider hardcodes "OFAC_SDN"** regardless of actual matching list | `packages/core/src/sanctions/screener.ts:125-126` | False audit records |
| C7 | **IVMS101 message sends "Unknown" for missing originator name** — should block | `packages/core/src/travel-rule/checker.ts:338-371` | Non-compliant transmission |
| C8 | **VelocityRule records blocked transactions** into the ledger | `packages/core/src/policy/rules.ts:326` | Permanent sender rate-limit DoS |

### 🔴 CORRECTNESS (10 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| X1 | **hashJsonDeterministic strips nested fields** — `JSON.stringify` allowlist issue | `packages/shared/src/utils/crypto.ts:101-105` | Receipt/invoice hashes are wrong |
| X2 | **SSE transport routes ALL messages to first client** | `packages/mcp-server/src/transports/sse.ts:104` | Multi-client MCP broken |
| X3 | **MCP `create_invoice` hardcodes compliance as passed** — never runs screening | `packages/mcp-server/src/tools/create-invoice.ts:129-137` | False compliance stamps |
| X4 | **MCP `register_agent` hardcodes sanctions_cleared=true** | `packages/mcp-server/src/tools/register-agent.ts:102-105` | Unscreened agent registration |
| X5 | **MCP `verify_kya` returns hardcoded trust score** (87 or 15) | `packages/mcp-server/src/tools/verify-kya.ts:94` | Meaningless trust scores |
| X6 | **SDK `registerAgent` and `issueKYA` hit same endpoint** | `packages/sdk/src/client.ts:258,295` | One method is dead code |
| X7 | **SDK Retry-After + backoff double-sleep** | `packages/sdk/src/http.ts:180-191` | Excessive retry delays |
| X8 | **Route ordering bug: GET /identity/agents shadowed by /:agentId** | `apps/api/src/routes/identity.ts:152,388` | Agent list endpoint unreachable |
| X9 | **receiptHash is hex-encoded ID, not a real hash** | `packages/core/src/engine/prooflink.ts:818` | No content integrity |
| X10 | **EAS attestation data is JSON, not ABI-encoded** — unreadable on-chain | `packages/integrations/src/eas/client.ts:55` | Attestations broken |

### 🔴 SMART CONTRACTS (5 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| SC1 | **ReentrancyGuard (non-upgradeable) in UUPS proxy** | `packages/contracts/src/FlowLinkFacilitator.sol:7,26` | Storage collision |
| SC2 | **Nonce space shared across all payers** — DoS vector | `packages/contracts/src/FlowLinkFacilitator.sol:56,236` | Griefing attack |
| SC3 | **settle() records spending but never transfers tokens** | `packages/contracts/src/FlowLinkFacilitator.sol:228-283` | Fake settlements |
| SC4 | **cancelInvoice deletes record** — same hash reusable | `packages/contracts/src/AgentInvoice.sol:319` | Invoice replay |
| SC5 | **ProofLinkRegistry zero schemaUID edge case** | `packages/contracts/src/ProofLinkRegistry.sol:222` | Schema re-registration |

### 🔴 DATA & INFRASTRUCTURE (6 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| D1 | **Zero database indexes defined** — all queries are sequential scans | `apps/api/src/db/schema.ts:19-142` | Performance collapse at scale |
| D2 | **No graceful shutdown** — SIGTERM drops in-flight requests | `apps/api/src/index.ts` | Data loss on deploy |
| D3 | **tests/integration missing from pnpm-workspace.yaml** | `pnpm-workspace.yaml:5` | Integration tests not linked |
| D4 | **Docker image missing x402-compliance and mcp-server dist** | `Dockerfile:66-80` | Container crash at runtime |
| D5 | **release.yml version propagation broken** | `.github/workflows/release.yml:113` | Failed npm publish |
| D6 | **CI rebuilds monorepo 3x independently** per push | `.github/workflows/ci.yml:88,160` | Wasted CI time |

### 🔴 CONCURRENCY (4 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| R1 | **Sanctions cache TOCTOU race** — concurrent requests bypass single-flight | `packages/core/src/sanctions/screener.ts:348-376` | Stale screening data |
| R2 | **x402 decision.checks mutation race** on concurrent settle | `packages/x402-compliance/src/hooks/before-settle.ts:85-98` | Duplicate/lost checks |
| R3 | **SSE multi-client routing broken** (first-client-only) | `packages/mcp-server/src/transports/sse.ts:104-111` | Wrong client receives responses |
| R4 | **WebSocket clientId collision** under high concurrency | `apps/api/src/routes/ws.ts:211` | Orphaned connections |

### 🔴 DASHBOARD (6 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| UI1 | **Entire app is "use client"** — zero RSC usage | All pages | No SSR, all data in client bundle |
| UI2 | **Mock data regenerates randomly every 5s** | `apps/dashboard/src/lib/api.ts:315-357` | Feed reshuffles constantly |
| UI3 | **Fake wallet addresses** derived from DIDs | `apps/dashboard/src/app/agents/[id]/page.tsx:65` | Invalid addresses displayed |
| UI4 | **Dark mode state disconnected** from DOM | `apps/dashboard/src/components/layout/header.tsx:11-12` | Wrong theme icon |
| UI5 | **Invoice form accepts negative prices, NaN totals** | `apps/dashboard/src/app/invoices/new/page.tsx:239-259` | Broken invoice creation |
| UI6 | **Clipboard copy swallows errors silently** | Multiple files | No user feedback on failure |

### 🔴 DOCUMENTATION (5 critical)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| DOC1 | **quick-start.md uses wrong SDK call signature** | `docs/quick-start.md:44` | Broken code examples |
| DOC2 | **API reference shows "APPROVED" status** — Zod rejects it | `docs/api-reference.md:306` | Integrators get validation errors |
| DOC3 | **Duplicate quickstart files** with conflicting content | `docs/quick-start.md` vs `docs/quickstart.md` | Confusion |
| DOC4 | **technical_design.md describes unimplemented architecture** | `architecture/technical_design.md:4` | Developers misled |
| DOC5 | **request-finance-integration.md uses wrong signature** | `docs/request-finance-integration.md:48` | Broken examples |

---

## WARNING Issues (Top 30)

| # | Issue | Location |
|---|-------|----------|
| W1 | `parseAmount` uses `10 ** decimals` instead of `BigInt(10) ** BigInt(decimals)` — overflow for >20 decimals | `shared/src/utils/validation.ts:71` |
| W2 | `normalizeEvmAddress` destroys EIP-55 checksum | `shared/src/utils/address.ts:31-36` |
| W3 | InvoiceLineItem doesn't validate `total === quantity * unitPrice` | `shared/src/types/invoice.ts:37-44` |
| W4 | Branded types (Address, DID, etc.) defined but never used in any Zod schema | `shared/src/types/protocol.ts` |
| W5 | `formatAmountDisplay` uses `parseFloat` — floating-point errors for large amounts | `shared/src/utils/format.ts:16-17` |
| W6 | `.d.ts`/`.js` files committed inside `src/` alongside `.ts` sources | `packages/shared/src/` |
| W7 | SDK pagination is offset-only — no cursor-based navigation | `packages/sdk/src/types.ts:81-89` |
| W8 | SDK `screenAddress` doesn't accept `entityName` from `ScreenAddressParams` | `packages/sdk/src/client.ts:90-107` |
| W9 | No runtime response validation in SDK — bare `as T` casts | `packages/sdk/src/http.ts:170` |
| W10 | `payloadKey` collision vector in x402 hooks — signature prefix used as key | `x402-compliance/src/hooks/before-verify.ts:317-321` |
| W11 | `defaultStubWarningEmitted` is module-level singleton — multi-instance silent | `x402-compliance/src/middleware.ts:88` |
| W12 | Default compliance stubs bypass ALL screening in production | `x402-compliance/src/middleware.ts:75-116` |
| W13 | failOpen silently approves transactions with no logging | `integrations/request-finance/src/compliance-bridge.ts:143-152` |
| W14 | EAS attestation hardcodes zeroed address/amount/chain fields | `integrations/src/eas/schema.ts:124-134` |
| W15 | IPFS Pinata uses hardcoded `pageLimit=1000` | `integrations/src/ipfs/client.ts:197` |
| W16 | Webhook secret rotation not supported | `packages/core/src/webhooks/` |
| W17 | No distributed tracing support | Codebase-wide |
| W18 | No audit log sanitization for PII | `apps/api/src/utils/logger.ts` |
| W19 | API key exposed in `FlowLinkTimeoutError.url` | `packages/sdk/src/http.ts:156` |
| W20 | Health monitor torn reads on `lastStatus`/`lastHealth` | `packages/core/src/health/monitor.ts` |
| W21 | Duplicate receipt endpoints with different response shapes | `routes/compliance.ts:225` vs `routes/receipts.ts` |
| W22 | `PUT /identity/agents/:id/delegation` does PATCH semantics | `routes/identity.ts:454` |
| W23 | Action-based URLs on compliance endpoints (verb-based) | `routes/compliance.ts:63,200,246` |
| W24 | `/v1` and `/api/v1` both serve the same API undocumented | `apps/api/src/app.ts:125-126` |
| W25 | Multi-chain demo claims Travel Rule fires but code shows it doesn't | `apps/demo/src/scenarios/multi-chain-demo.ts:165` |
| W26 | Demo sanctions-demo uses hardcoded fake signatures | `apps/demo/src/scenarios/sanctions-demo.ts:106,163` |
| W27 | Demo full-demo has swapped buyer/seller labels | `apps/demo/src/scenarios/full-demo.ts:172-188` |
| W28 | Batch demo hardcodes detection statistics | `apps/demo/src/scenarios/batch-demo.ts:265-268` |
| W29 | No API versioning strategy beyond URL prefix | Codebase-wide |
| W30 | `ComplianceRequest` duplicates 7/8 fields from `PaymentIntent` | `shared/src/types/protocol.ts` |

---

## Type Design Gaps

1. **Branded types are decorative** — `Address`, `CAIP2ChainId`, `AgentId`, `DID`, `ReceiptId`, `TxHash` are defined but never used in Zod schemas or interfaces. No factory functions exist.
2. **`amount` fields accept any string** — no regex validation for decimal format across all schemas.
3. **Jurisdiction codes are unconstrained strings** — no length or format enforcement.
4. **`sender`/`receiver` accept empty strings** — no `.min(1)` constraint.
5. **`ComplianceRequest` should derive from `PaymentIntent.omit()`** to prevent divergence.

---

## Test Coverage Gaps

1. No property-based / fuzz testing for sanctions matching
2. No concurrency stress tests for cache, rate limiter, or webhook delivery
3. No contract interaction tests (EAS attestation end-to-end)
4. No negative test for allowlist-bypasses-sanctions behavior
5. No test for multi-tenant data isolation
6. Integration tests not linked in workspace (missing from pnpm-workspace.yaml)

---

## Recommended Fix Priority

### P0 — Fix Before Any Demo/Launch
1. **S1**: WebSocket auth bypass
2. **S2+S3**: CORS bypass
3. **S5**: Tenant data isolation
4. **S7**: Allowlist bypasses sanctions
5. **C1+C2**: Wrong Travel Rule thresholds
6. **X1**: hashJsonDeterministic
7. **X8**: Route ordering bug
8. **D1**: Database indexes

### P1 — Fix Before Production
9. **S10**: KYA proof verification
10. **C3**: Name-based sanctions screening
11. **C4**: Travel Rule enforcement
12. **X2+R3**: SSE multi-client routing
13. **X3+X4**: MCP tools hardcoded compliance
14. **SC1-SC4**: Smart contract issues
15. **D2**: Graceful shutdown
16. **D4**: Docker image completeness

### P2 — Fix Before Investor Review
17. **DOC1-DOC5**: Documentation accuracy
18. **UI1-UI6**: Dashboard issues
19. **W25-W28**: Demo correctness
20. **X10**: EAS ABI encoding

### P3 — Technical Debt
21. All remaining warnings
22. Type design improvements
23. Test coverage gaps
24. CI/CD optimization
