# ProofLink Product Strategy
**Version:** 1.0
**Date:** March 20, 2026
**Classification:** Internal / Investor-Ready
**Synthesized from:** 7 research deep dives covering TradFi payments, agentic protocols, Coinbase ecosystem, agent economy infrastructure, compliance landscape, market analysis, and competitive intelligence.

---

## 1. Executive Summary

ProofLink is the compliance-as-infrastructure layer for stablecoin and agentic payments. It sits between payment protocols (x402, MPP, AP2, ACP) and settlement rails (USDC on Base/Solana/Tempo, card networks via Visa/Mastercard), providing real-time sanctions screening, FATF Travel Rule compliance, KYC/KYB, and the industry's first Know Your Agent (KYA) standard for autonomous AI agent transactions.

**Why now:** Three converging forces have opened a window that did not exist 12 months ago and will close within 18 months:

1. **Regulatory crystallization.** The GENIUS Act (signed July 2025) and MiCA (fully enforceable) have made stablecoin compliance mandatory, not optional. 99 jurisdictions are implementing the FATF Travel Rule. An enforcement wave is imminent -- 59% of jurisdictions with laws have not yet issued enforcement actions.

2. **Agentic payment protocol explosion.** Six competing agent payment protocols shipped between April 2025 and March 2026 (x402, ACP, AP2, MPP, Visa TAP, Mastercard Agent Pay). None of them have built-in compliance. Every new protocol creates a new compliance surface that ProofLink fills.

3. **Massive acquisition validation.** Mastercard acquired BVNK for $1.8B (March 17, 2026) on $90M raised -- a 22x capital efficiency multiple. Stripe acquired Bridge for $1.1B. The "build compliant stablecoin infrastructure, get acquired" thesis is proven and recent.

**What makes ProofLink unique:** No one else is building a neutral, protocol-agnostic compliance layer that works across both human and agent payment flows. Incumbents (Chainalysis, Elliptic) do post-hoc monitoring at $150K-$500K/year. Payment protocols (x402, MPP) have zero native compliance. ProofLink enforces compliance pre-payment, in the transaction flow, at developer-accessible pricing, and issues cryptographically signed compliance receipts that satisfy enterprise auditors.

---

## 2. Market Opportunity

### 2.1 Total Addressable Market (TAM)

| Market | Size | Growth | Source |
|--------|------|--------|--------|
| Global cross-border B2B payments | $31.7T (2024) -> $47.8T (2032) | 6.7% CAGR | FXC Intelligence |
| Stablecoin transaction volume | $33T (2025) | 72% YoY | Artemis Analytics |
| Crypto payment gateways | $1.68B (2025) -> $6.03B (2035) | 13.6% CAGR | Market research |
| RegTech / Compliance | $19.72B (2025) -> $100.63B (2033) | 22.6% CAGR | Straits Research |
| AI agents market | $7.84B (2025) -> $52.62B (2030) | 46.3% CAGR | MarketsandMarkets |
| Agentic commerce (total) | $3T-$5T by 2030 | -- | McKinsey |

### 2.2 Serviceable Addressable Market (SAM)

ProofLink's SAM is the intersection of B2B stablecoin payments requiring compliance infrastructure:

- **B2B stablecoin payments:** $226B annualized (2026), growing at 733% YoY. This is 0.01% of total global B2B payment volume ($1.6 quadrillion) -- the runway is enormous.
- **Compliance spend per VASP:** $670K-$2M+/year for a VASP doing $100M/month. ProofLink can capture a share of this as a lower-cost aggregated alternative.
- **Agent payment compliance:** Currently $0 (no product exists). As agentic commerce scales toward $3-5T, even 1 basis point of compliance fees = $300M-$500M annually.

### 2.3 Serviceable Obtainable Market (SOM) -- Year 1-3

| Year | Target | Revenue Basis |
|------|--------|---------------|
| Year 1 (H2H) | $50M-$200M monthly stablecoin B2B volume through the platform | 10-30 bps transaction fee = $600K-$7.2M ARR |
| Year 2 (H2A) | $500M-$1B monthly volume with agent-assisted flows | 10-30 bps = $6M-$36M ARR |
| Year 3 (A2A) | $2B-$5B monthly volume with full agent economy | 5-15 bps = $12M-$90M ARR |

### 2.4 Why the Timing Is Perfect

- **GENIUS Act signed:** July 2025 -- US regulatory clarity is here
- **MiCA fully enforceable:** All EU member states by July 2026 -- compliance is mandatory
- **BVNK acquired for $1.8B:** March 17, 2026 -- strategic acquirers are buying NOW
- **a16z raising $2B crypto fund:** March 2026 -- capital is deploying NOW
- **Six agent payment protocols shipped in 12 months:** Compliance gap is widening in real time
- **73% of CFOs evaluating crypto payments:** Enterprise demand is crossing the adoption threshold

---

## 3. Competitive Landscape

### 3.1 Feature Matrix

