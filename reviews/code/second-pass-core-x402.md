# Second Pass Review — `@flowlink/core` + `@flowlink/x402-compliance`

**Reviewer:** Claude Sonnet 4.6
**Date:** 2026-03-21
**Scope:** All fixes from `core-review.md` and `x402-review.md`; full re-read of both packages.

---

## First-Review Fix Verification

### Core package fixes

| Fix | Verified? | Notes |
|---|---|---|
| Unused `ComplianceCheckResult`/`ComplianceCheckType` imports removed | PASS | `engine/prooflink.ts:1-10` imports are clean |
| Allowlist/blocklist case-normalization | PASS | `prooflink.ts:116-119` normalizes both sides correctly |
| `resolveJurisdiction` no longer hard-codes `"US"` | PASS | `checker.ts:298-333` correctly extracts TLD from VASP DIDs |
| Silent signing failure removed | PASS | `issuer.ts:221-226` re-throws; no fake signature string |
| KYA cache bypass on `amountUsd === 0` | PASS | `kya-verifier.ts:148-149` uses `!== undefined` check |
| Offline provider label `"ofac_sdn_offline"` | NOT APPLIED — see below |
| `issueReceipt` accepts `ComplianceRequest` | PASS | `prooflink.ts:315-326` forwards full request context |

### x402-compliance package fixes

| Fix | Verified? | Notes |
|---|---|---|
| `payloadKey` collision fix (`slice(0,128)`) | PASS | `before-verify.ts:294` |
| `settledProofLinks` unbounded map replaced with TTL store | PASS | `middleware.ts:56-68` |
| Allowlist `compliance:check:passed` event emission | PASS | `before-verify.ts:110-114` |
| Cleanup interval covers both maps | PASS | `middleware.ts:196-199` |

---

## Remaining Bug: Offline Provider Label NOT Applied

**CRITICAL: `buildOfflineResult` and `buildSanctionedResult` still emit `provider: "chainalysis_free"` in offline paths**
— `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/sanctions/screener.ts:218,239`

The first review stated the fix was applied and that `"ofac_sdn_offline"` was added to the shared enum. Neither change is present in the code. Both builder methods still use `"chainalysis_free" as const`:

- `buildOfflineResult` line 218: `provider: "chainalysis_free" as const`
- `buildSanctionedResult` line 239: `provider: "chainalysis_free" as const`

The shared type was also not updated — `"ofac_sdn_offline"` is not a valid member of the `provider` union. This means audit logs from offline screening are incorrectly attributed to a live Chainalysis API call. The fix was documented as applied in the review report but was not committed.

**Fix:** Add `"ofac_sdn_offline"` to the `SanctionsCheckResult.provider` union in `@flowlink/shared/src/types/compliance.ts`, then change both builder methods to use `provider: "ofac_sdn_offline" as const`.

---

## New Bugs Introduced by Fixes

### 1. CRITICAL: `createEvictingMap` uses `DECISION_TTL_MS` (5 min) for `pendingDecisions` but ignores the TTL for `settledProofLinks`

— `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/middleware.ts:34-46`

`createEvictingMap` hardcodes `DECISION_TTL_MS` (5 minutes) inside its closure. The `settledProofLinks` store uses its own `createProofLinkStore` with `PROOF_LINK_TTL_MS` (30 seconds) — that is correct. However, `createEvictingMap` always applies the 5-minute TTL regardless of which entries it holds. If `createEvictingMap` were ever reused for a shorter-lived store, the hardcoded constant would silently apply the wrong TTL. The design is fragile: the TTL is baked into the factory function rather than passed as a parameter.

This is a latent defect, not an active one, because `createEvictingMap` is only called once (for `pendingDecisions`). But it is a maintenance trap.

**Fix:** Change `createEvictingMap` to accept a `ttlMs: number` parameter and pass `DECISION_TTL_MS` at the call site.

---

### 2. WARNING: `resolveJurisdiction` regex only matches TLD on the final segment — `did:web:vasp.company.de` is mishandled

— `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/travel-rule/checker.ts:307`

The regex `/\.([a-z]{2})$/` applied to `did:web:vasp.company.de` correctly extracts `"de"`. However, for a DID like `did:web:vasp-de.flowlink.io`, the TLD extracted is `"io"` (not `"de"`), which has no threshold entry and falls through to the default US $3,000 — the zero-threshold EU rule is silently missed for realistic production DIDs that use `.io` or `.com` domains.

