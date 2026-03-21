# FlowLink Competitive Intelligence: Deep Dive
**Date:** March 20, 2026
**Scope:** Crypto payment, invoicing, payroll, treasury, and streaming infrastructure
**Method:** Web search, live documentation, GitHub analysis, product pages

---

## TABLE OF CONTENTS

1. [Request Finance / Request Network](#1-request-finance--request-network)
2. [Superfluid](#2-superfluid)
3. [Sablier](#3-sablier)
4. [Coinshift](#4-coinshift)
5. [Utopia Labs (Acquired)](#5-utopia-labs-acquired-by-coinbase)
6. [Gilded Finance](#6-gilded-finance)
7. [LlamaPay](#7-llamapay)
8. [Huma Finance (PayFi)](#8-huma-finance--payfi-protocol)
9. [Biconomy / Pimlico (Account Abstraction)](#9-biconomy--pimlico--account-abstraction-layer)
10. [Circle / USDC Ecosystem](#10-circle--usdc-ecosystem)
11. [Tempo / Machine Payments Protocol (MPP)](#11-tempo--machine-payments-protocol)
12. [x402 Protocol (Coinbase)](#12-x402-protocol-coinbase)
13. [Rise Works (Crypto Payroll)](#13-rise-works)
14. [Acctual](#14-acctual)
15. [Kryptos](#15-kryptos)
16. [OneSafe](#16-onesafe)
17. [Zebec Protocol](#17-zebec-protocol)
18. [BVNK (Mastercard, $1.8B acquisition)](#18-bvnk--mastercard-acquisition)
19. [Borderless.xyz](#19-borderlessxyz)
20. [thirdweb Payments](#20-thirdweb-payments)
21. [Safe (Gnosis Safe)](#21-safe-gnosis-safe)
22. [Feature Matrix](#22-feature-matrix)
23. [GAPS — What No One Is Doing](#23-gaps--what-no-one-is-doing)

---

## 1. Request Finance / Request Network

### What They Do
Two distinct but connected products:
- **Request Network** — An open protocol (Layer 2 on Ethereum + IPFS) for creating, storing, and detecting on-chain payment requests. Think of it as a decentralized invoice ledger.
- **Request Finance** — A SaaS product built on top of the protocol, targeting Web3 businesses. Functions like QuickBooks + Stripe for crypto-native companies.

### Protocol Architecture (Request Network)
- **Smart Contract Stack:** Three contract types:
  - *Core/Storage contracts* — Store Content Identifiers (CIDs) pointing to invoice data on IPFS
  - *Payment contracts* — Handle detection of payments across 18+ chains
  - *REQ Burn contracts* — Lock, bridge, and burn REQ tokens on every request stored
- **Data Layer:** Invoices stored on IPFS as signed JSON documents. The smart contracts only store CIDs (hashes), keeping costs minimal.
- **Payment Detection:** Off-chain indexers (not oracles) watch chains and mark requests as paid when matching transactions are found.
- **Chains:** Ethereum, Polygon, Gnosis, Arbitrum, Optimism, Base, Avalanche, BSC, Fantom, Near, Celo, Moonbeam, Ronin, TRON (added Feb 2026 in v0.62.0). Claims to cover 95% of global stablecoin supply.
- **Token (REQ):** Every time a request is stored, a small amount of REQ is burned — deflationary utility token. ~582,000 REQ burned as of 2025.

### Request Finance — Features
- Invoicing (unlimited, recurring, multi-currency)
- Payroll (bulk CSV upload, templates)
- Accounts Payable (bill management with OCR)
- Accounts Receivable
- Business Mastercards (virtual + physical, funded with stablecoins)
- Crypto-to-fiat conversion
- Global USD account (multi-entity)
- Accounting integration: QuickBooks, Xero, NetSuite (soon)
- Supports 350+ crypto and fiat currencies across 18 networks

### Pricing
| Tier | Price | Limits |
|------|-------|--------|
| Basic | $600/month | $50K stablecoin transfer/mo; 50K transaction imports |
| Pro | Custom | Custom volume; NetSuite integration; dedicated manager |
| Premium | $9,000/month | Unlimited; CFO-as-a-Service; custom ERP; AP/AR management |

On-ramp/off-ramp fees: 0.40–1.00% depending on tier.

### Traction
- $1.3B+ all-time volume (crossed Jan 2026)
- 3,189 active organizations
- 1,500+ finance leaders using the platform
- Jan 2026: 4,034 payments worth $23.8M (90%+ in stablecoins)
- Dec 2025: 5,572 payments worth $27.2M (88% stablecoins)
- Primary chains: Ethereum, Polygon, TRON

### Strengths
- Decentralized protocol under the product — permissionless, auditable
- Broadest chain support in the invoicing segment
- Full-stack: invoicing → payroll → accounting → cards
- Real traction with 3,000+ orgs
- Strong stablecoin coverage (USDT, USDC, DAI across many chains)

### Weaknesses
- UX complaints: confusing entity selection, not mobile-responsive, cheap-looking design
- The protocol (REQ) is complex for developers to build on
- Pricing is steep for SMBs ($600/month minimum)
- No AI/agent integration features
- No streaming payments
- No built-in KYC/compliance layer (they handle invoicing, not employment law)
- No dispute resolution or escrow built-in
- "Amount requested vs received is slightly off" — noted in user reviews (floating point/FX issues)
- The protocol layer and the SaaS layer are loosely connected (the SaaS doesn't require the protocol)

---

## 2. Superfluid

### What They Do
Real-time money streaming protocol. Payments flow continuously by the second rather than in discrete transactions. Primary use cases: salaries, subscriptions, grants, airdrops, DCA.

### Protocol Architecture
- **Super Tokens:** Any ERC-20 can be "wrapped" into a Super Token (e.g., USDCx). The wrapper contract overrides `balanceOf` to return a dynamically computed balance based on ongoing streams. No gas consumed per second — the math is computed lazily.
- **Host Contract:** Central registry managing all tokens and agreements.
- **Agreements:**
  - `ConstantFlowAgreementV1` (CFA) — governs money streaming (open-ended, per-second rate)
  - `GeneralDistributionAgreementV1` (GDA) — one-to-many distributions/streaming pools
  - `InstantDistributionAgreementV1` (IDA) — legacy, being deprecated
- **SuperfluidPool:** Manages distribution pools (units per member)
- **NFTs:** Existential NFTs represent streaming rights (ConstantFlowNFT, PoolAdminNFT, PoolMemberNFT)
- **Governance:** SUP token via Snapshot

### Supported Chains
Ethereum, Polygon, Arbitrum, Optimism, Base, Gnosis Chain, Avalanche, Celo, BSC, Scroll, Degen — 11+ EVM chains.

### Traction
- 1.21 million recipients
- $1.47B total value streamed
- Used by leading DAOs for payroll, grants, token incentives

### Solvency & Liquidation — Critical Weakness
Superfluid's open-ended streams have an insolvency problem: if a sender's Super Token balance reaches zero, streams break the 1:1 backing invariant. To fix this:
- **Liquidator Network:** Off-chain bots (anyone can run them) monitor sender solvency and close streams before they go insolvent. Liquidators earn a small bounty.
- **Patricians:** Token-stakers who serve as a liquidity backstop if no liquidator closes a stream in time.
- **Sender Debt:** If liquidation is too slow, senders can go into negative balance (debt), with the Patrician backstop eating the loss.

This is a significant operational complexity. Senders must actively monitor balances or risk unexpected stream termination. Recipients cannot rely on stream continuity.

### Strengths
- Capital-efficient (no large upfront deposit like Sablier)
- Real-time per-second granularity
- Composable — Super Tokens can be used in DeFi protocols while streaming
- Mature protocol with wide adoption
- SDK in JS/TS and Solidity
- One stream can serve ongoing relationships indefinitely

### Weaknesses
- Requires token wrapping step (USDCx, DAIx, etc.) — friction for users
- Depends on off-chain liquidator network — centralization risk
- Senders must pre-fund adequately or face liquidation
- Open-ended streams cannot be made non-cancelable (recipient has no certainty)
- Not suitable for fixed-total vesting (Sablier wins there)
- No invoicing, accounting, or compliance layer
- UX is developer-first; no clean end-user product for businesses

---

## 3. Sablier

### What They Do
Token streaming and vesting protocol. Battle-tested since 2019. Primary use cases: token vesting, airdrops, grants, payroll, milestone-based payouts.

### Protocol Architecture
Two distinct protocol generations:
- **Sablier V2 (Lockup):** Closed-ended streams with fixed amounts and durations. Deposited upfront in escrow smart contracts. Multiple curve shapes: linear, exponential, logarithmic, monthly cliff, step unlocks. Non-cancelable variants available.
- **Sablier Flow:** Open-ended streams (like Superfluid) using an advanced debt-tracking model — each sender-recipient pair has an isolated balance, eliminating competitive withdrawal race conditions. Streams are adjustable (rate changes), pausable/resumable, and support third-party funding.

### Chains
27 EVM chains + Solana, including Ethereum, Arbitrum, Base, Optimism, Polygon, Avalanche, and others. Additional deployments available on request.

### TVL & Metrics
- Median TVL: $250M (2024)
- Average monthly TVL since 2021: $174M
- A16z, A Capital, Fenbushi, GD1 backed

### Fee Model
- Protocol is free to use
- Since Feb 3, 2025: $3 per claim in gas token for stream withdrawals and airdrop claims
- Integrators (third-party UIs) can charge a broker fee on every stream created — the protocol handles fee routing natively
- Airdrops product: white-glove service (custom websites, geoblocking, 1M+ recipient CSV support)

### Strengths vs Superfluid
- No wrapper tokens needed — works with standard ERC-20
- Non-cancelable streams give recipients certainty
- Sablier Flow solves the race-condition problem from Superfluid (isolated balances per pair)
- No off-chain liquidator dependency
- More flexible vesting curves (exponential, logarithmic, step) — not just linear
- Cleaner security model (audited by Cantina, CodeHawks + 5 others)
- Deployed on Solana — cross-ecosystem

### Weaknesses vs Superfluid
- Lockup streams require large upfront capital deposit
- No composability with DeFi while funds are locked
- No invoicing, payroll management, or accounting layer
- Not designed for subscription/recurring billing

---

## 4. Coinshift

### What They Do (Historical + Pivot)
**Originally (2021–2024):** Multi-sig treasury management platform built on top of Gnosis Safe. Key product: simplified proposal → multi-sig → payment workflow for DAOs and crypto companies.

**Current (2025–2026):** Has pivoted away from treasury operations toward **iUSPC** — an "Institutional Credit Yield Token" giving DeFi-native access to diversified institutional credit and crypto-native yield strategies. FINMA-licensed management, FCA-regulated custody.

This is a significant strategic pivot — they effectively abandoned the treasury operations market.

### Historical Features (Treasury)
- Mass Payout (up to 150 recipients in one transaction)
- Cash Flow Tracker (analytics for treasury inflows/outflows)
- Contact Management (org-wide address book)
- Proposal system: anyone creates → signer approves with one click → queued on-chain
- Built on Safe (Gnosis Safe)

### Funding
- $17.5M raised (Series A)
- Investors: Sequoia Capital, Tiger Global, FinTech Collective
- Valuation: $100M
- Founded 2021, Wyoming

### Weaknesses
- The pivot to yield tokens (iUSPC) effectively means treasury management is abandoned
- No invoicing, no compliance, no payroll
- The "treasury management" gap they're leaving is a real opening

---

## 5. Utopia Labs (Acquired by Coinbase)

### What Happened
- Founded 2021, raised $23M (Paradigm-led)
- Built DAO treasury + payroll tooling on top of Safe
- **October 2023:** Pivoted away from product, shut down services (Nov 6, 2023)
- **November 2024:** Acquired by Coinbase to accelerate onchain payments within Coinbase Wallet

### What They Built
- Payments app + digital wallet for DAOs
- USDC stablecoin bank transfer for B2B
- Crypto offramp (on-chain to bank)
- Automated payroll to 200+ recipients in single gasless transaction
- Transaction labeling and categorization

### Lesson for FlowLink
Utopia Labs demonstrated the market: DAOs need treasury + payroll + payments. But the standalone product didn't achieve product-market fit fast enough for its VC backers. Now the technology lives inside Coinbase Wallet's developer infrastructure, not as a standalone product. The market exists — but the business model was difficult.

---

## 6. Gilded Finance

### What They Do
Enterprise-grade crypto accounting, invoicing, and payments. Founded 2018, New Orleans. Target: accounting firms, CPAs, Web3-enabled businesses, DAOs, NFT platforms.

### Features
- Crypto Invoicing: 30+ tokens, non-custodial, real-time payment detection
- Crypto Bill Pay: expense management, non-custodial
- Crypto Mass Pay: up to 300 addresses in one transaction
- Crypto Accounting: automated reconciliation to QuickBooks, NetSuite, Xero
- NFTOPS: revenue operations for NFT marketplaces (royalty management, 1099 generation)
- Compass: programmable crypto accounting
- Tax reporting and 1099 generation
- Gnosis Safe multi-sig integration
- Blockpass KYC integration
- Stripe and ACH as fiat payment fallback

### Supported Assets
Bitcoin, Ethereum, Polygon — 30+ tokens including USDC, USDT, DAI, LINK, MKR, and more.

### Integrations
QuickBooks Online, NetSuite, Xero, Coinbase, Gnosis Safe, Blockpass, Pipedrive, Kraken, Stripe

### Traction
- Rated #1 on QuickBooks App Store for crypto
- 1,000+ blockchain companies using it
- Consistently >$1M/month in payments
- Average invoice: $4,500

### Strengths
- Deep accounting-first design (CPA-friendly)
- 1099 generation (unique in this space)
- Non-custodial with multi-wallet support
- Hybrid: crypto + fiat fallback (Stripe)
- Real NFTOPS product for NFT platforms

### Weaknesses
- No streaming payments
- No payroll (strictly invoicing and bill pay)
- No KYC/compliance beyond Blockpass integration
- Older chain support (Bitcoin, Ethereum, Polygon — not new L2s)
- No treasury management
- No legal/employment layer
- UI/UX reportedly dated

---

## 7. LlamaPay

### What They Do
Gas-efficient streaming payments protocol. Built by DefiLlama team.

### Technical Model
Uses a "debt tracking" model with standard ERC-20 tokens (no wrapping required). Each payer has a contract balance; when they run dry, recipients can still withdraw owed amounts tracked as debt.

Key differentiator: **3.2–3.7x more gas-efficient** than competitors. Used by Curve Finance, Arbitrum, DefiLlama themselves.

### Features
- Streaming salaries (per-second)
- Recurring payments/subscriptions gateway
- Scheduled payments (specific date)
- Token vesting (forked from Yearn Finance)
- Works on all EVM-compatible networks

### Strengths
- Most gas-efficient streaming protocol
- No token wrapping required
- Simple smart contracts, easy to audit
- Battle-tested by major protocols

### Weaknesses
- "First come, first served" during insolvency — recipients compete to withdraw
- No invoicing or accounting layer
- No business product — pure protocol
- Not on Solana or non-EVM chains
- No dispute resolution

---

## 8. Huma Finance / PayFi Protocol

### What They Do
The first "PayFi" network — combining invoice tokenization with DeFi to enable instant, stablecoin-backed cross-border payments and credit. Core concept: businesses tokenize future receivables (invoices) and receive USDC upfront, while liquidity providers earn yield.

### Products
- **Huma V1:** Income-backed lending (lend against predictable future income)
- **Huma V2 (April 2025):** Full PayFi platform — credit + payment infrastructure for businesses and financial institutions
- **HUMA (Permissionless):** Open retail participation in PayFi pools
- **Arf:** Partner entity handling cross-border payment liquidity

### How Invoice Financing Works
1. Business has $100K invoice due in 30 days
2. Tokenize invoice on Huma
3. Receive USDC immediately (minus financing fee)
4. When invoice is paid, the smart contract resolves and LPs are repaid + yield

### Traction
- $10B all-time payment financing volume (crossed Feb 2026)
- Monthly credit originated: grew from $65.7M (May 2024) → $197.3M (April 2025) — 200% YoY
- Partnership: TradeFlow Capital + Obligate for USDC-denominated eNotes for Asia/Africa/LatAm trade finance

### Strengths
- Unique: bridges DeFi liquidity to real-world invoice financing
- Solves the "net-30/net-60" cash flow problem for crypto businesses
- Real institutional partnerships
- Massive $10B volume is credible traction

### Weaknesses
- Requires trust in invoice validity (off-chain verification of real invoices)
- Currently focused on B2B cross-border trade, not freelancer/DAO invoicing
- Complex product for average Web3 user
- No invoicing UI for creating invoices (you tokenize existing invoices, don't create them here)

---

## 9. Biconomy / Pimlico / Account Abstraction Layer

### Why This Matters for Payments
Account Abstraction (AA) via ERC-4337 and EIP-7702 (activated May 7, 2025 with Pectra) changes the payment UX fundamentally:
- **Gasless transactions:** Paymasters sponsor gas, users pay in any token or nothing at all
- **Session keys:** Pre-authorize spending limits for AI agents or recurring payments without per-transaction approval
- **Batch transactions:** Multiple payments in one transaction
- **Social recovery:** No seed phrase — makes crypto wallets usable by non-crypto users

### Biconomy (Nexus)
- ERC-7579 modular smart account (most composable standard)
- Deployed 4.6M+ smart accounts
- Processed $1.1B through smart accounts
- Gemini integrated Nexus for their self-custodial wallet (passkey-based)
- **MEE (Modular Execution Environment):** Cross-chain orchestration — execute actions across chains in one user intent
- Smart Sessions, Passkeys, DeFi Automations, Hooks and Validators as modules

### Pimlico
- Infrastructure-as-a-service: bundler + verifying paymaster + ERC-20 paymaster
- Works with any ERC-4337 account (Kernel, Safe, Nexus, LightAccount, etc.)
- Pricing: cost of gas + 10% surcharge billed monthly
- Supports 100+ chains
- permissionless.js SDK

### Relevance to FlowLink
AA infrastructure is the **invisible payment rails** that any serious payment product needs:
- Gasless invoice payments (sponsor gas for customers)
- Agent-based recurring payment authorization
- Batch payroll disbursement in one transaction
- Cross-chain payment in one user action

Neither Biconomy nor Pimlico build the payment product — they are infrastructure for payment products to build on.

---

## 10. Circle / USDC Ecosystem

### CCTP V2 (Cross-Chain Transfer Protocol)
Circle's native USDC burn-and-mint bridge for cross-chain transfers. No liquidity pools required — natively burns on source, mints on destination.

**Supported Chains (20 in V2):**
Arbitrum, Avalanche, Base, Codex, EDGE Chain, Ethereum, HyperEVM, Ink, Linea, Monad, Morph, OP Mainnet, Plume, Polygon PoS, Sei, Solana, Sonic, Starknet, Unichain, World Chain, XDC.

**V2 Key Features:**
- **Fast Transfer:** Cross-chain settlement in seconds (not waiting for finality)
- **Hooks:** Post-transfer automation — deposit into DeFi, buy NFTs, trigger smart contract logic on destination chain
- Zero protocol fees for Standard Transfer; small fee for Fast Transfer

**V1 Deprecation:** V1 (11 chains) goes into phase-out July 31, 2026. V1 won't get new chains or features.

**Circle's Programmable Payments Platform:**
- Web3 APIs for USDC integration
- Paymaster-as-a-service
- Used by 3,189+ businesses (via Request Finance alone)
- Case study: Circle holds $2.5B USDC in Safe treasury

### Significance
CCTP V2 is foundational infrastructure. Any payment product that supports USDC cross-chain movement should be building on CCTP V2. The Hooks feature (automate post-transfer actions) is a DeFi composability primitive that payment products haven't fully exploited yet.

---

## 11. Tempo / Machine Payments Protocol

### What It Is
Stripe-backed blockchain designed specifically for high-speed stablecoin payments, launched March 2026. Incubated by Stripe + Paradigm. Raised $500M at $5B valuation.

### Machine Payments Protocol (MPP)
Open-source protocol for AI agents to pay each other and humans autonomously. Launched March 18, 2026. Key innovations:

- **Sessions primitive:** Agent pre-authorizes a spending limit upfront, then streams micropayments continuously without a per-interaction on-chain transaction
- Supports fiat and crypto payments
- Platform-agnostic — not locked to Tempo's chain
- Visa contributed specs for card-based agent payments
- Stripe, Visa, and Lightspark extended MPP to cards, wallets, and Bitcoin Lightning respectively

### What Makes It Different
- First protocol specifically designed for **AI-to-AI** and **AI-to-human** payments
- The "sessions" model solves micropayment economics (no gas per sub-cent action)
- Backed by the most powerful payments company in the world (Stripe)

### Competitive Significance
Tempo + MPP signals that the future of payment infrastructure is **agent-native**. This is a direct competitive threat to any payment product that does not have an AI/agent integration layer. The incumbents are moving fast.

---

## 12. x402 Protocol (Coinbase)

### What It Is
Open payment standard built on HTTP 402 "Payment Required" status code. Coinbase-built, open-source, being governed by the x402 Foundation (Coinbase + Cloudflare co-founders).

### How It Works
1. Client makes HTTP request to a paid resource
2. Server responds with HTTP 402 + payment requirements
3. Client pays (USDC/stablecoin), retries request with payment proof
4. Server verifies and delivers resource

A single middleware line enables any API to require payment:
```javascript
app.use(paymentMiddleware({
  "GET /weather": { accepts: [...], description: "Weather data" }
}));
```

### Current Metrics (March 2026)
- 75.41M transactions (30-day)
- $24.24M volume (30-day)
- 94,060 buyers, 22,000 sellers
- ~$28K daily volume on-chain (actual commerce still early-stage, much is testing)

### Adopters
Stripe, AWS, Messari, Alchemy, Nansen, Vercel, Cloudflare, World (Sam Altman's project)

### Zero-Fee Model
- No protocol fees
- Only standard network gas costs
- Anyone can build on it without Coinbase permission

### Significance
x402 is the **Stripe for AI agents**. It turns every HTTP endpoint into a payable resource. Combined with Coinbase's Agentic Wallets, this enables software agents to autonomously pay for APIs, data, compute — without human approval per transaction.

---

## 13. Rise Works

### What They Do
Full-stack crypto payroll for global teams. Combines compliance, onboarding, tax reporting with stablecoin + crypto payment rails.

### Features
- Global payroll in 190+ countries
- 90+ local currencies, 100+ cryptocurrencies
- Employer of Record (EOR) for full-time employees: US, UK, Canada (expanding to 60+ countries)
- Automated KYC/identity verification
- Service agreement generation
- Year-end tax form issuance (international)
- **Rise Earn:** Workers earn stablecoin yield on their payroll balance
- $0 fees on Layer 2 payouts

### Traction
- $1B+ payroll volume processed
- 50%+ of withdrawals in stablecoins
- 39% of surveyed workers receive income in stablecoins

### Pricing
Not publicly disclosed. Platform charges for EOR services and compliance.

### Strengths
- Actual legal compliance layer (EOR model)
- Tax filing included
- Crypto + fiat hybrid
- Rise Earn differentiates (yield on payroll)

### Weaknesses
- Payroll-focused — no invoicing for clients
- No treasury management
- No streaming payments
- Expensive (EOR services are traditionally costly)
- No protocol layer — fully custodial SaaS

---

## 14. Acctual

### What They Do
Crypto B2B invoicing and payments. USDC-centric, Circle partnership. Simple: create invoice → pay in USDC/USDT/EUR/USD → settle same day.

### Traction
- $25M+ in USDC processed (as of Oct 2024)
- 50%+ of transactions in USDC
- Circle featured case study

### Features
- Invoicing in USDC, USDT, EUR, USD
- Crypto-to-crypto, fiat-to-crypto, crypto-to-fiat
- Same-day settlement to wallet or bank
- QuickBooks integration

### Strengths
- Dead simple UX
- Circle partnership (distribution)
- Multi-currency flexibility

### Weaknesses
- Very limited feature set — pure invoicing
- No payroll, no streaming, no treasury
- No compliance layer
- Not a protocol — fully centralized SaaS

---

## 15. Kryptos

### What They Do
Enterprise Web3 finance suite. Started as crypto tax calculator, evolved into enterprise subledger.

### Features
- Crypto tax calculation (35+ jurisdictions)
- Treasury management and real-time visibility
- Token vesting management
- Payroll with multi-wallet address assignment
- Invoicing and payment scheduling
- Multi-chain reconciliation (5,000+ integrations)
- AI-driven transaction categorization
- Proof of reserves
- SAFT management
- Full audit trail with approval signatures and timestamps

### Strengths
- Most complete accounting layer in the space
- AI categorization is a real differentiator
- Broad chain + exchange integration (5,000+)
- Institutional-grade compliance and audit trails

### Weaknesses
- Not a payment protocol — accounting wrapper on top of wallets
- No streaming
- Pricing not disclosed — likely enterprise pricing that excludes SMBs
- No legal/employment compliance

---

## 16. OneSafe

### What They Do
Neo-banking for global Web3 companies. Blend of traditional banking features with crypto.

### Features
- USD accounts + ACH + wire payments
- Multi-network crypto support
- Web3 invoicing (send/receive crypto)
- DAO treasury management
- Payroll automation
- Crypto banking (fiat + crypto in one interface)
- Fireblocks-backed security
- Multi-factor authentication, end-to-end encryption

### Strengths
- True banking hybrid (fiat + crypto)
- Fireblocks custody = institutional security
- Strong for companies operating in both fiat and crypto

### Weaknesses
- Not decentralized — fully custodial
- No streaming payments
- No protocol layer
- No AI/agent integration
- Limited compared to dedicated accounting tools

---

## 17. Zebec Protocol

### What They Do
Solana-native streaming payment protocol, expanded to 18+ networks. Now adding crypto debit cards + payroll streaming into a "SuperApp."

### Technical Model
Continuous settlement protocol on Solana. Moved to multi-chain (18+ networks including EVM chains).

### Features (SuperApp — Q1 2026 rollout)
- Streaming payroll (per-second)
- Crypto debit cards for everyday spending
- Staking
- ACH integration (NatPay partnership — $170B/year, 300K+ ACH clients)

### Compliance Milestones
- **December 2025:** Joined Nacha Payments Innovation Alliance (alongside JPMorgan, Circle, ADP)
- **December 2025:** ISO 20022 compliance (SWIFT standard)
- **December 2025:** NatPay partnership for ACH rails

### Token (ZBCN)
~$0.002, ~$200M market cap (Feb 2026). Final token unlock completes March 2026 → fully deflationary.

### Strengths
- Solana-first = extremely fast and cheap
- ISO 20022 compliance — bridges to traditional finance
- Nacha alliance — real banking partnerships
- Streaming + cards + ACH is a unique combo

### Weaknesses
- Low token price undermines confidence
- SuperApp still in rollout phase
- No invoicing or accounting
- No compliance/KYC layer for contractors

---

## 18. BVNK / Mastercard Acquisition

### What Happened
**March 17, 2026:** Mastercard announced acquisition of BVNK for up to $1.8B (including $300M performance-contingent). Largest crypto deal Mastercard has ever done. Expected to close late 2026.

### What BVNK Does
- Operates in 130+ countries
- $30B+ annualized stablecoin payment volume
- Infrastructure: connects on-chain stablecoin payments with traditional fiat rails
- Products: cross-border B2B payments, remittances, payouts, merchant settlement

### Post-Acquisition Plans
- Power stablecoin capabilities across Mastercard's payment endpoints
- 24/7 stablecoin settlement for processors and acquirers
- Stablecoin checkout in Mastercard's payment gateway

### Significance
This acquisition signals that TradFi is absorbing crypto payment infrastructure. BVNK is no longer an independent competitor — it becomes Mastercard's crypto arm. This legitimizes the space but also means one major player is locked up inside a $500B+ incumbent.

---

## 19. Borderless.xyz

### What They Do
Global stablecoin orchestration and liquidity network. A "Stablecoin-as-a-Service" provider.

### Recent
- Named launch partner in Mastercard's Crypto Partner Program (85+ companies)
- Focused on cross-border transfers, B2B payments, global payouts using on-chain infrastructure

### Significance
Part of the emerging "Stablecoin-as-a-Service" category where the infrastructure layer abstracts multi-chain routing, FX, and compliance for businesses wanting to plug in stablecoins.

---

## 20. thirdweb Payments

### What They Do
Full-stack Web3 developer platform with payments as a feature.

### Payment Features
- **Universal Bridge:** Fiat-to-crypto (Visa, Mastercard, AMEX, ACH, 130+ countries) + crypto-to-crypto across 200+ EVM chains
- **HTTP and Agentic Payments:** Accept payments for APIs in any token, designed for AI agent commerce
- **Connect Wallet:** 500+ EVM wallets, social/email login, gasless via AA

### Strengths
- Broadest chain coverage (200+ EVM)
- Already supports agentic payments
- Fiat on-ramp built in

### Weaknesses
- Payment is a feature of a developer tooling platform, not the core product
- No invoicing or accounting
- No compliance layer
- Not designed for B2B business workflows

---

## 21. Safe (Gnosis Safe)

### What They Do
Open-source smart contract multisig wallet. The de facto standard for DAO and institutional treasury storage. Not a payment product but the infrastructure layer under most payment products (Coinshift, Utopia Labs, Gilded, Kryptos all built on Safe).

### Recent Metrics
- $10M annualized revenue (2025) — up 5x from $2M in 2024
- 18.3M new smart accounts deployed in 2025
- Planning to double revenue in 2026, target $100M ARR by 2030
- 98% of new deployments outside Ethereum mainnet
- Used by Ethereum Foundation ($650M ETH treasury)
- Used by Circle ($2.5B USDC treasury)

### Significance
Safe is not a competitor — it's infrastructure. But its growth confirms the underlying demand for programmable treasury management. Any payment product targeting DAOs or crypto companies will interact with Safe.

---

## 22. Feature Matrix

| Feature | Request Finance | Superfluid | Sablier | Coinshift | Gilded | LlamaPay | Huma | Rise | Acctual | Kryptos |
|---------|----------------|-----------|---------|-----------|--------|---------|------|------|---------|---------|
| **Invoice Creation** | ✅ Full | ❌ | ❌ | ❌ | ✅ Full | ❌ | ❌ | ❌ | ✅ Basic | ✅ Basic |
| **Recurring Invoices** | ✅ | ❌ | ✅ (vesting) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Payroll** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (streaming) | ❌ | ✅ Full | ❌ | ✅ |
| **Streaming Payments** | ❌ | ✅ Core | ✅ Core | ❌ | ❌ | ✅ Core | ❌ | ❌ | ❌ | ❌ |
| **Treasury Management** | ❌ | ❌ | ❌ | ✅ (pivoting) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Multi-sig** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Accounting Integration** | ✅ (QBO, Xero) | ❌ | ❌ | ❌ | ✅ (QBO, NS, Xero) | ❌ | ❌ | ❌ | ✅ (QBO) | ✅ Full |
| **KYC/Compliance** | ❌ | ❌ | ❌ (geoblocking) | ❌ | ✅ (Blockpass) | ❌ | ❌ | ✅ Full EOR | ❌ | Partial |
| **Multi-chain** | ✅ 18 chains | ✅ 11 chains | ✅ 27 chains + Solana | ❌ | ❌ (ETH/Polygon/BTC) | ✅ All EVM | ❌ | ❌ | ❌ | ✅ |
| **AI/Agent Integration** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Invoice Financing** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Core | ❌ | ❌ | ❌ |
| **Crypto Cards** | ✅ (Mastercard) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fiat On/Offramp** | ✅ | ❌ | ❌ | ❌ | ✅ (Stripe, ACH) | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Dispute/Escrow** | ❌ | ❌ | ✅ (non-cancelable) | ❌ | ❌ | ❌ | ✅ (partial) | ❌ | ❌ | ❌ |
| **Decentralized Protocol** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Developer API/SDK** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Tax Reporting** | ❌ | ❌ | ❌ | ❌ | ✅ (1099) | ❌ | ❌ | ✅ | ❌ | ✅ (35 jurisdictions) |
| **NFT Payments/Royalties** | ❌ | ❌ | ❌ | ❌ | ✅ (NFTOPS) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Legal Framework (EOR)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 23. GAPS — What No One Is Doing

This is the most important section. Based on exhaustive research across every active competitor, these are the validated gaps — things the market clearly needs but no product fully addresses:

---

### GAP 1: The Full-Stack AI-Native Payment Product
**The void:** Every competitor in the space was built for humans operating through UIs. AI agents are now economic participants (Coinbase Agentic Wallets, x402, Tempo MPP, Mastercard Agent Pay, Visa CLI). But no payment product has built a **coherent agent-first workflow**:

- Agents need to create and send invoices autonomously
- Agents need to authorize payment streams for their operators without per-transaction signatures
- Agents need to be the **recipient** of payments for work performed
- Agents need structured dispute resolution when they fail to deliver

Request Finance, Gilded, Acctual — all require a human to log into a dashboard. Superfluid and Sablier provide stream primitives but no agent-compatible auth layer. The gap is: **a payment product that treats AI agents as first-class financial entities with proper authorization scopes, spending limits, and audit trails**.

x402 handles the "pay for API calls" use case. **Nobody handles "agent as invoice sender, payroll recipient, or treasury manager."**

---

### GAP 2: Unified Compliance + Payment (Not Just Compliance-Adjacent)
**The void:** The regulatory landscape as of 2026 is complex and bifurcated:
- MiCA (EU) — full enforcement, Travel Rule compliance mandatory
- GENIUS Act (US, July 2025) — stablecoin-specific federal rules
- IRS 1099-DA reporting starting 2026 for crypto exchanges
- FATF Travel Rule — requiring originator/beneficiary info on every crypto transfer

Current state:
- Rise has compliance (but only for payroll, not invoicing)
- Gilded has Blockpass (KYC checkbox, not integrated workflow)
- Request Finance has none
- Sablier has geoblocking (not real compliance)
- No one integrates **Travel Rule compliance into the payment flow itself**

The gap: **A payment product where every invoice/payment is Travel Rule compliant by default, with embedded KYC/AML, jurisdiction-aware tax withholding, and automatic 1099 generation — all in one product, not bolted on.** This is what B2B enterprise customers will require by Q3 2026 when MiCA enforcement intensifies.

---

### GAP 3: Invoice Financing Embedded Into Invoicing Workflow
**The void:** Huma Finance does invoice tokenization and financing. Request Finance does invoicing. **No one bridges both in one UX.**

The flow nobody is providing:
1. Create invoice in FlowLink
2. Optionally toggle: "Finance this invoice" → receive USDC now (with Huma-style DeFi liquidity)
3. When client pays, financing is automatically settled

The global factoring industry is $3T/year. Net-30/net-60 is a massive pain point for Web3 companies. The gap is not the technology (Huma has it) — it's the **integration of financing into the invoicing workflow**. A crypto-native business should be able to get paid in 5 minutes on a 30-day invoice.

---

### GAP 4: Cross-Chain Invoice Settlement With Automatic FX
**The void:** A client wants to pay in USDT on Polygon. You want to receive USDC on Base. Currently:
- The client has to figure out the right chain and token
- Or you maintain multiple wallet addresses per chain
- Or you use a bridge (and pay fees + wait for finality)

CCTP V2 has the technology (burn-and-mint with Hooks). **No invoicing product has integrated CCTP V2 Hooks** to allow: "Accept payment in any stablecoin on any chain, auto-bridge and deliver in your preferred stablecoin on your preferred chain."

The gap: **Chain-and-token-agnostic invoice settlement** where the payer pays however they want and the recipient receives however they want, with CCTP V2 handling the cross-chain hop atomically and invisibly.

---

### GAP 5: Streaming Payments With Invoice-Level Accountability
**The void:** Streaming is a payment primitive (Superfluid, Sablier, LlamaPay). Invoicing is a business accountability primitive (Request Finance, Gilded). **No one connects them.**

The real-world case: A contractor works on a 6-month retainer. They want payment streamed by the second (Superfluid model). But the client's CFO wants to see invoices with line items, PO numbers, and accounting reconciliation for every month.

Current state: You either stream (no invoice accountability) or invoice (no streaming). The gap is: **Streamed payments with per-period invoice snapshots, automatic accounting entries, and tax documentation for each payment period.**

---

### GAP 6: Programmable Invoice Escrow With Milestone Unlocks
**The void:** Smart contract escrow exists (Sablier non-cancelable streams, Circle's Refund Protocol, ERC-8183). But no invoicing product exposes these as a business workflow.

The use case: You hire a dev agency for $200K. You want:
- $50K on kickoff → escrowed to smart contract, released on signing
- $75K on milestone 1 → released on attestation
- $75K on delivery → released after 7-day review window

No product combines: invoice creation + milestone definition + smart contract escrow + dispute resolution + accounting reconciliation into a single flow. Circle's Refund Protocol (released 2025) provides the escrow primitive. **Nobody wraps it in a business product.**

---

### GAP 7: The "SWIFT Message" for Crypto B2B — Structured Payment Metadata
**The void:** In traditional finance, wire transfers carry structured metadata: invoice number, buyer reference, seller reference, purpose codes. This data is machine-readable and reconciles automatically.

Crypto payments are bare transfers: address → address + amount + chain. Request Network does better (CID in storage contracts), but the standard is not adopted by wallets, exchanges, or accounting software.

The gap: **A machine-readable payment metadata standard for crypto B2B**, where every payment carries: invoice ID, payer ID, payee ID, currency, jurisdiction, purpose code — in a form that wallets and accounting software can read natively. Zebec's ISO 20022 compliance (December 2025) is a step but focused on ACH rails, not DeFi.

---

### GAP 8: Legal Contract + Payment = One Atomic Object
**The void:** A freelancer agreement lives in Notion or DocuSign. A payment lives on-chain. These two are disconnected. If a client refuses to pay, you have two separate systems with no cryptographic link between the agreement and the payment obligation.

Existing attempts: Ricardian contracts (theoretical), Request Network stores invoice data but not legal agreements, OpenLaw (now Tribute Labs) — tried but narrow scope.

The gap: **A product where signing a service agreement automatically creates an on-chain payment obligation**, and failure to pay creates a provable breach of a cryptographically-signed legal contract. This is especially relevant for DAOs contracting contributors without legal entities. **No one has productized this in a clean UX.**

---

### GAP 9: Multi-Party Payment Orchestration
**The void:** Complex B2B transactions involve multiple parties. Example: A crypto agency receives payment from a client, then needs to split 60% to 8 contributors, 20% to a vendor, 15% to a sub-contractor, 5% to treasury — in different currencies on different chains.

Current products:
- Request Finance: can do payroll batch, but it's a separate workflow from receiving an invoice
- Superfluid: can split streams (GDA), but doesn't connect to invoice receipts
- Coinshift: can do mass payout, but no invoicing

The gap: **A payment product where an incoming invoice payment automatically triggers a programmable disbursement DAG** — split to contributors, vendors, treasury, all atomically, from one received payment.

---

### GAP 10: Crypto-Native Expense Management With Policy Enforcement
**The void:** Traditional expense management (Brex, Ramp, Concur) works well for fiat corporate cards. For crypto companies that pay contributors in stablecoins and have treasuries in ETH:
- No crypto-native expense approval workflows
- No crypto-native spending policies (e.g., "contributor wallets can spend up to $500/month from treasury without CFO approval")
- No smart contract-enforced budget caps

Request Finance has Mastercard cards (spending controls in Pro tier). But spending controls are at the card level, not the wallet/smart account level.

The gap: **Smart account (ERC-7579) based expense management where spending policies are enforced on-chain**, not in a centralized SaaS. Leverages Biconomy Nexus or Safe modules for programmable treasury authorization rules.

---

### Summary of Gaps (Priority Ordered for FlowLink)

| Gap | Market Size | Technical Feasibility | Competition Density |
|-----|------------|----------------------|---------------------|
| 1. AI-Native Payments | $3-5T (McKinsey, 2030) | High (primitives exist) | Very Low |
| 2. Embedded Compliance | Regulatory mandate | Medium (regulatory complexity) | Low |
| 3. Invoice Financing | $3T/year factoring market | High (Huma provides primitives) | Very Low |
| 4. Cross-Chain Invoice Settlement | All crypto B2B | High (CCTP V2 Hooks) | None |
| 5. Streaming + Invoice Accountability | Retainer/contractor market | Medium | None |
| 6. Milestone Escrow | Professional services | Medium (ERC-8183, Circle) | Very Low |
| 7. Structured Payment Metadata | Enterprise B2B | Low (ecosystem adoption needed) | None |
| 8. Legal Contract + Payment Atomic | DAO contractor market | High (EIP-712 + DocuSign-like) | None |
| 9. Multi-Party Disbursement DAG | Agencies, DAOs | High | Very Low |
| 10. On-Chain Expense Policy | Crypto-native teams | High (ERC-7579) | None |

---

## Sources

- [Request Finance](https://www.request.finance)
- [Request Network](https://request.network/)
- [Request Finance Pricing](https://www.request.finance/pricing)
- [Superfluid Docs](https://docs.superfluid.org/docs/concepts/superfluid)
- [Superfluid Architecture](https://docs.superfluid.org/docs/technical-reference/Architecture)
- [Superfluid Liquidations](https://docs.superfluid.org/docs/protocol/advanced-topics/solvency/liquidations-and-toga)
- [Sablier Overview](https://sablier.com/)
- [Sablier Token Streaming Models](https://blog.sablier.com/overview-token-streaming-models/)
- [Sablier Fees](https://docs.sablier.com/concepts/fees)
- [Coinshift](https://www.coinshift.xyz/)
- [Utopia Labs Acquisition by Coinbase](https://www.pymnts.com/acquisitions/2024/coinbase-acquires-utopia-labs-team-to-accelerate-onchain-payments-roadmap/)
- [Utopia Labs Sunset](https://blockworks.co/news/utopia-labs-business-model-shift-sunset)
- [Gilded Finance](https://gilded.finance/)
- [Gilded Crypto Invoicing](https://gilded.finance/products/payments/crypto-invoicing)
- [LlamaPay](https://llamapay.io/)
- [Huma Finance - Messari](https://messari.io/report/understanding-huma-finance-a-comprehensive-overview)
- [Biconomy Nexus](https://blog.biconomy.io/nexus-the-operating-system-for-smart-accounts/)
- [Pimlico Pricing](https://docs.pimlico.io/guides/pricing)
- [Circle CCTP V2](https://www.circle.com/cross-chain-transfer-protocol)
- [CCTP V2 Technical](https://developers.circle.com/cctp)
- [Tempo MPP - Fortune](https://fortune.com/2026/03/18/stripe-tempo-paradigm-mpp-ai-payments-protocol/)
- [Tempo Launch - CoinDesk](https://www.coindesk.com/tech/2026/03/18/stripe-led-payments-blockchain-tempo-goes-live-with-protocol-for-ai-agents)
- [x402 Protocol](https://www.x402.org/)
- [Coinbase x402 Launch](https://www.coinbase.com/developer-platform/discover/launches/x402)
- [x402 GitHub](https://github.com/coinbase/x402)
- [Rise Works](https://www.riseworks.io/)
- [Rise State of Crypto Payroll 2026](https://www.riseworks.io/blog/state-of-crypto-payroll-report-2026)
- [Acctual - Circle Case Study](https://www.circle.com/case-studies/acctual)
- [Kryptos](https://kryptos.io/)
- [OneSafe](https://www.onesafe.io/)
- [Zebec Protocol](https://zebec.io/)
- [Zebec 2025 Overview](https://www.gate.com/blog/8146/Zebec-Network-2025--Real-Time-Crypto-Streaming-Payments-on-Solana)
- [BVNK Mastercard - CoinDesk](https://www.coindesk.com/business/2026/03/17/mastercard-agrees-to-purchase-bvnk-for-up-to-usd1-8-billion)
- [BVNK Mastercard - CNBC](https://www.cnbc.com/2026/03/17/mastercard-acquiring-stablecoin-startup-bvnk-in-crypto-bet.html)
- [thirdweb Payments](https://thirdweb.com/)
- [Safe Revenue Report](https://www.globenewswire.com/news-release/2026/02/03/3231251/0/en/Safe-Project-Reports-10M-Revenue-Targets-Break-Even-and-100M-ARR-Path-by-2030.html)
- [Superfluid Chain Support - AlphaGrowth](https://alphagrowth.io/superfluid)
- [MiCA 2026 Compliance](https://fystack.io/blog/2025-crypto-regulatory-compliance-for-web3-fintech-startups)
- [GENIUS Act](https://www.grantthornton.com/insights/articles/banking/2026/crypto-compliance-in-2026)
- [AI Agent Payment Infrastructure](https://reports.tiger-research.com/p/aiagentpayment-eng)
- [Huma Finance Q4 2025 - Messari](https://messari.io/report/state-of-huma-finance-q4-2025)
- [Circle Refund Protocol](https://www.circle.com/blog/refund-protocol-non-custodial-dispute-resolution-for-stablecoin-payments)
- [ERC-8183 AI Escrow](https://www.ccn.com/education/crypto/erc-8183-programmable-escrow-ai-agents-ethereum-how-it-works/)
- [B2B Crypto Payments 2026](https://www.chainup.com/blog/crypto-payments-in-2026-the-b2b-outlook/)
- [Stablecoin Predictions 2026](https://www.fintechweekly.com/news/stablecoin-predictions-2026-payments-infrastructure-regulation)
