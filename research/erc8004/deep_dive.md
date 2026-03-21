# ERC-8004: Deep Dive Research
**For: FlowLink — Agentic Payment Trust Layer**
**Researched: 2026-03-20**
**Researcher: Team Beta**

---

## Table of Contents

1. [What Is ERC-8004?](#1-what-is-erc-8004)
2. [Problem Statement & Motivation](#2-problem-statement--motivation)
3. [Authors & Institutional Backing](#3-authors--institutional-backing)
4. [Current Status & Timeline](#4-current-status--timeline)
5. [Full Technical Specification](#5-full-technical-specification)
   - 5.1 Identity Registry
   - 5.2 Reputation Registry
   - 5.3 Validation Registry
   - 5.4 Agent Registration File Schema
6. [Trust Models](#6-trust-models)
7. [Protocol Dependencies](#7-protocol-dependencies)
8. [Deployment & Ecosystem](#8-deployment--ecosystem)
9. [Relationship to Payments: x402 & ERC-8183](#9-relationship-to-payments-x402--erc-8183)
10. [Related Standards](#10-related-standards)
    - ERC-3643 (T-REX)
    - ERC-7528
    - ERC-7856
    - ERC-681
    - ERC-8122 / ERC-8126 / ERC-8183
11. [Compliance & Legal Considerations](#11-compliance--legal-considerations)
12. [Known Implementations & Projects](#12-known-implementations--projects)
13. [Community Reception & Criticism](#13-community-reception--criticism)
14. [Security Risks](#14-security-risks)
15. [Comparison to Other ERCs](#15-comparison-to-other-ercs)
16. [The Full Agentic Protocol Stack](#16-the-full-agentic-protocol-stack)
17. [FlowLink Implications](#17-flowlink-implications)
18. [Open Questions & Gaps](#18-open-questions--gaps)

---

## 1. What Is ERC-8004?

ERC-8004, titled **"Trustless Agents,"** is a draft Ethereum Standards Track (ERC category) that defines a minimal on-chain infrastructure layer enabling autonomous AI agents to be discovered, evaluated, and interacted with across organizational boundaries without pre-existing trust.

It is explicitly **not** a token standard (not ERC-20, not ERC-721 in the transfer sense). It is an **application-layer infrastructure standard** — closer in spirit to ERC-3643 (identity + compliance enforcement) or ENS (naming) than to fungible/non-fungible tokens. It provides the plumbing for trust; it does not move money.

The standard introduces three singleton on-chain smart contract registries:

1. **Identity Registry** — Who is this agent? (ERC-721-based portable ID)
2. **Reputation Registry** — What is this agent's track record? (feedback signals)
3. **Validation Registry** — Did this agent actually do what it claimed? (cryptographic proofs)

EIP link: https://eips.ethereum.org/EIPS/eip-8004

Official contracts: https://github.com/erc-8004/erc-8004-contracts

---

## 2. Problem Statement & Motivation

### The Trust Gap

Existing agent communication protocols (Google's A2A, Anthropic's MCP) are designed for **internal enterprise deployments** where the calling party already trusts the agent provider. They have no mechanism for:

- Discovering unknown agents across organization boundaries
- Verifying that an agent will do what it advertises
- Building portable reputation across interactions
- Establishing trust proportional to transaction value

When an AI agent must hire another agent from an unknown provider to complete a subtask, there is currently no trustless way to answer: "Is this agent legitimate? Has it performed well before? Can I verify it did the work?"

### The Lemon Problem

Without reputation infrastructure, agent markets suffer from the "lemons problem" — buyers cannot distinguish high-quality providers from low-quality ones, causing market collapse toward the lowest common denominator.

### Corporate Capture Risk

Existing solutions (API keys, platform vouching) require agents to operate inside closed platform ecosystems. If AI payment and discovery infrastructure is controlled by a handful of corporations, they gain the ability to:
- Systematically exclude "high-risk" industries (iGaming, adult content, crypto)
- Charge rent on all machine-to-machine commerce
- Surveil all agentic economic activity

ERC-8004's Ethereum-based approach is deliberately permissionless.

---

## 3. Authors & Institutional Backing

**Core Authors (from EIP metadata, created 2025-08-13):**

| Author | Organization | Role |
|--------|-------------|------|
| Marco De Rossi | MetaMask / ConsenSys | AI Lead at MetaMask; primary driver |
| Davide Crapis | Ethereum Foundation (dAI team lead) | Research lead |
| Jordan Ellis | Google | A2A protocol alignment |
| Erik Reppel | Coinbase | x402 payment layer alignment |

**Institutional Backing:**

The Ethereum Foundation's **dAI team** (decentralized AI) formally incorporated ERC-8004 into their **2026 strategic roadmap** as one of two "key focus areas" (alongside x402). The dAI team's stated goal: establish Ethereum as the global decentralized settlement and coordination backbone for AI.

**Ecosystem Supporters (as of mainnet launch):**
- ENS (naming infrastructure)
- EigenLayer (restaking for validation)
- The Graph (indexing, micropayments via GraphTally)
- Taiko (L2 scaling)
- Phala Network (TEE attestation)
- Virtuals Protocol (co-authored ERC-8183, the commerce layer)

**Community traction:**
- 2,000+ community members viewed and discussed the proposal on Ethereum Magicians within three weeks of publication
- 75+ projects signaled build interest before mainnet
- 30,000+ agent registrations in first week post-mainnet (January 2026)
- Second most discussed formal improvement on Ethereum Magicians forum at time of draft
- 1,100+ active builders in ERC-8004 communities (November 2025)

---

## 4. Current Status & Timeline

| Date | Event |
|------|-------|
| 2025-08-13 | ERC-8004 formally created and submitted |
| 2025-08-19 | Ethereum community discussion peaks; Ethereum Magicians thread opens |
| 2025-10-09 | ERC-8004 v1 released |
| 2025-10-~25 | Ethereum Foundation dAI team formally unveils standard with ecosystem backing |
| 2025-11-21 | Trustless Agents Day at Devconnect |
| 2025-12 | Testnet deployments across Sepolia, Base Sepolia, Linea, Hedera |
| 2026-01-29 | **Mainnet deployment on Ethereum** (and 35+ networks simultaneously) |
| 2026-02-25 | ERC-8183 (companion commerce standard) proposed by Virtuals + dAI |
| 2026-03 | v2 specification in development (enhanced MCP, x402 integration, on-chain storage options) |

**Official EIP Status: DRAFT** (as of research date). Despite draft status, the contracts are deployed on mainnet and actively used — which is not unusual for Ethereum application-layer ERCs.

---

## 5. Full Technical Specification

### 5.1 Identity Registry

The Identity Registry is built on **ERC-721 with URIStorage extension**. Every agent receives a unique NFT-based identifier that is portable, censorship-resistant, and tradeable on secondary markets.

**Agent Identifier Format:**
```
{namespace}:{chainId}:{identityRegistry}
```
Example: `eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

**Core Interface Functions:**

```solidity
// Registration (three overloads)
function register(string agentURI, MetadataEntry[] metadata) external returns (uint256 agentId)
function register(string agentURI) external returns (uint256 agentId)
function register() external returns (uint256 agentId)

// URI management
function setAgentURI(uint256 agentId, string newURI) external

// Metadata (key-value store per agent)
function getMetadata(uint256 agentId, string metadataKey) external view returns (bytes)
function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external

// Agent wallet binding (EIP-712 signed)
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature) external
function getAgentWallet(uint256 agentId) external view returns (address)
function unsetAgentWallet(uint256 agentId) external
```

**Events:**
```solidity
event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)
event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)
```

**Key design decisions:**
- Agent wallet is separate from the NFT owner address (hot/cold key separation)
- The wallet binding uses EIP-712 signatures, verifiable by both EOAs (EIP-191) and smart contract wallets (ERC-1271)
- The `agentWallet` is the operational signing key; the NFT owner is the governance/custody key

### 5.2 Reputation Registry

Provides a standardized interface for feedback submission and retrieval. Critically: it stores raw feedback signals, not aggregated scores. Aggregation is intentionally off-chain.

**Feedback Submission:**

```solidity
function giveFeedback(
    uint256 agentId,
    int128 value,              // Signed integer feedback value
    uint8 valueDecimals,       // 0-18 range; scales the value
    string calldata tag1,      // Optional categorization tag
    string calldata tag2,      // Optional secondary tag
    string calldata endpoint,  // Optional: which endpoint was used
    string calldata feedbackURI,   // Optional: off-chain detailed report
    bytes32 feedbackHash           // Optional: hash of feedbackURI content
) external
```

**Constraints:**
- `valueDecimals` must be 0–18 (enforced on-chain)
- Feedback submitter **cannot** be the agent owner or an approved operator (anti-self-review)
- The server agent issues a **signed feedback authorization** to the client, which the client presents when submitting feedback — this prevents spam and unverified reviews
- Authorization uses EIP-191 (for EOAs) or ERC-1271 (for smart contract clients)

**Read Functions:**

```solidity
// Aggregate summary
function getSummary(
    uint256 agentId,
    address[] calldata clientAddresses,
    string calldata tag1,
    string calldata tag2
) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)

// Individual feedback entry
function readFeedback(
    uint256 agentId,
    address clientAddress,
    uint64 feedbackIndex
) external view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)

// Bulk read
function readAllFeedback(
    uint256 agentId,
    address[] calldata clientAddresses,
    string calldata tag1,
    string calldata tag2,
    bool includeRevoked
) external view returns (address[] clients, uint64[] feedbackIndexes, int128[] values, uint8[] valueDecimals, string[] tag1s, string[] tag2s, bool[] revokedStatuses)

// Response management
function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex, address[] calldata responders) external view returns (uint64)
function getClients(uint256 agentId) external view returns (address[])
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)
```

**Feedback management:**
```solidity
function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external
function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string responseURI, bytes32 responseHash) external
```

**Events:**
```solidity
event NewFeedback(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 feedbackIndex,
    int128 value,
    uint8 valueDecimals,
    string indexed indexedTag1,
    string tag1,
    string tag2,
    string endpoint,
    string feedbackURI,
    bytes32 feedbackHash
)
event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)
event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)
```

**Proof of Payment Integration:**

The `feedbackURI` and `feedbackHash` fields are designed to optionally contain x402 payment receipts. This creates value-weighted reputation: a $10,000 transaction's review carries more economic credibility than a free-tier interaction. The EIP explicitly anticipates payment proofs appearing inside feedback objects, though it remains deliberately out-of-scope in the core spec.

### 5.3 Validation Registry

Provides pluggable hooks for independent verification of agent work. Think of it as an on-chain certificate of work completion that escrow contracts can query.

**Request Submission (must be agent owner or operator):**

```solidity
function validationRequest(
    address validatorAddress,   // Which validator to invoke
    uint256 agentId,
    string calldata requestURI,     // Off-chain job specification
    bytes32 requestHash             // Hash of requestURI content
) external
```

**Response Submission (must be the original validatorAddress):**

```solidity
function validationResponse(
    bytes32 requestHash,
    uint8 response,         // 0-100 scale
    string calldata responseURI,    // Optional: evidence link
    bytes32 responseHash,
    string calldata tag             // Optional: categorization
) external
```

**Read Functions:**

```solidity
function getValidationStatus(bytes32 requestHash) external view returns (
    address validatorAddress,
    uint256 agentId,
    uint8 response,
    bytes32 responseHash,
    string tag,
    uint256 lastUpdate
)

function getSummary(
    uint256 agentId,
    address[] calldata validatorAddresses,
    string calldata tag
) external view returns (uint64 count, uint8 averageResponse)

function getAgentValidations(uint256 agentId) external view returns (bytes32[])
function getValidatorRequests(address validatorAddress) external view returns (bytes32[])
```

**Events:**
```solidity
event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)
event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)
```

**Critical escrow integration pattern:**

```solidity
// Escrow contract reading the validation registry
if (validationRegistry.getValidationStatus(requestHash).response >= 75) {
    // Release payment to provider
    paymentToken.transfer(provider, escrowAmount);
} else {
    // Refund client
    paymentToken.transfer(client, escrowAmount);
}
```

This is the "no work, no pay" guarantee enforced cryptographically rather than through centralized dispute resolution.

### 5.4 Agent Registration File Schema

The registration file (stored off-chain, IPFS or HTTPS, referenced by the Identity Registry token URI) follows this schema:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",

  // REQUIRED fields
  "name": "AgentName",
  "description": "Natural language description. MAY include capabilities, pricing, interaction methods.",
  "image": "https://example.com/agent-image.png",

  // OPTIONAL: service endpoints
  "services": [
    {
      "name": "A2A",
      "endpoint": "https://api.agentxyz.com/a2a/",
      "version": "1.0.0"
    },
    {
      "name": "MCP",
      "endpoint": "https://api.agentxyz.com/mcp/",
      "capabilities": {
        "tools": [
          { "name": "tool_id", "description": "Tool description" }
        ]
      }
    },
    {
      "name": "web",
      "endpoint": "https://agentxyz.com/"
    },
    {
      "name": "ENS",
      "endpoint": "agentxyz.eth"
    },
    {
      "name": "DID",
      "endpoint": "did:ethr:0x..."
    },
    {
      "name": "email",
      "endpoint": "agent@agentxyz.com"
    }
  ],

  // OPTIONAL: x402 payment support flag
  "x402Support": true,

  // OPTIONAL: payment receiving address
  "payment": {
    "chain": "base",
    "address": "0xAgentWalletAddress"
  },

  // OPTIONAL: active status
  "active": true,

  // OPTIONAL: cross-chain registrations
  "registrations": [
    {
      "chainId": 8453,
      "registryAddress": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      "agentId": 42
    }
  ],

  // OPTIONAL: supported trust mechanisms
  "supportedTrust": ["reputation", "validation-staking", "zkml", "tee"]
}
```

**Service name convention:** The `name` field in services uses a defined vocabulary: `web`, `A2A`, `MCP`, `OASF`, `ENS`, `DID`, `email`. This allows discovery clients to filter by protocol.

**Storage:** The file is stored on IPFS (preferred for censorship resistance) or HTTPS. The on-chain registry stores only the URI and a hash. Content changes require a new URI update transaction, creating an immutable version history.

---

## 6. Trust Models

ERC-8004 supports four distinct trust models, selectable per use case:

### 1. Reputation-Based Trust
- **Mechanism:** Clients submit authorized feedback; off-chain aggregators compute scores
- **Best for:** Low-to-medium value tasks, commodity services
- **Limitation:** Vulnerable to Sybil attacks and collusion rings; requires feedback authorization to mitigate
- **Implementation:** Read `ReputationRegistry.getSummary()` before engagement

### 2. Stake-Secured Re-execution (Crypto-Economic Validation)
- **Mechanism:** Third-party validators re-run the job and stake ETH/tokens on the outcome; slashing if they lie
- **Best for:** Deterministic, re-executable tasks (data transformations, computations)
- **Implementation:** Custom validator contracts + `ValidationRegistry`
- **Ecosystem:** EigenLayer AVS (Active Validation Services) are a natural fit

### 3. Zero-Knowledge Machine Learning (zkML)
- **Mechanism:** Agent generates a ZK proof of correct model execution; on-chain verifier contract checks proof mathematically
- **Best for:** ML inference tasks requiring verifiable correctness without revealing model weights
- **Implementation:** JOLT-Atlas architecture (lookup tables over arithmetic circuits); proof posted to `ValidationRegistry`
- **Property:** Deterministic, trust-minimized — proof either validates or doesn't
- **Limitation:** Currently expensive/slow for large models; improving rapidly

### 4. Trusted Execution Environment (TEE) Oracle
- **Mechanism:** Agent runs inside a hardware-isolated enclave (Intel SGX, TDX, AMD SEV); enclave generates a cryptographic attestation proving the correct code ran on the correct inputs
- **Best for:** Privacy-sensitive tasks, proprietary model weights, confidential data processing
- **Implementation:** Phala Network (dstack/ROFL), Automata (SGX SDK), Oasis Protocol (ROFL framework)
- **Property:** Secret data stays secret; attestation is publicly verifiable

### Trust Tiering by Value

| Transaction Value | Recommended Trust Model |
|------------------|------------------------|
| < $10 | Reputation only |
| $10 - $1,000 | Reputation + staking validation |
| $1,000 - $100,000 | Reputation + zkML or TEE validation |
| > $100,000 | Multi-model: zkML + TEE + multisig evaluator |

---

## 7. Protocol Dependencies

ERC-8004 formally depends on:

| Dependency | Role |
|-----------|------|
| **EIP-155** | Replay protection (chain ID in signatures) |
| **EIP-712** | Typed structured data signing (agent wallet binding) |
| **ERC-721** | NFT standard (agent identity tokens) |
| **ERC-1271** | Contract signature validation (smart contract wallets as clients/agents) |

Optional integrations mentioned in spec or community:
- **EIP-7702** — Gas sponsorship for frictionless feedback submission
- **EIP-5192** — Soulbound tokens (used by Chitin for non-transferable agent certificates)
- **ENS** — Human-readable agent names

---

## 8. Deployment & Ecosystem

### Contract Addresses (Reference Implementation)

**Mainnet pattern:**
- IdentityRegistry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**Testnet pattern (Sepolia):**
- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

The addresses use "vanity deployment" — the `8004` prefix is intentional (see `VANITY_DEPLOYMENT_GUIDE.md` in the contracts repo).

**Deployed Networks (35+):**

Major: Ethereum, Arbitrum, Optimism, Polygon, Base, Avalanche, BSC, Celo, Gnosis, Linea, Mantle, Metis, Scroll, Taiko, Soneium

Emerging: Abstract, Hedera, Arc, MegaETH, SKALE, Monad, XLayer, GOAT

Testnet: Sepolia, Base Sepolia, Arbitrum Testnet, Polygon Amoy, Scroll Testnet

### Repository

- **Contracts:** https://github.com/erc-8004/erc-8004-contracts
  - 128 commits, 197 stars, 81 forks, 19 open issues (as of research date)
  - Stack: Hardhat, TypeScript, Hardhat Ignition for deployment
  - Key files: `ERC8004SPEC.md` (normative spec), `UPGRADEABLE_IMPLEMENTATION.md`, `VANITY_DEPLOYMENT_GUIDE.md`

- **Example:** https://github.com/vistara-apps/erc-8004-example
- **Awesome list:** https://github.com/sudeepb02/awesome-erc8004

### SDKs

| Language | Package |
|----------|---------|
| JavaScript/TypeScript | `erc-8004-js` (ChaosChain SDK) |
| Python | `erc-8004-py`, `chaoschain-sdk` (PyPI) |
| Go | Praxis Protocol Go SDK |

---

## 9. Relationship to Payments: x402 & ERC-8183

ERC-8004 is deliberately **payment-agnostic**. Payments are explicitly out of scope in the core spec. However, the standard is designed to complement two payment protocols:

### x402 Protocol

**Origin:** Coinbase + Cloudflare. Revives HTTP 402 "Payment Required" status code.

**Mechanism:**
1. Agent makes HTTP request to service endpoint
2. Service responds with `402 Payment Required` + `PAYMENT-REQUIRED` header (base64 `PaymentRequired` object)
3. Agent checks payment terms against budget constraints
4. Agent resubmits request with `PAYMENT-SIGNATURE` header containing `PaymentPayload`
5. Service verifies via facilitator; delivers resource
6. Receipt becomes proof of payment

**Integration with ERC-8004:**
- Agents advertise `x402Support: true` in their registration file
- Payment receipts from x402 transactions can be included in ERC-8004 reputation feedback (`feedbackURI` pointing to payment proof)
- Creates value-weighted reputation: paid transactions get higher credibility weight than free trials
- ENS names resolve agent payment addresses, providing human-readable payment intent signals

**x402 v2 (December 2025):** Multi-chain by default; compatible with legacy payment rails (ACH, card networks).

**Adoption:** 35M+ transactions, $10M+ volume since Solana launch.

**x402 website:** https://www.x402.org/

### ERC-8183: The Commerce Layer

**Proposed:** 2026-02-25 by Virtuals Protocol + Ethereum Foundation dAI team.

**What it solves:** ERC-8004 provides identity and reputation but no mechanism to actually lock payment against work delivery. ERC-8183 provides the programmable escrow primitive.

**The Trigger:** $3M+ in agent-to-agent transactions were occurring with no escrow, no delivery verification, and no recovery mechanism.

**Core Concept:** Every task is a **"Job"** — a smart contract primitive with four lifecycle states.

**Job Lifecycle:**
```
OPEN → FUNDED → SUBMITTED → TERMINAL (Completed | Rejected | Expired)
```

**Three Parties:**
- **Client:** Creates job, deposits funds into escrow
- **Provider (Agent):** Performs work, submits deliverable hash
- **Evaluator:** Any address (AI agent, ZK verifier, DAO, multisig) that calls `complete()` or `reject()`

**Core Interface:**
```solidity
function createJob(address provider, address evaluator, uint256 expiry, string taskDescription, address hook) external returns (bytes32 jobId)
function fund(bytes32 jobId) external payable
function submit(bytes32 jobId, bytes32 deliverableHash) external  // provider only
function complete(bytes32 jobId) external  // evaluator only → releases funds
function reject(bytes32 jobId) external    // evaluator only → refunds client
function claimRefund(bytes32 jobId) external  // anyone, post-expiry
```

**Hook System:** Optional smart contracts attached to jobs that execute callbacks on state transitions. Enables bidding mechanisms, reputation thresholds, capital management, privacy-preserving submissions. Crucially: `claimRefund` explicitly excludes hook callbacks to prevent malicious blocking of refunds.

**ERC-8004 Integration:**
- ERC-8183 job completion generates verifiable on-chain records: deliverable hash, evaluator attestation, settlement outcome
- These records feed directly into ERC-8004's Reputation Registry
- Creates the closed loop: **Discovery (ERC-8004) → Transaction (ERC-8183) → Reputation Update (ERC-8004)**

**The Full Machine Payment Stack:**
```
x402        → Per-API-call micropayments (streaming, sub-cent)
ERC-8183    → Task-level escrow (minutes to hours, $1 to $1M)
ERC-8004    → Trust/reputation anchor (persistent, cross-platform)
```

---

## 10. Related Standards

### ERC-3643 (T-REX: Token for Regulated EXchanges)

**Origin:** Tokeny Solutions. Became Ethereum Standard Track Final.

**Purpose:** Permissioned security token standard with on-chain identity verification enforced at the transfer level.

**Core Components:**
1. **IERC3643 Token:** ERC-20 compatible but all transfers invoke compliance checks before execution
2. **IIdentityRegistry:** Whitelist of eligible holders; `isVerified()` returns TRUE only if holder has required claims from trusted issuers
3. **IIdentityRegistryStorage:** Separates storage from logic; allows multiple token contracts to share one whitelist
4. **ICompliance:** `canTransfer(from, to, amount)` — enforces global rules (investor caps by country, per-investor limits)
5. **ITrustedIssuersRegistry:** Which KYC/AML claim issuers are trusted
6. **IClaimTopicsRegistry:** Which claim types are required to hold this token

**ONCHAINID Integration:** Each investor has an on-chain identity contract holding cryptographic claims (KYC status, investor type, country, accreditation). Claims are signed by trusted issuers. `isVerified()` validates claim presence + issuer trust + topic match.

**Transfer Flow:**
```
transfer() called
→ sender has sufficient free balance? (total - frozen)
→ receiver.isVerified() == true?
→ token not paused?
→ compliance.canTransfer(from, to, amount) == true?
→ execute transfer
```

**Forced transfers:** Agents (delegated operators) can `forcedTransfer()` for regulatory recovery scenarios.

**Relevance to FlowLink:** ERC-3643 is the gold standard for **compliant tokenized assets**. If FlowLink issues compliance tokens, stablecoin representations, or needs to gate payment access by verified identity, ERC-3643 is the template.

**EIP:** https://eips.ethereum.org/EIPS/eip-3643
**Docs:** https://docs.erc3643.org/
**Implementation:** https://github.com/TokenySolutions/T-REX

---

### ERC-7528 (ETH Native Asset Address Convention)

**Author:** Joey Santoro. Published: 2023-10-03.

**Purpose:** Standardizes the address `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` as the canonical representation of native ETH wherever an ERC-20 address is used.

**Why it matters:**
- Protocols create separate event schemas for ETH vs. ERC-20, causing data fragmentation
- Off-chain indexers must handle two code paths
- ERC-7528 creates one unified event format

**Specification:**
```
Any field where an ERC-20 address would be used but ETH is the underlying token
MUST use: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```

**Relevance to FlowLink:** When implementing payment routing that handles both native ETH and ERC-20 tokens, always use this address convention to maintain compatibility with indexers, wallets, and aggregators.

**EIP:** https://eips.ethereum.org/EIPS/eip-7528

---

### ERC-7856 (Chain-Specific Payment Requests)

**Purpose:** URI scheme for cross-chain payment requests. Solves ambiguity when the same asset exists on multiple chains.

**URI Format:**
```
cspr://<recipient>/<amount>/<token-address>?on-success=<url>&on-error=<url>
```

Where:
- `recipient` uses CAIP-10 format: `eip155:{chainId}:0x...`
- `token-address` is base64-encoded contract address, or `native`
- Callbacks are optional

**Examples:**
```
# 1 ETH on Base Mainnet
cspr://eip155:8453:0x1111111111111111111111111111111111111111/1/native?on-success=https://example.com

# 100 USDC on Ethereum Mainnet
cspr://eip155:1:0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb/100/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

**Relevant prior art:** Supersedes ERC-681 (Ethereum-only payment URLs), extends to all CAIP-10-compatible chains.

**Relevance to FlowLink:** This is the most complete existing standard for payment request URIs. FlowLink invoices could natively encode into ERC-7856 `cspr://` URIs, making them wallet-parseable and cross-chain compatible.

**EIP:** https://eips.ethereum.org/EIPS/eip-7856

---

### ERC-681 (URL Format for Transaction Requests)

**Purpose:** URL format for Ethereum payment requests, embeddable in QR codes, emails, chat messages.

**Format:**
```
ethereum:{address}[@chainId][/function]?[params]
```

**Limitation:** Ethereum-specific; does not handle L2s or cross-chain well. ERC-7856 is the multi-chain successor.

**EIP:** https://eips.ethereum.org/EIPS/eip-681

---

### ERC-8122 (Minimal Agent Registry)

A lightweight, deployable on-chain registry for discovering AI agents — a **complementary alternative** to ERC-8004's singleton approach. Where ERC-8004 defines one registry per chain, ERC-8122 enables custom registry deployments (curated collections, specialized domains, fixed-supply registries). Proposed by a community member in the Ethereum Magicians thread.

---

### ERC-8183 (Programmable Escrow for AI Agents)

Covered in depth in Section 9. This is the critical commerce primitive that sits on top of ERC-8004.

**EIP discussion:** https://ethereum-magicians.org/

---

## 11. Compliance & Legal Considerations

### ERC-8004's Compliance Posture

ERC-8004 is **explicitly permissionless and compliance-agnostic by design**. The standard acknowledges this directly: it "cannot cryptographically guarantee that advertised capabilities are functional and non-malicious." There is no KYC, no AML, no regulatory enforcement at the protocol level.

However, it creates the **infrastructure** that compliance layers can build on:

1. **Immutable audit trails:** All registrations, feedback events, and validation responses are on-chain and permanent. Cannot be deleted. Regulators can query the ledger.

2. **Flexible validation tiers:** High-value transactions can require zkML/TEE validation before payment release. This is proportional security.

3. **Off-chain data minimization:** Detailed reports stored off-chain via URIs. Compliance-sensitive data stays off-chain; only hashes go on-chain. Supports GDPR-style data minimization.

4. **Identity separation:** The agent NFT owner (governance key) is separate from the `agentWallet` (operational hot key). This supports key rotation and custody separation required in institutional settings.

### Know Your Agent (KYA)

An emerging compliance paradigm analogous to KYC for human customers. As of early 2026, at least a dozen major players (Visa, Microsoft, ERC-8004-native protocols) are competing to define KYA infrastructure.

**KYA Framework Components:**
- **Identity & Lifecycle:** Every agent is a first-class principal with versioning, ownership metadata, and lifecycle state (created → revoked)
- **Authentication:** Short-lived tokens, signed assertions, credential rotation tied to agent versions
- **Authorization:** Least-privilege, role-based/attribute-based, object-level, time-bounded, dual-control for high-risk
- **Runtime Policy:** Real-time guardrails (allowlisted tools, new-beneficiary blocking, rate limits, anomaly halts)
- **Behavioral Monitoring:** Unusual tool sequences, new destinations, policy violations, escalation attempts
- **Auditability:** Evidence-grade logs: agent identity/version, sponsor, timestamps, inputs/outputs, approvals, tamper-evident anchoring

**Regulatory Landscape (2026):**
- No comprehensive federal KYA framework in the US (state-level: Colorado AI Act June 2026, Texas TRAIGA January 2026)
- NIST AI Risk Management Framework provides vocabulary
- NIST SP 800-63 adapted for AI agent identity assurance

**ERC-3643 as KYA building block:** If FlowLink needs to gate agent access to payment rails by verified identity (operator KYC, OFAC screening, jurisdictional limits), ERC-3643's on-chain identity + claims framework is the proven template. ERC-8004's reputation registry could reference ONCHAINID claims.

### High-Risk Industry Permissionlessness

A notable observation from the research: mainstream payment processors reject ~40-50% of "high-risk" merchants (iGaming, adult content, crypto). As they build proprietary agent payment systems, they will systematically ban high-risk agents.

ERC-8004 + ERC-8183 + x402 provide a permissionless alternative that **cannot discriminate based on industry classification** — this is a deliberate design choice stated in the community discourse.

---

## 12. Known Implementations & Projects

### Infrastructure

| Project | What It Builds | ERC-8004 Usage |
|---------|---------------|----------------|
| **Phala Network** | TEE deployment via dstack | ERC-8004-compliant TEE agent with Intel TDX attestation; posts attestation to Validation Registry |
| **Automata Network** | SGX/TDX/SNP attestation SDK | TEE validation for ERC-8004 |
| **Ch40s Chain** | Reference implementation | Core reference for ERC-8004 registry interactions |
| **Praxis Protocol** | Agent coordination | Go + Python SDKs for ERC-8004 |
| **Primev FastRPC** | x402 facilitator | Sub-200ms Ethereum mainnet payment facilitation |
| **The Graph** | Indexing + GraphTally micropayments | Indexes ERC-8004 events; voucher-based batch settlement |

### Identity & Trust

| Project | What It Builds |
|---------|---------------|
| **Chitin** | Soul identity on Base L2; ERC-8004 agent passports + EIP-5192 soulbound certificates |
| **ENS** | Human-readable subnames for agents (e.g., `trade.agent.eth`) |

### Applications

| Project | What It Builds |
|---------|---------------|
| **AgentStore** | Trustless agent marketplace with USDC settlement via ERC-8004 identity + x402 |
| **Vistara Labs** | Agent Arena SDK; example implementations |
| **ISEK** | Decentralized agent network |
| **Ensemble Framework** | Agent orchestration |

### TEE Reference Implementation (Phala)

The Phala `erc-8004-tee-agent` repository demonstrates the full production stack:
- Python FastAPI backend
- ERC-8004 Identity Registry registration on Sepolia (`0x8004A818BFB912233c491871b3d84c89A494BD9e`)
- ERC-8004 Reputation Registry interaction
- Intel TDX secure enclave execution via Phala Cloud
- The Graph subgraph for event indexing
- RedPill Confidential AI for TEE-secured inference
- Automated on-chain registration in `entrypoint.sh` at container startup

GitHub: https://github.com/Phala-Network/erc-8004-tee-agent

---

## 13. Community Reception & Criticism

### Positive Reception

**Binji (Ethereum Foundation):**
> "This is a practical ERC that can be used and iterated on in the wild; the specifics can stay offchain, but the skeleton of trust lives on ethereum."

**Davide Crapis (EF dAI, co-author):**
> "We published ERC-8004 just three weeks ago, and the response has been incredible: Over 2,000 community members viewed and discussed the proposal, 75+ projects reached out or signaled build interest."

**General reception:** The three-registry architecture was praised as lightweight and practical. The hybrid on-chain/off-chain approach was seen as gas-pragmatic without sacrificing composability.

### Technical Debates (Ethereum Magicians thread)

**1. On-chain vs. Off-chain Data Storage**
- **Concern (spengrah):** The standard prioritizes off-chain reads via events, limiting smart contract composability — contracts can't easily read reputation scores.
- **Author response (Marco-MetaMask):** Gas efficiency and client signing burdens justified the approach. Optional on-chain storage could be added.
- **Resolution:** Community proposed minimal additions like `getAuthFeedback()` and `getValidationResponse()` without full on-chain storage.

**2. Reputation Score Aggregation Monopoly Risk**
- **Concern (daniel-ospina):** Compressing reputation into single metrics enables monopolistic behavior by aggregators.
- **Spengrah extension:** Trust is directional (Alice→Bob) and context-dependent; comprehensive on-chain quantification may need "async trust-minimized oracles."
- **Resolution:** Multiple modular providers can reference the same raw reputation data without enforcing a single scoring model.

**3. Domain vs. URL Resolution**
- **Concern (pcarranzav):** Requiring domain-based agent discovery contradicts A2A's flexibility; agents could operate at multiple URLs within one domain.
- **Unresolved:** Domain ownership validation mechanism remains unclear.

---

## 14. Security Risks

Drawn from the EIP security considerations, Composable Security audit review, and community analysis:

### Sybil Attacks
- **Risk:** Malicious actors create multiple ERC-8004 identities to inflate reputation or spam feedback
- **Mitigation:** Server-side feedback authorization (clients present signed auth from agent), reviewer-weighted reputation filtering, registration bonds in specific implementations

### Oracle Manipulation
- **Risk:** Validation Registry validators can be corrupted or collude to post false validation responses
- **Mitigation:** Protocol externalizes validator incentives (collateral, slashing) to specific validation protocols; choice of validator is up to client; multiple validator consensus

### Storage Exhaustion
- **Risk:** Unbounded `validationRequest` calls exhaust storage
- **Mitigation:** Implementation-specific rate limits and access controls

### Capability Claims Without Verification
- **Explicit acknowledgment in EIP:** "While this ERC cryptographically ensures the registration file corresponds to the on-chain agent, it cannot cryptographically guarantee that advertised capabilities are functional and non-malicious"
- **Implication:** Registration ≠ capability proof. Only Reputation + Validation signals provide operational context.

### Collusion Rings
- Agents can collude to amplify each other's reputations
- Difficult to detect on-chain; relies on reputation aggregators implementing sophisticated social graph analysis

### Smart Contract Risks
- The contracts are upgradeable (see `UPGRADEABLE_IMPLEMENTATION.md`)
- Upgradeability introduces governance risk — who controls upgrades? What is the upgrade timelock?
- Production deployments must audit access controls and oracle integrity

### Pointer Integrity
- Off-chain content at `feedbackURI`/`responseURI` can change; only the hash is anchored on-chain
- Implementers must verify URI content against stored hash

---

## 15. Comparison to Other ERCs

| Standard | Category | Purpose | Key Mechanism | Compliance |
|----------|----------|---------|---------------|------------|
| **ERC-20** | Fungible token | Transferable currency/utility tokens | `transfer()`, `approve()`, `transferFrom()` | None built-in |
| **ERC-721** | Non-fungible token | Unique asset ownership | `safeTransfer()`, `tokenURI()` | None built-in |
| **ERC-1155** | Multi-token | Batch fungible+NFT | `safeBatchTransfer()` | None built-in |
| **ERC-3643** | Compliant security token | Regulated asset transfers with KYC enforcement | `isVerified()` gate on all transfers | Full KYC/AML, ONCHAINID |
| **ERC-7528** | Convention | Native ETH address standardization | Address `0xEeee...` convention | None |
| **ERC-7856** | URI scheme | Cross-chain payment request URLs | `cspr://` URI scheme | None |
| **ERC-681** | URI scheme | Ethereum payment request URLs | `ethereum:` URI scheme | None |
| **ERC-8004** | Agent infrastructure | AI agent identity, reputation, validation | Three singleton registries | None (infrastructure only) |
| **ERC-8122** | Agent registry | Lightweight custom agent registries | Deployable registry contracts | None |
| **ERC-8183** | Agent commerce | Programmable escrow for agent tasks | Job lifecycle + evaluator hook | None |

**Key insight:** ERC-8004 is NOT a token standard. It is infrastructure for trust, more analogous to ENS (naming) than ERC-20 (money). Its value is in composability with the payment and compliance layers above it.

---

## 16. The Full Agentic Protocol Stack

Understanding where ERC-8004 sits in the full stack:

```
┌─────────────────────────────────────────────────────────────┐
│                      USER / BUSINESS                         │
│               (Intent expressed in natural language)          │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│              CONNECTIVITY LAYER (How agents talk)            │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │ MCP (Anthropic)     │  │ A2A (Google)                 │  │
│  │ Data access,        │  │ Agent delegation,            │  │
│  │ tools, context      │  │ task orchestration           │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│              PAYMENT LAYER (How agents pay)                  │
│  ┌──────────────┐ ┌───────────────┐ ┌─────────────────────┐ │
│  │ x402         │ │ ACP (OpenAI + │ │ AP2 (Google +       │ │
│  │ Micropayments│ │ Stripe)       │ │ Visa/MC/Amex)       │ │
│  │ Stablecoins  │ │ Consumer rails│ │ Compliance mandates │ │
│  └──────────────┘ └───────────────┘ └─────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│         COMMERCE PRIMITIVE LAYER (Task-level escrow)         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                    ERC-8183                           │   │
│  │  createJob() → fund() → submit() → complete()/reject()│   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│              TRUST LAYER (Who agents are, how good)          │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                    ERC-8004                           │   │
│  │  Identity Registry | Reputation Registry | Validation │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│           COMPLIANCE LAYER (Who is authorized)               │
│  ┌──────────────────────────────┐  ┌─────────────────────┐  │
│  │ ERC-3643 (T-REX)             │  │ KYA Framework        │  │
│  │ On-chain KYC, claim issuers, │  │ Agent lifecycle,     │  │
│  │ transfer gating              │  │ mandate verification │  │
│  └──────────────────────────────┘  └─────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│              BLOCKCHAIN (Settlement finality)                │
│  Ethereum L1 + L2s (Base, Arbitrum, Optimism, Polygon...)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 17. FlowLink Implications

FlowLink is described as an "agentic payment trust layer with invoicing and compliance." Here is how ERC-8004 and the surrounding ecosystem maps to FlowLink's core functionality:

### 1. Agent Identity for FlowLink Nodes

Every FlowLink participant (payer agent, payee agent, validator, compliance oracle) should have an ERC-8004 identity. This gives:
- Portable, censorship-resistant identity across chains
- Human-readable naming via ENS subnames
- Transferable ownership for custody/operational key separation

**Implementation:** Register FlowLink's own agent infrastructure on the ERC-8004 Identity Registry. Each FlowLink sub-agent (invoice processor, compliance checker, payment router) gets its own `agentId`.

### 2. Reputation as a Payment Rail Signal

Before routing a payment through an agent path, FlowLink can query `ReputationRegistry.getSummary()` to weight routing decisions:
- Route high-value payments through agents with verified payment-execution track records
- Penalize routing through agents with `tag1 = "late_payment"` or `tag2 = "dispute"` feedback
- Use `feedbackURI` payment proof references to build value-weighted trust scores

### 3. Invoicing as Validation Requests

FlowLink invoices can be modeled as ERC-8004 Validation Requests:
1. Invoice issuer calls `validationRequest(validatorAddress=FlowLinkOracle, agentId, requestURI=ipfs://invoiceHash, requestHash)`
2. FlowLink oracle verifies service delivery, calls `validationResponse(requestHash, response=100, ...)`
3. Escrow contract (ERC-8183 style) reads the validation response and releases payment

This creates a fully on-chain, cryptographically auditable invoice → payment → completion cycle without centralized intermediaries.

### 4. ERC-8183 as FlowLink's Core Commerce Primitive

FlowLink should seriously evaluate ERC-8183 as the escrow foundation:
- Job lifecycle maps directly to FlowLink invoice lifecycle (created → funded → delivered → settled)
- The Hook system allows FlowLink to inject custom logic (compliance checks, multi-sig approvals, reputation thresholds) without modifying core contracts
- Evaluator role can be FlowLink's compliance oracle, a zkML verifier, or a DAO
- `claimRefund` timeout provides automatic dispute resolution without human intervention

### 5. Compliance via ERC-3643 Integration

If FlowLink needs to gate payment access by verified identity (institutional clients, OFAC screening, jurisdictional limits):
- Use ERC-3643's `ONCHAINID` as the identity layer
- Trusted claim issuers (KYC providers) sign claims about FlowLink participants
- FlowLink's compliance contract calls `isVerified()` before releasing payments from escrow
- The combination of ERC-8004 (agent reputation) + ERC-3643 (participant compliance) provides the full trust stack

### 6. Payment URI Standard for Invoices

FlowLink invoices should be serializable as ERC-7856 `cspr://` URIs for maximum wallet compatibility:
```
cspr://eip155:8453:0xFlowLinkEscrow/100/0xUSDCAddress?on-success=https://flowlink.io/confirm/inv123
```
This makes FlowLink invoices parseable by any ERC-7856-compatible wallet, enabling direct payment from human wallets and agent wallets alike.

### 7. x402 for Sub-Invoice Micropayments

For FlowLink use cases involving streaming payments or per-API-call billing (e.g., a data agent billing per query within a larger workflow), x402 is the right primitive:
- Agents advertise `x402Support: true` in their ERC-8004 registration file
- FlowLink acts as the x402 facilitator for its network participants
- Payment receipts from x402 transactions feed back into ERC-8004 reputation

### 8. The "No Work, No Pay" Guarantee

FlowLink's core value proposition ("payment trust layer") maps exactly to the ERC-8004 + ERC-8183 architecture. The stack delivers:
- Cryptographic proof of work delivery (Validation Registry / ERC-8183 submit)
- Automatic escrow release on verified completion
- Immutable audit trail for dispute resolution
- No centralized arbitrator required

### 9. KYA (Know Your Agent) as Compliance Product

FlowLink can differentiate by offering KYA compliance as a managed service on top of ERC-8004:
- Run validation oracles that verify agent capability claims
- Issue ERC-3643-style compliance claims for agents that pass screening
- Maintain a trusted issuer registry for FlowLink-verified agents
- This is the enterprise/institutional moat: "ERC-8004 reputation, FlowLink-verified compliance"

### 10. High-Risk Industry Opportunity

The research surfaced an explicit gap: mainstream payment processors systematically exclude high-risk industries. ERC-8004 + x402 + ERC-8183 provide permissionless infrastructure that cannot discriminate. FlowLink could explicitly target this market as a compliant but permissionless payment layer — using ERC-3643 claims to provide optional compliance without mandatory gatekeeping.

---

## 18. Open Questions & Gaps

These are unresolved issues discovered during research:

1. **Domain ownership verification:** The EIP requires domain-based agent discovery but has no mechanism for on-chain domain ownership proof. This remains explicitly unresolved in the Ethereum Magicians discussion.

2. **Smart contract composability of reputation:** Off-chain aggregation of reputation means on-chain contracts cannot natively query an agent's reputation score for conditional logic. The `getSummary()` function exists but is raw data. FlowLink would need its own on-chain reputation oracle.

3. **Validator incentive design:** ERC-8004 explicitly externalizes validator economics. FlowLink must design the collateral/reward/slashing model for its validation oracle network.

4. **v2 specification timeline:** v2 with enhanced MCP support, improved x402 integration, and optional on-chain storage for reputation is "in development" as of early 2026. No formal ETA.

5. **ERC-8183 maturity:** Proposed February 25, 2026. Still early draft. Not yet deployed to mainnet at research date. FlowLink should track closely but not build critical infrastructure on it without stable spec.

6. **Cross-chain identity coherence:** An agent with 35+ chain registrations has 35 different `agentId` values. The `registrations[]` array in the agent file provides cross-chain pointers, but there is no canonical cross-chain identity standard yet. CAIP-10 addresses this at the account level but not at the agent abstraction level.

7. **Feedback authorization replay attacks:** The feedback authorization mechanism (signed by the agent, presented by the client) includes expiration timestamps, but the replay protection surface should be carefully audited in production deployments.

8. **Gas costs at scale:** The Reputation Registry's `readAllFeedback()` function could be expensive for agents with many clients. Off-chain indexing (The Graph) is the practical solution but introduces a trusted indexer dependency.

---

## Sources

Primary sources consulted:

- [ERC-8004: Trustless Agents (Official EIP)](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 Contracts Repository](https://github.com/erc-8004/erc-8004-contracts)
- [Ethereum Magicians Discussion Thread](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)
- [Awesome ERC-8004 Resources](https://github.com/sudeepb02/awesome-erc8004)
- [Phala Network TEE Agent Implementation](https://github.com/Phala-Network/erc-8004-tee-agent)
- [Marco De Rossi - Story Behind ERC-8004](https://medium.com/survival-tech/the-story-behind-erc-8004-next-steps-ec46c18d1879)
- [Ethereum Foundation dAI 2026 Roadmap](https://mpost.io/ethereum-foundation-progresses-dai-teams-2026-roadmap-highlighting-erc-8004-and-x402-as-key-priorities/)
- [ERC-8004 and x402: Infrastructure for Autonomous AI Agents](https://www.smartcontracts.tools/blog/erc8004-x402-infrastructure-for-autonomous-ai-agents/)
- [Understanding x402 and ERC-8004 (The Graph)](https://thegraph.com/blog/understanding-x402-erc8004/)
- [MCP, A2A, AP2, ACP, x402 & ERC-8004 Explained (PayRam)](https://www.payram.com/blog/mcp-a2a-ap2-acp-x402-erc-8004)
- [ERC-8004 as Trust Layer for AI Agent Economy (PayRam)](https://www.payram.com/blog/what-is-erc-8004-protocol)
- [ERC-8004 Machine Economy, AgentFi (Phemex)](https://phemex.com/blogs/erc-8004-machine-economy-agentfi-intent-centric-ux)
- [ERC-8183 Specification (Bitrue)](https://www.bitrue.com/blog/exploring-the-erc-8183)
- [ERC-8183: Virtuals + dAI Launch](https://themerkle.com/virtuals-and-dai-launch-erc-8183-to-enable-trustless-agentic-commerce-on-ethereum/)
- [ERC-3643 Official EIP](https://eips.ethereum.org/EIPS/eip-3643)
- [ERC-3643 T-REX Documentation](https://docs.erc3643.org/)
- [ERC-7528 ETH Address Convention](https://eips.ethereum.org/EIPS/eip-7528)
- [ERC-7856 Chain-Specific Payment Requests](https://eips.ethereum.org/EIPS/eip-7856)
- [x402 Protocol Official Site](https://www.x402.org/)
- [x402 GitHub (coinbase/x402)](https://github.com/coinbase/x402)
- [ENS + ERC-8004 Integration](https://ens.domains/blog/post/ens-ai-agent-erc8004)
- [Composable Security ERC-8004 Explainer](https://composable-security.com/blog/erc-8004-a-practical-explainer-for-trustless-agents/)
- [Oasis Protocol ERC-8004 + ROFL](https://oasis.net/blog/erc-8004-trustless-agents)
- [QuickNode Developer Guide](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)
- [zkML Trustless Agents (ICME)](https://blog.icme.io/trustless-agents-with-zkml/)
- [Know Your Agent 2026 (Stablecoin Insider)](https://stablecoininsider.org/know-your-agent-kya-in-2026/)
- [ERC-8004 Community Reaction (CryptoTimes)](https://www.cryptotimes.io/2025/08/19/ethereum-community-buzzed-with-trustless-agents-erc-8004-discussion/)
- [Filebase ERC-8004 Registration Guide](https://filebase.com/blog/how-to-power-erc-8004-trustless-agents-with-filebase/)
- [Filecoin Pin + ERC-8004 (DEV Community)](https://dev.to/hammertoe/making-services-discoverable-with-erc-8004-trustless-agent-registration-with-filecoin-pin-1al3)
- [Davide Crapis on X](https://x.com/DavideCrapis/status/1965597732124647792)
