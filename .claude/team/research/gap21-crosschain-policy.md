# GAP-21: Cross-Chain Policy Synchronization for Autonomous Agents

**Status:** Research Complete
**Date:** 2026-03-25
**Scope:** How ProofLink should propagate agent delegation scopes (spending limits, allowlists, chain restrictions, time-bound authorizations) across heterogeneous chains — EVM, Solana, and beyond.

---

## 1. Problem Statement

ProofLink's `CompliancePolicyEngine` (`packages/core/src/policy/engine.ts`) and `ProofLinkEngine` (`packages/core/src/engine/prooflink.ts`) evaluate policies locally, per-request. Each `ComplianceRequest` carries a `chain` field (CAIP-2 format: `eip155:1`, `eip155:8453`, `solana:mainnet`) but policies themselves — spending thresholds, allowlists, blocklists, jurisdiction restrictions, velocity windows — exist only in-process memory of the API server.

The gap: **when an agent is delegated a spending scope on Ethereum, that scope is invisible to Solana programs, Base contracts, and any other chain the agent touches.** A $500/day limit set by a human operator on chain A does not prevent the agent from spending $500/day on chain B simultaneously. Cross-chain policy state is not synchronized.

This brief covers eight technical approaches to fix this, then recommends a layered implementation architecture for ProofLink.

---

## 2. Core Concepts

### 2.1 Agent Delegation Scope

In ProofLink, a delegation scope for an agent (`agentDid` in `kyaCredential`) minimally contains:

```typescript
interface AgentDelegationScope {
  agentDid: string;                    // e.g., "did:key:z6Mk..."
  spendingLimitUsd: number;            // per-period cap
  periodSeconds: number;               // rolling window
  allowedChains: string[];             // CAIP-2 chain IDs
  allowedAssets: string[];             // "USDC", "EURC", etc.
  allowedCounterparties?: string[];    // address allowlist
  blockedCounterparties?: string[];    // address blocklist
  expiresAt: string;                   // ISO-8601
  version: number;                     // monotonic, for revocation
}
```

Syncing this struct cross-chain is the core problem.

### 2.2 Synchronization Primitives Required

1. **Propagation**: pushing a policy update from a source chain (or off-chain) to N destination chains
2. **Revocation**: invalidating a previous delegation (monotonic version, tombstone)
3. **Verification**: a destination chain can trustlessly prove the policy it holds is canonical
4. **Velocity accounting**: aggregating spend across chains for a global limit (hardest problem)

---

## 3. Transport Layer Options

### 3.1 Chainlink CCIP

**What it is:** Cross-chain messaging protocol secured by two independent Decentralized Oracle Networks (Committing DON + Executing DON) plus a Risk Management Network (RMN).

**Message format:**
```solidity
struct EVM2AnyMessage {
    bytes receiver;          // ABI-encoded destination address
    bytes data;              // arbitrary payload — up to ~4KB practical limit
    EVMTokenAmount[] tokenAmounts;
    address feeToken;        // LINK or native gas token
    bytes extraArgs;         // gas limit for ccipReceive()
}
```
The `data` field is where ProofLink encodes a `PolicyUpdateMessage` (ABI-encoded or protobuf).

**Trust model:** Two-of-two DON consensus (Committing DON signs a Merkle root; Executing DON delivers; RMN independently blesses or curses per-chain lane). RMN is written in a different language by a different team — N-version programming. As of CCIP v2, cursing is per-chain-lane, not global.

**Latency:** Source-chain finality dependent. Ethereum L1 to any destination: ~13 minutes (2 epoch finality). Ethereum L2 (Base, Arbitrum) to destination: 2-5 minutes. L2 to L2 on same superchain: ~30-60 seconds.

**Cost:** Single fee on source chain, denominated in LINK or native gas. Ethereum mainnet: $2-15 per message depending on payload size and destination gas. L2 source chains: $0.05-0.50.

**CCIP 2.0 (Q4 2025 / early 2026):** Per-application risk tolerance levels — institutions can choose a security/speed tradeoff. Relevant: a ProofLink policy update could use a "high security, slower" profile while an x402 micropayment uses "fast, lower security."

**ProofLink application:**
- Policy updates (delegation scope changes) originate from an admin or agent runtime on any chain.
- `PolicySyncRouter` contract on each chain implements `CCIPReceiver` and updates a local `AgentPolicyRegistry` mapping `agentDid => DelegationScope`.
- The `DelegationScope.version` field is monotonic; the receiver contract rejects messages with `version <= storedVersion`.
- Cost: acceptable for infrequent policy updates. Not suitable for per-transaction policy checks.

**Chains supported:** 60+ as of early 2026. Includes Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BNB, Solana (via CCIP SVM adapter launched 2025).

---

### 3.2 LayerZero V2

**What it is:** Immutable, censorship-resistant messaging protocol with modular security. Each application configures its own Decentralized Verifier Networks (DVNs) and Executors per pathway.

