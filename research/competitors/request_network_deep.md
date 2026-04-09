# Request Network / Request Finance: Deep Competitive Research

**Research Date:** March 20, 2026
**Analyst:** Claude (Technical Researcher)
**Scope:** Request Network Foundation (protocol) + Request Finance (commercial product built on protocol)

---

## 1. ORGANIZATIONAL STRUCTURE

### The Protocol / Product Split

Request Network and Request Finance are **two separate entities** — a critical distinction.

- **Request Network Foundation** — the open-source protocol layer, founded 2017. Stores payment request data on IPFS, anchors CIDs on Gnosis Chain, processes payments across 18+ EVM chains. Token: REQ.
- **Request Finance** (request.finance) — a commercial SaaS product *originally built on* Request Network, launched 2020. The two teams have since separated. Request Finance is now building its own fiat/stablecoin stack on top (and sometimes aside) the protocol. HQ: Saint-Julien-en-Genevois, France. ~35 employees.

This split matters: Request Finance is pursuing a traditional fintech moat (licensing, banking rails, compliance) while the protocol remains open and lightly monetized.

---

## 2. GITHUB REPOSITORIES

**Organization:** github.com/RequestNetwork (58 total repositories)

### Key Repos

| Repo | Purpose | Last Updated |
|------|---------|--------------|
| `requestNetwork` | Core TypeScript SDK (26 packages, monorepo) | Dec 31, 2025 |
| `request-commerce` | App for creating/paying requests | Jan 5, 2026 |
| `easy-invoice` | Demo app using Request Network API | Dec 26, 2025 |
| `docs.request.network` | Protocol documentation | Dec 26, 2025 |
| `ui-registry` | UI component registry | Dec 12, 2025 |
| `Request_SmartContracts` | DEPRECATED legacy contracts | — |

### SDK Stats (`requestNetwork` monorepo)
- **Stars:** 387
- **Forks:** 91
- **Open Issues:** 104 (significant)
- **Open PRs:** 23
- **Commits:** 2,192
- **Languages:** TypeScript (91.5%), Solidity (6.1%), JavaScript (1.7%)
- **License:** MIT
- **Package manager:** Yarn + Lerna monorepo
- **Latest release:** v0.62.0 (February 16, 2026)

### Notable SDK Packages
- `@requestnetwork/request-client.js` — node interaction
- `@requestnetwork/smart-contracts` — contract sources/artifacts
- `@requestnetwork/ethereum-storage` — IPFS + Gnosis Chain storage
- `@requestnetwork/payment-processor` — web3 wallet payment handling
- `@requestnetwork/advanced-logic` — protocol extensions
- `@requestnetwork/data-format` — invoice/data standards

---

## 3. PROTOCOL ARCHITECTURE

### How It Works (Technical)

Request Network is **not a blockchain**. It is a protocol layered on existing infrastructure:

```
Invoice Data → IPFS (content-addressable) → CID anchored on Gnosis Chain
                                          → Payment executed on any supported chain
```

**Three-layer architecture:**

1. **Storage Layer**
   - Invoice/request content stored in IPFS
   - Only CID (Content ID hash) stored on-chain (Gnosis Chain mainnet)
   - `RequestHashStorage` contract = entry point to retrieve all hashes
   - `RequestOpenHashSubmitter` = accepts hash declarations, collects fees
   - `StorageFeeCollector` = manages request creation fees
   - Aleph.im integration for backup/redundancy

2. **Payment Layer (16+ contracts)**
   - ERC20 and native token transfer contracts with payment references
   - `FeeProxy` variants enabling simultaneous payment to recipient + fee collector
   - Escrow contracts with refund capabilities
   - Batch payment processor (multiple payments in one tx)
   - Chainlink-based conversion contracts (pay in token X for invoice denominated in Y)
   - Swap contracts for cross-currency settlement
   - NFT-based transferable receivables (invoice as NFT)
   - Single-request proxy for streamlined CEX/custodian payments
   - Private payments via Hinkal integration