| Feature | ProofLink | Request Finance | BVNK (Mastercard) | Bridge (Stripe) | NOWPayments | BitPay | Skyfire | Nevermined |
|---------|----------|----------------|-------------------|----------------|-------------|--------|---------|------------|
| Stablecoin invoicing | Yes | Yes (100+ currencies) | Yes (enterprise) | Yes (API) | Yes (300+ coins) | Yes | No | No |
| OFAC/EU/UN sanctions screening | Native, real-time | No | Partial | No | No | Partial | No | No |
| FATF Travel Rule | Native | No | Unclear | No | No | No | No | No |
| AML transaction monitoring | Native | No | Yes | No | No | Partial | No | No |
| KYA (Know Your Agent) | Native, ERC-8004 | No | No | No | No | No | Partial (KYAPay) | No |
| Agent payment protocol support | x402, MPP, AP2, ACP | No | Card rails only | Stripe ecosystem | No | No | x402 only | x402, MCP, A2A |
| Compliance receipts (on-chain) | Yes | No | No | No | No | No | No | No |
| Multi-jurisdiction compliance | US + EU + UK + SG + UAE | Limited | Mastercard network | US-focused | No | US-focused | No | No |
| ERP integration pathway | Planned (NetSuite, SAP) | QuickBooks, Xero | Enterprise | Stripe dashboard | No | Enterprise | No | No |
| Agent identity verification | DID + VC + ERC-8004 | No | No | No | No | No | KYAPay protocol | ERC-8004 |
| Dispute resolution | Planned (ERC-8183 hooks) | No | Card chargeback | Stripe disputes | No | No | No | Escrow-based |
| Open standard authorship | KYA standard, Agent Invoice | No | Mastercard proprietary | No | No | No | Proprietary | No |

### 3.2 The Whitespace -- What Nobody Is Doing

Based on systematic analysis across all 6 agent payment protocols, 8 infrastructure projects, and 6 TradFi incumbents:

1. **Invoice-native trust layer.** All incumbents build payment primitives. Nobody has built the workflow layer between "business sends invoice" and "agent authorizes payment" with compliance, dispute resolution, multi-sig approval, and audit trail baked in.

2. **KYA for B2B.** Mastercard's Verifiable Intent addresses consumer retail. B2B invoice signing by AI agents with verified human authorization chains is unaddressed entirely.

3. **Cross-protocol compliance orchestration.** When an AI agent pays an invoice via x402, with the payer's treasury on Kinexys, settled on Tempo -- no compliance layer spans all of these.

4. **Agent Travel Rule.** Current Travel Rule protocols (Notabene, Sygna, TRISA) assume both parties are VASPs with registered compliance officers. Agent-to-agent payments break this assumption. Nobody has defined how originator information travels with agent transactions.

5. **Compliance receipts as verifiable attestations.** Every protocol creates logs. None create the structured, auditor-friendly, cryptographically signed compliance proof required for SOX, PCI DSS, or financial reporting.

---

## 4. ProofLink's Unique Value Proposition

### 4.1 The Core Thesis: Compliance-as-Infrastructure for Agentic Payments

ProofLink is not competing with Stripe, Visa, or Circle at the payment rail layer. ProofLink is the **neutral compliance orchestration layer** that makes those rails work for regulated B2B commerce -- both human and autonomous.

The thesis rests on three structural advantages:

**Structural Advantage 1: Compliance cannot be bolted on.**
Retroactively adding Travel Rule compliance to existing exchange infrastructure is substantially harder than building it native. Every competitor that tries to add compliance after the fact faces architectural debt. ProofLink builds it from day one.

**Structural Advantage 2: Protocol fragmentation increases ProofLink's value.**
Each new agent payment protocol (x402, MPP, AP2, ACP, TAP, Agent Pay) creates a new compliance surface. An enterprise using multiple protocols faces fragmented, non-interoperable compliance stacks. ProofLink provides one compliance layer across all of them. More fragmentation = more value for the neutral middleware.

**Structural Advantage 3: Compliance is a network effect business.**
Every agent screened builds the behavioral database. Every compliance attestation issued builds the reputation dataset. Over time, ProofLink's dataset of agent compliance history becomes a competitive moat no single protocol can replicate.

### 4.2 Why This Cannot Be Easily Replicated

| Barrier | Detail |
|---------|--------|
| **Standards authorship** | If ProofLink authors the KYA standard that AP2 and x402 adopt, every agent transaction in those ecosystems touches ProofLink infrastructure |
| **Multi-protocol integration cost** | Integrating compliance across 6+ competing protocols, 5+ blockchain networks, and 7+ regulatory jurisdictions simultaneously is a 12-18 month effort no protocol owner will prioritize |
| **Regulatory credibility** | Being the first to define "Travel Rule for AI agents" creates a reference architecture regulators cite -- this is locked in once established |
| **Behavioral dataset** | Agent transaction pattern data does not exist anywhere today. ProofLink will be the first to build this dataset, creating ML model advantages over time |
| **Neutrality** | Coinbase's compliance serves Coinbase. Stripe's serves Stripe. A neutral compliance provider is structurally different from a vertically integrated one |

