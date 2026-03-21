# Unit Test Verification Report

**Date:** 2026-03-21
**Runner:** Vitest v3.2.4
**Node:** >=22.0.0

## Summary

| Package | Test Files | Tests | Passed | Failed | Skipped | Duration |
|---------|-----------|-------|--------|--------|---------|----------|
| `packages/shared` | 4 | 417 | 417 | 0 | 0 | 829ms |
| `packages/core` | 15 | 414 | 409 | **5** | 0 | 3.41s |
| `packages/sdk` | 3 | 111 | 111 | 0 | 0 | 6.28s |
| `packages/integrations` | 6 | 197 | 197 | 0 | 0 | 1.93s |
| `packages/x402-compliance` | 2 | 67 | 67 | 0 | 0 | 1.83s |
| `packages/mcp-server` | 1 | 50 | 50 | 0 | 0 | 2.95s |
| `apps/api` | 6 | 133 | 133 | 0 | 0 | 2.32s |
| **TOTAL** | **37** | **1389** | **1384** | **5** | **0** | **~19.5s** |

**Overall: 99.6% pass rate (5 failures in `packages/core`)**

## Failure Details

All 5 failures are in `packages/core`, across 2 test files. They share a common root cause: **allowlist bypass logic does not short-circuit before sanctions screening**, causing the screener to fire with unmocked `fetch` and throw `TypeError: Cannot read properties of undefined (reading 'ok')`.

### File: `src/__tests__/edge-cases.test.ts` (3 failures)

#### 1. ProofLinkEngine -- empty string addresses > should match empty sender against allowlist entry of empty string
- **Location:** `src/__tests__/edge-cases.test.ts`
- **Error:** `SanctionsScreeningError: Sanctions screening failed for : Cannot read properties of undefined (reading 'ok')`
- **Root cause:** Allowlist check does not short-circuit for empty-string address; sanctions screener is invoked and crashes on unmocked fetch.
- **Traceback:** `ChainalysisProvider.screen (screener.ts:105)` -> `SanctionsScreener.screenAddress (screener.ts:357)`

#### 2. ProofLinkEngine -- allowlist and blocklist same address > should approve when sender is on both allowlist and blocklist (allowlist checked first)
- **Location:** `src/__tests__/edge-cases.test.ts:551`
- **Error:** `AssertionError: expected 'REJECTED' to be 'APPROVED'`
- **Root cause:** Blocklist is evaluated before allowlist, contradicting the test's assumption that allowlist takes priority.

#### 3. ProofLinkEngine -- allowlist and blocklist same address > should reject when receiver is on blocklist but sender is on allowlist (different addresses)
- **Location:** `src/__tests__/edge-cases.test.ts:567`
- **Error:** `AssertionError: expected 'REJECTED' to be 'APPROVED'`
- **Root cause:** Same as above -- blocklist evaluated before allowlist short-circuit.

### File: `src/__tests__/prooflink.test.ts` (2 failures)

#### 4. ProofLinkEngine > checkCompliance -- blocklist / allowlist > should immediately approve allowlisted sender
- **Location:** `src/__tests__/prooflink.test.ts:172`
- **Error:** `SanctionsScreeningError: Sanctions screening failed for 0xallowlisted1234567890abcdef123456789ab: Cannot read properties of undefined (reading 'ok')`
- **Root cause:** Allowlist check does not prevent sanctions screening from executing. The test expects allowlisted addresses to bypass all downstream checks, but `ProofLinkEngine.checkCompliance` (prooflink.ts:331) calls the screener regardless.

#### 5. ProofLinkEngine > checkCompliance -- allowlist case-insensitive matching > should treat allowlist addresses as case-insensitive
- **Location:** `src/__tests__/prooflink.test.ts:631`
- **Error:** `SanctionsScreeningError: Sanctions screening failed for 0xAABBCCDDeeff1234567890abcdef1234567890AB: Cannot read properties of undefined (reading 'ok')`
- **Root cause:** Same as #4 -- case-insensitive allowlist matching either not implemented or not checked before screener invocation.

### Root Cause Analysis

The bug is in `packages/core/src/engine/prooflink.ts` around line 331. The `checkCompliance` method does not check the allowlist before invoking `SanctionsScreener.screenAddress()`. The expected flow is:

1. Check allowlist -> if match, return APPROVED immediately
2. Check blocklist -> if match, return REJECTED immediately
3. Run sanctions screening

The actual flow appears to be:

1. Check blocklist -> if match, return REJECTED
2. Run sanctions screening (crashes for allowlisted-only test setups with no fetch mock)
3. Check allowlist (never reached)

**This is a code bug, not a test bug.** The allowlist should be evaluated before any external API calls.

## Passing Packages (no issues)

- **packages/shared** (417 tests): Crypto utilities, error classes, validation, schemas -- all solid.
- **packages/sdk** (111 tests): Client, error handling, retry logic, request structure -- all passing. Note: retry tests use real timers with ~500ms waits.
- **packages/integrations** (197 tests): TRM, Notabene, IPFS, EAS, Slack, Request Finance adapters -- all passing.
- **packages/x402-compliance** (67 tests): Middleware, hooks, sanctions, AML, travel rule, KYA, EAS attestation -- all passing.
- **packages/mcp-server** (50 tests): All MCP tool handlers passing.
- **apps/api** (133 tests): Health, auth, compliance, identity, invoices, webhooks -- all passing.

## Flaky Test Indicators

No flaky tests detected. All failures are deterministic and reproducible (same 5 failures on re-run). The SDK retry tests use real 500ms+ delays but are stable.

## Coverage Gaps Observed

1. **No test files found for:**
   - `packages/contracts` (Solidity -- would use Foundry/forge, not vitest)
   - `apps/dashboard` (Next.js frontend -- no unit tests)
   - `apps/demo` (has vitest config but no test files found in source)

2. **Integration/E2E tests exist but were not run** (out of scope for unit test verification):
   - `tests/integration/` (9 test files)
   - `tests/e2e/` (4 test files)

3. **Core engine coverage gaps:**
   - Allowlist/blocklist priority logic is buggy (see failures above)
   - No tests for concurrent compliance checks
   - No tests for ProofLinkEngine with partial config (e.g., screener enabled but no AML scorer)

4. **Missing negative-path coverage:**
   - SDK: no tests for network timeouts with AbortController
   - Integrations: no tests for rate limiting from upstream providers
   - MCP server: no tests for malformed JSON-RPC requests
