# SDK + Demo Code Review

**Reviewed:** `packages/sdk/src/` and `apps/demo/src/`
**Date:** 2026-03-21
**Reviewer:** automated senior review pass
**Status after fixes:** 21/21 tests passing, both packages typecheck clean

---

## Findings

### CRITICAL

**CRITICAL: `AbortSignal.timeout` reused across retry attempts — `packages/sdk/src/http.ts:147-155`**

The original code created `fetchInit` (including `signal: AbortSignal.timeout(...)`) once before the retry loop. On the first timeout, that signal becomes permanently aborted. Every subsequent retry immediately threw an `AbortError` before even reaching the network. This made retry logic completely ineffective for timeout scenarios.

Fix: `fetchInit` is now reconstructed inside the loop body on every attempt, giving each attempt a fresh `AbortSignal`.

---

### WARNING

**WARNING: `Retry-After` header referenced in comment but not implemented — `packages/sdk/src/http.ts:190`**

The comment read `// Retryable failure → respect Retry-After if present, else backoff` but the code unconditionally used exponential backoff. On 429 responses from rate-limited APIs, ignoring `Retry-After` causes unnecessary hammering and will exhaust retries faster than the server's stated recovery window.

Fix: The header is now parsed as a seconds value and applied before recording `lastError`.

**WARNING: Missing `deleteInvoice` endpoint — `packages/sdk/src/client.ts`**

The REST API surface includes `DELETE /invoices/:id` (inferred from the `CANCELLED` state and standard CRUD conventions). The client had no method for it. Callers transitioning invoices to `CANCELLED` would have to drop to the raw `HttpClient`, bypassing the typed layer.

Fix: `deleteInvoice(invoiceId: string): Promise<void>` added. Handles the 204 No Content path already present in `http.ts`.

**WARNING: Missing `listAgents` endpoint — `packages/sdk/src/client.ts`**

`GET /identity/agents` was absent. The client could fetch a single agent by ID (`getAgentIdentity`) or verify one (`verifyAgent`), but had no way to enumerate registered agents.

Fix: `listAgents(params?: PaginationParams): Promise<PaginatedResponse<AgentIdentity>>` added.

**WARNING: `riskScore` ignores `threshold` parameter — `apps/demo/src/utils/display.ts:69`**

`threshold` was accepted as a required parameter at every call site (`riskScore(8, 85)`, `riskScore(12, 85)`, `riskScore(2, 85)`) but the function body never referenced it. This is a dead parameter — it silently failed to convey whether the score actually exceeded the configured AML threshold, which is a core compliance signal.

Fix: The function now appends a `EXCEEDS threshold` indicator in red when `score >= threshold`.

**WARNING: ANSI stripping regex too narrow in `summaryBox` — `apps/demo/src/utils/display.ts:327`**

The original regex `/\u001B\[[0-9;]*m/g` only strips SGR sequences ending in `m`. Chalk emits other CSI final bytes (e.g., `K` for erase-line). More importantly it misses nothing in practice here because Chalk only emits SGR, but the pattern `/[0-9;]*/` allows zero-width matches against any byte sequence — the broader POSIX CSI pattern (`[\x30-\x3F]*[\x20-\x2F]*[\x40-\x7E]`) is correct and future-proof.

Fix: Regex updated to full CSI coverage.

---

### SUGGESTION

**SUGGESTION: Unused `formatJson` import in `full-demo.ts` — `apps/demo/src/scenarios/full-demo.ts:23`**

`formatJson` was imported but never called in `full-demo.ts`. The full JSON receipt display is only shown in `payment-demo.ts`. The unused import is harmless but creates noise and would flag under a strict linter.

Fix: Import removed.

**SUGGESTION: Test for `deleteInvoice` and `listAgents` were absent before this review**

Two new methods have corresponding tests added to `client.test.ts`. The `Retry-After` path also gained a dedicated test case (`respects Retry-After header on 429`). Total test count: 18 → 21.