This is the same fundamental problem as before: DID-based jurisdiction resolution is unreliable for production VASP DIDs unless all counterparties use country-code TLDs. The regex was a reasonable minimal fix but must be documented as a known limitation, not treated as correct in all cases.

**Suggestion:** Document in the function JSDoc that TLD extraction only works for country-code TLDs and is a best-effort heuristic; for production, VASP DIDs should be resolved via a VASP directory (e.g., TRISA GDS) that returns explicit jurisdiction metadata.

---

### 3. WARNING: `receiptId` in `ComplianceDecision` still does not match the `receiptId` in the issued `ComplianceReceipt`

— `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/engine/prooflink.ts:469`
— `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/receipts/issuer.ts:129-135`

The first review flagged this as a pipeline correctness issue but classified it under "Suggestions." It has not been addressed. `buildDecision` at line 469 generates:

```ts
const receiptId = `pl-${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 8)}`;
```

`issueReceipt` at line 129 generates a fully different ID using `generateReceiptId(...)` (deterministic hash of sender+receiver+amount+chain+timestamp). The `ComplianceDecision.receiptId` and the `ComplianceReceipt.receiptId` are therefore always different values for the same compliance run. Any downstream consumer that stores `decision.receiptId` and tries to look up the receipt by that ID will fail.

**Fix:** `buildDecision` should call `generateReceiptId` with the request context, or the field on `ComplianceDecision` should be renamed to `decisionId` to make clear it is not the receipt ID.

---

### 4. WARNING: `kya-verifier.ts:209` — delegation amount check still uses falsy guard after the `!== undefined` fix

— `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/identity/kya-verifier.ts:209`

The first review fixed the cache bypass (`transactionAmountUsd !== undefined`). However, the delegation scope amount check on line 209 was NOT updated and still reads:

```ts
if (
  transactionAmountUsd &&
  delegationScope.maxTransactionAmount &&
  transactionAmountUsd > delegationScope.maxTransactionAmount
)
```

`transactionAmountUsd &&` is a falsy check. A zero-dollar transaction (`transactionAmountUsd = 0`) will not be checked against `maxTransactionAmount`. This means an agent with `maxTransactionAmount: 0` (no spending allowed) passes the check for a $0 transaction, which is semantically wrong — an agent with `maxTransactionAmount: 0` should allow no transactions at all.

The cache bypass was fixed but the same pattern in the delegation logic was overlooked.

**Fix:** Change line 209 to `transactionAmountUsd !== undefined &&`.

---

### 5. WARNING: Parallel sanctions screening race condition is benign in Node.js but has an audit-log correctness issue

— `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-settle.ts:86-93`

The first review flagged this as a suggestion. It has not been fixed. In `before-settle.ts`, `decision.checks.push(...)` mutates the shared `PendingDecision` that was written by `onBeforeVerify`. Under concurrent settle calls for the same key (retry storm, race), both calls receive the same object reference from `pendingDecisions.get(key)` and push into the same `checks` array. The `pendingDecisions.delete(key)` on line 150 of `after-settle.ts` only runs after settlement — not before settle. Two concurrent settle calls both see the key present and both push check entries, producing duplicate records in the audit log.

Node.js is single-threaded for the push itself so the array will not be corrupted, but the duplicate check entries will be serialized into the `ProofLinkReceipt` stored by `storeAuditRecord`.

**Fix:** Clone the decision before mutating: `const localDecision = { ...decision, checks: [...decision.checks] };` and use `localDecision` for subsequent mutations.

---

### 6. WARNING: `DefaultProofLinkService.computeHash` — 2^31 collision domain hash still in production path

— `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/middleware.ts:103-108`

Not fixed. The hash function is `((hash << 5) - hash + char) | 0` which produces a 32-bit signed integer. The `| 0` clamp means the output has only ~2^31 unique values. At ~77,000 transactions (birthday bound), the probability of a collision in the `proofLinkHash` field exceeds 50%. A hash collision produces two distinct transactions sharing the same `proofLinkHash`, corrupting the audit trail and making EAS attestations ambiguous.