3. **REQ Token + Burn**
   - Small REQ burn required per request creation (anti-spam)
   - Fees collected in xDAI on Gnosis Chain
   - Periodically bridged to mainnet as DAI
   - Swapped to REQ via on-chain DEX (historically Kyber Network)
   - REQ burned, reducing total supply
   - Creates deflationary pressure tied to protocol usage

### Invoice Creation On-Chain (Step by Step)

1. Invoice data (parties, amounts, due date, payment terms) structured per `@requestnetwork/data-format` standard
2. Data encrypted (optional) and pushed to IPFS via Request Node Gateway
3. IPFS returns CID
4. CID submitted to `RequestHashStorage` on Gnosis Chain
5. Small REQ fee burned
6. Request is now publicly discoverable via The Graph indexing
7. Payer fetches invoice data via CID from IPFS
8. Payer calls appropriate Payment Contract on the payment chain
9. Payment contract emits event with payment reference
10. Reconciliation: The Graph detects payment event, links to invoice CID → 100% automated reconciliation

**Key constraint:** Payer and payee must use the **same blockchain** for a given payment. Cross-chain payments (e.g., sender on Arbitrum, receiver expects Ethereum) are **not supported**.

---

## 4. SUPPORTED CHAINS

### Request Network Protocol (Payment Chains)
As of v0.62.0 (Feb 2026):

| Chain | Added |
|-------|-------|
| Ethereum (mainnet) | Original |
| Gnosis Chain | Original (also used for storage) |
| Polygon | Early |
| Celo | Early |
| Fantom | Early |
| Near | Early |
| BNB Chain | 2023 |
| Arbitrum | 2023 |
| Optimism | 2023 |
| Base | 2024 (v0.46.0) |
| zkSync Era | 2024 (v0.46.0) |
| CORE | 2024 (v0.46.0) |
| Sepolia (testnet) | 2024 |
| Sonic | Jan 2026 (v0.56.0) |
| Tron | Feb 2026 (v0.62.0 — full TRC20 support) |
| Aleo | Sep 2025 (private payments partnership) |

**Storage chain:** Always Gnosis Chain (mainnet) or Sepolia (testnet)

### Request Finance Platform (Payment Networks)
- **Top chains by volume (Sep 2025):** Ethereum (59%), Tron (8%), Polygon (7%), Arbitrum (5%), BNB Chain (5%)
- Supports 25+ blockchain integrations on the product layer
- Fiat: 190+ countries, 20+ fiat currencies via Pay.so acquisition

---

## 5. REQ TOKEN ECONOMICS

| Metric | Value (March 2026) |
|--------|-------------------|
| Price | ~$0.066 USD |
| Market Cap | ~$65.5M |
| 24h Volume | ~$1.05M |
| Circulating Supply | ~999.4M REQ |
| Total Burned | 583,259 REQ (extremely low) |
| Pending Burn | 2,567 REQ |
| Foundation Reserves | $39.8M (ETH: $20.6M, stETH: $19.1M) |
| Active Wallets | 41,293 addresses |

### REQ Utility
1. **Anti-spam burn** — small amount burned per request creation (primary utility today)
2. **Governance** — vote on community contributions via Discord
3. **Staking** — plans for node deployment staking (not yet live as core feature)
4. **Discounts** — fee reductions for REQ holders (planned)
5. **Node operation** — future: stake REQ to operate a node

**Assessment:** REQ token has minimal active utility beyond the burn mechanism. Total burned is tiny (583K out of ~1B supply). The deflationary story depends on volume growth that hasn't materialized at scale. Foundation holds $39.8M in ETH/stETH as runway — well-capitalized protocol side.

---

## 6. REQUEST FINANCE — PRODUCT DEEP DIVE

### Core Product Modules

| Module | Description |
|--------|-------------|
| Accounts Payable | Approve, batch, pay vendor invoices |
| Accounts Receivable | Issue invoices, track payment status |
| Payroll | Batch crypto salary payments with approvals |
| Expenses | Employee expense reimbursement in crypto |
| Accounting | Auto-categorization, reconciliation, ERP sync |
| Treasury | Portfolio view, multi-entity USD accounts |
| Business Cards | USDC-funded virtual/physical Mastercards |
| On/Off-Ramp | Crypto-to-fiat, fiat-to-crypto (Pay.so) |

