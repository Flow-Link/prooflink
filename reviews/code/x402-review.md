# x402-compliance Package — Code Review

**Reviewer:** Senior TypeScript code reviewer (Claude Sonnet 4.6)
**Date:** 2026-03-21
**Package:** `@flowlink/x402-compliance` — `packages/x402-compliance/src/`
**Test result (post-fix):** 28/28 passing

---

## Summary

The package is architecturally sound. The hook/factory pattern with injected service interfaces is idiomatic and testable. However, two bugs were critical enough to be fixed immediately: a signature key collision that could allow bypassing compliance, and an unbounded memory leak in the settled-proof-links store. Five further issues were flagged at WARNING or SUGGESTION level.

---

## Findings

### CRITICAL

**CRITICAL: `payloadKey` produces an 8-byte prefix — trivial collision domain**
— `packages/x402-compliance/src/hooks/before-verify.ts:281`
— `signature.slice(0, 32)` takes 32 hex characters = 16 bytes. Two signatures that share the same first 16 bytes would map to the same `pendingDecisions` key. The verify hook would store a compliance decision under that key; if a second, distinct payment arrives before settle whose signature shares the same prefix (maliciously or accidentally), the before-settle hook will find the first payment's cached decision and proceed without running sanctions or AML checks on the second payment. This is a compliance bypass.
**Fix applied:** Changed to `signature.slice(0, 128)` (64 bytes, full ECDSA signature or the first 64 bytes of longer Solana sigs). All 28 tests still pass.

---

