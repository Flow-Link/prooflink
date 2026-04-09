# ProofLink Smart Contracts — Security Audit Report

**Date:** 2026-03-21
**Auditor:** Claude Sonnet 4.6 (automated security review)
**Scope:** `packages/contracts/src/` — all `.sol` files
**Compiler:** Solidity 0.8.25 (via-ir: false, optimizer: 200 runs)

---

## Executive Summary

Four contracts were reviewed: `ProofLinkRegistry`, `ProofLinkKYA`, `AgentInvoice`, and `ProofLinkFacilitator`, plus their shared `Types` library and `IEAS`/`IERC8004` interfaces. All four use the UUPS upgradeable proxy pattern via OpenZeppelin v5.

**Two critical vulnerabilities and two high-severity issues were identified and fixed.** One medium-severity design gap was also remediated. All fixes have been applied directly to the source and test files.

---

## Findings

### CRITICAL

**C-1 — `AgentInvoice.anchorInvoice` is permissionless — any caller can forge an issuer identity**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/AgentInvoice.sol:114`
— Any address could call `anchorInvoice(id, hash, victim_address, recipient, amount)` and create an on-chain record attributing a fraudulent invoice to an arbitrary `issuer`. Because `_issuerInvoices[issuer]` is updated and the `InvoiceAnchored` event fires with that address, off-chain indexers and UIs would show the forged invoice as belonging to the victim.
— **Fix applied:** Added `if (msg.sender != issuer && !hasRole(FACILITATOR_ROLE, msg.sender)) revert NotAuthorized();` as the final guard in `anchorInvoice`. The facilitator escape-hatch preserves the platform-anchoring use case documented in the architecture.

**C-2 — `AgentInvoice.updateState` — DISPUTED and REFUNDED transitions had zero access control**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/AgentInvoice.sol:181` (original)
— The comment `// DISPUTED and REFUNDED transitions are open (admin can also trigger)` translated to literally no `if` branch for those states. Any EOA could transition a PAID invoice to DISPUTED or a DISPUTED invoice to REFUNDED, enabling griefing (blocking settlement), extortion (threatening to raise false disputes), and denial-of-service.
— **Fix applied:** DISPUTED now requires `msg.sender == inv.recipient || hasRole(FACILITATOR_ROLE, msg.sender)`. REFUNDED requires `hasRole(FACILITATOR_ROLE, msg.sender)`. New `NotAuthorized` error added for clarity.

---

### HIGH

**H-1 — `ProofLinkRegistry` has no mechanism to set the IPFS content hash after anchoring**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkFacilitator.sol:264`
— `settle()` passes `bytes32(0)` as `ipfsContentHash` when calling `proofLinkRegistry.anchorReceipt(...)`, with the comment "IPFS hash set by off-chain engine later." However `ProofLinkRegistry` had no setter function, making every Facilitator-anchored receipt permanently have a zero IPFS hash. This breaks the compliance audit trail — the IPFS CID is the only pointer to the full compliance report JSON.
— **Fix applied:** Added `updateIpfsHash(bytes32 receiptId, bytes32 ipfsContentHash)` to `ProofLinkRegistry`, gated to `ATTESTER_ROLE`. Revoked receipts cannot have their hash updated. Emits `ReceiptIpfsUpdated`. New `InvalidIpfsHash` error guards zero-hash input.

**H-2 — `_enforceCompliance` spending-limit fail-open path missing `return`**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkFacilitator.sol:396–399` (original)
— In fail-open mode (`failClosed == false`), the sanctions and risk branches both `emit ... ; return;`. The spending-limit branch only `emit ...;` with no `return`. While execution would reach the end of the function regardless (it was the last check), this is structurally inconsistent and becomes a real bug if any code is ever inserted after the spending-limit block. More importantly, the pattern signals to future maintainers that falling through is safe — it is not.
— **Fix applied:** Added `return;` after the spending-limit `ComplianceCheckFailed` emission, matching the other fail-open branches exactly.

---

### MEDIUM

**M-1 — `verifyReceipt` and `getReceiptByTxHash` did not surface the revoked flag**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkRegistry.sol:271` (original)
— Both view functions returned the raw receipt struct without indicating whether it was revoked. A caller that checked compliance by calling `verifyReceipt` rather than `isPaymentCompliant` would receive a revoked receipt with no indication of its status. This is particularly dangerous for integrators who query raw receipt data.
— **Fix applied:** Both functions now return `(Types.ProofLinkReceipt memory receipt, bool isRevoked)`. All callers in tests updated accordingly. `isPaymentCompliant` already checked `revoked[rid]` directly and was unaffected.

---

### LOW

**L-1 — `ProofLinkKYA.initialize` silently accepts zero `validationRegistry_`**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkKYA.sol:98`
— `identityRegistry_` is validated against `address(0)` but `validationRegistry_` is intentionally allowed to be zero (optional integration). This is documented in the NatSpec and guarded with conditional checks throughout. However it creates a risk surface where a misconfigured deployment silently operates without ERC-8004 validation responses, never surfacing an error.
— **Not fixed** (intentional design). Recommend adding a deployment checklist item to verify the validation registry address before production deployment. If the registry must always be set, add the zero check.

