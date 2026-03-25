# GAP-20: Event-Driven Streaming Payments for AI Agents

**Status:** Research Complete
**Date:** 2026-03-25
**Scope:** Payment model survey + implementation design for FlowLink integration
**Relevant codebase:** `packages/x402-compliance/` (current x402 settlement layer)

---

## Executive Summary

FlowLink currently implements x402 exact-amount settlement: one HTTP request, one EIP-3009 signature, one on-chain settlement. This is correct for compliance gating but architecturally limited for agent workloads that are:

- **High-frequency** (thousands of sub-cent calls per session)
- **Result-conditional** (pay only if the LLM/tool output satisfies a predicate)
- **Long-running** (streaming jobs measured in minutes, not milliseconds)
- **Multi-agent** (orchestrator delegates budget slices to sub-agents)

This brief surveys eight approaches, characterizes each against the four axes above, and designs a `StreamingPaymentManager` abstraction that FlowLink can layer on top of its existing x402-compliance middleware without breaking the current API surface.

---

## 1. Superfluid Protocol — Constant Flow Agreements + GDA Pools

### Payment Model

Superfluid operates on **Super Tokens** — ERC-20 wrappers with real-time balance accounting baked into the token itself. Balance is not stored as a discrete number; it is a function of time: `balance(t) = balance_at_open + flowRate * (t - t_open)`. No per-second transactions occur; a single state update establishes the flow, and the ledger computes balances lazily on read.

Two primitives are relevant:

**Constant Flow Agreement (CFA / Money Streaming)**
Creates a directed stream from sender to receiver at a fixed `flowRate` in wei/second. Opening, updating, and closing require one on-chain tx each. Between open and close, zero gas. A stream of 10 USDCx/month = `3,805,175,038,052 wei/s`. The sender must maintain a non-negative real-time balance or the stream becomes insolvent (liquidatable by sentinels).

**General Distribution Agreement (GDA) — Distribution Pools**
One distributor (e.g., the FlowLink escrow contract) streams to a pool. Recipients hold "units" in the pool. Gas cost is O(1) regardless of recipient count — distributing to 1,000 agents costs the same as distributing to 1. Each recipient's share is `flowRate * (units_i / totalUnits)`. Pool membership and unit assignment are mutable.

A key 2025 development: ERC-8004 (Agent Pool) formalizes an interface for AI agents to register with a GDA pool and earn continuous token streams based on task completion proofs, enabling the first standardized "pay-per-contribution-rate" model for agent networks.

### Latency

Stream open/close: L2 block time (250ms–2s on Polygon/Optimism). In-flight earnings: instant, no transactions required. The sender's balance drains continuously; recipient balance increases continuously.

### Gas Costs

- CFA open/update/close: ~100k–200k gas per operation on L1; ~20k–50k on L2
- GDA distribute (instant distribution): one tx, O(1) in recipient count
- Zero gas for per-second settlement — all implicit

### Conditional Release Mechanisms

**Native:** None. Superfluid streams are time-based (pay-per-second), not result-based. There is no built-in predicate.
**Composable:** A smart contract receiver can gate `flowRate` updates on oracle attestations. Pattern: an on-chain "task manager" contract receives the stream, holds it in escrow, and releases tranches to agent wallets upon event log verification (e.g., a Chainlink oracle confirming task output hash).

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Excellent | Zero marginal cost per call |
| Result-conditional | Poor native / Good with wrapper | Requires oracle bridge |
| Long-running | Excellent | Designed for indefinite streams |
| Multi-agent delegation | Good | GDA pool units are reassignable |

**Best fit:** Time-bounded service subscriptions where the agent is paid per-unit-time and output quality is validated off-chain with periodic stream adjustments.

---

## 2. Sablier — Lockup + Flow Streaming Models

### Payment Model

Sablier V2 has two distinct products:

**Lockup (vesting-oriented)**
Every stream is an ERC-721 NFT. Three shapes:
- **Lockup Linear**: constant rate with optional cliff. Cliff = period before any withdrawal is available; after cliff, linear drip at a fixed rate.
- **Lockup Dynamic**: composed of segments `(amount, exponent, milestone)` fed to an on-chain power function. Enables exponential growth, logarithmic decay, step functions, or arbitrary piecewise curves.
- **Lockup Tranched**: periodic unlocks (weekly, monthly). At each period boundary, a tranche becomes fully withdrawable.

