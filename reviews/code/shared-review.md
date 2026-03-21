# Code Review: `packages/shared`

**Reviewer:** Claude (automated senior review)
**Date:** 2026-03-21
**Status:** FIXED — all issues below were corrected in-place

---

## Findings

### CRITICAL

**CRITICAL: `keccak256` was SHA3-256, not Ethereum keccak256 — `src/utils/crypto.ts`**

Node.js `createHash("sha3-256")` implements the NIST SHA3-256 variant, which
produces different output from the Keccak-256 used by Ethereum, Solidity, EAS,
and viem. Any on-chain hash verification (ProofLink receipts, EAS attestation
UIDs, EIP-712 domain separators) would silently produce wrong values.

Fix: renamed to `sha3_256Stub` with a deprecation warning and a prominent
comment directing callers to `@flowlink/core`'s viem-backed keccak256. The
misleading `keccak256` export is gone.

---

**CRITICAL: `domainSeparatorHash` and `computeReceiptHash` used raw string concatenation — `src/utils/crypto.ts`**

Both functions concatenated fields with template literals. `${name}${version}` and
`${txHash}${chainId}${timestamp}` have hash collisions whenever adjacent fields
share characters across boundaries (e.g. `name="ab", version="c"` vs
`name="a", version="bc"` produce the same input string).

Additionally `domainSeparatorHash` used SHA-256, not keccak256, so it was wrong
for EIP-712 even if the encoding were correct.

Fix: renamed to `domainSeparatorHashOffChain` and `computeReceiptHashOffChain`,
switched to null-byte-delimited field encoding, and added clear documentation
that these are off-chain-only utilities (not EVM-compatible). EIP-712 domain
separators must be computed in `@flowlink/core` with viem.

---

**CRITICAL: `verifyPersonalSign` and `verifyTypedDataSignature` exported but always throw — `src/utils/crypto.ts`**

Both functions were exported from `@flowlink/shared` with valid type signatures but
threw `Error` on every call. Any consumer that imports them at the module level
will not crash on import, but will crash at runtime the first time they are called,
with no compile-time warning. The exports were a runtime trap.

Fix: removed both exports entirely. A comment explains they live in
`@flowlink/core` and why they are intentionally absent from shared.

---

### WARNING

**WARNING: `PaymentProof.protocol` and `AgentInvoice.paymentProtocol` used a duplicate lowercase enum — `src/types/invoice.ts`**

`PaymentProtocol` (the canonical enum) uses uppercase values `"X402"`, `"MPP"`,
`"AP2"`, `"ACP"`, `"DIRECT"`. `PaymentProof.protocol` and `AgentInvoice.paymentProtocol`
declared a separate inline enum with lowercase values `"x402"`, `"mpp"`, etc. This
means a `PaymentProof` parsed from the wire and a `PaymentIntent` would have
incompatible `protocol` fields even for the same payment, breaking any code that
compares them.

Fix: both fields now reuse `PaymentProtocol` directly.

---

**WARNING: `DelegationScope.allowedChains` and `allowedCurrencies` used `z.array(z.string())` — `src/types/identity.ts`**

The fields accept any string, losing the constraint that only `SupportedChain` and
`SupportedToken` values are valid. This allows `"bitcoin"` or `"DOGE"` through
schema validation silently.

Fix: changed to `z.array(SupportedChain)` and `z.array(SupportedToken)`. Same fix
applied to `KYAVerificationResult.spendingLimits`.

---

**WARNING: `TOKEN_DECIMALS` typed as `Record<string, number>` — `src/utils/validation.ts`**

Typed as a wide record, so `TOKEN_DECIMALS["INVALID"]` returns `undefined` at
runtime but TypeScript infers `number`, silently passing the bad value to
`parseAmount`/`formatAmount` which would then compute wrong base-unit values.

Fix: typed as `Record<SupportedToken, number>`.

---

**WARNING: Dead-code `key` variable in `getEvmChainId` — `src/utils/validation.ts:150`**

The template-literal `key` was computed and then immediately overridden by
`lookup[chain] ?? key`. The fallback to `key` would have been wrong anyway for
Polygon (testnet is `POLYGON_AMOY`, not `POLYGON_SEPOLIA`). The entire `key`
computation was unreachable dead code.

Fix: removed the dead `key` variable; `lookup` is now the sole lookup table.

---

