# ProofLink Final Quality Report

**Reviewer:** Claude Sonnet 4.6
**Date:** 2026-03-21
**Scope:** Full cross-package review — core engine, shared types, x402-compliance middleware, MCP server, SDK client, API routes

---

## Overall Quality Grade: B+

The codebase is well-structured and demonstrates production-level thinking in key areas (rate limiting, HMAC auth, typed events, plugin system, LRU caching, provider health tracking). The architecture is coherent. The main grade detractors are a simulated compliance pipeline in the API, a type divergence for `KYAVerificationResult` across packages, a partial request-signing implementation, and the body-excluded request signature which meaningfully degrades its security value.

---

## Findings

### CRITICAL

**CRITICAL: `POST /v1/compliance/check` runs a hardcoded simulation, not the `ProofLinkEngine`**
File: `apps/api/src/routes/compliance.ts` lines 65–116
`checksPerformed` is a static array with hardcoded `"PASSED"` results and `riskScore` is fixed at `12`. The `ProofLinkEngine` from `@prooflink/core` is never imported or called. Any real sanctioned address submitted to this endpoint returns APPROVED. This is the single most important issue for hackathon credibility and for any live demo.
Fix: Replace the static block with a call to `ProofLinkEngine.checkCompliance()`. Map `ComplianceCheckRequest` to `ComplianceRequest`, call the engine, and persist the real decision. If a live Chainalysis key is unavailable, instantiate `ProofLinkEngine` with `failOpen: true` and the offline OFAC fallback will still fire on known addresses.

---

**CRITICAL: Request signature does not cover the request body**
File: `apps/api/src/middleware/auth.ts` lines 176–178
```
const message = `${timestamp}.${c.req.method}.${c.req.path}`;
```
The body is explicitly excluded with the comment "We can't read the body synchronously here". This means an attacker who intercepts a signed request can replay it with a modified body (e.g., different sender/receiver addresses) within the 5-minute replay window. The signature provides no integrity protection for the payload — only for the method and path.
Fix: Either (a) drop the request-signing feature and document it as not yet implemented, or (b) require callers to send `X-Signature-Body-Hash: sha256(body)` as a separate header and include it in the HMAC input. This is a solved problem (Stripe, AWS SigV4 both do it this way).

---

**CRITICAL: `KYAVerificationResult` type divergence between `@prooflink/core` and `@prooflink/shared`**
Files:
- `packages/core/src/identity/kya-verifier.ts` line 49 — defines a local interface with `{ verified, agentDid, controllingEntity, delegationScope, erc8004Registered, credentialExpired, delegationValid, errors, latencyMs }`
- `packages/shared/src/types/identity.ts` line 116 — defines a Zod schema/type with `{ verified, trustScore, agentMetadata, operatorStatus, spendingLimits, validationEvidence, receiptId }`
- `packages/sdk/src/client.ts` line 8 — imports `KYAVerificationResult` from `@prooflink/shared/types`

The SDK's `verifyAgent()` promises to return `KYAVerificationResult` from `@prooflink/shared`, but the core engine produces the local interface from `kya-verifier.ts`. These are structurally incompatible (e.g., `errors[]` vs. no `errors` field; `agentDid` vs. `agentMetadata.name`). Any consumer that calls `verifyAgent()` through the SDK and then passes the result into a core engine method will hit a runtime shape mismatch.
Fix: Consolidate to a single canonical type. The shared Zod schema is the right source of truth. Update `kya-verifier.ts` to import and return `KYAVerificationResult` from `@prooflink/shared`, and remove the local interface.

---

### WARNING