### Currency/Chain Support (Request Finance Platform)
- 350+ crypto and fiat currencies
- 18+ payment networks
- Fiat payouts to 190+ countries
- 20+ fiat currencies: EUR, USD, GBP, AUD, CHF, SGD, JPY, KRW, IDR, HKD, THB, NZD, INR, AED, etc.

### Key Integrations
- **Wallets:** MetaMask, Ledger, Fireblocks, Safe/Gnosis
- **Banks:** Wise, N26, Revolut, JP Morgan, Citi, BNP Paribas
- **Accounting:** QuickBooks, Xero, SAP, NetSuite
- **Chains:** Near, Celo, Fantom, Gnosis, Ethereum, etc.

---

## 7. PRICING MODEL

### Current Pricing (as of March 2026)

| Tier | Price | Stablecoin Transfer Fee | On/Off-Ramp Fee | Included Volume |
|------|-------|------------------------|-----------------|-----------------|
| **Basic** | $600/month | 0.70% | 0.45%–1.00% | $50K/month |
| **Pro** | Custom | 0.40% | 0.40%–0.95% | Custom |
| **Premium** | $9,000/month | Free | Custom | Unlimited |

### What's Included Across All Tiers
- Unlimited invoices
- Unlimited business cards
- Batch payment capabilities
- Treasury/portfolio views

### Premium Features (Pro/Premium only)
- Approval policies for payables
- Advanced accounting rules
- Dedicated senior customer success manager
- Slack support
- Custom ERP integrations
- CFO-as-a-Service
- Custom development services

### Historical Pricing Note
The original Request Network protocol charged only **0.1% capped at $2 per invoice** (paid by payer). The current $600/month minimum for Request Finance represents a massive pivot toward enterprise SaaS pricing, abandoning the original micro-fee model entirely.

---

## 8. CUSTOMERS AND CASE STUDIES

### Confirmed Customers
- **Near Foundation** — DAO treasury management
- **Aave** — DeFi protocol payments
- **OpenZeppelin** — crypto payroll for engineering team
- **The Sandbox** — NFT/gaming company payments and accounting
- **Ledger** — hardware wallet company
- **Balderton Capital** — VC firm (also investor)
- **Arbitrum** — L2 ecosystem payments
- **Bonk** — Solana memecoin team
- **Beam** — gaming platform

**Claimed customer base:** 1,500–2,000+ Web3 organizations

### OpenZeppelin Case Study (Detailed)
- **Problem:** Manual .csv uploads to multisig, tedious ERC-20 address verification, error-prone process
- **Solution:** Request Finance for crypto payroll + vendor invoice settlement
- **Result:** ~1 day/month saved on payroll processing, eliminated human error risk, stronger approval controls
- **Quote (VP Finance Jaime Barriga Amin):** "We have realized a significant reduction in time spent on crypto payroll and contractor payment processing – about one full day per month."

### The Sandbox Case Study
- Chose Request Finance to streamline crypto payments and accounting
- Used for cross-border payments to a globally distributed team

---

## 9. RECENT METRICS (VERIFIED)

| Period | Payments | Volume |
|--------|----------|--------|
| Sep 2025 | 5,258 | $32.3M |
| Nov 2025 | 4,185 | $30.6M |
| Jan 2026 | 4,034 | $23.8M |
| **All-time** | 148,102+ | $1.3B+ |

**Currency breakdown (Sep 2025):**
- USDC: ~45%
- USDT: ~29%
- USD (fiat conversion): 9%
- ALEO: 4%
- EUR (fiat conversion): 4%
- Stablecoins total: 85%+

**Chain breakdown (Sep 2025):**
- Ethereum: 59%
- Tron: 8%
- Polygon: 7%
- Arbitrum: 5%
- BNB Chain: 5%

---

## 10. RECENT ANNOUNCEMENTS (2024–2026)

### Acquisitions
1. **Consola Finance** (acquired March 2024) — crypto accounting sub-ledger, now "Request Accounting." Adds crypto-to-ERP synchronization (QuickBooks, SAP, NetSuite).
2. **Pay.so Lithuania** (acquired November 25, 2024) — regulated VASP, now "Request Technologies." Adds fiat on/off-ramp capability, $100–$100M transaction range, 17 fiat currencies.