The review noted "production should use keccak256" but this code path is the production default when no custom `ProofLinkService` is injected.

**Fix:** Replace with `node:crypto`'s `createHash('sha256')`:

```ts
import { createHash } from "node:crypto";

computeHash(receipt: {...}): string {
  const data = `${receipt.transactionHash}:${receipt.sender}:${receipt.receiver}:${receipt.amount}:${receipt.createdAt}`;
  return "0x" + createHash("sha256").update(data).digest("hex");
}
```

This is a zero-dependency fix (Node.js built-in).

---

### 7. WARNING: `kya-verifier.ts` — no timeout on `readContract` call

— `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/identity/kya-verifier.ts:278-283`

Flagged as CRITICAL in the first review, not fixed. The `client.readContract(...)` call has no timeout. If the RPC endpoint is unresponsive, the entire compliance pipeline hangs indefinitely. Viem's `http()` transport does not set a default request timeout. A stalled RPC blocks the 500ms pipeline budget.

**Fix:** Pass a timeout via `createPublicClient({ transport: http(this.config.rpcUrl, { timeout: 4_000 }) })` or wrap the call in `Promise.race` with a 4-second rejection.

---

## Import Graph — Circular Dependency Check

Traced all import chains manually:

**`@flowlink/core`**
```
engine/prooflink.ts
  → cache.ts                (no further imports from this pkg)
  → config.ts               (no further imports from this pkg)
  → aml/scorer.ts           → config.ts [ok]
  → identity/kya-verifier.ts → cache.ts, config.ts [ok]
  → receipts/issuer.ts      → config.ts [ok]
  → sanctions/screener.ts   → cache.ts, config.ts, sanctions/lists.ts [ok]
  → travel-rule/checker.ts  → config.ts [ok]
```
No circular dependencies. All imports are DAG-clean.

**`@flowlink/x402-compliance`**
```
middleware.ts
  → types.ts                (no local imports)
  → hooks/before-verify.ts  → types.ts, address.ts [ok]
  → hooks/before-settle.ts  → types.ts, address.ts, hooks/before-verify.ts [ok]
  → hooks/after-settle.ts   → types.ts, address.ts, hooks/before-verify.ts [ok]
  → extension.ts            → types.ts, hooks/before-verify.ts [ok]
```
No circular dependencies.

**Cross-package:** `x402-compliance` imports from `@flowlink/shared/types` only (in `types.ts`). It does NOT import from `@flowlink/core` despite it being listed as a dependency in `package.json` (confirmed unfixed from first review). No circular cross-package dependency.

---

## Test Coverage — New Gaps Introduced by Fixes

### 1. Allowlist `compliance:check:passed` event — no assertion in tests
— `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/__tests__/middleware.test.ts:858-879`

The fix emitting `compliance:check:passed` on the allowlist path was applied. The allowlist test at line 858 only asserts `result` is `undefined` and `screener.screen` is not called. It does not assert the event was emitted. If the event emission is accidentally removed in a future refactor, the test will not catch it.

### 2. `onAfterSettle` idempotency — no test
No test for the silent no-op when `onAfterSettle` is called twice for the same key (first call deletes the key, second call finds nothing). Still missing as noted in first review.

### 3. EU Travel Rule zero-threshold — no test
`TravelRuleChecker.resolveJurisdiction` with `originator.vaspDid: "did:web:vasp.de"` and `amountUsd: 1` should produce `status: "TRANSMITTED"`. Still not tested.

### 4. Delegation amount check with `transactionAmountUsd: 0` — no test
The bug in finding #4 above has no regression test.

---

## Pipeline Integration — ProofLink Engine ↔ x402 Middleware

The two packages do not integrate — confirmed again. `@flowlink/x402-compliance` reimplements the screening pipeline through injected service interfaces and never calls `ProofLinkEngine`. The `@flowlink/core` dependency in `package.json` is dead weight.

Key behavioral divergences that remain unfixed:

1. **Allowlist semantics:** Core allowlists sender-only (`OR` semantics). x402 requires BOTH sender AND receiver on the allowlist (`AND` semantics). Undocumented divergence.
2. **Fail-open:** Core has a `failOpen` config flag that controls behavior on API errors. x402 has no `failOpen` mechanism — a `screener.screen()` rejection propagates as an unhandled exception out of `onBeforeVerify`, crashing the compliance hook. There is no try/catch around the `Promise.all` on line 145 of `before-verify.ts`.
3. **Escalation:** Core has an `ESCALATED` status distinct from `REJECTED`. x402 only has pass/abort — there is no equivalent of `ESCALATED` in the x402 pipeline.