All Lockup streams have a fixed end time and are funded upfront.

**Flow (debt-tracking, introduced 2024)**
Flow is a continuous debt ledger — no upfront deposit, no end time. The sender accrues a debt at a configured rate. The receiver can withdraw available debt at any time. Flow can be paused and resumed without resetting accrued debt. This is Sablier's answer to Superfluid's CFA, but without requiring a Super Token wrapper.

### Latency

Stream creation: one tx. Withdrawal: one tx per claim (recipient-initiated). No auto-push; recipients pull. For agent workloads, the withdrawal latency is gating: an agent must issue a withdrawal tx to access funds, adding L2 block time (~250ms–2s) per claim event.

### Gas Costs

- Stream creation: ~200k gas L1, ~50k L2
- Withdrawal: ~80k gas L1, ~20k L2
- Each unique stream = separate contract state — no O(1) multi-recipient scaling

### Conditional Release Mechanisms

**Not natively supported.** All Sablier streams release based on time elapsed, not result conditions. However, Lockup Dynamic's `exponent` parameter can be set to 0 to create step functions that mimic milestone-gated tranches. The milestones are still time-milestones, not oracle-verified events.

**Workaround:** A custodial wrapper contract holds the NFT and only forwards withdrawal calls after verifying an off-chain proof. This defeats the trustless property.

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Poor | Each withdrawal requires a tx |
| Result-conditional | Poor native | Step functions are time-gated, not predicate-gated |
| Long-running | Excellent (Flow) | Flow is indefinite |
| Multi-agent delegation | Moderate | NFT streams are transferable but 1:1 |

**Best fit:** Structured payroll for known-duration agent contracts (e.g., "this agent is engaged for 30 days at rate X"). Not suitable for per-call or per-result payment patterns.

---

## 3. Circle Nanopayments — Off-Chain Aggregation + Batched Settlement

### Payment Model

Circle Nanopayments (testnet March 2026, 12+ chains) is purpose-built for AI agent micropayments. The architecture:

1. **Client signs an EIP-3009 `transferWithAuthorization` off-chain** — this is identical to the x402 payment header FlowLink already processes.
2. **Signed voucher is submitted to Circle Gateway** (not on-chain) — near-instant ACK (~50ms).
3. **Circle Gateway runs inside an AWS Nitro Enclave (TEE)**: verifies EIP-3009 signatures, computes net balances across all pending vouchers.
4. **Batch settlement**: Gateway periodically (configurable) sweeps accumulated vouchers into a single on-chain tx, paying net balances. Gas cost per payment approaches zero — Circle absorbs batch gas and recovers via thin spread.

Minimum payment: $0.000001 USDC. Supported chains: Arbitrum, Base, Ethereum, Optimism, Polygon PoS, Avalanche, Sei, Sonic, Unichain, World Chain, HyperEVM, Arc.

The protocol **follows the x402 standard** — a Nanopayments facilitator is a drop-in replacement for Coinbase's standard x402 facilitator.

### Latency