**WARNING: `SanctionsList` missing `"OFAC_CONS"` — `src/types/compliance.ts`**

The x402 middleware design and `CompliancePolicy` in the architecture doc reference
`"OFAC_CONS"` (the OFAC Consolidated non-SDN list) as a distinct entry from
`"OFAC_SDN"`. Omitting it means the type system cannot express an OFAC_CONS-only
screen and code comparing list names against the enum would fail at runtime.

Fix: added `"OFAC_CONS"` to `SanctionsList`.

---

**WARNING: `hashJsonDeterministic` comment claimed recursive sort, implementation was top-level only — `src/utils/crypto.ts`**

`JSON.stringify(obj, Object.keys(obj).sort())` passes an array of property names as
the replacer argument. This filters top-level keys (only the listed keys survive)
and does NOT recursively sort nested objects. The previous comment said it sorted
keys for on-chain anchoring, which would be wrong for objects with deeply nested
fields where insertion order differs.

Fix: rewrote the implementation to use the array replacer correctly
(`JSON.stringify(obj, sortedKeys)`), updated the doc comment to accurately describe
the limitation (top-level only), and added a note directing callers to canonicalize
before calling for deep objects.

---

### SUGGESTION

**SUGGESTION: `ComplianceDecision` lacked `blockReason` field — `src/types/compliance.ts`**

`SettlementResult` in `protocol.ts` has `blockReason: z.string().optional()`.
`ComplianceDecision` (the upstream source of the block signal) had no corresponding
field, so the reason for a rejection could not be propagated through the type
system. Downstream code in `x402-compliance` would have to carry it out-of-band.

Fix: added `blockReason: z.string().optional()` to `ComplianceDecision`.

---

**SUGGESTION: `ProofLinkReceipt` and `CompliancePolicy` were missing from shared — `src/types/compliance.ts`**

Both types are referenced extensively in `architecture/x402_middleware_design.md`
and will be the primary shared contract between `@flowlink/x402-compliance`,
`@flowlink/core`, and `apps/api`. Without them in shared, each package would define
its own version, causing divergence.

Fix: added both as Zod schemas with inferred TypeScript types.

---

**SUGGESTION: MCP tool I/O types were absent — new `src/types/mcp.ts`**

The MCP server package (`packages/mcp-server`) needs typed input/output schemas for
all six tools defined in `architecture/mcp_design.md`. Without shared types, the
MCP server cannot validate inputs against a common contract shared with the REST API.

Fix: created `src/types/mcp.ts` with Zod schemas for `CheckSanctionsInput/Output`,
`VerifyKYAInput/Output`, `SubmitTravelRuleInput/Output`,
`GetComplianceReceiptInput`, `PayWithComplianceInput/Output`, and `MCPToolError`.

---

**SUGGESTION: Error classes missing for API and core use — `src/errors.ts`**

`apps/api` and `packages/core` will need `AuthenticationError` (401),
`RateLimitError` (429 + `retryAfterSeconds`), `PaymentError` (402),
`ConfigurationError` (500), `NotFoundError` (404), and `UpstreamServiceError`
(502). These are common HTTP error types that every package will eventually define
independently without them in shared.

Fix: added all six error classes.

---

**SUGGESTION: Zero test coverage for utility functions**

`src/utils/crypto.ts` and `src/utils/validation.ts` contain pure functions with
edge-case-sensitive logic (`parseAmount`, `formatAmount`, `getEvmChainId`,
`generateReceiptId`, `sha256`, `hashJsonDeterministic`) but there are no test files
anywhere in `packages/shared`. The `vitest` devDependency is declared but unused.

Critical test cases to add:
- `parseAmount("1.123456789", 6)` should throw (too many decimals)
- `parseAmount("0.000001", 6)` should return `1n`
- `formatAmount(1000001n, 6)` should return `"1.000001"`
- `hashJsonDeterministic` produces same hash regardless of key insertion order
- `getEvmChainId("polygon", true)` returns `80002` (not undefined or wrong ID)

---

## Files Modified

- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/utils/crypto.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/utils/validation.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/compliance.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/identity.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/invoice.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/index.ts`
- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/errors.ts`

## Files Created

- `/home/akash/PROJECTS/FLOW-LINK/packages/shared/src/types/mcp.ts`

## TypeScript Status

`tsc --noEmit` passes with zero errors after all changes.