### Partnerships
- **Aleo Network** (September 4, 2025) — First private crypto payroll. Aleo became Top-2 blockchain on Request Finance within 2 months; $3.7M ALEO processed post-launch.
- **Aleph.im** — Decentralized IPFS backup storage for invoicing data.
- **Hinkal** — Private payments integration.

### Protocol Updates (2024–2026)
- v0.46.0: Added Base, zkSync Era, CORE, Sepolia
- v0.56.0 (Jan 2026): Added Sonic chain
- v0.62.0 (Feb 2026): Full Tron blockchain support (TRC20 payment detection, payment processor, chain definitions, smart contract deployment)
- 2024: Released Payment Widget, Request Checkout Playground, Request Scan, Request Injector
- 2024: Resolved "critical IPFS network infrastructure issues"
- 2024: Reached nearly 40,000 individual protocol transactions in October 2024

### Funding
- Initial seed: $5.5M (Animoca Brands, Balderton Capital, XAnge)
- Strategic round (2025, undisclosed amount): Bpifrance (French sovereign investment bank) led, plus Balderton, Xange
- **Total disclosed:** ~$5.5M seed + undisclosed strategic round
- $1B milestone PR: March 25, 2025

---

## 11. AI/AGENT FEATURES

**Short answer: None announced or shipped as of March 2026.**

Request Network/Finance has made no public announcements about AI agent payment features, autonomous payment protocols, or AI integrations. The broader market has seen Stripe, Google (AP2), Visa, Mastercard, and Coinbase (x402) all launching AI agent payment protocols in 2025–2026, but Request Finance has been silent on this front.

Their closest related feature is webhook-based automation for reconciliation, which is developer-facing automation but not AI-native.

**Gap:** The agentic payments space ($226B B2B stablecoin volume projected) is being seized by other players. Request Finance has no roadmap item here that is publicly known.

---

## 12. COMPLIANCE APPROACH

### Current Status
- **VASP License (Lithuania):** Obtained via Pay.so acquisition (Nov 2024) — covers EU crypto services
- **MiCA compliance:** Actively pursuing; positioning as "regulatory-compliant for crypto finance across Europe"
- **KYC/AML:** Handled through the Pay.so regulated entity for on/off-ramp operations
- **Privacy:** Optional encrypted requests; Aleo integration for private payroll
- **Audit trail:** On-chain payment reference creates immutable audit trail per invoice

### What They DON'T Have
- No US money transmitter licenses (not explicitly serving US market as regulated entity)
- No SOC2 certification mentioned
- KYB/KYC for counter-party screening is not a highlighted feature
- No mention of sanctions screening tooling

---

## 13. KNOWN LIMITATIONS AND COMPLAINTS

### Technical Limitations (Documented)

1. **No cross-chain payments** — Payer and payee MUST be on the same blockchain. If payer has ETH on Arbitrum and payee expects Polygon, the invoice cannot be settled without manual bridging. This is explicitly acknowledged in the FAQ.

2. **No native fiat settlement** — Requests can be *denominated* in fiat but must be *settled* in crypto. On/off-ramp requires Pay.so and is a multi-step process, not seamless.

3. **No smart contract wallet creation** — "Currently impossible via smart contract; use the Request Network API instead."

4. **IPFS dependency** — Invoice data retrieval requires IPFS node. Request Network addressed this by creating a private IPFS network (disabled DHT for speed), but this is a centralization trade-off. Historically had "critical IPFS network infrastructure issues" in 2024.

5. **Hybrid centralization** — The Request Finance API is "not fully decentralized" and requires a Request Finance account. Raw protocol interaction requires running/using a Request Node.

6. **Rate limits** — API: 500 calls/hour (unauthenticated), 5,000/hour (authenticated), 15,000/hour (OAuth). Can be a constraint for high-volume integrations.

### User Experience Complaints (TrustRadius, GetApp, Capterra)