**L-2 — `setRegistries` on `ProofLinkKYA` can silently leave `validationRegistry` unchanged when zero is passed**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkKYA.sol:245`
— `if (validationRegistry_ != address(0)) { validationRegistry = ...; }` means passing `address(0)` to `setRegistries` does not clear the registry — it silently ignores the parameter. If the intent is to clear it, this is a bug. If it is intentional, the NatSpec should say so explicitly.
— **Not fixed.** Clarify intent in NatSpec.

---

### WARNINGS (no code changes, design observations)

**W-1 — Sanctions bitmask layout is undocumented and partially inconsistent**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkFacilitator.sol:369` and `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkRegistry.sol:52`
— The schema string defines `uint16 sanctionsFlags` but the actual bitmask layout is only documented in comments: "bits 8-11 are match indicators." There is no on-chain invariant that the lower nibble (screening bits) must be set before the upper nibble (match bits) can be trusted. A malformed attestation with `sanctionsFlags = 0x0100` (OFAC match, nothing screened) passes the check correctly — it is blocked. But `sanctionsFlags = 0x0000` (nothing screened, nothing matched) also passes all checks, meaning an attester who omits screening entirely would not be caught on-chain.
— Recommend: add a `require(compliance.sanctionsFlags & 0x000F != 0, ...)` screened-bits check in both `verify` and `_enforceCompliance` if screening is always expected.

**W-2 — `settlementId` is non-deterministic (includes `block.timestamp`)**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkFacilitator.sol:236`
— `keccak256(abi.encodePacked(payload.paymentHash, payload.nonce, block.timestamp))` means two settlements with the same `paymentHash` and `nonce` but in different blocks produce different IDs. Since nonce reuse is already blocked, `block.timestamp` adds no uniqueness — it just makes the ID impossible to predict off-chain before the transaction mines.
— Recommend: `keccak256(abi.encodePacked(payload.paymentHash, payload.nonce))` for a fully deterministic settlement ID.

**W-3 — No `BatchTooLarge` enforcement**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkRegistry.sol:109`
— The error `BatchTooLarge` is declared but never used. `multiAttest` support was not implemented (the IEAS interface exposes it, but `ProofLinkRegistry` has no batch anchoring function). Remove or implement.

**W-4 — `isPaymentCompliant` does not check `sanctionsFlags`**
— `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkRegistry.sol:288`
— The compliance check only examines `riskScore > riskThreshold`. A receipt with a sanctions hit (non-zero match bits in `sanctionsFlags`) would still return `isCompliant = true` as long as the risk score is low. Sanctions hits should be a hard block regardless of risk score.

---

## Access Control Review

| Contract | Role | Gated Functions | Assessment |
|---|---|---|---|
| ProofLinkRegistry | `DEFAULT_ADMIN_ROLE` | `registerSchema`, `setRiskThreshold`, `revokeReceipt`, `_authorizeUpgrade` | Correct |
| ProofLinkRegistry | `ATTESTER_ROLE` | `anchorReceipt`, `updateIpfsHash` | Correct |
| ProofLinkKYA | `DEFAULT_ADMIN_ROLE` | `setRegistries`, `_authorizeUpgrade` | Correct |
| ProofLinkKYA | `VERIFIER_ROLE` | `issueKYA`, `revokeKYA`, `suspendKYA`, `reinstateKYA` | Correct |
| AgentInvoice | `DEFAULT_ADMIN_ROLE` | `_authorizeUpgrade` | Correct |
| AgentInvoice | `FACILITATOR_ROLE` | `updateState` (PAID→SETTLED, PAID→DISPUTED, DISPUTED→REFUNDED), `anchorInvoice` (platform use) | Correct after fix |
| AgentInvoice | none (msg.sender == issuer) | `anchorInvoice`, `updateState` (DRAFT→ISSUED, cancel) | Correct after fix |
| ProofLinkFacilitator | `DEFAULT_ADMIN_ROLE` | `setSpendingLimit`, `setRiskThreshold`, `setFailMode`, `setContractAddresses`, `unpause`, `_authorizeUpgrade` | Correct |
| ProofLinkFacilitator | `SETTLER_ROLE` | `settle` | Correct |
| ProofLinkFacilitator | `PAUSER_ROLE` | `pause` | Correct |

---

## Reentrancy Review

- `ProofLinkFacilitator.settle` is protected by `nonReentrant` (ReentrancyGuardUpgradeable). The nonce is marked used before the external `proofLinkRegistry.anchorReceipt` call, following CEI correctly. No reentrancy risk.
- `ProofLinkRegistry.anchorReceipt` calls `eas.attest(...)` (external) before updating `_receipts`/`receiptToEAS`/`txHashToReceipt`. However, the EAS contract is a trusted system contract and `ATTESTER_ROLE` is not reentrant-exploitable here since the duplicate check uses `receiptToEAS[receiptId] != bytes32(0)` which is set after the external call. A reentering attester could potentially anchor the same receipt twice before the state update. **Recommend:** move `receiptToEAS[receiptId] = easUID` to before the `eas.attest()` call (optimistic update), or mark it as trusted-contract-only. This is low-risk in practice since ATTESTER_ROLE is trusted, but the pattern is suboptimal.
- `ProofLinkRegistry.revokeReceipt` sets `revoked[receiptId] = true` before calling `eas.revoke()`. CEI is followed correctly.
- `ProofLinkKYA` and `AgentInvoice` make no external calls in state-changing functions (other than the optional ERC-8004 validation call in `issueKYA`, which cannot cause meaningful reentrancy since the state is already written before the call).