**Message format (OApp standard):**
```solidity
// Outbound: encoded as bytes in lzSend()
struct PolicyUpdatePayload {
    bytes32 agentDidHash;    // keccak256 of DID string
    uint256 version;
    uint256 spendingLimitUsd;
    uint256 periodSeconds;
    bytes32[] allowedChains; // CAIP-2 hashed
    bytes32[] allowedAssets;
    uint256 expiresAt;
    bytes32[] allowedCounterparties;
}
```
Encoded as ABI bytes, max size ~32KB. Message options (gas limit, native drop) set separately as serialized bytes.

**DVN configuration for ProofLink:**
- Required DVNs: LayerZero's default DVN + one application-specific DVN (run by ProofLink or a trusted third party).
- Optional: CryptoEconomic DVN backed by restaked ETH via EigenLayer (2025 launch). Slashing on misbehavior.
- X-of-Y-of-N: e.g., 2-of-3-of-5. High-value policy changes (revoking delegation entirely) could require 3-of-5.
- Rate limiting: `RateLimiter.sol` pattern built into LayerZero v2 OApp standard — enforce max N policy updates per hour to prevent DoS.

**Trust model:** Application-configurable. Default DVN uses a federated set of verifiers. CryptoEconomic DVN adds slashing. No single point of failure as long as DVN threshold is not colluding.

**Latency:** DVN verification + Executor delivery. Typical: 30-120 seconds for EVM-to-EVM. Solana endpoints supported via LayerZero Solana adapter.

**Cost:** Executor fee (gas on destination) + DVN fee. EVM-to-EVM: $0.10-2.00. Highly configurable; ProofLink can pre-fund Executor allowances.

**Key differentiator for ProofLink:** `OApp.enforcedOptions()` lets ProofLink mandate a minimum gas limit on all policy update messages — prevents a malformed message from permanently bricking the destination registry. Also: the pathway-specific DVN config means Ethereum-to-Solana can have a different (stricter) security model than Base-to-Optimism.

---

### 3.3 Wormhole

**What it is:** 19-guardian multisig network that produces Verifiable Action Approvals (VAAs). Post-"W 2.0" upgrade (late 2025), ZK-tech reduces confirmation time to 30-90 seconds.

**Message format:**
```
VAA {
    version: u8,
    guardian_set_index: u32,
    signatures: [GuardianSignature; 13],  // 13-of-19 threshold
    timestamp: u32,
    nonce: u32,
    emitter_chain: u16,
    emitter_address: [u8; 32],
    sequence: u64,
    consistency_level: u8,
    payload: Vec<u8>               // arbitrary bytes, ProofLink policy encoded here
}
```
t-Schnorr multisig: cost-efficient, chain-agnostic. Linear in verifier count but cheaper than ECDSA multisig at threshold.

**NTT (Native Token Transfers) relevance:** Wormhole's NTT framework includes a `GlobalAccountant` that maintains cross-chain token supply integrity. ProofLink can adopt the same pattern for **global spend accounting** — each chain's `PolicyRegistry` reports net spend to the Global Accountant, which flags threshold breaches. This is the closest existing infrastructure to solving the velocity aggregation problem.

**Trust model:** 13-of-19 guardian consensus. Guardians are permissioned (major validators: Jump, Certus One, etc.). Not permissionless — this is a tradeoff vs. Hyperlane.

**Latency:** 30-90 seconds (post-ZK upgrade). Faster for non-Ethereum source chains.

**Cost:** Guardian network is subsidized; relayer fees vary. Typically $0.50-3.00 per cross-chain message.

**ProofLink application:** Best suited for **Solana as destination**. Wormhole has the deepest Solana integration. `wormhole-anchor-sdk` provides Rust/Anchor primitives to receive and parse VAAs in Solana programs. A ProofLink `policy_registry` Solana program would:
1. Receive VAA containing `PolicyUpdatePayload`.
2. Verify guardian signatures on-chain.
3. Update the PDA (Program Derived Address) keyed by `(agentDid, chain)`.
4. Reject if `payload.version <= stored_version`.

---

### 3.4 Hyperlane

**What it is:** Permissionless interchain messaging. Any developer can deploy Mailbox contracts on any chain without approval. Security is application-configurable via Interchain Security Modules (ISMs).

**ISM options relevant to ProofLink:**

| ISM Type | Mechanism | Latency | Best for |
|---|---|---|---|
| MultisigISM | M-of-N validator signatures | 30-90s | Standard policy updates |
| OptimisticISM | Assume valid, fraud window (hours) | Seconds (optimistic) / hours (challenged) | Low-value updates |
| AggregationISM | AND/OR of multiple ISMs | Varies | High-security scope revocations |
| RoutingISM | Different ISM per source chain | Per-ISM | Multi-chain deployments |

**Interchain Accounts (ICA) — critical feature:** Hyperlane ICA allows a contract on chain A to make authenticated calls to any contract on chain B, through a deterministic `OwnableMulticall` proxy (CREATE2). The ICA address is deterministic given `(origin, sender, router, ISM)`.