1. **Confusing entity/company selection** — UI described as "cheap" in appearance for billing entity selection
2. **Limited direct crypto-to-crypto flows** — Users want to pay and receive crypto within the app; current wallet transfer process is "cumbersome"
3. **Price increase discontent** — Sudden pricing changes (from the ~free protocol model to $600/month SaaS) have alienated smaller users and some Gnosis integration users
4. **Minor payment discrepancies** — Small gaps (~$5 USD) between requested and received amounts reported
5. **Customer support responsiveness** — Users want faster support response
6. **Lack of onboarding tutorials** — New users request video guides
7. **Limited team management** — Some users want more granular team/role capabilities

### Structural Weaknesses

1. **Pricing cliff** — $600/month Basic is prohibitively expensive for small/growing Web3 teams; the old 0.1% per-invoice model was more accessible
2. **REQ token has no real utility traction** — Only 583K tokens burned out of 1B supply; governance is Discord-based voting which is informal
3. **Protocol-product misalignment** — The foundation and Request Finance are separate, creating potential fragmentation in roadmap and developer trust
4. **Small team (35 people)** — Limited bandwidth to simultaneously build protocol, compliance stack, fiat rails, and enterprise features
5. **European-centric compliance** — Lithuania VASP + MiCA focus leaves US and APAC regulatory coverage unclear
6. **No AI/agent features** — Missing the largest growth narrative in payments (2025–2026)
7. **GitHub issue backlog** — 104 open issues in core repo; not a healthy signal for enterprise developer trust
8. **Volume plateau** — Protocol-level monthly volumes peaked in 2021 ($50.5M in May 2021) and have since "stabilized" at $20-30M/month — not growing at protocol level despite bull market

---

## 14. X/TWITTER SENTIMENT

Direct scraping of X/Twitter was not possible. From indirect signals:

- Request Finance maintains an active account (@RequestFinance)
- No significant viral criticism threads found in search results
- Sentiment around pricing changes to $600/month appears negative in Web3 CFO circles
- The Aleo partnership generated positive PR
- REQ token community appears small (41K wallet addresses) and price-depressed (~$0.066, well below historical highs)
- The broader developer community for the protocol is small (387 GitHub stars is modest)

---

## 15. COMPETITIVE LANDSCAPE SUMMARY

### Direct Competitors to Request Finance

| Company | Focus | Differentiator vs Request |
|---------|-------|--------------------------|
| **Gilded** | Enterprise crypto accounting + invoicing | Better QuickBooks/NetSuite sync, established accounting firm relationships |
| **Acctual** | Crypto B2B payments/invoicing | Simpler UX, lower entry price |
| **Rise** | Crypto payroll (global) | $800M+ processed, 190 countries, US-regulated |
| **Deel** | Global payroll (crypto option) | Massive scale, employer of record, compliance |
| **BVNK** | Enterprise stablecoin payments | Institutional-grade, multi-licensed globally |

---

## 16. SPECIFIC WEAKNESSES THAT PROOFLINK CAN EXPLOIT

### 1. The $600/Month Pricing Wall
Request Finance abandoned the accessible 0.1%-capped-at-$2 model and jumped to $600/month minimum. This locks out **small and mid-size Web3 teams** — the fastest-growing segment. ProofLink can win on pricing by offering usage-based or startup-friendly tiers. Many teams that built on Request Network's free protocol are now priced out of Request Finance's enterprise product.

### 2. No Cross-Chain Payments
The explicit limitation that payer and payee must be on the same chain is a fundamental UX failure in 2026's multi-chain world. A team paying contractors on Polygon cannot receive from a client on Arbitrum without manual bridging. ProofLink can offer native cross-chain payment routing (via CCIP, LayerZero, or similar) as a core feature and market it directly against this gap.

### 3. No AI/Agent Payments
Request Finance has zero AI agent payment features while Stripe, Visa, Google, and Mastercard have all shipped or announced AI agent payment protocols in 2025. ProofLink can position as the **crypto-native AI agent payment infrastructure** — handling autonomous invoice creation, approval workflows, and payment execution for AI systems. This is a blue ocean that Request Finance is ignoring.