Item 2 (no try/catch around `Promise.all`) is an unreviewed bug not in the first review.

---

## New Finding: Missing Try/Catch in `before-verify.ts` `Promise.all`

**CRITICAL: Unhandled `Promise.all` rejection crashes the verify hook**
— `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-verify.ts:145-150`

```ts
const [senderScreen, receiverScreen, amlScore, kyaCredential] = await Promise.all([
  screener.screen(sender, requirements.network),
  screener.screen(receiver, requirements.network),
  amlScorer.score(sender, requirements.maxAmountRequired, requirements.network),
  kyaRegistry ? kyaRegistry.lookup(sender) : Promise.resolve(null),
]);
```

If any of these promises rejects (e.g., Chainalysis API is unreachable, AML scorer throws), the exception propagates uncaught out of `onBeforeVerify`. The x402 server framework then receives a rejected promise from its `onBeforeVerify` hook. Depending on the x402 server implementation, this either silently passes the payment (fail-open at the framework level) or crashes the request handler with an unhandled rejection.

There is no equivalent of `failOpen` config in x402 — the first review did not flag this gap. The `DefaultSanctionsScreener` stub always returns clean, masking the problem in tests.

**Fix:** Wrap the `Promise.all` in try/catch. On error, either abort with `{ abort: true, reason: "compliance_error", message: "Internal compliance check failure" }` (fail-closed), or emit a warning and continue (fail-open), based on a config flag. Recommend fail-closed as the default.

---

## Summary Table

| # | Severity | File | Status | Description |
|---|---|---|---|---|
| 1 | CRITICAL | `sanctions/screener.ts:218,239` | NOT FIXED | Offline provider label still `"chainalysis_free"` |
| 2 | CRITICAL | `hooks/before-verify.ts:145` | NEW BUG | No try/catch on `Promise.all` — service rejection crashes verify hook |
| 3 | CRITICAL | `identity/kya-verifier.ts:278` | NOT FIXED | No timeout on ERC-8004 `readContract` — RPC stall hangs pipeline |
| 4 | WARNING | `identity/kya-verifier.ts:209` | NOT FIXED | Delegation amount check uses falsy guard, misses `amountUsd === 0` |
| 5 | WARNING | `middleware.ts:103` | NOT FIXED | `DefaultProofLinkService.computeHash` has 2^31 collision domain |
| 6 | WARNING | `hooks/before-settle.ts:86` | NOT FIXED | Concurrent settle calls produce duplicate check entries in audit log |
| 7 | WARNING | `engine/prooflink.ts:469` | NOT FIXED | `decision.receiptId` does not match `receipt.receiptId` from `issueReceipt` |
| 8 | WARNING | `travel-rule/checker.ts:307` | PARTIAL FIX | DID TLD extraction undocumented as heuristic; fails for `.io`/`.com` VASPs |
| 9 | WARNING | `middleware.ts:34-46` | NEW (minor) | `createEvictingMap` TTL hardcoded in closure, not parameterized |
| 10 | SUGGESTION | `__tests__/middleware.test.ts:879` | NOT FIXED | Allowlist test missing `compliance:check:passed` event assertion |
| 11 | SUGGESTION | tests | NOT FIXED | Missing: `onAfterSettle` idempotency, EU zero-threshold, `amountUsd=0` delegation |

---

## Files Requiring Changes

- `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/sanctions/screener.ts` — lines 218, 239: provider label
- `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/identity/kya-verifier.ts` — line 209: falsy guard; line 274: add RPC timeout
- `/home/akash/PROJECTS/FLOW-LINK/packages/core/src/engine/prooflink.ts` — line 469: `buildDecision` receiptId generation
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-verify.ts` — line 145: wrap `Promise.all` in try/catch
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/middleware.ts` — line 103: replace djb2 hash with SHA-256; line 34: parameterize TTL
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-settle.ts` — line 85: clone decision before mutation
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/compliance.ts` — add `"ofac_sdn_offline"` to provider union