This means: ProofLink's admin contract on Ethereum can directly call `updateAgentPolicy()` on the Base policy registry, through the ICA, without the destination contract needing special CCIP/LayerZero receiver logic. The destination just needs a standard function interface.

**Message format:** Arbitrary bytes via `Mailbox.dispatch()`. ICA variant wraps a call as `(address target, uint256 value, bytes calldata data)[]`.

**Trust model:** Permissionless deployment; trust is in the ISM configuration. A `MultisigISM` with ProofLink's own validator set is fully self-sovereign. An `AggregationISM` combining ProofLink validators + Hyperlane's default validators gives defense-in-depth.

**Latency:** With `MultisigISM`: 30-90 seconds. With `OptimisticISM`: near-instant with an hours-long fraud window (not suitable for critical policy revocations).

**Cost:** Variable by ISM. Self-run validators + Relayer: near-zero gas overhead beyond destination execution. Third-party relayer: $0.05-0.50.

**ProofLink differentiation:** Hyperlane is the only option where ProofLink can deploy its own chain-specific ISMs without permission. For a new chain (e.g., a new appchain or Solana fork), no protocol upgrade is needed — just deploy a Mailbox and ISM. This future-proofs the architecture.

**ICA limitation:** Currently EVM-only. Solana not supported for ICA (only basic message passing via Warp Routes / Wormhole integration).

---

### 3.5 ERC-4337 Account Abstraction + ERC-7715 / ERC-7710

**What it is:** ERC-4337 replaces EOA-based transaction signing with `UserOperation` objects processed by an `EntryPoint` singleton and `Bundler` network. ERC-7715 standardizes the `wallet_grantPermissions` RPC method for session key / policy delegation. ERC-7710 (`DelegationManager`) enables on-chain redemption of delegated permissions.

**Cross-chain reality:** ERC-4337 `EntryPoint` is deployed independently per chain. There is no cross-chain state sync built into the standard. A session key granted on Ethereum with a $500 limit is a separate contract state from the $500 limit on Base — they do not share a velocity counter.

**EIP-7702 (Pectra, May 2025):** Allows EOAs to temporarily delegate to smart contract code. Combined with ERC-7715, it enables: an agent EOA can receive a session key that enforces spending limits per-chain, but limits are still per-chain, not global.

**The gap ERC-4337 alone cannot fill:** Global velocity accounting across chains. A $500/day limit means the sum across all chains must be tracked — ERC-4337 has no cross-chain sum primitive.

**ProofLink integration:**
- Use ERC-7715 `wallet_grantPermissions` as the **human-facing delegation UX** on EVM chains. Operators grant the agent a session key with encoded `AgentDelegationScope`.
- The scope is stored in ProofLink's on-chain `PolicyRegistry` (not just in the wallet).
- Cross-chain propagation uses CCIP or LayerZero to push the policy hash to other chains.
- Per-chain spend is reported to ProofLink's off-chain aggregator (or an on-chain Global Accountant via Wormhole) for velocity enforcement.

**ERC-7715 permission object (relevant fields):**
```json
{
  "chainId": "0x1",
  "address": "0xAgentSmartWallet",
  "expiry": 1780000000,
  "permissions": [
    {
      "type": "native-token-recurring-allowance",
      "data": { "allowance": "0x1DCD6500", "period": 86400 }
    },
    {
      "type": "erc20-token-recurring-allowance",
      "data": {
        "token": "0xUSDC",
        "allowance": "0x1DCD6500",
        "period": 86400
      }
    }
  ]
}
```
This is the on-chain anchor for the delegation. ProofLink reads this to build its `AgentDelegationScope` struct, then propagates cross-chain.

---

### 3.6 MoonPay Open Wallet Standard (OWS) — March 2026

**What it is:** Open-source specification (MIT) released March 23, 2026. Provides a universal, local-first, policy-gated wallet for AI agents. Backed by Ethereum Foundation, Solana Foundation, PayPal, Circle, LayerZero, Arbitrum, and 15+ others.

**Architecture (7 sub-specifications):**

| Sub-spec | Concern |
|---|---|
| Storage | Encrypted vault, AES-256-GCM, local-first, no cloud |
| Signing | Produce signatures without exposing private keys |
| Policies | Pre-signing policy engine — rules evaluated before key touched |
| Agent Access | MCP server interface, LangChain/Claude/ChatGPT native tool bindings |
| Key Isolation | Keys in protected memory, never swapped to disk |
| Wallet Lifecycle | Create, recover, rotate, revoke |
| Chain Support | 8 chain families: BTC, ETH (EVM), Solana, TON, Cosmos, etc. |