---

## 5. Product Architecture

### 5.1 ProofLink Engine

The ProofLink Engine is ProofLink's core compliance decision engine. It executes in the payment flow -- before funds move -- and produces cryptographically signed compliance receipts.

**Decision flow (target: <500ms end-to-end):**

```
Agent/Human initiates payment
    |
    v
ProofLink Engine:
    1. Resolve identity
       - Human: KYC credential (Jumio/Onfido via integration)
       - Agent: DID lookup -> ERC-8004 registry -> KYA credential verification
       - Entity: GLEIF vLEI verification (B2B)
    |
    2. Sanctions screening (<100ms)
       - OFAC SDN (Chainalysis free API baseline)
       - EU Consolidated Financial Sanctions List
       - UN Consolidated List
       - HMT Consolidated List (UK)
       - Wallet address screening + entity-level mapping
    |
    3. Travel Rule pre-flight
       - Determine jurisdiction thresholds (US: $3K, EU: none, etc.)
       - Collect originator information (agent DID + principal ID + wallet)
       - Collect beneficiary information
       - Transmit via Notabene Gateway (multi-protocol interoperability)
    |
    4. AML risk scoring
       - Transaction graph analysis (TRM Labs / ChainAware integration)
       - Agent behavioral velocity checks
       - Cross-agent pattern analysis (ML model, proprietary)
    |
    5. Jurisdiction-specific rules
       - EU: MiCA CASP authorization check
       - US: BSA threshold application
       - Multi-jurisdiction: apply strictest applicable rule
    |
    6. Issue ProofLink Compliance Receipt
       - Cryptographically signed attestation
       - Content: screens performed, timestamp, results, identity hashes (no raw PII)
       - Anchored on-chain (IPFS hash committed to Base/Ethereum)
       - Machine-verifiable by counterparties without trusting ProofLink
    |
    v
Payment executes with attached ProofLink attestation
```

### 5.2 Integration with Agent Payment Protocols

| Protocol | Integration Model | ProofLink Role |
|----------|------------------|---------------|
| **x402 (Coinbase)** | Middleware between HTTP 402 response and payment execution. ProofLink intercepts the payment payload, runs compliance, attaches ProofLink receipt. | Compliance gateway for permissionless payments |
| **MPP (Stripe/Tempo)** | Session-level compliance. When an agent opens an MPP session, ProofLink validates the agent's KYA credential and the session's spending parameters against compliance rules. Continuous monitoring during session. | Session compliance validator |
| **AP2 (Google)** | Mandate-level compliance. ProofLink validates each mandate (Intent, Cart, Payment) against sanctions and AML rules. Compliance data embedded in the mandate itself. | Mandate compliance layer |
| **ACP (OpenAI/Stripe)** | SPT-level compliance. ProofLink verifies the agent's delegation scope and screens the transaction before SPT execution. | Delegated credential compliance check |
| **MCP servers** | ProofLink exposes compliance as an MCP server. Any AI agent calls `check_sanctions()`, `verify_travel_rule()`, `validate_kya()` as standard MCP tool invocations. | Compliance-as-MCP-tool (ambient compliance) |

### 5.3 KYA (Know Your Agent) Standard

ProofLink's KYA standard answers three questions about every autonomous agent:

1. **Who is this agent?** (Identity) -- ERC-8004 registry lookup + DID resolution
2. **Who controls it?** (Authority) -- Human principal linkage via Verifiable Credentials, compatible with Mastercard Verifiable Intent and World ID ZK proofs
3. **Can it be trusted?** (Reputation) -- ERC-8004 Reputation Registry + ProofLink behavioral scoring

