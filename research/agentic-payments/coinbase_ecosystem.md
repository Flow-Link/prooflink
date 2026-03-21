# Coinbase Ecosystem for AI Agent Payments
**Research Date:** March 2026
**Scope:** AgentKit, CDP, Commerce, AI Strategy, Base Chain

---

## Executive Summary

Coinbase has made agentic payments one of its top stated priorities, constructing a vertically integrated stack: Base (L2 settlement layer) → USDC (stablecoin) → x402 (HTTP payment protocol) → AgentKit/Agentic Wallets (agent SDK) → Payments MCP (LLM integration). The x402 protocol launched May 2025 and processed 75 million transactions worth $24M by December 2025, though a significant portion is artificial. Stripe added x402 support on Base in February 2026, validating the approach. Real demand for agentic micropayments remains nascent but the infrastructure is now production-grade.

---

## 1. Coinbase AgentKit

### What It Is

AgentKit is Coinbase Developer Platform's open-source toolkit for giving AI agents a crypto wallet and the ability to take onchain actions. Tagline: "Every agent deserves a wallet."

- GitHub: `github.com/coinbase/agentkit`
- Available in TypeScript (50+ actions) and Python (30+ actions)
- Designed as both framework-agnostic and wallet-agnostic
- Launched: January 2025 (announced with CDP)

### Architecture

```
AI Agent (any LLM)
    └── Framework Extension (LangChain, OpenAI Agents SDK, etc.)
            └── AgentKit Core
                    ├── Wallet Provider (CDP | Privy | Viem)
                    └── Action Providers (50+ in TS, 30+ in Python)
                            └── Blockchain (Base, Ethereum, Solana, + all EVM/SVM)
```

**Core Design Principles:**
- Framework adapters decouple AgentKit from any specific LLM orchestrator
- Action Providers are modular, grouped by domain (DeFi, Social, NFT, etc.)
- Wallet Providers are swappable — default is Coinbase Smart Wallet (ERC-4337)
- Natural language → onchain action translation via the AI framework layer

### Supported AI Frameworks

| Framework | Language |
|---|---|
| LangChain | Python + TypeScript |
| OpenAI Agents SDK | Python |
| Vercel AI SDK | TypeScript |
| Model Context Protocol (MCP) | TypeScript |
| Pydantic AI | Python |
| AutoGen | Python |
| Strands Agents | Python |
| Eliza | TypeScript |

### Supported Chains