**Policy-gated signing (directly relevant):**
```json
{
  "policies": [
    { "type": "spending_limit", "asset": "USDC", "limit": 500, "period": "1d" },
    { "type": "chain_allowlist", "chains": ["eip155:8453", "solana:mainnet"] },
    { "type": "contract_allowlist", "contracts": ["0xUniswapV3Router", "..."] },
    { "type": "time_bound", "from": "09:00Z", "to": "17:00Z" },
    { "type": "expiry", "expiresAt": "2026-12-31T00:00:00Z" }
  ]
}
```
The policy engine runs **before** any signing occurs. No network call needed — purely local enforcement.

**Critical insight for ProofLink:** OWS is the **agent-side enforcement point**. It does not solve cross-chain synchronization — it enforces whatever policy is loaded into the local vault. ProofLink's role is to be the **authoritative source** that pushes policy updates into OWS-compliant agent wallets.

**Integration path:**
1. Human operator sets/updates delegation scope via ProofLink dashboard.
2. ProofLink API pushes updated `OWSPolicyDocument` to agent runtime.
3. Agent runtime loads updated policy into its OWS vault.
4. OWS pre-signing engine enforces limits locally before any transaction is signed.
5. ProofLink on-chain policy registries (synced via CCIP/LayerZero) serve as the verifiable backup for counterparties.

**GitHub:** `github.com/open-wallet-standard/core` (available on npm and PyPI).

---

### 3.7 Circle CCTP V2

**What it is:** Cross-chain USDC transfer protocol. CCTP V2 is the canonical version (launched March 11, 2025; CCTP V1 legacy phase-out starts July 31, 2026).

**Attestation model:**
- **Standard Transfer:** Circle Attestation Service observes burn event on source chain, waits for hard finality, issues signed attestation. Recipient uses attestation to mint USDC on destination.
- **Fast Transfer:** Attestation issued before source chain finalization. Reduces Ethereum-source transfer time from minutes to seconds. Enables multi-chain simultaneous transfers.
- **Hooks:** Post-transfer automation — developers register a hook contract that executes after USDC mints on destination.

**CCTP V2 Hook for ProofLink:**
```solidity
// Destination hook: after USDC mints, record spend against agent's policy
interface ICCTPHook {
    function handleReceiveMessage(
        uint32 sourceDomain,
        bytes32 sender,
        bytes calldata messageBody  // contains agentDid, amount, policyId
    ) external returns (bool);
}
```
When an agent transfers USDC cross-chain via CCTP, the hook can:
1. Decode the `agentDid` from the message body.
2. Look up the agent's policy in the local `PolicyRegistry`.
3. Increment the velocity counter.
4. Revert if limit exceeded (causing the USDC mint to fail).