**KYA credential schema (W3C Verifiable Credential):**

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1", "https://prooflink.dev/kya/v1"],
  "type": ["VerifiableCredential", "KYACredential"],
  "issuer": "did:prooflink:prooflink-engine",
  "credentialSubject": {
    "agentId": "erc8004:{chainId}:{registryAddress}:{tokenId}",
    "agentDID": "did:ethr:0x...",
    "principalEntity": {
      "type": "LegalEntity",
      "vLEI": "LEI-20-char-code",
      "kyb_status": "verified",
      "jurisdiction": "US"
    },
    "principalHuman": {
      "did": "did:world:0x...",
      "humanVerification": "world_id_zk_proof | kyc_credential",
      "delegationScope": {
        "maxTransactionValue": "10000 USDC",
        "allowedCounterparties": ["*"],
        "blockedJurisdictions": ["IR", "KP", "CU"],
        "expiresAt": "2026-06-20T00:00:00Z"
      }
    },
    "complianceStatus": {
      "sanctionsScreened": true,
      "sanctionsScreenDate": "2026-03-20T14:30:00Z",
      "amlRiskScore": 12,
      "travelRuleCapable": true
    },
    "reputationScore": 87,
    "validatedBy": ["prooflink_prooflink", "erc8004_validator_xyz"]
  }
}
```

ProofLink publishes this as an open standard while operating the verification infrastructure -- creating both a standards-setting position and a recurring revenue moat.

### 5.4 Agent Invoice Standard (JSON-LD Schema)

No machine-readable invoice format exists for agent-to-agent commerce. ProofLink defines one:

```json
{
  "@context": ["https://schema.org", "https://prooflink.dev/invoice/v1"],
  "@type": "AgentInvoice",
  "invoiceId": "inv_prooflink_2026_abc123",
  "issuer": {
    "agentId": "erc8004:8453:0x...:42",
    "principalEntity": "LEI-20-char-code",
    "kya_credential": "did:prooflink:kya:..."
  },
  "recipient": {
    "agentId": "erc8004:8453:0x...:99",
    "principalEntity": "LEI-20-char-code"
  },
  "lineItems": [
    {
      "description": "API inference calls - GPT-4 equivalent",
      "quantity": 15000,
      "unit": "api_call",
      "unitPrice": "0.003 USDC",
      "total": "45.00 USDC"
    }
  ],
  "totalAmount": "45.00 USDC",
  "currency": "USDC",
  "settlementChain": "base:8453",
  "paymentProof": {
    "protocol": "x402",
    "txHash": "0xabc...",
    "facilitator": "cdp.coinbase.com"
  },
  "workProof": {
    "standard": "ERC-8183",
    "evaluatorAttestation": "0xdef...",
    "jobId": "erc8183:8453:0x...:7"
  },
  "complianceStamp": {
    "proofLinkReceiptId": "pl_receipt_xyz",
    "ipfsHash": "QmX...",
    "sanctionsCleared": true,
    "travelRuleTransmitted": true,
    "jurisdictionsApplied": ["US", "EU"]
  },
  "taxInfo": {
    "vatApplicable": false,
    "withholdingTax": "0%"
  },
  "disputeWindow": "72h",
  "disputeOracleContract": "0x..."
}
```

This schema links: agent identity (ERC-8004) -> service description -> payment proof (x402/MPP tx hash) -> work proof (ERC-8183 evaluator attestation) -> compliance stamp (ProofLink receipt). It is the missing piece between "agent paid" and "CFO approved."

### 5.5 Compliance Receipts as On-Chain Attestations

Every ProofLink-processed payment generates a ProofLink Compliance Receipt:

- **Content:** What was screened (sanctions lists, AML checks, identity verification), timestamp with proof, result of each check, agent/human identity credential hashes (no raw PII), jurisdictional rules applied
- **Storage:** IPFS content-addressed storage, with commitment hash anchored on-chain (Base or Ethereum)
- **Verification:** Any party can verify the receipt independently without trusting ProofLink
- **Properties:** Tamper-evident, portable across jurisdictions, satisfies auditor requirements without exposing PII, proves real-time due diligence was exercised

---

## 6. Go-to-Market Strategy

### Phase 1: H2H -- Human-to-Human (Live Now, Scale Through Q2 2026)

**Target:** CFOs and finance teams at mid-market companies ($10M-$500M revenue) making cross-border B2B stablecoin payments.

**Why they buy:**
- 73% of CFOs are evaluating crypto payment options
- 77% of corporates want stablecoin payments to suppliers cross-border
- Current settlement: 3-5 business days, thousands in fees. Stablecoin: 3.2 seconds average
- GENIUS Act + MiCA make compliance mandatory -- CFOs need proof they're compliant

**Product:**
- Stablecoin invoicing with USDC/EURC (Circle, MiCA + GENIUS Act compliant)
- Real-time sanctions screening (OFAC, EU, UN, HMT)
- FATF Travel Rule compliance built-in
- ProofLink Compliance Receipts for every transaction
- Dashboard for payment management, compliance reporting

**Distribution:**
- Direct sales to CFOs via LinkedIn outreach, fintech conferences
- Content marketing: "How to pay international suppliers in stablecoins without going to jail"
- Partner with accounting firms (Big 4 are advising clients on crypto adoption)
- Integration with QuickBooks, Xero, NetSuite for invoice import/export

**Success metric:** $50M-$200M monthly payment volume, 50+ active businesses

---

### Phase 2: H2A -- Human-to-Agent / Agent-to-Human (Q3 2026)

**Target:** Enterprises deploying AI agents for procurement, expense management, and vendor payments. Also: API providers monetizing via x402/MPP who need compliance for agent customers.

**Why they buy:**
- 80% of Fortune 500 have active AI agents in production
- Gartner projects $15T in B2B spending intermediated by agents by 2028
- But: only 16% of consumers trust AI to make payments. Compliance closes the trust gap
- Enterprise procurement requires: policy engines, audit trails, SOC 2, ERP integration

**Product additions:**
- KYA (Know Your Agent) verification for inbound agent payments
- Agent spending policy engine (declarative rules for what agents can spend, on what, under what conditions)
- x402 compliance middleware (intercept and screen permissionless agent payments)
- MPP session compliance (validate agent sessions at authorization)
- Compliance-as-MCP-tool (agents call compliance checks natively)

**Distribution:**
- Hackathon strategy (see 6.4)
- Developer relations: SDKs, documentation, free tier
- Partnership with Coinbase (AgentKit integration), Stripe (MPP integration)
- Enterprise sales through existing H2H customer expansion

**Success metric:** 10,000+ agents with KYA credentials, 1M+ agent transactions screened/month

---

### Phase 3: A2A -- Agent-to-Agent (Q1 2027)

**Target:** The autonomous agent economy -- agents hiring other agents, negotiating prices, invoicing, and settling payments without human intervention.

**Why they buy:**
- The compliance layer in the A2A stack is [GAP] -- literally no product exists
- ERC-8183 (programmable escrow) goes live but has no compliance hooks
- Agent-to-agent stablecoin transfers trigger Travel Rule obligations that no one handles
- Regulatory frameworks for agentic payments will emerge (EU likely first) -- ProofLink's architecture becomes the reference implementation

**Product additions:**
- Full Agent Invoice Standard (JSON-LD schema, machine-readable)
- Agent-to-agent Travel Rule protocol (IVMS101 data standard adapted for agent principals)
- Behavioral AML monitoring for agent transaction patterns (ML models trained on proprietary agent activity data)
- ERC-8004 Compliance Validator (on-chain attestation via Validation Registry)
- Dispute resolution hooks (ERC-8183 compatible, with ProofLink audit trail as evidentiary record)

**Distribution:**
- Standards adoption: publish KYA and Agent Invoice Standard as open specs
- Become a registered ERC-8004 validator -- agents with ProofLink validation have provable compliance
- Protocol-level integrations: ProofLink compliance baked into x402 SDK, MPP reference implementation
- Regulatory engagement: present ProofLink's architecture to FATF, FinCEN, ESMA as the reference for agent payment compliance

**Success metric:** 100,000+ KYA-credentialed agents, ProofLink referenced in regulatory guidance

---

### 6.4 Hackathon Strategy

The hottest hackathon tracks are all x402/agentic-commerce related. ProofLink should enter aggressively:

| Event | Strategy | Prize Opportunity |
|-------|----------|------------------|
| **ETHGlobal** (multiple 2026 events) | Demo: AI agent invoicing a business client, business approving + paying via x402, with automatic Travel Rule compliance and on-chain ProofLink receipt | $500K+ prize pools |
| **SF Agentic Commerce x402 Hackathon** | Previous event: 324 builders, 275K on-chain transactions, $50K+ prizes. Next event: submit ProofLink as compliance middleware track | Partner sponsor opportunity |
| **Coinbase "Agents in Action"** | Integrate ProofLink compliance into AgentKit workflow. Show: agent creates invoice -> counterparty agent pays via x402 -> ProofLink screens -> ProofLink receipt | CDP ecosystem visibility |
| **Base Batches 2026** | Apply to startup track: $10K grant + 8-week program + $50K Base Ecosystem Fund | $50K+ investment, SF Demo Day |
| **Encode Club** | DeFi compliance track -- show ProofLink as MiCA compliance layer for DeFi protocols | $66K+ prizes |

**Winning demo formula:** An AI agent invoicing a business client -> the business approving and paying via x402 -> automatic Travel Rule compliance -> on-chain compliance receipt -> ERP reconciliation. This demo wins in every current hackathon because it shows real commerce, real compliance, and real agent sophistication.

---

## 7. Revenue Model

### 7.1 Transaction Fees (Primary Revenue)

| Tier | Volume | Fee | Comparable |
|------|--------|-----|-----------|
| Starter | <$1M/month | 30 bps (0.30%) | Coinbase Commerce: 1%. BitPay: 1%. NOWPayments: 0.5% |
| Growth | $1M-$10M/month | 15 bps (0.15%) | BVNK: ~15-25 bps. Bridge/Stripe: variable |
| Enterprise | $10M+/month | 5-10 bps (0.05-0.10%) | Negotiated. BVNK processed $30B annualized at similar rates |

### 7.2 Subscription Tiers (Compliance-as-a-Service)

| Tier | Price | Included |
|------|-------|---------|
| **Free** | $0 | OFAC SDN screening only (Chainalysis free API), 100 transactions/month, basic dashboard |
| **Developer** | $99/month | Full sanctions screening (OFAC + EU + UN + HMT), 10,000 transactions/month, API access, basic AML |
| **Business** | $499/month | Full compliance stack (sanctions + Travel Rule + AML), 100,000 transactions/month, ProofLink receipts, KYA verification (100 agents) |
| **Enterprise** | Custom ($2,000+/month) | Unlimited volume, custom compliance rules, dedicated compliance receipts, audit support, ERP integration, SLA |

### 7.3 KYA Credential Fees

| Service | Price |
|---------|-------|
| Agent KYA verification | $0.10/verification (one-time) |
| KYA credential renewal | $0.05/month per active agent |
| Bulk enterprise KYA | $0.02/agent/month (10,000+ agents) |

### 7.4 Revenue Projections

| Year | Volume | Transaction Revenue | Subscription Revenue | KYA Revenue | Total ARR |
|------|--------|--------------------|--------------------|-------------|-----------|
| Year 1 | $100M cumulative | $200K | $300K | $50K | $550K |
| Year 2 | $2B cumulative | $3M | $2M | $500K | $5.5M |
| Year 3 | $15B cumulative | $12M | $8M | $3M | $23M |

These numbers are conservative. BVNK reached $30B annualized volume and $1.8B acquisition value. Bridge quadrupled stablecoin volume after Stripe acquisition.

---

## 8. Funding Narrative

### 8.1 The Pitch That Lands

> "ProofLink is the Stripe of compliant B2B crypto payments. We are building the trust layer that sits between every stablecoin transaction and every AI agent payment -- making them legal, auditable, and safe for enterprise CFOs. The compliance infrastructure for the $33 trillion stablecoin economy and the $3-5 trillion agentic commerce market does not exist. We are building it."

### 8.2 Key Numbers for the Deck

Use these exact figures -- every one is sourced from primary research:

| Slide | Number | Source |
|-------|--------|--------|
| Market size | "$150 trillion in cross-border B2B payments -- 0.01% on-chain today" | FXC Intelligence |
| Stablecoin traction | "$33 trillion in stablecoin volume in 2025 -- up 72% YoY, approaching ACH network scale" | Artemis Analytics / Bloomberg |
| B2B opportunity | "B2B stablecoin payments grew 733% YoY in 2025" | BVNK / Cobo |
| Exit comp | "BVNK acquired for $1.8B on $90M raised -- 22x capital efficiency" | Mastercard (March 17, 2026) |
| Exit comp 2 | "Stripe acquired Bridge for $1.1B -- largest crypto acquisition of 2025" | Stripe |
| Regulatory tailwind | "99 jurisdictions implementing Travel Rule -- enforcement wave incoming" | FATF 2025 |
| Compliance market | "RegTech market: $19.72B -> $100.63B by 2033 at 22.6% CAGR" | Straits Research |
| Agent economy | "AI agents market: $7.84B -> $52.62B by 2030 at 46.3% CAGR" | MarketsandMarkets |
| Enterprise demand | "73% of CFOs evaluating crypto payment options; 86% of firms say infra is ready" | Chainup / industry surveys |
| Trust gap | "Only 16% of US consumers trust AI to make payments -- compliance closes this gap" | PYMNTS |

### 8.3 Comparable Exits and Valuations

| Company | Event | Valuation | Revenue Multiple Signal | Date |
|---------|-------|-----------|------------------------|------|
| **BVNK** | Acquired by Mastercard | $1.8B | $90M raised, 22x capital efficiency | March 2026 |
| **Bridge** | Acquired by Stripe | $1.1B | Largest Stripe acquisition ever | February 2025 |
| **Rain** | Series C (ICONIQ-led) | $1.95B | $250M raised | January 2026 |
| **Tempo** | Series A (Stripe + Paradigm) | $5B | $500M raised | 2025/2026 |
| **Ripple** | Funding round | $40B | $500M raised | 2025 |

**The signal:** Every major card network and payment platform is acquiring stablecoin infrastructure at $1B+ valuations. The next acquirer is Visa, JPMorgan, or PayPal. ProofLink's compliance-first positioning makes it an ideal acquisition target for any of them.

### 8.4 Target VCs

| VC Firm | Why | Thesis Fit |
|---------|-----|-----------|
| **a16z Crypto** | Raising ~$2B 5th fund (March 2026). Thesis: "stablecoins are the fastest, cheapest, most global way to send a dollar." State of Crypto report signals payments infrastructure conviction. | Direct thesis alignment |
| **Paradigm** | Backed Tempo with Stripe at $5B. Focus: protocols, payment infrastructure. | Existing bet on agent payment rails; ProofLink is the compliance layer |
| **Pantera Capital** | Active in payment protocols, DeFi. | Stablecoin infrastructure thesis |
| **ICONIQ Growth** | Led Rain $250M Series C at $1.95B. | Proven conviction in stablecoin payments |
| **Dragonfly Capital** | Participated in Rain. Crypto protocols + payments. | Capital efficiency focus aligns with ProofLink |
| **Haun Ventures** | Crypto consumer + infrastructure. Active in stablecoin space. | Regulatory-aware fund, compliance thesis resonates |
| **Bessemer Venture Partners** | Fintech + crypto infrastructure. Rain Series C. | Enterprise SaaS + compliance infrastructure |
| **Galaxy Ventures** | Crypto + digital assets focus. Rain Series C. | Infrastructure-first thesis |

### 8.5 What VCs Want to Hear in 2026

From direct VC commentary (The Block, DL News, a16z):

1. **Real metrics** -- profitability paths, transaction volume, organic user growth
2. **Regulatory clarity** -- teams that understand and build around MiCA, GENIUS Act
3. **Infrastructure, not speculation** -- rails, settlement, compliance tooling, not token economics
4. **Capital efficiency** -- BVNK's 22x multiple proves this market rewards lean infrastructure builders
5. **Measurable cash flows** -- how does this generate actual returns from transaction fees/volume
6. **"Stablecoin-as-a-Service" as a category** -- VC investment in stablecoin companies exceeded $1.5B in 2025

ProofLink checks every box: compliance infrastructure (not a token), transaction fee revenue model (measurable cash flows), regulatory moat (GENIUS Act + MiCA native), capital efficient (build on top of existing compliance providers, don't replicate Chainalysis).

---

## 9. Differentiation from Request Finance

Request Finance is the closest direct competitor in crypto invoicing. Here is the specific breakdown of why ProofLink wins:

### 9.1 Technical Differences

| Dimension | Request Finance | ProofLink |
|-----------|----------------|----------|
| **Core product** | Crypto invoicing + payroll | Compliance-first payment orchestration with invoicing |
| **Compliance** | Basic (limited to what blockchain provides) | Native real-time sanctions screening, Travel Rule, AML, KYA |
| **Agent support** | None -- human-only workflows | Native: KYA, agent invoice standard, x402/MPP/AP2 integration |
| **Payment protocols** | Ethereum-based Request Network | Protocol-agnostic: x402, MPP, AP2, ACP, USDC direct |
| **Compliance receipts** | None | Cryptographically signed, on-chain attestations |
| **Regulatory coverage** | Not specified | US (GENIUS Act), EU (MiCA), UK, Singapore, UAE explicit |
| **Identity model** | Wallet address | DID + VC + ERC-8004 + GLEIF vLEI |
| **Escrow/conditional payment** | Basic | ERC-8183 compatible programmable escrow |
| **Audit trail** | Blockchain transaction history | ProofLink receipt with compliance details, IPFS-anchored |

### 9.2 Strategic Differences

| Dimension | Request Finance | ProofLink |
|-----------|----------------|----------|
| **Market positioning** | "Crypto invoicing tool" | "Trust protocol for money moving at machine speed" |
| **TAM ceiling** | Crypto invoicing (~$6B market) | Compliance infrastructure ($100B RegTech) + agentic payments ($3-5T) |
| **Moat** | First mover in crypto invoicing | Compliance network effects + standards authorship + agent behavioral data |
| **Acquisition attractiveness** | Niche invoicing tool | Compliance infrastructure layer (Mastercard/Visa/JPMorgan acquisition target) |
| **Regulatory positioning** | Reactive | Proactive -- defining standards before regulators mandate them |

### 9.3 Why ProofLink Wins

1. **Request Finance has no compliance layer.** In a post-GENIUS Act, post-MiCA world, this is disqualifying for enterprise adoption. CFOs need proof of compliance -- Request cannot provide it.

2. **Request Finance has no agent story.** The $3-5T agentic commerce market is invisible to Request's product. ProofLink is built for the H2H -> H2A -> A2A progression.

3. **Request Finance is invoice-centric, not compliance-centric.** When compliance becomes mandatory (it already is), the compliance layer becomes the platform, and invoicing becomes a feature on top. ProofLink has the right architectural priority.

4. **Request Finance cannot issue compliance receipts.** The signed, verifiable, on-chain compliance attestation is a product category that Request would need to rebuild its architecture to offer.

---

## 10. Risk Analysis

### 10.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Protocol fragmentation worsens** -- no standard wins, ProofLink must support 6+ protocols indefinitely | High | Medium | Architecture is already protocol-agnostic. Each new protocol integration is incremental. Fragmentation actually increases ProofLink's value as the neutral layer. |
| **x402/MPP adoption stalls** -- agentic commerce narrative ahead of reality (x402 at $28K/day real volume) | Medium | Medium | Build for H2H B2B first (proven $226B/year market). Agentic is the 2027+ expansion, not the 2026 revenue driver. |
| **Compliance provider dependency** -- Chainalysis, Notabene, or TRM change pricing/access | Medium | Low | Multi-provider architecture. Free tier on Chainalysis free SDN API. Upgrade paths to TRM, ChainAware. No single-vendor lock-in. |
| **Latency budget** -- <500ms compliance decision may be hard to achieve with multiple provider calls | Medium | Medium | Parallel API calls. Cache sanctions lists locally (Chainalysis allows this). Pre-compute KYA credentials. Target: 200ms for cached decisions, 500ms for cold. |
| **ERC-8004/ERC-8183 adoption stalls** -- standards fail to gain traction | Low | Medium | These are reference standards, not dependencies. ProofLink's compliance engine works with any identity system. ERC-8004 is preferred but not required. |

### 10.2 Regulatory Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **ProofLink classified as a VASP/MSB** -- must obtain expensive licenses | High | Medium | Architecture as non-custodial compliance middleware, not a payment processor. Never hold or transmit customer funds. If reclassified, partner bank model ($0 upfront, revenue share) is the fallback. |
| **MiCA CASP licensing required for EU operations** | Medium | High | Use Circle's EURC and partner with MiCA-licensed intermediaries initially. Apply for CASP license when revenue justifies ($100K-$500K cost). |
| **US state MTL requirements** -- 49 states, $1.3M-$3M+ upfront | High | Low (if non-custodial) | Non-custodial architecture avoids MTL trigger. If needed, partner bank model. NY BitLicense: avoid NY initially or use licensed partner. |
| **FATF issues agent-specific guidance that contradicts ProofLink's approach** | Medium | Low | Being first to define "Travel Rule for agents" means ProofLink's architecture influences the guidance. Engage proactively with FATF working groups. |
| **GENIUS Act yield prohibition limits business model** | Low | N/A | ProofLink's model is transaction fees, not yield. This restriction is irrelevant to ProofLink but eliminates potential competitors who rely on yield. |

### 10.3 Market Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Incumbents vertically integrate** -- Stripe adds compliance layer, Mastercard adds KYA, Visa builds trust | High | High | Build the compliance moat faster than they can ship. Be the open standard they reference rather than compete with. Stripe took 2 years to add basic stablecoin support; compliance is even harder. |
| **"Crypto winter" kills enterprise stablecoin adoption** | Medium | Low | Stablecoins are not speculative crypto. $33T volume is real economic activity. BVNK's volume quadrupled during the 2025 market correction. Stablecoins are countercyclical -- they grow when businesses seek cheaper rails. |
| **Enterprise sales cycle too long** -- 6-12 months for compliance products | High | High | Lead with developer-first free tier (capture startups now). Enterprise is a parallel motion. BVNK proved enterprise stablecoin sales can be fast when compliance is native. |
| **KYA standard not adopted** -- competing standards emerge | Medium | Medium | Publish as open standard (Apache 2.0). Get one major protocol (x402 or AP2) to adopt. If competing standards win, implement them -- ProofLink is the orchestration layer, not the standard itself. |

### 10.4 Risk Summary Heat Map

| | Low Probability | Medium Probability | High Probability |
|---|---|---|---|
| **High Severity** | US MTL requirement | Protocol fragmentation; VASP classification | Incumbent vertical integration; Enterprise sales cycle |
| **Medium Severity** | Compliance provider dependency | x402 adoption stalls; Latency budget; KYA not adopted | MiCA CASP licensing |
| **Low Severity** | FATF contradicts approach | ERC-8004 adoption stalls | -- |

**Overall risk assessment:** The highest-severity, highest-probability risk is incumbent vertical integration. The mitigation is speed: establish the compliance standard and the network effect before Stripe or Visa can replicate. The second major risk is enterprise sales cycle length, mitigated by the developer-first GTM and hackathon-driven adoption.

---

## Appendix A: Key Source Documents

1. Team Gamma: TradFi Crypto/Blockchain/AI Payments Deep Dive (Visa, Stripe, Mastercard, PayPal, JPMorgan, Swift, Circle analysis)
2. Market Analysis: Deep Dive (TAM/SAM/SOM, investment trends, hackathon landscape, competitive snapshot)
3. Coinbase Ecosystem Research (AgentKit, CDP, x402 protocol, Base chain, Commerce)
4. Agent Economy Research (Infrastructure projects, identity standards, payment rails, invoicing gaps)
5. Compliance Landscape Research (FATF Travel Rule, sanctions screening, KYC/KYB, MiCA, US regulation, on-chain compliance)
6. Agentic Payments Deep Dive (All 6 protocols, infrastructure projects, MCP servers, identity delegation, compliance gaps)
7. Current State Analysis (ProofLink product assessment)

## Appendix B: Acronym Reference

| Acronym | Definition |
|---------|-----------|
| KYA | Know Your Agent |
| KYC | Know Your Customer |
| KYB | Know Your Business |
| AML | Anti-Money Laundering |
| OFAC | Office of Foreign Assets Control |
| FATF | Financial Action Task Force |
| MiCA | Markets in Crypto-Assets Regulation |
| CASP | Crypto Asset Service Provider |
| VASP | Virtual Asset Service Provider |
| MTL | Money Transmitter License |
| MSB | Money Services Business |
| BSA | Bank Secrecy Act |
| DID | Decentralized Identifier |
| VC | Verifiable Credential (W3C) |
| vLEI | Verifiable Legal Entity Identifier |
| SPT | Shared Payment Token |
| MPP | Machine Payments Protocol |
| AP2 | Agent Payments Protocol (Google) |
| ACP | Agentic Commerce Protocol (OpenAI/Stripe) |
| TAP | Trusted Agent Protocol (Visa) |
| MCP | Model Context Protocol |
| CCTP | Cross-Chain Transfer Protocol (Circle) |
| ERP | Enterprise Resource Planning |

---

*Synthesized by Team Sigma -- March 20, 2026*
*Data sources: 7 research deep dives, 100+ primary sources, covering March 2025 -- March 2026*