Off-chain ACK: ~50ms. On-chain finality: deferred (batch window, configurable from seconds to hours). For agent workflows where "payment acknowledged" is sufficient for service delivery (i.e., the service trusts Circle's signed voucher), effective latency is ~50ms.

### Gas Costs

Effective cost per payment: ~$0.00 to developer. Circle absorbs batch gas, recovering via spread. For 10,000 payments batched into one tx, each payment's gas burden is ~1/10,000th of a single transfer.

### Conditional Release Mechanisms

None natively — it is a transfer primitive, not a conditional escrow. Conditionality must be implemented at the application layer before the EIP-3009 signature is submitted.

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Excellent | Sub-cent payments, zero gas |
| Result-conditional | None native | Application-layer responsibility |
| Long-running | Good | Signed vouchers are timestamped, expiry configurable |
| Multi-agent delegation | Moderate | Each agent needs its own wallet + EIP-3009 signing key |

**Best fit:** High-frequency agent-to-service micropayments (tool calls, LLM inference, API lookups) where per-call cost must be <$0.001 and gas elimination is critical. This is a direct upgrade to FlowLink's x402 facilitator for high-volume workloads — the existing `EIP3009Authorization` type in `packages/x402-compliance/src/types.ts` is already structurally compatible.

**Integration path for FlowLink:** The `FlowLinkX402Compliance` middleware is facilitator-agnostic. Replacing the Coinbase facilitator endpoint with a Circle Nanopayments Gateway endpoint requires zero changes to the compliance layer — only the `facilitatorUrl` in the x402 server config changes.

---

## 4. x402 Deferred Settlement — Cloudflare Batch Proposal

### Payment Model

x402 (launched May 2025, Coinbase + Cloudflare Foundation) repurposes HTTP 402 `Payment Required` as a machine-readable payment challenge. The base protocol is:

1. Server returns `402` with `X-Payment-Requirements` header (scheme, network, maxAmount, payTo, asset).
2. Client sends EIP-3009 signed authorization in `X-Payment` header of the next request.
3. Facilitator verifies signature and settles on-chain.
4. Server delivers resource.

**Cloudflare's deferred scheme** (proposed extension, not yet standardized) decouples the cryptographic handshake from on-chain settlement:

- Server issues a signed receipt (off-chain) immediately upon receiving a valid EIP-3009 authorization.
- Client proceeds without waiting for on-chain confirmation.
- Server accumulates authorizations and submits them in a batch at the end of a window (e.g., daily).
- Dispute window: client retains the signed receipt as proof of payment; server retains the authorization as proof of client intent.

This pattern is identical in structure to Circle Nanopayments but operated by the merchant rather than Circle.

**Current status:** The `exact/evm` scheme (immediate per-request settlement) is live and standardized. Deferred/batch is a governance proposal within the x402 Foundation (Coinbase + Cloudflare co-founders). No SDK implementation as of March 2026.

### Latency

Per-request ACK: sub-100ms (signature verify only). On-chain settlement: deferred to batch window. Effective latency for agent operations: same as Nanopayments (~50ms for service access).

### Gas Costs

Per-payment gas: O(1/N) where N = batch size. At N=1000, gas per payment approaches rounding error on L2.

### Conditional Release Mechanisms

Same as Nanopayments — the EIP-3009 authorization has `validAfter` / `validBefore` timestamps. Conditionality on result requires application-layer orchestration. The deferred scheme adds a natural dispute window where settlement can be withheld if the service was not correctly rendered — but this requires a trust relationship (the facilitator must adjudicate disputes).

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Excellent | Batch overhead amortized |
| Result-conditional | Poor native / architectural via dispute window | Dispute window = soft conditionality |
| Long-running | Good | Batch windows can span sessions |
| Multi-agent delegation | Poor | No delegation primitive in base x402 |

**Best fit:** Web crawlers, data pipeline agents, and API consumers where volume is high, amounts are micro, and fraud risk is low (Circle/Cloudflare absorb settlement risk).

---

## 5. Lightning Network L402 — Macaroons + Payment Proofs

### Payment Model

L402 (formalized as bLIP-0026, March 2025) implements HTTP 402 over the Lightning Network:

1. Server returns `402` with `WWW-Authenticate: L402 token="<macaroon>" invoice="<BOLT-11>"` header.
2. Client pays the Lightning invoice (~milliseconds, ~1 sat fee).
3. Client receives **payment preimage** (proof of payment — the hash preimage of the invoice's payment hash).
4. Client re-requests with `Authorization: L402 <macaroon>:<preimage>`.
5. Server verifies: (a) macaroon is well-formed and from this server, (b) preimage satisfies the payment hash committed in the macaroon.

**Macaroons** are the key primitive for agent delegation:
- **Attenuation**: a macaroon holder appends caveats (spending caps, service scope, time-based expiry) to create a restricted sub-credential without contacting the issuer.
- **Delegation**: the restricted macaroon is handed to a sub-agent, which can further attenuate it.

This creates a **hierarchical budget delegation system** without on-chain transactions per delegation step. A root agent can distribute scoped credentials to 100 sub-agents, each with independent spending limits, service restrictions, and expiry times.

Lightning Labs' `lightning-agent-tools` repo (2026) provides an MCP server and agent toolkit implementing this pattern.

### Latency

Lightning payment: ~100–500ms (global median for well-connected nodes). Routing failures increase tail latency. For agent use, Lightning's probabilistic routing is a reliability concern — failed payments require retry and rebalancing.

### Gas Costs

Zero on-chain gas. Lightning fees: ~1–50 sat per payment (~$0.0001–$0.005 at BTC prices). On Liquid Network (federated sidechain), fees are fixed and lower.

### Conditional Release Mechanisms

**Native and elegant.** The payment preimage is the condition. The server does not deliver the resource until the preimage is presented. Since the preimage can only be obtained by paying the invoice, the transaction is **atomically linked to service access**.

For pay-per-result: the server generates an invoice only after computing the result, then includes the result hash in the invoice's description/metadata. The client pays, receives the preimage, and uses it to claim the result from the server. This is not technically binding (server could withhold the result after payment), but the server's reputation is at stake. True atomicity requires a PTLC-based scheme.

**PTLC (Point Time-Lock Contract)** — proposed upgrade: instead of payment hash/preimage, the invoice commits to a secp256k1 scalar. The server reveals the scalar (and thus the DL witness) only upon correct service execution. This is adaptor-signature-based and is implemented in A402 (see Section 7).

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Good | Sub-second per payment on good routes |
| Result-conditional | Good (soft) / Excellent with PTLC | Preimage = access proof |
| Long-running | Moderate | Invoice expiry (CLTV) limits streaming |
| Multi-agent delegation | Excellent | Macaroon attenuation is built for this |

**Best fit:** Agents consuming paid APIs where budget delegation across sub-agents is required and BTC/Lightning is the settlement layer. The macaroon delegation model is uniquely well-suited for hierarchical agent systems.

---

## 6. Payment Channel Networks — State Channels for Micropayments

### Payment Model

State channels lock collateral in an on-chain contract and allow two (or more) parties to update a shared state off-chain. Each state update is a signed message; only the final state (or a dispute) requires on-chain settlement.

For micropayments, the relevant pattern is the **unidirectional payment channel**:
- Alice deposits 100 USDC into a channel contract with Bob.
- Alice sends signed state updates: `balance = {alice: 99, bob: 1}`, `{alice: 98, bob: 2}`, ...
- Bob can close the channel at any point by submitting the latest signed state on-chain.
- Alice cannot double-spend because the contract enforces that only increasing balances for Bob are accepted.

**Bidirectional channels** (Raiden, Sprites) use HTLCs or PTLCs for multi-hop payment routing across a network without direct channels between every pair.

**Raiden Network** (Ethereum): token-agnostic, supports ERC-20. Network scale limited by routing and liquidity provisioning. Development activity has slowed significantly since 2023.

**Perun** (research): virtual channels built on top of state channels — no direct on-chain setup required for intermediary hops. More efficient for sparse graphs.

**Sprites**: use a shared on-chain preimage registry to reduce HTLC lock time from O(path_length) to O(1), dramatically reducing capital lockup for routed payments.

### Latency

In-channel state update: sub-1ms (just a signature). Channel open/close: on-chain (L2: 250ms–2s). For agent workloads with long-lived sessions, this is the right tradeoff: pay open/close cost once, get free in-channel throughput.

### Gas Costs

- Channel open: ~200k gas
- Channel close (cooperative): ~100k gas
- Channel close (dispute): ~300k gas + challenge window
- In-channel payments: zero gas

For a 1-hour agent session making 10,000 calls, the amortized on-chain cost is (open + close) / 10,000 — negligible.

### Conditional Release Mechanisms

**HTLC (Hash Time-Lock Contract):** payment is released only if the recipient can present the preimage of a hash H before timeout T. Standard in Lightning. Enables atomic multi-hop payment routing.

**PTLC (Point Time-Lock Contract):** adaptor-signature based. The hash is replaced by a secp256k1 point; the preimage is a scalar (a discrete-log witness). Enables script-less cross-chain atomicity and is the primitive underlying A402.

**Conditional channels:** research (Programmable Payment Channels, 2024) extends state channels with arbitrary predicates evaluated by on-chain verifiers or TEEs.

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Excellent | In-channel: zero cost, near-zero latency |
| Result-conditional | Good with HTLC/PTLC | Requires hash/point preimage revelation |
| Long-running | Excellent | Session = channel lifetime |
| Multi-agent delegation | Poor native | No delegation; each agent-pair needs own channel |

**Best fit:** Persistent bilateral agent-to-service sessions (e.g., a long-running agent repeatedly calling one API provider). Multi-agent orchestration requires a routing network (Raiden/Lightning topology), adding complexity.

---

## 7. A402 — Atomic Service Channels with TEE (arXiv:2603.01179)

### Payment Model

A402 (Peking University + Shanghai Jiao Tong University, March 2026) identifies and solves a fundamental problem with x402: **the standard does not guarantee atomicity across payment, service execution, and result delivery**. A client can pay without receiving the result; a server can deliver a result without being paid.

A402 introduces **Atomic Service Channels (ASCs)**, a channel protocol where service execution is embedded into the payment channel state machine:

**Three-party structure:**
1. **Client Agent (A):** has USDC/BTC; wants to pay for service execution.
2. **Service Provider (S):** runs the service; wants payment upon correct execution.
3. **TEE Liquidity Vault (LV):** a Trusted Execution Environment (AWS Nitro or Intel SGX) that manages ASC lifecycles and blindly aggregates settlements.

**Atomic Exchange Protocol (within an ASC):**

Step 1: Client locks payment P in ASC state.
Step 2: Client sends request R to service provider inside encrypted TEE channel.
Step 3: Service provider executes R, producing result Res.
Step 4: Service provider generates an **adaptor signature** `σ'` on the new ASC state (payment to provider), conditioned on revealing scalar `s` where `s = DLEQ(result_commitment)`.
Step 5: Client verifies that `σ'` adapts correctly (proof that revealing `s` will complete the signature) and that the result commitment matches `H(Res)`.
Step 6: Client reveals `s` (equivalently, accepts the result), completing the adaptor signature and finalizing the payment.

**Guarantee:** payment is finalized IF AND ONLY IF the result is correctly delivered and its commitment verified. This is the first protocol to achieve true atomicity for agentic commerce.

**TEE Liquidity Vault:** aggregates settlements from many ASCs into a single on-chain tx, hiding individual payment amounts (privacy). The vault attests its computation via remote attestation.

### Latency

Prototype benchmark (2026): **~350ms median end-to-end latency**, **2,875 RPS peak throughput**. Orders of magnitude better than x402 per-request on-chain settlement. Implemented on both Bitcoin (PTLC-based) and Ethereum (adaptor signatures on ECDSA).

### Gas Costs

Per-payment on-chain cost: amortized across ASC batches. At 2,875 RPS and hourly settlement, each payment's on-chain footprint approaches 0. TEE vault aggregates N payments into 1 tx.

### Conditional Release Mechanisms

**Native and cryptographically enforced.** The adaptor signature scheme ensures that the service provider cannot receive payment without revealing `s`, and the client cannot obtain `s` without the service provider executing correctly (the TEE enforces this). No oracle required — the service itself is the oracle.

For **complex predicates** (e.g., "pay only if output satisfies quality metric Q"), the TEE can run the evaluator for Q inside the enclave and only reveal `s` if Q is satisfied. This is the strongest form of pay-per-result yet proposed.

### Suitability for Agent Workloads

| Axis | Rating | Notes |
|------|--------|-------|
| High-frequency | Excellent | 2,875 RPS, batched settlement |
| Result-conditional | Excellent | Cryptographic atomicity, no trusted third party |
| Long-running | Excellent | Channels are indefinitely open |
| Multi-agent delegation | Moderate | No macaroon-style delegation; each ASC is bilateral |

**Best fit:** High-value agent-to-service calls where atomicity is critical and service correctness must be cryptographically bound to payment. Particularly relevant for FlowLink's trust-layer positioning — this is the architecture that makes "pay-per-verified-result" a primitive, not an application concern.

**Critical gap vs. current FlowLink:** A402 requires TEE infrastructure (AWS Nitro / SGX). This is an operational commitment but aligns with Circle Nanopayments' own TEE-based settlement (both use AWS Nitro Enclaves).

---

## 8. Conditional / Event-Driven Payments — Pay-Per-Result Patterns

This section synthesizes the conditional release mechanisms across all protocols into actionable implementation patterns.

### Pattern A: Oracle-Gated Escrow (On-Chain)

```
Agent → deposits USDC into EscrowContract(conditionHash=H(Q))
EscrowContract → waits for OracleAttestation(hash, result)
Oracle (Chainlink CRE / Supra Threshold AI) → fetches result, attests on-chain
EscrowContract → releases to service provider if result satisfies Q, else refunds agent
```

**Latency:** Oracle round = 1–5 minutes (Chainlink). **Gas:** two txs (deposit + release). **Atomicity:** Yes, on-chain. **Suitable for:** high-value, low-frequency tasks (e.g., "pay $50 for a research report if it contains >= 10 citations"). Not suitable for sub-cent per-call patterns.

### Pattern B: Hash-Preimage Commitment (L402 / HTLC)

```
Service provider → computes result R, sets H = SHA256(R)
Service provider → issues invoice/challenge locking payment on H
Agent → pays, receives preimage P where SHA256(P) = H
Agent → presents P to service provider to claim R
```

**Latency:** Payment settle time (~100ms Lightning, ~50ms Circle Nanopayments). **Gas:** Zero (off-chain). **Atomicity:** Soft (server can withhold R after payment; no cryptographic binding without PTLC). **Suitable for:** API access tokens, per-call tool access.

### Pattern C: Adaptor-Signature Atomic Exchange (A402)

As described in Section 7. Full cryptographic atomicity. **Suitable for:** any call where result integrity is critical.

### Pattern D: Streaming with Periodic Oracle Checkpoints (Superfluid + Chainlink)

```
Orchestrator → opens Superfluid CFA to escrow contract at rate R tokens/second
Escrow contract → forwards floor(R * quality_score(t)) to service provider
Chainlink CRE → evaluates quality_score every checkpoint interval
If quality_score < threshold → escrow reduces flowRate to zero
```

**Latency:** Checkpoint interval (minutes to hours). **Gas:** One tx per checkpoint. **Suitable for:** long-running agents where output is evaluated periodically (e.g., monitoring agents, continuous data pipelines).

### Pattern E: Signed Voucher with Dispute Window (x402 Deferred / Nanopayments)

```
Agent → signs EIP-3009 voucher (validBefore = T + dispute_window)
Service provider → delivers result
If result invalid → agent does NOT submit voucher to facilitator (voucher expires)
If result valid → agent (or service) submits voucher; Circle/facilitator settles
```

This inverts the payment model: **the agent retains control of settlement**. Payment occurs only if the agent is satisfied. The tradeoff: service provider takes delivery risk (they delivered before being paid). Suitable only when service provider trusts the agent or has a reputation/stake mechanism.

**Latency:** Zero additional latency for service access. Settlement deferred. **Gas:** Batched (near zero). **Suitable for:** trusted agent-service pairs, subscription-style access.

---

## Comparative Analysis Matrix

| Protocol | Model | Latency | Gas/Call | Conditional | Multi-agent | Atomicity |
|----------|-------|---------|----------|-------------|-------------|-----------|
| Superfluid CFA | Continuous stream | ~1s (open/close) | 0 in-stream | No native | GDA units | Time-only |
| Superfluid GDA | Pool distribution | ~1s (update) | 0 in-stream | No native | Excellent | Time-only |
| Sablier Lockup | Scheduled vesting | Block time/withdraw | ~20k L2 | Time-milestones | Poor | Deposit-based |
| Sablier Flow | Debt ledger | Block time/withdraw | ~20k L2 | No | Poor | None |
| Circle Nanopayments | Off-chain batched | 50ms ACK | ~0 (absorbed) | No native | Poor | Soft (TEE) |
| x402 Exact | Per-request | Block time | ~50k L2 | No | No | No |
| x402 Deferred | Batched | 50ms ACK | ~0 | Dispute window | No | Soft |
| L402 / Lightning | Per-request | 100–500ms | 0 (sats) | Preimage-gated | Macaroons | Soft |
| State Channels | In-channel | <1ms | 0 in-channel | HTLC/PTLC | No native | HTLC |
| A402 ASC | In-channel + TEE | ~350ms | ~0 batched | Adaptor sig | No native | Hard |
| Oracle Escrow | On-chain | 1–5 min | 2 txs | Yes (any) | No | Hard |

---

## FlowLink Integration Design

### Architecture: `StreamingPaymentManager`

FlowLink should introduce a `StreamingPaymentManager` abstraction in a new package `packages/streaming-payments/`. This sits **beside** (not inside) `packages/x402-compliance/`, consuming the same `PaymentPayload` and `PaymentRequirements` types from `types.ts`.

```typescript
// packages/streaming-payments/src/types.ts

export type StreamMode =
  | "nanopayments"      // Circle off-chain batched, drop-in x402 upgrade
  | "superfluid_cfa"   // Continuous stream, time-based
  | "superfluid_gda"   // Pool distribution, multi-agent
  | "state_channel"    // Bilateral channel, high-frequency
  | "a402_asc"         // Atomic service channel, result-conditional
  | "l402"             // Lightning macaroon, budget delegation

export interface StreamConfig {
  mode: StreamMode
  sessionId: string           // ties payments to an agent session
  maxBudgetUsd: number        // hard cap for session
  conditionalRelease?: {
    predicateType: "preimage" | "adaptor_sig" | "oracle" | "dispute_window"
    predicateConfig: unknown   // mode-specific
  }
  delegation?: {
    enabled: boolean
    maxDepth: number           // macaroon attenuation depth (L402 only)
  }
}

export interface StreamingPayment {
  sessionId: string
  amountUsd: number
  mode: StreamMode
  conditionalProof?: string    // preimage hex | adaptor scalar | oracle attestation uid
  settledAt?: Date
  batchId?: string
}
```

### Recommended Implementation Sequence

**Phase 1 (Immediate, 0 infra change): Circle Nanopayments as Facilitator**

Replace the Coinbase facilitator URL with the Circle Nanopayments Gateway URL. The existing `FlowLinkX402Compliance` middleware requires no changes — `EIP3009Authorization` is already the correct type. All compliance hooks (sanctions screening, AML, travel rule, ProofLink) continue to run.

Implementation: one-line change in server config + env var `FACILITATOR_URL=https://gateway.nanopayments.circle.com`. Compliance at batch settlement time (the `afterSettle` hook) needs to handle deferred txhash — receipts are issued against the batch tx, not per-payment.

**Phase 2 (Short-term, 2–4 weeks): L402 Adapter for Multi-Agent Budget Delegation**

Add an L402 authentication layer that issues macaroons tied to a session budget. Sub-agents receive attenuated macaroons with spending caps. The existing `KYACredential` type in `types.ts` maps naturally to L402 macaroon caveats.

```typescript
// Macaroon caveat structure for FlowLink agents
interface FlowLinkMacaroonCaveats {
  "agent_id": string              // maps to KYACredential.agentId
  "max_spend_usd": number         // budget cap
  "allowed_services": string[]   // service endpoint patterns
  "expires_at": number           // unix timestamp
  "risk_max": number             // max AML risk score allowed
}
```

The `before-verify` hook can verify macaroon caveats as part of KYA verification.

**Phase 3 (Medium-term, 6–8 weeks): Superfluid GDA Integration for Agent Pool Payments**

For multi-agent orchestration scenarios, deploy a Superfluid Pool contract that FlowLink manages. Orchestrators open a CFA to the pool; sub-agents receive units. The compliance middleware wraps pool `updateMemberUnits()` calls. This maps well to ERC-8004's agent pool interface.

**Phase 4 (Research/Long-term): A402 ASC for Atomic Pay-Per-Result**

The A402 architecture requires TEE infrastructure (AWS Nitro Enclave). Circle Nanopayments already uses this. A FlowLink A402 integration would:
1. Run a TEE Liquidity Vault as a sidecar to the FlowLink API server.
2. All ASC lifecycle management happens inside the enclave.
3. The `afterSettle` hook receives the attested batch receipt from the vault.
4. Compliance (sanctions, AML) runs on vault inputs before ASC open.

This provides the strongest pay-per-result guarantee and is the architecture to target for FlowLink's long-term trust-layer differentiation.

---

## Risks and Open Questions

1. **Circle Nanopayments testnet reliability**: As of March 2026, this is testnet-only. Production SLA, dispute resolution process, and batch failure recovery are unspecified. Do not use for production until mainnet launch and SLA documentation.

2. **A402 TEE trust model**: The Liquidity Vault is trusted (AWS Nitro Enclaves are not formally verified). A compromised enclave can steal funds. FlowLink must evaluate whether this risk profile is acceptable given regulatory requirements.

3. **Superfluid liquidation risk**: CFA senders must maintain a positive buffer balance or face liquidation by sentinel bots. For agent wallets with unpredictable top-up patterns, this creates operational risk. The GDA pool admin wallet needs automated balance monitoring.

4. **L402 Lightning routing reliability**: Sub-second Lightning payments require well-connected nodes and adequate channel liquidity. Probabilistic routing failures (1–5% on poorly connected nodes) require retry logic. For high-volume agent workloads, this tail latency matters.

5. **x402 deferred settlement — no standard yet**: Cloudflare's batch proposal is a governance proposal, not an implemented standard. Building against it now requires betting on a specific governance outcome in the x402 Foundation.

6. **EIP-3009 overlap with all approaches**: All EVM-based approaches (Nanopayments, x402, Superfluid Super Tokens) converge on EIP-3009 `transferWithAuthorization` as the signing primitive. FlowLink's existing `EIP3009Authorization` type is the correct abstraction point. This is a strategic advantage — the existing middleware is extensible to all EVM streaming approaches without type changes.

---

## Sources

- [Superfluid GDA Wiki](https://github.com/superfluid-org/protocol-monorepo/wiki/General-Distribution-Agreement)
- [Superfluid Protocol Architecture](https://docs.superfluid.org/docs/technical-reference/Architecture)
- [Superfluid Distribution Pools](https://docs.superfluid.org/docs/protocol/distributions/guides/pools)
- [ERC-8004 Agent Pool](https://8004-demo.superfluid.org)
- [Sablier Stream Shapes](https://docs.sablier.com/concepts/lockup/stream-shapes)
- [Sablier Flow Overview](https://docs.sablier.com/concepts/flow/overview)
- [Sablier V2 Intro](https://blog.sablier.com/introducing-sablier-v2/)
- [Circle Nanopayments Launch](https://www.circle.com/blog/circle-nanopayments-launches-on-testnet-as-the-core-primitive-for-agentic-economic-activity)
- [Circle Nanopayments Technical](https://www.circle.com/nanopayments)
- [Crowdfund Insider — Circle Nanopayments](https://www.crowdfundinsider.com/2026/03/266110-circle-rolls-out-nanopayments-on-testnet-as-foundation-for-agent-driven-economies/)
- [Cloudflare x402 Blog](https://blog.cloudflare.com/x402/)
- [x402 Cloudflare Agents Docs](https://developers.cloudflare.com/agents/x402/)
- [Coinbase x402 Foundation Announcement](https://www.coinbase.com/blog/coinbase-and-cloudflare-will-launch-x402-foundation)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [x402 EVM Scheme Spec](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)
- [L402 Protocol Specification](https://docs.lightning.engineering/the-lightning-network/l402)
- [L402 for Agents — Lightning Labs 2026](https://lightning.engineering/posts/2026-03-11-L402-for-agents/)
- [L402 GitHub Repo](https://github.com/lightninglabs/L402)
- [Lightning Agent Tools](https://github.com/lightninglabs/lightning-agent-tools)
- [Macaroons Docs](https://docs.lightning.engineering/the-lightning-network/lsat/macaroons)
- [A402 Abstract (arXiv:2603.01179)](https://arxiv.org/abs/2603.01179)
- [A402 Full Paper HTML](https://arxiv.org/html/2603.01179v1)
- [Ethereum State Channels](https://ethereum.org/developers/docs/scaling/state-channels/)
- [Programmable Payment Channels](https://eprint.iacr.org/2023/347.pdf)
- [Chainlink AI Agent Payments](https://chain.link/article/ai-agent-payments)
- [Chainlink Programmable Payments](https://chain.link/article/programmable-payments)
- [Supra Threshold AI Oracles](https://supra.com/documents/Threshold_AI_Oracles_Supra.pdf)