**Trust model:** Centralized attestation (Circle's servers). This is a meaningful trust assumption — Circle is a regulatory actor. Acceptable for USDC-denominated flows but not for chain-agnostic policy enforcement.

**Chains supported:** All major EVM chains as of November 2025. Aptos and Sui by H1 2026.

**ProofLink application:** CCTP V2 is the native rail for USDC flows. The hook mechanism is the right place to enforce spend limits on USDC cross-chain transfers. This is a narrow but high-value integration — most ProofLink agent payments are USDC-denominated via x402.

---

### 3.8 EVM-to-Solana Policy Synchronization

**The fundamental challenge:** Solana's programming model is stateless (programs do not store their own state) and uses PDAs (Program Derived Addresses) keyed by seeds, not mappings. ERC-4337, ERC-7715, and ICA (Hyperlane) are EVM-only. Solana has no native account abstraction standard equivalent to ERC-4337 as of Q1 2026 (infrastructure noted as "slated for implementation in coming months").

**Solana policy enforcement primitives:**

1. **PDA-keyed policy registry:** A Solana program stores `DelegationScope` in a PDA keyed by `[b"policy", agentDidHash, chainId]`. This PDA is the on-chain truth for Solana-side enforcement.

2. **Cross-Program Invocation (CPI):** Before any agent transaction executes on Solana, the invoking program calls the `policy_registry` program via CPI to assert the agent is within limits. CPI depth limit is 4 — sufficient for a `payment_processor -> policy_registry` check.

3. **SPL token delegation:** Solana's SPL token standard has a built-in `Delegate` instruction — grant an account authority to transfer up to N tokens. This is a native spending cap at the token account level, enforced by the SPL Token program itself, no custom code required.

4. **CCIP SVM adapter (Chainlink, 2025):** Chainlink launched CCIP support for Solana in 2025. The adapter uses Program Derived Addresses as the cross-chain message receiver. A CCIP message from Ethereum can update a Solana PDA.

5. **Wormhole Anchor SDK:** Most mature cross-chain messaging for Solana. ProofLink policy updates sent as Wormhole VAAs can be parsed and verified in a Rust/Anchor program.

**Recommended Solana policy sync flow:**
```
Ethereum (policy update emitted)
  -> Wormhole guardians sign VAA
  -> Solana program receives VAA via wormhole_anchor_sdk::wormhole_post_message
  -> program verifies guardian signatures
  -> PDA [b"policy", agentDid, CURRENT_CHAIN] updated
  -> SPL token delegate authority adjusted to match new limit
```

**SPL delegate pattern:**
```rust
// agent_program.rs
pub fn update_policy_from_vaa(
    ctx: Context<UpdatePolicy>,
    vaa_body: PolicyUpdateVAA,
) -> Result<()> {
    require!(vaa_body.version > ctx.accounts.policy_pda.version, ErrorCode::StalePolicy);

    // Update PDA
    ctx.accounts.policy_pda.spending_limit_usdc = vaa_body.spending_limit_usd * 1_000_000;
    ctx.accounts.policy_pda.version = vaa_body.version;
    ctx.accounts.policy_pda.expires_at = vaa_body.expires_at;

    // Adjust SPL token delegate
    token::approve(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), Approve {
            to: ctx.accounts.agent_usdc_account.to_account_info(),
            delegate: ctx.accounts.agent_authority.to_account_info(),
            authority: ctx.accounts.policy_authority.to_account_info(),
        }),
        vaa_body.spending_limit_usd * 1_000_000, // lamports or token decimals
    )?;

    Ok(())
}
```

---

## 4. Protocol Comparison Matrix

| Protocol | Latency | Trust Model | EVM Cost | Solana Support | Permissionless | Velocity Aggregation |
|---|---|---|---|---|---|---|
| Chainlink CCIP | 2-13 min | DON + RMN (oracle) | $0.10-15 | Yes (CCIP SVM) | No | No (manual) |
| LayerZero V2 | 30-120s | DVN (configurable) | $0.10-2 | Yes (adapter) | Partially | No (manual) |
| Wormhole | 30-90s | 13-of-19 guardians | $0.50-3 | Yes (best) | No | Yes (Global Accountant) |
| Hyperlane | 30-90s | ISM (self-sovereign) | $0.05-0.50 | No (EVM only for ICA) | Yes | No |
| ERC-4337/7715 | N/A (per-chain) | EntryPoint | N/A | No | Yes | No (cross-chain gap) |
| OWS | Local (instant) | Local policy engine | $0 | Yes | Yes | No (local only) |
| CCTP V2 | Seconds-minutes | Centralized (Circle) | $0.01-0.50 | Pending (H1 2026) | No | No (USDC only) |

---

## 5. Recommended Architecture: ProofLink Cross-Chain Policy Sync

### 5.1 Layered Design

```
Layer 0: Human Operator / Admin Dashboard
  |
  v
Layer 1: ProofLink Policy Authority (off-chain, EAS-attested)
  |-- Signs PolicyUpdateMessage with operator key
  |-- Issues EAS attestation (schema: AgentDelegationScope)
  |-- Stores in IPFS / ProofLink receipt storage
  |
  v
Layer 2: Policy Propagation (on-chain)
  |-- Primary: LayerZero V2 OApp (EVM chains)
  |-- Primary: Wormhole VAA (Solana destination)
  |-- Secondary: CCTP V2 Hook (USDC-specific enforcement)
  |
  v
Layer 3: On-Chain Policy Registry (per chain)
  |-- EVM: PolicyRegistry.sol — mapping(bytes32 agentDid => DelegationScope)
  |-- Solana: policy_registry program — PDA [b"policy", agentDid]
  |
  v
Layer 4: Local Enforcement
  |-- OWS policy engine (agent-side, pre-signing)
  |-- CCIP/LayerZero receiver verifies version monotonicity
  |-- Solana: SPL token delegate caps
  |
  v
Layer 5: Velocity Aggregation (global spend tracking)
  |-- Wormhole Global Accountant pattern (off-chain aggregator)
  |-- Each chain's registry emits SpendEvent
  |-- Aggregator challenges policy if global sum breaches limit
```

### 5.2 PolicyUpdateMessage Schema

```typescript
// Canonical wire format (ABI-encodable for EVM, Borsh-serializable for Solana)
interface PolicyUpdateMessage {
  // Identification
  agentDidHash: Hex;        // keccak256(agentDid)
  policyId: Hex;            // keccak256(agentDid + issuedAt)

  // Versioning (monotonic — receivers MUST reject if version <= stored)
  version: bigint;
  issuedAt: number;         // unix timestamp
  expiresAt: number;        // unix timestamp

  // Scope
  spendingLimitUsd: bigint; // 6 decimal precision (USDC units)
  periodSeconds: number;
  allowedChains: Hex[];     // keccak256 of CAIP-2 string per chain
  allowedAssets: Hex[];     // keccak256 of asset symbol

  // Allowlists (optional — empty = unrestricted)
  allowedCounterparties: Hex[];
  blockedCounterparties: Hex[];

  // Authorization
  authoritySignature: Hex;  // operator ECDSA sig over keccak256(above fields)
  easAttestationUid: Hex;   // EAS UID for auditability
}
```

### 5.3 EVM PolicyRegistry Contract Interface

```solidity
interface IPolicyRegistry {
    struct DelegationScope {
        bytes32 agentDidHash;
        uint256 version;
        uint256 spendingLimitUsd;  // 6 decimals
        uint256 periodSeconds;
        uint256 expiresAt;
        bytes32[] allowedChains;
        bytes32[] allowedAssets;
        bytes32[] allowedCounterparties;
        bytes32[] blockedCounterparties;
    }

    // Called by CCIP receiver / LayerZero OApp lzReceive()
    function updatePolicy(
        bytes32 agentDidHash,
        DelegationScope calldata scope,
        bytes calldata authoritySignature
    ) external;

    // Called before every agent transaction on this chain
    function assertPolicyValid(
        bytes32 agentDidHash,
        uint256 amountUsd,
        address counterparty,
        bytes32 assetHash
    ) external returns (bool);

    // Called after each transaction to update velocity counter
    function recordSpend(
        bytes32 agentDidHash,
        uint256 amountUsd
    ) external;

    // Revoke — sets version to max, expiresAt to past
    function revokePolicy(bytes32 agentDidHash) external;

    event PolicyUpdated(bytes32 indexed agentDidHash, uint256 version);
    event PolicyRevoked(bytes32 indexed agentDidHash);
    event SpendRecorded(bytes32 indexed agentDidHash, uint256 amountUsd, uint256 cumulativeUsd);
}
```

### 5.4 Velocity Aggregation Strategy

Global velocity (spending across all chains) cannot be enforced purely on-chain without oracle infrastructure. Three viable approaches:

**Option A: Off-chain aggregator with on-chain challenge (recommended for MVP)**
- Each chain's `PolicyRegistry` emits `SpendRecorded` events.
- ProofLink's off-chain aggregator (part of the API server) subscribes to these events on all supported chains.
- When global sum approaches limit, aggregator sends a `pausePolicy(agentDid)` message via LayerZero to all chains simultaneously.
- Weakness: aggregator is a centralized component. Mitigated by: EAS-attested audit trail, operator alerts, and the fact that per-chain limits can be set conservatively (e.g., $200/chain for a $500/day global limit).

**Option B: Wormhole Global Accountant pattern**
- Extend Wormhole's NTT Global Accountant for ProofLink policy spend tracking.
- Each chain's registry integrates as a NTT "transceiver" and reports net spend cross-chain.
- Global Accountant (a Wormhole-managed program) aggregates and can block messages.
- Weakness: requires Wormhole integration on all chains, and the Global Accountant is a Wormhole-controlled contract.

**Option C: Conservative per-chain limits**
- If global limit is $L/day, set per-chain limit to $L / N where N is number of supported chains.
- Crude but zero-infrastructure. Weakest but fastest to ship.

**Recommendation:** Ship Option C for MVP, migrate to Option A in v1.1.

### 5.5 x402 Integration

ProofLink's x402 payment flow (`protocol: "x402"` in `ComplianceRequest`) already runs through `ProofLinkEngine.checkCompliance()`. To add cross-chain policy enforcement:

1. After KYA credential validation (Step 1 in `ProofLinkEngine`), add Step 1b: **on-chain policy lookup**.
2. Query the local chain's `PolicyRegistry.assertPolicyValid(agentDidHash, amountUsd, counterparty, asset)`.
3. On pass: proceed with existing pipeline.
4. On fail: return `REJECTED` with `blockReason: "Cross-chain policy limit exceeded"`.
5. After `APPROVED` decision: call `PolicyRegistry.recordSpend()` in a non-blocking async call (fire-and-forget, with retry on failure).

This adds ~20-50ms of RPC call latency to the existing <500ms pipeline target — acceptable.

### 5.6 OWS Integration

```typescript
// packages/core/src/policy/ows-sync.ts (new file)

import type { AgentDelegationScope } from "./types.js";

interface OWSPolicyDocument {
  version: number;
  policies: OWSPolicy[];
}

interface OWSPolicy {
  type: "spending_limit" | "chain_allowlist" | "contract_allowlist" | "time_bound" | "expiry";
  data: Record<string, unknown>;
}

export function delegationScopeToOWSPolicy(scope: AgentDelegationScope): OWSPolicyDocument {
  return {
    version: scope.version,
    policies: [
      {
        type: "spending_limit",
        data: {
          asset: "USDC",
          limit: scope.spendingLimitUsd,
          period: `${scope.periodSeconds}s`,
        },
      },
      {
        type: "chain_allowlist",
        data: { chains: scope.allowedChains },
      },
      {
        type: "expiry",
        data: { expiresAt: scope.expiresAt },
      },
      ...(scope.allowedCounterparties?.length
        ? [{ type: "contract_allowlist" as const, data: { contracts: scope.allowedCounterparties } }]
        : []),
    ],
  };
}
```

ProofLink API server pushes `OWSPolicyDocument` to the agent runtime via:
1. Webhook (if agent has a registered webhook endpoint — existing `WebhookManager`).
2. MCP tool response (if agent is connected via MCP — existing `mcp-server`).
3. Polling endpoint: `GET /v1/agents/:agentDid/policy` — agent polls on startup and on 401/policy-expired responses.

---

## 6. Implementation Phases

### Phase 1 — Foundation (2-3 weeks)
- [ ] Define `PolicyUpdateMessage` TypeScript types in `packages/shared/src/types/`.
- [ ] Implement `delegationScopeToOWSPolicy()` in `packages/core/src/policy/ows-sync.ts`.
- [ ] Add `GET /v1/agents/:agentDid/policy` endpoint to `apps/api`.
- [ ] Add `PolicyRegistry` interface to `packages/shared/src/types/` (no on-chain deployment yet).
- [ ] Conservative per-chain limits: update `PolicyConfig` to accept `perChainSpendingLimitUsd`.

### Phase 2 — EVM On-Chain Registry (3-4 weeks)
- [ ] Deploy `PolicyRegistry.sol` on Base (primary ProofLink chain).
- [ ] Deploy on Ethereum, Arbitrum, Optimism.
- [ ] Implement LayerZero V2 OApp: `PolicySyncOApp.sol` as cross-chain propagation.
- [ ] Add `ProofLinkEngine` Step 1b: on-chain policy lookup (configurable, fail-open if RPC unavailable).
- [ ] Emit `SpendRecorded` events; implement off-chain aggregator.

### Phase 3 — Solana (2-3 weeks)
- [ ] Implement `policy_registry` Solana program (Anchor).
- [ ] Wormhole VAA receiver for policy updates.
- [ ] SPL token delegate adjustment on policy update.
- [ ] Add `solana:mainnet` to supported propagation targets.

### Phase 4 — CCTP V2 Hook + OWS Push (1-2 weeks)
- [ ] Register CCTP V2 hook on all deployed chains.
- [ ] Implement `OWSPolicyDocument` push via existing webhook system.
- [ ] Add MCP tool: `prooflink_get_policy` for agents to pull their current scope.

### Phase 5 — Velocity Aggregation (2-3 weeks)
- [ ] Migrate from Option C (conservative per-chain) to Option A (off-chain aggregator + on-chain pause).
- [ ] `pausePolicy(agentDid)` LayerZero broadcast on limit breach.
- [ ] EAS attestation for all pause/revoke events.

---

## 7. Risks and Open Questions

### 7.1 Latency vs. Security Tradeoff
Policy updates via LayerZero (30-120s) or Wormhole (30-90s) create a window where an agent might execute a transaction on chain B before the policy revocation from chain A arrives. Mitigations:
- Conservative per-chain sub-limits (Phase 1).
- OWS local enforcement as a faster first line (zero-latency, local).
- CCIP can be configured for higher security / lower speed for revocations specifically.

### 7.2 Solana Account Abstraction Gap
Solana lacks ERC-4337 equivalent as of Q1 2026. The SPL token delegate + PDA policy registry approach is functional but coarser than EVM. Watch for Solana AA announcements in 2026 — the ecosystem has committed to closing this gap.

### 7.3 CCTP V2 Centralization
Circle's attestation service is a centralized trust assumption. For USDC-specific enforcement (CCTP hook), this is acceptable — Circle already controls USDC minting. For non-USDC assets, CCTP is not applicable.

### 7.4 OWS Adoption Risk
OWS was released March 23, 2026 — very new. The spec may evolve. ProofLink's `delegationScopeToOWSPolicy()` conversion layer should be versioned and backwards-compatible.

### 7.5 Global Velocity Accounting
No existing protocol solves global cross-chain spend aggregation without either centralized infrastructure or significant latency. This is a fundamental limitation of the current cross-chain stack. Options A/B/C all involve tradeoffs. ProofLink should document this limitation explicitly in the agent delegation UX.

### 7.6 ERC-7715 Browser Wallet Dependency
`wallet_grantPermissions` requires a wallet that implements ERC-7715 (MetaMask Delegation Toolkit, others). As of early 2026, adoption is limited. ProofLink's permission grant flow should support both ERC-7715 (when available) and a programmatic API flow (for headless agents that don't have a browser wallet).