**WARNING: `POST /v1/compliance/screen` is a static stub — never queries a provider**
File: `apps/api/src/routes/compliance.ts` lines 194–208
Returns `matched: false` and `riskScore: 0` for every address unconditionally. The `SanctionsScreener` from core is not called. Unlike the `/check` endpoint, there is no DB write either, so OFAC-listed addresses pass clean with no audit trail.
Fix: Instantiate `SanctionsScreener` (or call the engine's `screenAddress` method) and return the real result. Persist to a `sanctions_screens` table or at minimum log the request with the address.

---

**WARNING: `GET /v1/compliance/history` leaks all records when `auth.apiKeyId` is absent**
File: `apps/api/src/routes/compliance.ts` lines 245–247
```ts
if (auth?.apiKeyId) {
  conditions.push(eq(complianceChecks.apiKeyId, auth.apiKeyId));
}
```
If `auth` is undefined or `apiKeyId` is null/undefined (possible with the JWT auth path where `apiKeyId` is set to `payload.sub` but no DB row is enforced), the `conditions` array remains empty and the query returns all rows from all tenants. The comment above correctly identifies this as "prevents cross-tenant reads" but the conditional guard is inverted — it should be a hard assertion, not a soft guard.
Fix: Return `403` early if `!auth?.apiKeyId` rather than silently dropping the filter. Also verify the JWT path always sets a meaningful non-null `apiKeyId`.

---

**WARNING: `SanctionsCheckResult.riskScore` defined as `z.number().int()` but `SanctionsScreener` returns `riskScore: 0` (float) from providers**
File: `packages/shared/src/types/compliance.ts` line 36; `packages/core/src/sanctions/screener.ts` line 126
The schema enforces `.int()` but neither `ChainalysisProvider` nor `TRMLabsProvider` explicitly casts the provider's `riskScore` to an integer. If a provider returns `0.5` or similar, Zod parse will fail at any API boundary that validates the result.
Fix: Add `Math.round()` when assigning `riskScore` in the screener, or change the Zod constraint to `z.number().min(0).max(100)`.

---

**WARNING: `DefaultPriceConverter.toUsd` assumes all assets are 6-decimal stablecoins**
File: `packages/x402-compliance/src/middleware.ts` lines 92–97
EURC is 6 decimals (correct), but the comment says "stablecoin". Any ETH or WBTC payment routed through x402 will be undervalued by ~6 orders of magnitude, causing Travel Rule threshold checks to never trigger on high-value native-asset payments.
Fix: Implement a proper per-asset decimal map or integrate a real price feed. At minimum add an asset-to-decimals lookup table for ETH (18), WBTC (8), USDC (6), EURC (6).

---

**WARNING: `AMLScorer` weights do not sum to 1.0 — normalization is incorrect for partial rule sets**
File: `packages/core/src/aml/scorer.ts` lines 334–337
Summing the default weights: 0.15 + 0.20 + 0.15 + 0.08 + 0.12 + 0.08 + 0.10 + 0.10 + 0.05 + 0.07 = 1.10. The scorer divides by `totalWeight` so the normalization is mathematically correct for the full default set. However, when `removeRule()` is used at runtime, `totalWeight` shrinks but the remaining rules' weights were calibrated against the full 1.10 sum. This means a rule with `weight: 0.20` carries `0.20 / 0.90 = 22%` influence after one rule removal, inflating individual signals beyond their intended severity.
Fix: Document that rule weights should be treated as relative, not absolute percentages, or normalize the default set to sum to 1.0 and add a guard that re-normalizes after `addRule`/`removeRule`.

---

**WARNING: `registerAgent` and `issueKYA` in the SDK both map to `POST /identity/kya/issue`**
File: `packages/sdk/src/client.ts` lines 257 and 295
Both methods call the same endpoint with different param shapes (`AgentRegistration` vs `IssueKYAParams`). If the API only handles one shape, one method silently sends a malformed request. The API's identity route was not reviewed here but the SDK is promising two different operations on a single endpoint.
Fix: Either consolidate the two methods into one, or give each a distinct endpoint (`/identity/agents` for registration, `/identity/kya/issue` for credential issuance).

---

**WARNING: `verifyRequestSignature` returns `true` when `REQUEST_SIGNING_SECRET` is missing in non-production**
File: `apps/api/src/middleware/auth.ts` lines 160–163
A missing secret causes the function to log a warning and return `true` (bypass). In a staging environment where `NODE_ENV` is not set to `production`, this silently disables signature verification with no error. The current guard only throws in production for `API_KEY_SECRET` (line 84); the signing secret has no equivalent guard.
Fix: Apply the same `NODE_ENV === "production"` throw pattern, or more defensively, refuse to start if signing is enabled (signature headers are present in the OpenAPI spec) but the secret is unset.

---

### SUGGESTION

**SUGGESTION: `buildDecision` receives an optional `request` parameter but uses it only for receipt ID generation — the fallback uses `Date.now()` which is not deterministic**
File: `packages/core/src/engine/prooflink.ts` line 817
The random fallback `pl-${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 8)}` is used in the batch error path (line 533) where `request` is passed in but only as a partial recovery object. The receipt ID for error-path decisions is non-reproducible, making it impossible to deduplicate retried requests.

**SUGGESTION: `checkComplianceBatch` has a TOCTOU race on the shared `queue` array**
File: `packages/core/src/engine/prooflink.ts` lines 520–556
The worker pool uses `queue.shift()` without any mutex. In a Node.js event loop this is safe for the current sync-shift pattern, but if `processItem` is ever made truly parallel (e.g., moved to worker threads), the array is not thread-safe. Add a comment marking this assumption explicit.

**SUGGESTION: `screener.ts` `providers` array is mutated via `addProvider`/`removeProvider` while iteration may be in-progress**
File: `packages/core/src/sanctions/screener.ts` lines 385–397
`screenPriority` iterates `this.providers` with a `for...of` loop. A concurrent call to `removeProvider` during iteration will not cause an error in JS (the iterator captures the array reference, not a snapshot), but the iteration may skip an element. Snapshot the array at the start of `screenPriority` and `screenAggregate`.

**SUGGESTION: `ChainalysisProvider.screen` maps all identifications to `"OFAC_SDN"` regardless of actual list**
File: `packages/core/src/sanctions/screener.ts` line 117
Chainalysis free API returns `category` and `url` which can distinguish between SDN, CONS, and other OFAC programs. Hard-coding `"OFAC_SDN"` produces inaccurate audit trails.

**SUGGESTION: MiCA EU jurisdiction list in `checkJurisdictionalRules` is missing post-2025 members**
File: `packages/core/src/engine/prooflink.ts` lines 739–742
The list includes 20 EU member states but omits RO (Romania), BG (Bulgaria), PL (Poland), HU (Hungary), CZ (Czechia), and SE (Sweden) — all EU members subject to MiCA. The check will silently pass USDT transactions from these jurisdictions.

---

## Export Consistency Assessment

`@prooflink/core/src/index.ts` is comprehensive. All engine classes, providers, verifiers, and utilities are exported. No missing exports detected.

`@prooflink/shared/src/index.ts` re-exports all type modules via barrel. No gaps.

`@prooflink/sdk/src/types.ts` re-exports all relevant shared types and defines client-local param types. The `ComplianceRequest` re-export shadows the core engine's `ComplianceRequest` (which has a different shape — `sender: string` vs `sender: { address, chain }`). This is a name collision that is confusing but not a compile error due to separate import paths.

`@prooflink/mcp-server/src/server.ts` does not re-export tool or resource types — acceptable for an MCP server.

---

## Circular Dependency Assessment

No circular dependencies detected across the reviewed files. The dependency graph is:
```
@prooflink/shared  (no deps)
  <- @prooflink/core
  <- @prooflink/sdk
  <- @prooflink/x402-compliance
  <- @prooflink/mcp-server
  <- apps/api
```
Clean layering maintained.

---

## Strengths

1. **Auth middleware is production-quality.** HMAC-SHA256 key hashing with per-environment fallback, timing-safe comparison, JWT HS256 with expiry, scope hierarchy, and fire-and-forget `lastUsedAt` tracking. This is notably better than most hackathon submissions.

2. **ProofLink engine pipeline is well-architected.** The allowlist fast-path, parallel sanctions screening, fail-open/fail-closed config, typed event emitter, plugin lifecycle hooks, and telemetry integration are all coherent and production-ready. The batch concurrency control with pre-warming is a genuine performance optimization.

3. **Zod schemas in `@prooflink/shared` are thorough.** Branded types, datetime validation, min/max bounds, enum exhaustiveness, and `.default()` on non-required fields are all correctly applied. The schemas would parse real API payloads without modification.

4. **Provider health tracking with automatic degradation** in `SanctionsScreener` is a strong reliability pattern. The offline OFAC SDN fallback means the system degrades gracefully rather than hard-failing.

5. **Multi-tenant data isolation** is intentionally implemented in the history endpoint (even though the guard has the conditional bug noted above). The awareness of cross-tenant leakage at the query level is correct.

6. **`ProofLinkX402Compliance.destroy()`** correctly unrefs the cleanup interval and provides explicit lifecycle management — a detail often missed that prevents test process hang.

---

## Hackathon Readiness Assessment

**Demo-ready with caveats.** The architecture is impressive and tells a coherent story. The core engine (`ProofLinkEngine`) is genuinely functional. However:

- The API's `/compliance/check` endpoint returning hardcoded APPROVED for every request is a demo-killer if a judge submits a known OFAC address (Tornado Cash: `0x7F367cC41522cE07553e823bf3be79A889DEBE1B` is in the offline list). The engine will block it; the API will approve it.
- The type divergence on `KYAVerificationResult` will surface as a runtime error in any end-to-end demo that exercises the KYA flow through the SDK.

**Estimated time to resolve top 3 issues: 4–6 hours.**

Priority order:
1. Wire `ProofLinkEngine` into `POST /v1/compliance/check` (2–3 hrs)
2. Fix `KYAVerificationResult` type divergence (1 hr)
3. Fix the history endpoint cross-tenant guard (15 min)

After those three fixes, the codebase is in a strong position for a live demo and a technical review by judges.

---

## Top 5 Remaining Issues to Fix

| # | Issue | File | Severity | Est. Fix |
|---|-------|------|----------|----------|
| 1 | `/compliance/check` runs static simulation instead of `ProofLinkEngine` | `apps/api/src/routes/compliance.ts:65` | Critical | 3 hrs |
| 2 | `KYAVerificationResult` has divergent types in core vs shared | `packages/core/src/identity/kya-verifier.ts:49` | Critical | 1 hr |
| 3 | History endpoint cross-tenant leak when `apiKeyId` is absent | `apps/api/src/routes/compliance.ts:245` | Warning | 15 min |
| 4 | Request signature excludes body — provides no payload integrity | `apps/api/src/middleware/auth.ts:177` | Critical | 2 hrs |
| 5 | `/compliance/screen` is a hardcoded stub with no audit trail | `apps/api/src/routes/compliance.ts:194` | Warning | 1 hr |