**CRITICAL: `settledProofLinks` is an unbounded `Map<string, string>` with no eviction**
— `packages/x402-compliance/src/middleware.ts:133` (original)
— Entries are added by `onAfterSettle` and consumed (deleted) inside `enrichSettlementResponse`. If the extension is registered but `enrichSettlementResponse` is never called (e.g., the x402 server version doesn't call enrichment, or the settle response is an error path that skips enrichment), entries accumulate indefinitely. A server processing high volumes of micro-payments would OOM over hours.
**Fix applied:** Replaced `Map<string, string>` with a new `createProofLinkStore()` function returning a `Map<string, { hash: string; timestamp: number }>` with a 30-second TTL and a `cleanup()` method. The existing 60-second `setInterval` now calls both `pendingDecisions.cleanup()` and `settledProofLinks.cleanup()`. The `extension.ts` and `after-settle.ts` interfaces updated accordingly. All 28 tests still pass.

---

### WARNING

**WARNING: `allowlist` short-circuit requires BOTH sender AND receiver on the list**
— `packages/x402-compliance/src/hooks/before-verify.ts:98`
— The `ProofLinkEngine` in `@flowlink/core` allowlists on sender alone (`if (this.config.allowlist.includes(request.sender.toLowerCase()))` — `core/src/engine/prooflink.ts:118`). The x402 package requires both parties, making it significantly more restrictive. This divergence is undocumented and will silently reject payments where only the payer is known-good (e.g., internal treasury accounts paying external vendors). If the dual-allowlist semantics are intentional, it must be documented; if not, the condition should be `||` for OR logic.
**Not fixed** (business intent unknown — needs product decision).

---

**WARNING: `allowlist` fast-path emits `compliance:check:started` but not `compliance:check:passed`**
— `packages/x402-compliance/src/hooks/before-verify.ts:85,98`
— The event `compliance:check:started` is emitted unconditionally, then the allowlist short-circuit returns without emitting `compliance:check:passed`. Downstream consumers observing the event stream (metrics, audit dashboards) will see an unmatched `:started` event with no resolution for every allowlisted payment. This causes metric gaps.
**Fix applied:** Added `onEvent?.({ type: "compliance:check:passed", ... })` call before the `return` in the allowlist branch.

---

**WARNING: `@flowlink/core` is listed as a dependency but never imported**
— `packages/x402-compliance/package.json:33`
— `@flowlink/core` is in `dependencies` alongside `@flowlink/shared`, but zero source files in this package import from `@flowlink/core`. The package defines its own service interfaces (`SanctionsScreener`, `AmlScorer`, `TravelRuleService`, `ProofLinkService`) and injects implementations at construction time. This means:
  1. The `ProofLinkEngine` from `@flowlink/core` is never used despite the doc comment describing "calling the ProofLink engine."
  2. The `@flowlink/core` package is installed in production bundles for no reason, adding install weight and a dependency surface.
**Not fixed** — removing the dependency would require either wiring `ProofLinkEngine` into this package's service interfaces, or making the intent explicit. Recommend: either use `ProofLinkEngine` as the default `screener`/`amlScorer` implementation, or remove `@flowlink/core` from dependencies and make it an optional peer.

---

**WARNING: `DefaultProofLinkService.computeHash` is a 32-bit djb2 hash with a 2^31 collision domain**
— `packages/x402-compliance/src/middleware.ts:78–87`
— The hash is returned as `proofLinkHash` in the settlement enrichment response and emitted in compliance events. It is positioned as a "deterministic" receipt identifier but with only 2^31 possible values, collisions are probable at ~77,000 transactions (birthday problem). Two different transactions with different hashes mapping to the same `proofLinkHash` would produce a corrupted audit trail. The code comment acknowledges this ("production should use keccak256") but does not fail loudly when `eas` config is set, meaning EAS attestations could be anchored with a weak hash.
**Not fixed** — fixing requires adding a crypto dependency. Recommend using `node:crypto`'s `createHash('sha256')` as the default instead of djb2 until keccak256 is wired.

---

### SUGGESTION

**SUGGESTION: `ScreeningCache` interface is exported but never wired in**
— `packages/x402-compliance/src/hooks/before-verify.ts:31`, `hooks/index.ts:2`
— `ScreeningCache` defines a get/set interface for caching compliance decisions, but `BeforeVerifyDeps` does not include it and the hook never uses it. The code re-runs full sanctions+AML checks on every request. Given that the redis config (`RedisConfigSchema`) is part of `FlowLinkConfig`, this was presumably intended to be wired. Without caching, repeat payments from the same sender will triple the external API call count (verify-sender, verify-receiver, aml-score each time). This will push latency above the 200ms budget for any non-trivial Chainalysis API.
— Add `cache?: ScreeningCache` to `BeforeVerifyDeps`, check it before calling `screener.screen()` and `amlScorer.score()`, and populate it after clean results.

---

**SUGGESTION: `before-settle.ts` mutates `decision.checks` from a shared map without synchronization**
— `packages/x402-compliance/src/hooks/before-settle.ts:86–93`
— `decision.checks.push(...)` mutates the object stored in `pendingDecisions`. If two concurrent settle calls arrive for the same key (e.g., retry storm), they both fetch the same `PendingDecision` reference and race to push checks into the same array. Node.js is single-threaded so this won't corrupt the array, but it could produce duplicate check entries in the audit receipt. Guard with a `settleInProgress` Set or clone the decision before mutating.

---

**SUGGESTION: Missing test for the allowlist `compliance:check:passed` event**
— `packages/x402-compliance/src/__tests__/middleware.test.ts:857–880`
— The existing `allowlist` test only asserts `result` is `undefined` and `screener.screen` is not called. It doesn't assert that `compliance:check:passed` is emitted. After the fix applied above, this should be verified.
— Add event capture to the allowlist test and assert `events.map(e => e.type)` includes `"compliance:check:passed"`.

---

**SUGGESTION: Missing test for duplicate/retry `onAfterSettle` (idempotency)**
— `packages/x402-compliance/src/__tests__/middleware.test.ts` — no such test exists
— If `onAfterSettle` is called twice for the same payment key (e.g., network retry), the second call finds no `decision` (it was deleted by the first call at line 150) and silently returns. This is the correct behavior, but there is no test verifying the silent no-op, meaning a regression that erroneously regenerates the receipt would go undetected.

---

## Hook Flow Correctness

The three hooks intercept the payment flow in the correct order and with correct semantics:

- `onBeforeVerify` — runs before the facilitator cryptographic verification. Aborting here prevents the facilitator from even seeing the payment. Correct placement.
- `onBeforeSettle` — runs after cryptographic verification but before the on-chain transaction is submitted. Travel Rule must gate here (pre-transaction), not in verify. Correct placement.
- `onAfterSettle` — runs after the transaction is on-chain. Receipt generation and attestation are correctly placed here. Fire-and-forget for EAS/invoice is intentional and correct — these must not block the settlement response.

## Compliance Integration with `@flowlink/core`

The package does NOT integrate with `ProofLinkEngine` from `@flowlink/core`. Instead it reimplements the pipeline through injected service interfaces. This is architecturally clean (testable, no tight coupling) but creates two parallel implementations of the same pipeline. The core engine has features this package lacks: jurisdictional rules, GENIUS Act / MiCA checks, `failOpen` mode, escalation status, and proper LRU caching. Long-term, these packages should converge — either the x402 package delegates to `ProofLinkEngine` or `@flowlink/core` is removed from dependencies.

## Performance Budget

With cold services (no cache), the verify hook runs:
- `Promise.all([screener, screener, amlScorer, kyaRegistry.lookup])` — all parallel
- Then (if KYA credential found) `kyaVerifier.verify()` — sequential

If each external API call takes ~50ms, the verify phase takes ~50ms + optional 50ms = ~100ms. Comfortably within 200ms if Chainalysis and Notabene APIs are well-connected. The missing `ScreeningCache` integration is the main risk here — without it, every payment is a cache miss.

The before-settle hook adds a sequential `priceConverter.toUsd()` + conditional `travelRuleService.transmit()`. The Notabene API can take 100–500ms, meaning settle could push total latency to 600ms+. This is expected for VASP-to-VASP Travel Rule but should be documented as a known trade-off.

## Files Modified

- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/before-verify.ts` — `payloadKey` collision fix + allowlist event emission fix
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/hooks/after-settle.ts` — `settledProofLinks` type updated to `{ hash, timestamp }`
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/extension.ts` — `settledProofLinks` type updated; reads `.hash` from entry
- `/home/akash/PROJECTS/FLOW-LINK/packages/x402-compliance/src/middleware.ts` — replaced `Map<string, string>` with `createProofLinkStore()` (TTL-evicting); cleanup interval now covers both maps

---

NEXT STEPS:
1. Decide whether `allowlist` semantics should be sender-only (`||`) or both parties required (`&&`) — update accordingly and document.
2. Wire `ScreeningCache` (backed by the configured Redis) into `BeforeVerifyDeps` to avoid redundant Chainalysis API calls on repeated payments.
3. Replace `DefaultProofLinkService.computeHash` with `node:crypto` SHA-256 to eliminate the 2^31 collision domain.
4. Either remove `@flowlink/core` from dependencies or wire `ProofLinkEngine` as the default service implementation to eliminate the parallel compliance pipeline.
5. Add the missing tests: allowlist event assertion and `onAfterSettle` idempotency.