### 4. IPFS Fragility and Centralization Trade-offs
Request Network had "critical IPFS network infrastructure issues" in 2024, and their solution (private IPFS network with disabled DHT) is a centralization trade-off. Data availability in the long term is uncertain. ProofLink can offer more resilient storage architecture (e.g., EIP-4844 blob storage, Arweave, or redundant IPFS + Filecoin) and market it as enterprise-grade data guarantees.

### 5. Weak REQ Token Utility
Only 583K REQ burned out of 1B total supply — the deflationary token story is theoretical, not real. ProofLink's tokenomics (if it has a token) can demonstrate actual fee capture, governance utility, and real value accrual tied to volume. Or ProofLink can remain token-free and market simplicity as a feature vs. Request's unnecessary token dependency.

### 6. No Native US Compliance Coverage
Request Finance's regulatory posture is entirely EU-focused (Lithuania VASP, MiCA). This leaves US-based Web3 companies underserved in terms of compliant on/off-ramp, proper KYB, and OFAC screening. ProofLink with US regulatory clarity can own the North American market that Request Finance is not serving with a licensed entity.

### 7. Protocol/Product Fragmentation
The split between Request Network Foundation (protocol) and Request Finance (product) creates confusion for builders. Developers building on the protocol have no guaranteed path to the commercial product's features. ProofLink can offer **a unified, single-product experience** — no separate teams, no protocol vs. product confusion, one roadmap.

### 8. The 104-Issue GitHub Backlog + Small Community
387 GitHub stars and 104 open issues on the core SDK is a signal of limited developer ecosystem health. ProofLink can invest in developer experience (DX), better docs, SDKs in multiple languages, and community building to create a stronger developer pull. Enterprise buyers evaluate ecosystem health before committing to infrastructure.

### 9. Stablecoin Card and Banking Features Are Not Differentiated
Request Finance's business cards and USD accounts are commoditized offerings now available from many fintechs (Brex, Ramp, Relay, etc.). The crypto angle is not enough differentiation. ProofLink should avoid competing here and instead go deep on **programmable payment flows and compliance automation** — areas where Request Finance is weakest.

### 10. Fiat Conversion is Still Multi-Step
Despite the Pay.so acquisition, crypto-to-fiat conversion is still not seamless in the UI. Users report friction. ProofLink can offer **one-click stablecoin-to-fiat settlement** with direct bank delivery as a core workflow, not an add-on acquisition feature.

---

## SOURCES

- [Request Network GitHub Organization](https://github.com/RequestNetwork/)
- [Request Network Core SDK Repo](https://github.com/RequestNetwork/requestNetwork)
- [Request Network Docs - Smart Contracts](https://docs.request.network/advanced/protocol-overview/contracts)
- [Request Network FAQ](https://docs.request.network/faq)
- [Request Finance Pricing](https://www.request.finance/pricing)
- [Request Finance Homepage](https://www.request.finance)
- [Request Finance API FAQ](https://docs.request.finance/faq)
- [REQ Activity Dashboard](https://req.network/)
- [OpenZeppelin Case Study](https://www.request.finance/use-cases/openzeppelin)
- [Pay.so Acquisition Announcement](https://www.request.finance/post/request-finance-acquires-pay-so-lithuania)
- [Consola Finance Acquisition](https://www.request.finance/post/request-finance-acquires-consola-finance)
- [Aleo Partnership](https://aleo.org/post/aleo-request-finance-private-payments-partnership/)
- [Request Finance $1B Milestone](https://www.request.finance/post/request-finance-hits-1-billion-in-bill-payments)
- [September 2025 Metrics](https://www.request.finance/post/request-finance-in-numbers-september-2025---ath-in-stablecoin-to-fiat-payments)
- [Request Finance TrustRadius Reviews](https://www.trustradius.com/products/request-finance/reviews?qs=pros-and-cons)
- [Request Finance Seed Round](https://www.request.finance/post/request-finance-raises-5-5m-seed-round)
- [Blockchain Magazine - $1B Funding Announcement](https://blockchainmagazine.com/press-release/request-finance-hits-1-billion-in-bill-payments-secures-strategic-funding-to-scale-stablecoins-fiat-finance)
- [2024 Year in Review - Request Network](https://request.network/blog/a-year-in-review-2024)