**SUGGESTION: `ComplianceCheckParams.amount` is typed as `number` but `PaymentIntent.amount` in shared types uses `string` (decimal) — `packages/sdk/src/types.ts:49`**

The SDK's `ComplianceCheckParams` uses `amount: number` while the protocol-level `PaymentIntent` in shared uses `amount: string` to avoid floating-point precision loss. These two types represent the same semantic field but with different representations. If the API server expects a decimal string internally, the SDK silently converts it to a float via `JSON.stringify`. This should be aligned: either document that `ComplianceCheckParams.amount` is in the token's smallest integer unit (which the JSDoc currently says), or switch to `string` and match the protocol type. Not fixed here — requires API contract clarification.

**SUGGESTION: `backoffMs` applies jitter additively on top of the cap — `packages/sdk/src/http.ts:79-83`**

```ts
const base = Math.min(500 * 2 ** attempt, 8000);
const jitter = Math.random() * base * 0.25;
return base + jitter;
```

When `base` is capped at 8000ms, jitter can push the actual delay to 10 000ms (10s). For a `timeoutMs` default of 30 000ms and `maxRetries = 3`, the total worst-case wait before the final throw is ~3 × 10s = 30s, right at the timeout boundary. Not a bug, but worth documenting.

**SUGGESTION: `readKey` in `index.ts` does not guard `setRawMode` on non-TTY stdin — `apps/demo/src/index.ts:138-139`**

```ts
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding("utf8");
```

The guard is correct — `setRawMode` is only called when `isTTY` is truthy. However in a non-TTY context (piped input, CI), the `data` event emits buffered chunks rather than individual keypresses, so `readKey` may resolve with a multi-character string whose `.trim()` still works. No crash, but interactive selection is undefined in non-TTY environments. A guard that exits early with a usage message when not a TTY would be more explicit.

---

## SDK Assessment

| Criterion | Status |
|---|---|
| API coverage | Partial before fix (missing DELETE /invoices and GET /identity/agents); complete after |
| HTTP client — retry | Critical bug fixed (AbortSignal reuse) |
| HTTP client — Retry-After | Warning fixed |
| HTTP client — auth headers | Correct (`Authorization: Bearer`) |
| Types — params | Fully typed with JSDoc on every field |
| Types — responses | Fully typed via shared Zod-inferred types |
| JSDoc — public methods | Every public method documented with @param and @returns |
| Tests — coverage | All 11 client methods tested; 3 new tests added for new/fixed paths |

## Demo Assessment

| Criterion | Status |
|---|---|
| Works without external services | Yes — fully mocked, no real API calls |
| Visually impressive | Yes — spinner animations, colour-coded status, box-drawn tables, receipt formatting |
| Sanctions block showcased | Yes — `runSanctionsDemo` and Act 1 of `runFullDemo` both demonstrate OFAC SDN block |
| Compliance receipt showcased | Yes — `formatReceipt` renders a table with all check results |
| Invoice showcased | Yes — `formatInvoice` renders line-item table with totals |
| Timing display | Realistic — randomised within plausible ranges (55-200ms for screening, 18-30ms for AML), spinner sleep matches reported latency |
| Dead parameter in `riskScore` | Fixed — threshold now drives the EXCEEDS indicator |

---

## Files Modified

- `/home/akash/PROJECTS/prooflink/packages/sdk/src/http.ts` — AbortSignal fix, Retry-After implementation
- `/home/akash/PROJECTS/prooflink/packages/sdk/src/client.ts` — `deleteInvoice`, `listAgents`, `PaginationParams` import
- `/home/akash/PROJECTS/prooflink/packages/sdk/src/__tests__/client.test.ts` — 3 new test cases
- `/home/akash/PROJECTS/prooflink/apps/demo/src/utils/display.ts` — `riskScore` threshold, ANSI regex
- `/home/akash/PROJECTS/prooflink/apps/demo/src/scenarios/full-demo.ts` — removed unused import