---

## 8. Key Files to Modify

| File | Change |
|---|---|
| `packages/shared/src/types/policy.ts` | Add `AgentDelegationScope`, `PolicyUpdateMessage`, `OWSPolicyDocument` |
| `packages/core/src/policy/types.ts` | Add `perChainSpendingLimitUsd` to `PolicyConfig` |
| `packages/core/src/policy/ows-sync.ts` | New: `delegationScopeToOWSPolicy()` |
| `packages/core/src/engine/prooflink.ts` | Add Step 1b: `assertPolicyValid()` call |
| `packages/mcp-server/src/tools/` | New tool: `get_agent_policy` |
| `apps/api/src/routes/` | New route: `GET /v1/agents/:agentDid/policy` |
| `packages/core/src/policy/engine.ts` | `CompliancePolicyEngine` already supports `evaluateAll()` — wire to cross-chain scope |

---

## Sources

- [Chainlink CCIP Documentation](https://docs.chain.link/ccip)
- [CCIP Architecture Overview](https://docs.chain.link/ccip/concepts/architecture/overview)
- [CCIP Execution Latency](https://docs.chain.link/ccip/ccip-execution-latency)
- [Chainlink CCIP Risk Management Network](https://docs.chain.link/ccip/concepts/architecture/offchain/risk-management-network)
- [Chainlink: End-to-End Interoperability Standard](https://blog.chain.link/end-to-end-interoperability/)
- [Chainlink CCIP — 11,000 Banks Cross-Chain (BlockEden, Jan 2026)](https://blockeden.xyz/blog/2026/01/12/chainlink-ccip-cross-chain-interoperability-tradfi-bridge/)
- [LayerZero Protocol Overview](https://docs.layerzero.network/v2/concepts/protocol/protocol-overview)
- [LayerZero Message Channel Security](https://docs.layerzero.network/v2/concepts/protocol/message-security)
- [LayerZero x EigenLayer: CryptoEconomic DVN Framework](https://medium.com/layerzero-official/layerzero-x-eigenlayer-the-cryptoeconomic-dvn-framework-68af27ca2040)
- [LayerZero V2 Deep Dive](https://medium.com/layerzero-official/layerzero-v2-deep-dive-869f93e09850)
- [LayerZero OApp Standard](https://docs.layerzero.network/v2/concepts/applications/oapp-standard)
- [Wormhole Guardians](https://wormhole.com/docs/protocol/infrastructure/guardians/)
- [Wormhole Native Token Transfers Overview](https://wormhole.com/docs/products/token-transfers/native-token-transfers/overview/)
- [Wormhole NTT Architecture](https://wormhole.com/docs/products/token-transfers/native-token-transfers/concepts/architecture/)
- [Hyperlane Permissionless Interoperability](https://www.hyperlane.xyz/)
- [Hyperlane Modular Security](https://hyperlane.xyz/post/modular-security-with-hyperlane)
- [Hyperlane Interchain Accounts](https://docs.hyperlane.xyz/docs/applications/interchain-account)
- [Hyperlane Tiger Research Report](https://reports.tiger-research.com/p/hyperlane-eng)
- [ERC-4337: Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [ERC-7715: Grant Permissions from Wallets](https://eips.ethereum.org/EIPS/eip-7715)
- [MetaMask Delegation Toolkit](https://metamask.io/developer/delegation-toolkit)
- [Gelato: ERC-4337 to EIP-7702 Guide](https://gelato.cloud/blog/gelato-s-guide-to-account-abstraction-from-erc-4337-to-eip-7702)
- [MoonPay Open Wallet Standard — The Block](https://www.theblock.co/post/394609/moonpay-releases-wallet-standard-ai-agents)
- [MoonPay OWS Press Release](https://www.prnewswire.com/news-releases/moonpay-open-sources-the-wallet-layer-for-the-agent-economy-302722116.html)
- [OWS GitHub](https://github.com/open-wallet-standard/core)
- [MoonPay OWS — CoinCentral](https://coincentral.com/moonpay-launches-open-wallet-standard-for-ai-agents/)
- [Circle CCTP V2](https://www.circle.com/blog/cctp-v2-the-future-of-cross-chain)
- [CCTP V2 Version Updates](https://www.circle.com/blog/cctp-version-updates)
- [Circle CCTP Developers](https://developers.circle.com/cctp)
- [CCTP V2 on Sei](https://blog.sei.io/education/cross-chain-transfer-protocol-cctp-v2-native-usdc/)
- [x402 Protocol Overview](https://www.x402.org/)
- [x402 V2 Launch](https://www.x402.org/writing/x402-v2-launch)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [Coinbase x402 GitHub](https://github.com/coinbase/x402)
- [Cloudflare x402 Blog](https://blog.cloudflare.com/x402/)
- [Cross-Chain Messaging: IBC, LayerZero, CCIP Comparison (BlockEden, Jul 2025)](https://blockeden.xyz/blog/2025/07/28/cross-chain-messaging-and-shared-liquidity/)
- [Solana CPI Documentation](https://solana.com/docs/core/cpi)
- [Solana EVM to SVM: ERC-4337](https://solana.com/developers/evm-to-svm/erc4337)
- [CCIP Prerequisites for SVM to EVM](https://docs.chain.link/ccip/tutorials/svm/source/prerequisites)
- [State of AI Agents on Solana (Crossmint)](https://blog.crossmint.com/the-state-of-ai-agents-in-solana/)
- [Autonomous Agents on Blockchains (arXiv, Jan 2026)](https://www.arxiv.org/pdf/2601.04583)
- [Polygon Pessimistic Proof for Agglayer](https://polygon.technology/blog/introducing-the-pessimistic-proof-for-the-agglayer-zk-security-for-cross-chain-interoperability)