- **Base** (primary — Coinbase's own L2)
- **Ethereum** mainnet
- **Solana** (SVM)
- All other EVM-compatible networks
- All SVM-compatible networks

### Action Provider Categories

Pre-built action providers cover (non-exhaustive):

**DeFi & Finance:**
- Compound, Morpho, Moonwell (lending)
- Jupiter (Solana DEX aggregator)
- Superfluid (streaming payments)
- DefiLlama (TVL/protocol data)
- Pyth (oracle price feeds)

**NFT & Social:**
- OpenSea, Zora (NFT trading/minting)
- Farcaster (decentralized social)

**AI & Compute:**
- Hyperbolic (GPU compute marketplace)
- Allora (AI inference network)
- dTelecom (decentralized telecom)

**Infrastructure:**
- Alchemy (RPC provider)

**Core wallet operations:** token transfers, swaps, contract deployment, ERC-20 approval, wallet info

### Payment Capabilities

- **Fee-free stablecoin payments** via Coinbase infrastructure on Base
- **Gasless transactions** via Coinbase Paymaster (ERC-4337 UserOperations)
- **x402 integration**: agents can autonomously pay for API calls via HTTP 402 protocol
- **Token swaps** across supported DEXes
- **Streaming payments** via Superfluid integration

### Wallet Provider Detail

Three wallet providers available:

| Provider | Description | Key Feature |
|---|---|---|
| CDP (Coinbase) | Default; Coinbase Smart Wallet | Gasless txns, MPC key management |
| Privy | Embedded wallet | Social login, passkey auth |
| Viem | Lightweight Ethereum lib | EOA support, bring-your-own key |

**Security:** Smart Wallet uses MPC — private keys never exposed to the agent's LLM context. Coinbase infrastructure holds keys in secure enclaves.

### Risk Factors

- Default setup relies heavily on Coinbase centralized infrastructure (single point of failure)
- LLM hallucination risk — agents can execute real financial transactions from bad reasoning
- No built-in rate limiting at protocol level (must be implemented at application layer)
- Limited to Coinbase's supported action set unless custom providers are built

---

## 2. Coinbase Developer Platform (CDP)

### Product Catalog Overview

CDP organizes into three layers:

#### Wallet Infrastructure

| Product | Description |
|---|---|
| **Embedded Wallets** | Social login + passkey auth for end-user apps; GA October 2025 |
| **Server Wallets** | Programmatic wallet creation for backend/automation |
| **Agentic Wallet** | Purpose-built wallet for autonomous AI agents (see §2a) |
| **Smart Wallet** | ERC-4337 contract wallet with gasless txns, spend permissions |

#### Payments & Funding

| Product | Description |
|---|---|
| **x402** | HTTP-native stablecoin payment protocol (see §3) |
| **Onramp** | Fiat-to-crypto conversion API; Coinbase account, bank, debit, Apple Pay |
| **Commerce** | Merchant crypto payment gateway (see §4) |
| **Payments MCP** | MCP server exposing wallet + onramp + x402 to LLMs (see §2b) |
| **Paymaster** | Gas sponsorship for Smart Wallet transactions |

#### Infrastructure

| Product | Description |
|---|---|
| **AgentKit** | AI agent onchain action toolkit |
| **Data API** | Wallet balances, transaction history |
| **Node** | Free Base mainnet RPC endpoint |
| **Staking API** | Staking rewards for customer assets |
| **Swap API** | Token swaps (launched 2025, "infra-free") |
| **Faucet** | Testnet token funding |

### Pricing

- **Embedded Wallets**: Free tier of 5,000 wallet operations/month, then pay-as-you-go
- **x402 Facilitator**: 1,000 free transactions/month, then $0.001/tx
- **Node RPC**: Free Base mainnet access
- No minimum tiers or setup fees on most products

### 2a. Agentic Wallet (Distinct from AgentKit)

Announced late 2025 as a standalone product separate from AgentKit:

**Key Differentiators:**

| Dimension | AgentKit | Agentic Wallet |
|---|---|---|
| **Scope** | Full onchain SDK (contracts, DeFi, NFTs) | Narrow: wallet ops only |
| **Chains** | All EVM + SVM | Base only |
| **Access** | Developer SDK (TypeScript/Python) | CLI tool (`awal`) + MCP + Agent Skills |
| **Auth** | API keys / wallet providers | Email OTP |
| **Keys** | Agent controls via provider | Coinbase holds in secure enclave |
| **x402** | Via action provider | Native integration |

**Spending Controls:**
- Session caps: maximum USDC per agent session
- Transaction limits: maximum per individual transaction
- OFAC screening: automatic sanctions check before every transfer
- KYT screening: blocks high-risk onchain interactions

**Supported Assets:** USDC on Base (primary), token trading on Base via DEXes

**Integration Methods:**
1. CLI: `awal` command for testing/scripting
2. Agent Skills: pre-built capabilities via `agentic-wallet-skills` repo
3. MCP: natural language wallet control in Claude Desktop, Codex, Gemini, etc.

### 2b. Payments MCP

Launched October 2025 as the "easiest way for agents to get onchain via x402."

**What it does:**
- Exposes wallet creation, funding (onramp), and x402 payments to any MCP-compatible LLM
- No API keys or developer setup required
- Runs locally on user's desktop (speed + privacy)
- Agents never access the user's main wallet — operate via sub-wallets with strict limits

**Verified compatible with:** Claude Desktop, Claude Code, Codex, Gemini, Cherry Studio

**Capabilities exposed as MCP tools:**
- Create wallet (email OTP auth)
- Onramp fiat to USDC (Coinbase account, bank, debit, Apple Pay in supported regions)
- Send stablecoins
- Pay x402-gated APIs
- Check balance

**Security model:** Configurable funding caps + approval thresholds; sub-wallet isolation from main account.

### 2c. Spend Permissions (Smart Wallet Primitive)

`github.com/coinbase/spend-permissions` — ERC contract enabling recurring authorized token transfers.

**Architecture:**
- `SpendPermissionManager` deployed as a singleton contract on Base
- Apps call `SpendPermissionManager.spend()` from a spender EOA
- User signs permission details once via `eth_signTypedData` (ERC-6492 for undeployed accounts)
- Supports recurring periods: "10 USDC per month" subscription patterns
- Revocable anytime by user via `SpendPermissionManager.revoke()`
- Supports native ETH and all ERC-20 tokens
- Does NOT route through ERC-4337 EntryPoint (prevents paymaster fee manipulation)

**Use case relevance for FlowLink:** This is the subscription primitive on Base. Agents can be granted spend permissions to autonomously charge for services on a recurring basis without per-transaction approval.

---

## 3. x402 Protocol

### What It Is

x402 is an open HTTP payment protocol that revives the long-dormant HTTP 402 "Payment Required" status code to enable instant, automatic stablecoin micropayments directly over HTTP. Developed by Coinbase, launched May 2025.

- GitHub: `github.com/coinbase/x402` (Apache 2.0)
- Whitepaper: `x402.org/x402-whitepaper.pdf`
- Foundation: x402 Foundation (Coinbase + Cloudflare co-founding partners, Sept 23, 2025)

### How It Works (V2 — Dec 2025)

```
1. Client → GET /api/data
2. Server ← 402 Payment Required
           PAYMENT-REQUIRED: {price, asset, network, facilitator}
3. Client signs payment authorization (EIP-3009 / Permit2 / ERC-7710)
4. Client → GET /api/data
           PAYMENT-SIGNATURE: {signed_payload}
5. Facilitator verifies signature, checks balance, simulates tx
6. Facilitator broadcasts on-chain tx (USDC transfer)
7. Server receives verification, returns 200 OK
           PAYMENT-RESPONSE: {txHash, confirmation}
```

**Key design principles:**
- Stateless — no sessions, no accounts, no API keys required
- HTTP-native — works with any HTTP client/server stack
- No new protocol — standard HTTP headers carry all payment data
- Permissionless — no need to register with any central authority

### EVM Payment Schemes (Technical)

Three methods, chosen by token capability:

#### 1. EIP-3009 (Recommended — USDC, EURC)
- Client signs `transferWithAuthorization` off-chain (65-byte signature)
- Facilitator calls the token contract directly — no separate approval tx
- Most efficient; zero extra on-chain operations
- Parameters: `{from, to, value, validAfter, validBefore, nonce}` + signature

#### 2. Permit2 (Universal Fallback — any ERC-20)
- Uses Uniswap's canonical `Permit2` contract at `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- Proxy contract: `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` (deployed via CREATE2 across all EVM chains)
- Witness pattern prevents facilitator from redirecting payments
- Three sub-options: Direct approval / Sponsored ERC20 / EIP-2612 permit

#### 3. ERC-7710 (Smart Accounts)
- Uses smart account delegation capabilities
- Entirely simulation-based verification
- Risk: delegation revocation between simulation and execution → requires private mempool
- Pending EIP status — less production-ready

### Supported Networks

| Network | Chain ID | Facilitator | Free Tier |
|---|---|---|---|
| Base mainnet | 8453 | CDP (Coinbase) | 1,000 tx/mo |
| Polygon mainnet | 137 | CDP (Coinbase) | 1,000 tx/mo |
| Solana mainnet | - | CDP (Coinbase) | 1,000 tx/mo |
| Base Sepolia | 84532 | x402.org | Unlimited (testnet) |
| Solana Devnet | - | x402.org | Unlimited (testnet) |
| Any EVM chain | any | Custom/community | Varies |

### Supported Tokens

**EVM:**
- USDC (EIP-3009 native — optimal path)
- EURC (EIP-3009 native)
- All ERC-20 tokens via Permit2

**Solana:**
- USDC (SPL token)
- All SPL Token Program tokens
- Token2022 tokens (V2 protocol only)

### SDK Support

| Language | Package | Status |
|---|---|---|
| TypeScript | `@x402/evm`, `@x402/svm` (npm org) | Production |
| Python | `x402` | Production |
| Go | `x402` | Production |

### x402 V2 Changes (December 11, 2025)

Key improvements over V1:
- All payment data moved to HTTP headers (body now available with 402 response)
- Multi-chain support without custom logic (`@x402/evm` handles all EVM)
- Dynamic `payTo` routing — per-request address changes + dynamic pricing
- Wallet-based sessions via `@x402/paywall` — skip repeated payments (subscription-like)
- Sign-In-With-X (SIWx) header coming as follow-up (wallet identity standard)
- Plugin-driven SDK — register new chains/assets without modifying core
- Automatic service discovery + pricing metadata indexing
- Multi-facilitator support as first-class feature
- Full backward compatibility with V1

### x402 Foundation (September 23, 2025)

Co-founded by Coinbase and Cloudflare. Governance structure:
- Apache 2.0 license on all reference implementations
- Open membership: e-commerce platforms, AI companies, payment providers
- Foundation oversees: governance, ecosystem growth, protocol interoperability
- Ecosystem grants available for builders

**Launch partners:** AWS, Anthropic, Circle, NEAR (announced alongside initial launch, May 2025)

### Adoption Metrics (as of March 2026)

- 75 million transactions by December 2025 (6 months post-launch)
- $24 million in transaction value processed
- ~$28,000 daily volume, ~131,000 daily transactions
- Average payment: ~$0.20
- **Caution:** Artemis analysts identified significant artificial activity (self-dealing + wash trading) — real organic demand remains nascent

**Stripe integration (February 11, 2026):** Stripe added x402 support on Base with USDC — includes open-source `purl` CLI tool, Python/Node.js examples, dashboard monitoring. Currently in preview.

**World/Sam Altman integration (March 2026):** World (formerly Worldcoin) launched their own AgentKit using x402, adding World ID (proof of human) verification layer to x402 transactions.

### Key Risks / Limitations

1. **No refunds at protocol level** — merchants must send compensating transfers; no network-level reversals
2. **Hot wallet custody requirement** — agents need USDC pre-loaded; enterprise compliance overhead
3. **Coinbase facilitator concentration** — dominant early adopter; controls chain prioritization and fee policy
4. **Demand gap** — the "merchants" x402 targets (single-purpose AI microservices) barely exist at scale yet
5. **EIP-3009 dependency** — non-USDC tokens require Permit2 (slightly more complex UX)
6. **ERC-7710 race condition** — delegation revocation between simulation and execution

---

## 4. Coinbase Commerce

### What It Is

Coinbase Commerce is a non-custodial crypto payment gateway for merchants. Funds go directly to addresses controlled by the merchant, not through Coinbase custody.

- URL: `commerce.coinbase.com`
- Model: Non-custodial, merchant-controlled addresses
- Fee: **1% per transaction** (no monthly fee, no setup cost)

### Supported Cryptocurrencies

| Asset | Networks |
|---|---|
| USDC | Base, Ethereum, Polygon, Solana |
| EURC | Base, Ethereum |
| ETH | Ethereum |
| DAI | Base, Ethereum |
| Bitcoin | Bitcoin mainnet |
| Litecoin | Litecoin |
| Dogecoin | Dogecoin |
| Bitcoin Cash | BCH |

**Strategic emphasis:** Base network integration for near-zero-cost stablecoin settlement.

### API Capabilities

- REST API for programmatic charge creation (`POST /charges`)
- Webhook system for automated post-payment triggers (order fulfillment, email, etc.)
- Unique address per transaction via smart contract routing on Base
- 60-minute payment window per charge
- QR codes for mobile payment UX

### Commerce Payments Protocol (mid-2025)

Coinbase + Shopify co-developed an open onchain payments standard:
- Smart contract-based payment routing on Base
- Multi-step payment flows onchain (authorization, capture, refunds, subscriptions)
- Near-instant settlement, ~$0.01 transaction fees on Base
- Native Shopify plugin (no custom code needed)
- Part of Coinbase + Shopify + Stripe tri-party partnership

### Merchant Integrations

- **Shopify:** Native plugin via Commerce Payments Protocol (smoothest integration)
- **WooCommerce:** Dedicated plugin with webhook support
- **Custom:** REST API for any backend

### Key Limitation

No automatic fiat conversion — merchants must manually transfer to Coinbase exchange to convert crypto to USD. (Coinbase has announced plans to unify Commerce with Coinbase Business, which offers full custody + cash-out.)

### Relationship to AgentKit/x402

Commerce is oriented toward **human merchant → human buyer** flows with checkout UI. For **agent-to-agent** or **API monetization** use cases, x402 is the appropriate primitive. Commerce is not directly integrated with x402 as of current research.

---

## 5. Coinbase's AI Strategy

### Core Thesis: "Agentic Commerce"

Coinbase's stated vision (per Chief Business Officer + CEO communications):

> "The long-dominant ad-supported internet model is giving way to usage-based economics. AI agents increasingly act on behalf of users and systems, directly paying for data, content, and services — buying, selling, fetching data, and coordinating services in real time."

Agentic payments are "certainly one of our top priorities as a company." Key strategic bets:

1. **USDC as the currency of the agentic internet** — stablecoin optimized for machine payments
2. **Base as the settlement layer** — low cost (~$0.01/tx), fast finality, Coinbase-operated
3. **x402 as the payment protocol** — open standard, but Coinbase's facilitator dominates early
4. **AgentKit as the developer SDK** — capture agent builder mindshare
5. **Payments MCP** — embed into the most-used AI dev tools (Claude, Codex, Gemini)

### Why Crypto for Agent Payments (Coinbase's Argument)

- Traditional payment rails (Stripe, ACH, cards) designed for humans: require accounts, subscriptions, billing cycles
- Agents need **per-request, sub-cent, autonomous** payments — incompatible with $0.30 minimum Stripe charge
- Crypto stablecoins: programmable, 24/7, no intermediary, instant settlement
- McKinsey projects AI could mediate "$3–5 trillion of global consumer commerce by 2030"

### Product Timeline

| Date | Milestone |
|---|---|
| Jan 2025 | AgentKit launched |
| May 2025 | x402 protocol launched; AWS, Anthropic, Circle, NEAR as launch partners |
| Aug 2025 | CDP Embedded Wallets beta |
| Sep 2025 | x402 Foundation (Coinbase + Cloudflare); Payments MCP launched |
| Oct 2025 | CDP Embedded Wallets GA; Agentic Wallets announced; Swap API launched |
| Dec 2025 | x402 V2 launched; 75M tx milestone reached |
| Feb 2026 | Stripe adds x402 support on Base |
| Mar 2026 | World/Sam Altman integrates x402 + World ID for human-verified agent payments |

### Competitive Positioning

Coinbase is betting that owning the payment infrastructure layer for AI agents gives them:
- Transaction fee revenue (x402 facilitator: $0.001/tx at scale = significant volume)
- USDC demand (more USDC used = more yield revenue for Coinbase from Circle partnership)
- Base chain activity (sequencer fees)
- Developer platform lock-in (AgentKit → CDP products)

### Critical Assessment

**What's real:**
- Infrastructure is production-grade (x402 V2, AgentKit with 50+ actions, Stripe integration)
- Institutional validation: Stripe, Cloudflare, Anthropic, AWS all publicly involved
- Base has genuine traction (billions in TVL, major DeFi protocols deployed)

**What's not there yet:**
- Real agentic commerce demand is nascent — most x402 volume is artificial or dev testing
- The "merchants" (AI microservices that charge per request) barely exist at scale
- Enterprise adoption blocked by compliance/custody complexity
- Historical precedent: Lightning Network, BAT browser monetization both failed similar visions

---

## 6. Base Chain as Payment Infrastructure

### Overview

Base is Coinbase's Ethereum L2, launched August 2023. Built on the OP Stack (Optimism). Coinbase operates the sequencer.

### Why Base for Payments

| Property | Value |
|---|---|
| Transaction fee | ~$0.01 per tx (stablecoins) |
| Finality | ~2 seconds (L2 block time) |
| USDC native | Circle deploys USDC natively on Base |
| EIP-3009 | USDC on Base supports transferWithAuthorization |
| Sequencer | Coinbase-operated (fast, reliable, but centralized) |
| Total Value Locked | Billions (major DeFi protocols: Morpho, Aerodrome, etc.) |

### Payment Primitives on Base

#### 1. USDC Native Transfer (EIP-3009)
- `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)`
- Gasless from user perspective — facilitator pays gas
- Ideal for x402 payments: one signature, one tx, done

#### 2. Smart Wallet (ERC-4337)
- Coinbase-deployed `CoinbaseSmartWallet` contract on Base
- Supports passkeys, social recovery, batched txns
- Gas sponsorship via Paymaster (up to $15K gas credits via Base Gasless Campaign)
- ERC-7677 compliant paymaster interface

#### 3. Spend Permissions
- `SpendPermissionManager` on Base — enables subscription-like recurring USDC debits
- `github.com/coinbase/spend-permissions`
- Canonical proxy: `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`

#### 4. Sub-Accounts (Base Accounts Framework)
- Hierarchical account ownership on Base
- Fine-grained spend limits per sub-account
- Powered by Spend Permissions + ERC-4337
- Introduced early 2025

#### 5. x402 Facilitator (Native on Base)
- Coinbase's hosted facilitator: fee-free USDC settlement on Base mainnet
- 1,000 free transactions/month
- Handles: signature verification, balance check, gas payment, tx broadcast, confirmation

### Base and x402 Relationship

Base is x402's primary home:
- Lowest fees of any EVM chain supported
- USDC EIP-3009 = optimal x402 payment path (no Permit2 overhead)
- Coinbase operates both Base sequencer and x402 facilitator → coordinated reliability
- Stripe's x402 integration is Base-only (Feb 2026)
- Most x402 tooling examples use Base + USDC

### Risks of Base Centralization

- Coinbase operates the sequencer → censorship risk (could block x402 competitors)
- No decentralized sequencer yet (on roadmap but not deployed)
- Regulatory risk: Coinbase as sequencer creates liability surface
- Opstack is still maturing on the security/decentralization axis

---

## 7. FlowLink Implications

### What Coinbase Has Built That Matters

| Component | FlowLink Relevance |
|---|---|
| x402 protocol | Core primitive — HTTP-native payments for any API |
| AgentKit | Reference for how agents interact with wallets and DeFi |
| Spend Permissions | Subscription billing primitive on Base |
| Agentic Wallet | Agent-specific wallet model with spending limits |
| Payments MCP | How to expose payment capabilities to LLMs via MCP |
| x402 V2 sessions | Wallet-based sessions = subscription pattern over x402 |

### Gaps Coinbase Doesn't Address

1. **Cross-chain unified billing** — x402 requires selecting a specific chain/token per endpoint; no abstraction layer
2. **Non-crypto payment rails** — x402 Foundation says fiat support is planned but not shipped; no ACH/Stripe fallback
3. **Metered billing with variable pricing** — x402 is per-request; complex metering (tiered, volume-discounted, seat-based) is application layer
4. **Agent identity + reputation** — World's March 2026 AgentKit integration shows demand; Coinbase has no native solution
5. **Revenue analytics for developers** — no built-in billing dashboard for API providers using x402
6. **Multi-party payment splits** — no native way to split a single API payment among multiple recipients (e.g., model provider + inference provider + data provider)

### Strategic Observation

Coinbase is building the **settlement layer** (Base + USDC + x402) but not the **billing abstraction layer**. FlowLink's opportunity is in the gap between raw x402 transactions and what a developer actually needs to run a metered API business: plans, usage tracking, invoicing, analytics, upgrade flows, and multi-rail fallback.

---

## Sources

- [Coinbase AgentKit GitHub](https://github.com/coinbase/agentkit)
- [AgentKit README](https://github.com/coinbase/agentkit/blob/main/README.md)
- [CDP Documentation](https://docs.cdp.coinbase.com/)
- [x402 Welcome Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 Network Support](https://docs.cdp.coinbase.com/x402/network-support)
- [x402 EVM Scheme Spec](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md)
- [x402 GitHub](https://github.com/coinbase/x402)
- [x402.org](https://www.x402.org/)
- [x402 V2 Launch](https://www.x402.org/writing/x402-v2-launch)
- [Cloudflare x402 Blog](https://blog.cloudflare.com/x402/)
- [Cloudflare Press Release](https://www.cloudflare.com/press/press-releases/2025/cloudflare-and-coinbase-will-launch-x402-foundation/)
- [Agentic Wallet Docs](https://docs.cdp.coinbase.com/agentic-wallet/welcome)
- [AgentKit Docs](https://docs.cdp.coinbase.com/agent-kit/welcome)
- [Spend Permissions GitHub](https://github.com/coinbase/spend-permissions)
- [Base MCP GitHub](https://github.com/base/base-mcp)
- [Coinbase Developer Platform](https://www.coinbase.com/developer-platform)
- [CDP Payments Product](https://www.coinbase.com/developer-platform/payments)
- [Coinbase Commerce](https://commerce.coinbase.com/)
- [Stripe x402 Docs](https://docs.stripe.com/payments/machine/x402)
- [Stripe x402 Integration (FinanceFeeds)](https://financefeeds.com/stripe-launch-x402-usdc-payments-on-base-network/)
- [x402 Adoption Analysis (CoinDesk, March 2026)](https://www.coindesk.com/markets/2026/03/11/coinbase-backed-ai-payments-protocol-wants-to-fix-micropayment-but-demand-is-just-not-there-yet)
- [x402 Deep Dive (FintechWrapup)](https://www.fintechwrapup.com/p/deep-dive-is-x402-payments-protocol)
- [x402 QuickNode Explainer](https://blog.quicknode.com/x402-protocol-explained-inside-the-https-native-payment-layer/)
- [x402 CryptoSlate Explainer](https://cryptoslate.com/what-is-x402-the-http-402-payments-standard-powering-ai-agents-explained/)
- [Coinbase Commerce Review (BlockFinances)](https://blockfinances.fr/en/coinbase-commerce-review-fees-guide)
- [World x402 Integration (CoinDesk)](https://www.coindesk.com/tech/2026/03/17/sam-altman-s-world-teams-up-with-coinbase-to-prove-there-is-a-real-person-behind-every-ai-transaction)
- [AgentKit KAIST Report](https://web3classdao.github.io/kaist2025/reports/coinbase_agentkit/)
- [PYMNTS — Coinbase AI Agent Payments](https://www.pymnts.com/artificial-intelligence-2/2026/coinbase-bets-on-ai-agents-to-power-payments-growth/)
- [Base Gasless Transactions](https://docs.base.org/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster)
- [Base Smart Wallet Paymasters](https://docs.base.org/identity/smart-wallet/guides/paymasters)
- [ERC20 Paymasters on Base](https://docs.base.org/identity/smart-wallet/guides/erc20-paymasters)