---

## Integer Overflow Review

Solidity 0.8.25 has built-in overflow checking. All arithmetic uses it:
- `_dailySpent[payload.payer][dayNumber] += payload.amount` — safe, `uint128` addition with built-in check.
- `spent + payload.amount > limit` — overflow possible if `spent` is near `type(uint128).max`. In practice, spending limits are user-set admin values and `_dailySpent` accumulates from real payments, so overflow requires settling `2^128 - 1` base units in a single day — not exploitable.

---

## Proxy Safety Review

All four contracts:
- Call `_disableInitializers()` in the constructor — storage-slot bricking of the implementation is prevented.
- Implement `_authorizeUpgrade` gated to `DEFAULT_ADMIN_ROLE` — upgrade path is controlled.
- Use `Initializable` from OZ v5, which sets the `_initialized` flag correctly.
- Storage layout: all contracts use unstructured (OZ standard) storage slots for proxy variables. Custom state is declared after OZ base contract state — layout is safe for upgrades as long as new variables are only appended, never inserted.

One note: The linter removed `__UUPSUpgradeable_init()` from `ProofLinkRegistry.initialize` (OZ v5 no-ops this), which is correct — OZ v5's `UUPSUpgradeable` no longer has an init function. Other contracts should be verified to not call it either (they do call it but it is a no-op, so harmless).

---

## NatSpec Coverage

| Contract | Functions with full NatSpec | Missing |
|---|---|---|
| ProofLinkRegistry | All public/external | None |
| ProofLinkKYA | All public/external | None |
| AgentInvoice | All public/external | `NotAuthorized` error NatSpec added |
| ProofLinkFacilitator | All public/external | None |
| Types library | All structs/enums | None |

Coverage is excellent. NatSpec is present on all public interfaces.

---

## Gas Optimization Notes

- `_issuerInvoices` and `_recipientInvoices` are unbounded arrays. `getInvoicesByIssuer` / `getInvoicesByRecipient` return full arrays — will hit gas limits at scale. Consider pagination or off-chain indexing (The Graph).
- `verify()` calls `kyaContract.verifyKYA()` as an external call even though it is a `view` function. This is an extra STATICCALL per verification. Consider caching KYA results or batching.
- `abi.encode(...)` in `anchorReceipt` produces a full ABI-encoded blob that is passed to EAS. This is unavoidable given EAS's interface.
- `_dailySpent` mapping uses `uint256` day numbers as keys — each day creates a new storage slot per agent. These slots are never cleared. Over years of operation, this will create significant storage bloat. Consider a compact rolling-window structure.

---

## Test Coverage Assessment

| Contract | Critical paths covered | Missing |
|---|---|---|
| ProofLinkRegistry | Anchor, revoke, verify, compliance check, schema registration, access control | `updateIpfsHash` — added in this audit |
| ProofLinkKYA | Issue, revoke, suspend, reinstate, expiry, re-issue after revoke, ERC-8004 integration | Expiry of suspended credential (edge case) |
| AgentInvoice | Full lifecycle, all valid/invalid transitions | DISPUTED/REFUNDED access control — added in this audit; `anchorInvoice` access control — added in this audit |
| ProofLinkFacilitator | Settle, verify, all compliance failure modes, fail-open, spending limits, KYA, nonce replay, deadline | Spending limit `return` consistency in fail-open mode test would be valuable |

---

## Files Modified

All fixes are in-place edits to existing source files:

- `/home/akash/PROJECTS/prooflink/packages/contracts/src/AgentInvoice.sol` — C-1 fix (access control on `anchorInvoice`), C-2 fix (access control on DISPUTED/REFUNDED), `NotAuthorized` error added.
- `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkRegistry.sol` — H-1 fix (`updateIpfsHash` function added, `ReceiptIpfsUpdated` event, `InvalidIpfsHash` error), M-1 fix (`verifyReceipt` and `getReceiptByTxHash` return `isRevoked` flag).
- `/home/akash/PROJECTS/prooflink/packages/contracts/src/ProofLinkFacilitator.sol` — H-2 fix (`return` added to spending-limit fail-open branch).
- `/home/akash/PROJECTS/prooflink/packages/contracts/test/AgentInvoice.t.sol` — Tests updated for access control changes; new access control tests added.
- `/home/akash/PROJECTS/prooflink/packages/contracts/test/ProofLinkRegistry.t.sol` — Tests updated for new return types; new `updateIpfsHash` and revoked-flag tests added.
