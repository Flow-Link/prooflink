# Agentic Payment Protocol Comparison: FlowLink Integration Analysis
**Team Delta — FlowLink Research**
**Date: March 20, 2026**
**Classification: Internal Strategy**

---

## Overview

Six agentic payment protocols launched between April 2025 and March 2026. Each emerged from a different coalition with different architectural philosophies, compliance postures, and developer audiences. FlowLink's compliance-first positioning creates distinct integration angles with each. This document provides a side-by-side technical and strategic comparison, then outputs a prioritized integration roadmap.

---

## 1. x402 (Coinbase / x402 Foundation)

### Current Status and Volume

**Live. The only protocol with meaningful organic transaction volume.**

- Launched: May 2025
- V2 launched: December 11, 2025
- Transactions: 75.41 million in the first 6 months; ~500K/week sustained
- Transaction value: $24.24M total processed
- Participants: 94,060 buyers, 22,000 sellers
- Average payment size: ~$0.20
- Caution: Artemis analysts identified artificial activity (self-dealing, wash trading); real organic demand is nascent but growing

**Notable integrations post-launch:**
- Stripe added x402 support on Base (February 11, 2026)
- Cloudflare and Coinbase co-founded the x402 Foundation (September 23, 2025)
- World (Sam Altman's biometric identity company) integrated World ID verification into x402 agent transactions (March 17, 2026)
- AWS, Anthropic, Circle, NEAR as launch partners

### Technical Architecture

x402 is a three-party HTTP-native payment protocol built on the dormant HTTP 402 "Payment Required" status code.

**Three parties:**
1. **Client** — the agent seeking to pay for a resource
2. **Resource Server** — the API or HTTP service being paid for
3. **Facilitator** — verifies payment authorization and broadcasts the on-chain transaction

**Flow (V2):**
```
1. Agent → GET /api/endpoint
2. Server ← 402 Payment Required
           PAYMENT-REQUIRED: {price, asset, network, facilitator}
3. Agent signs payment authorization (EIP-3009 / Permit2 / ERC-7710)
4. Agent → GET /api/endpoint
           PAYMENT-SIGNATURE: {signed_payload}
5. Facilitator verifies signature, checks balance, simulates tx
6. Facilitator broadcasts on-chain tx (USDC transfer)
7. Server verifies confirmation → returns 200 OK
           PAYMENT-RESPONSE: {txHash, confirmation}
```

**V2 additions:** Wallet-based identity sessions (skip repaying on every call), automatic API discovery, dynamic `payTo` routing, multi-chain by default via CAIP standards, fiat compatibility roadmap (ACH, card networks), multi-facilitator support, plugin-driven SDK for new chains.

**Settlement:** USDC primary (EIP-3009 native — most efficient), EURC, all ERC-20 via Permit2, SPL tokens on Solana. Sub-200ms confirmation. Under $0.001 per transaction.

**Supported chains:** Base (primary), Polygon, Solana, any EVM chain via custom facilitator.

**SDKs:** TypeScript (`@x402/evm`, `@x402/svm`), Python, Go. Apache 2.0 license.

### Where Compliance Fits

**The biggest compliance gap in the entire protocol landscape.**

x402 is permissionless by design: no accounts, no KYC, no API keys required. The Coinbase-hosted facilitator runs OFAC screening and KYT (Know Your Transaction) checks on every transaction passing through it. But:

- Independent facilitators have no compliance obligation built into the protocol spec
- No AML transaction monitoring
- No FATF Travel Rule support (stablecoin transfers carry zero originator information)
- No agent identity verification (KYA)
- Geographic restrictions are mentioned in the V2 roadmap as "optional attestations for sellers" — not live
- The World ID integration (March 2026) is the first attempt at human-backing verification, but it is opt-in and covers only the buyer, not the agent itself

**The compliance gap FlowLink fills:** Every x402 transaction that passes through a non-Coinbase facilitator — or any transaction above Travel Rule thresholds — is effectively unscreened. FlowLink's ProofLink Engine inserted as a compliance middleware layer before the facilitator settles would provide OFAC/UN/EU/HMT sanctions screening, FATF Travel Rule information packaging, and KYA verification for any x402 payment.

### How FlowLink Integrates

**Integration model: Compliance Facilitator.**

FlowLink runs a custom x402 facilitator (the protocol is open-source, facilitators are pluggable). Any resource server that points to FlowLink's facilitator endpoint gets every payment automatically screened before on-chain settlement:

```
Agent → 402 header (signed payment) → FlowLink Facilitator
FlowLink: sanctions_screen(agent_id, principal_id, amount, destination)
FlowLink: travel_rule_check(amount, threshold) → attach IVMS101 data if required
FlowLink: kya_verify(agent_did, erc8004_registry)
FlowLink: prooflink_stamp(tx_hash, compliance_status) → on-chain attestation
FlowLink → Coinbase Facilitator (if clean) → on-chain settlement
```

Resource servers can also call FlowLink's compliance check as a pre-authorization step before returning the 200 OK, creating a two-layer assurance model.

**MCP angle:** Expose FlowLink compliance as an MCP tool: `check_sanctions(counterparty)`, `verify_travel_rule(transfer)`, `get_kya_score(agent_id)`. Any MCP-compatible agent using x402 can call FlowLink compliance the same way it calls any other tool — making compliance ambient and automatic.

### Partnership Decision-Maker

- **x402 Foundation governance:** Open application process for e-commerce platforms, AI companies, and payment providers
- **Coinbase contacts:** Nemil Dalal (Head of Coinbase Developer Platform — strategic), Dan Kim (business development and partnerships, dual role with Digital Asset Listings)
- **Entry point:** x402 Foundation membership application + GitHub PR to the x402 repository (Apache 2.0 — no permission needed to build a custom facilitator)
- **Cloudflare co-governance:** Matthew Prince / Cloudflare's developer relations team

### Open Source Status

**Apache 2.0.** Full reference implementation on GitHub (`coinbase/x402`). 686+ commits. No permission needed to implement a custom facilitator. FlowLink can build on x402 without any formal partnership.

---

## 2. MPP — Machine Payments Protocol (Stripe + Tempo)

### Current Status and Volume

**Just launched. Mainnet live March 18, 2026. Fastest-growing by institutional backing.**

- Launched: March 18, 2026 (Tempo mainnet)
- Tempo blockchain: Purpose-built Layer 1, $500M raised at $5B valuation
- Tempo backers: Stripe, Paradigm
- Payments directory at launch: 100+ integrated service providers
- Early adopters: Browserbase, PostalForm, Prospect Butcher Co., Parallel Web Systems
- Design partners: Anthropic, DoorDash, Mastercard, Nubank, OpenAI, Ramp, Revolut, Shopify, Standard Chartered, Visa

Volume at time of writing: No published figures (days-old launch). Trajectory will be high given Stripe's distribution.

### Technical Architecture

MPP is a rail-agnostic open standard for machine-to-machine payments. Its core innovation is the **Session primitive** — described as "OAuth for money."

**Four-step flow:**
1. Agent requests a resource from a service (API, MCP endpoint, HTTP service)
2. Service responds with a payment request (amount, session limit, currency)
3. Agent authorizes a session spending cap once
4. Agent streams micropayments continuously within the session cap — no per-transaction approval

**Sessions ("OAuth for money"):**
- Agent authorizes a spending limit once (e.g., "I authorize up to $10 for this browser session")
- Consumes the cap incrementally as it uses the service (data calls, compute, API requests)
- Multiple small transactions aggregate into single settlement transactions (reduces on-chain overhead)
- No human approval at each micropayment step
- Designed specifically for continuous metered consumption: compute, data, inference

**Payment methods:**
- Stablecoins (USDC, USDT on Tempo chain)
- Traditional fiat via Shared Payment Tokens (SPTs) — Stripe issues SPTs; Visa contributed card specification
- Bitcoin Lightning (Lightspark contributed integration)
- BNPL (buy now, pay later)

**Tempo chain specs:**
- Sub-second finality (0.6-second deterministic block time, no re-orgs)
- Fees under $0.001
- EVM-compatible (can use EVM tooling)
- Not decentralized at launch (Stripe/Paradigm operated)

**Merchant integration:** Existing Stripe PaymentIntents API, "a few lines of code." Funds settle in merchant's default currency on standard Stripe payout schedule. Tax calculation, fraud protection, reporting, accounting integrations, refunds — all inherited from Stripe infrastructure.

**Spec status:** Open at `mpp.dev`. Shared Payment Token implementation is partially proprietary (Stripe-issued).

**SDKs:** Not yet published at time of writing (days post-launch). Expect TypeScript and Python given Stripe's developer orientation.

### Where Compliance Fits

MPP inherits Stripe's compliance infrastructure for fiat payments (SPTs). Stripe is PCI DSS compliant, handles fraud signals, tax calculation, and standard AML for traditional card payments.

**Gaps:**
- Stablecoin sessions on Tempo chain fall outside Stripe's traditional compliance umbrella
- No agent-level compliance (KYA) — only user-level (existing Stripe KYC)
- No Travel Rule implementation for stablecoin micropayment streams
- Sessions that aggregate multiple micropayments into one settlement create AML monitoring challenges (the individual payment that triggered the aggregated threshold is not visible)
- MPP is rail-agnostic — Lightning and stablecoin paths have different compliance requirements than the Stripe fiat path; no unified compliance layer exists

**The compliance gap FlowLink fills:** MPP's Session primitive is specifically designed for sub-cent, continuous, high-velocity micropayments. This is the exact pattern that breaks traditional AML velocity monitoring. FlowLink's agent behavioral monitoring — trained on agent-scale transaction patterns vs. human patterns — is the missing compliance layer for MPP sessions.

### How FlowLink Integrates

**Integration model: Session Compliance Hook.**

MPP's spec is open. FlowLink integrates as a session authorization middleware:

```
Agent → Session authorization request (spending cap, service)
FlowLink: pre_session_screen(agent_id, service_id, spending_cap, session_duration)
   → sanctions_check(agent + service)
   → kya_verify(agent_did)
   → velocity_check(agent session history)
   → issue_compliance_token(session_id, prooflink_attestation)
Agent → MPP session proceeds with FlowLink token attached
FlowLink: session_monitor(micropayment_stream, behavioral_model)
   → flag if pattern deviates from agent baseline
FlowLink: travel_rule_package(session_close, aggregated_amount, IVMS101_data)
```

For Stripe merchants: FlowLink compliance token becomes a metadata field in the PaymentIntent, giving Stripe merchants audit-trail access without changing their integration.

### Partnership Decision-Maker

- **Stripe:** Developer Relations team (`stripe.com/contact/sales`). For compliance partnerships, Stripe's Head of Platform Partnerships or their Risk and Compliance product team.
- **Tempo:** Direct contact via `tempo.xyz` — small team (Stripe + Paradigm-incubated), likely reachable via Paradigm network or the Tempo founders directly.
- **MPP spec governance:** Open standard — FlowLink can implement without formal permission. Partnership for co-marketing or official compliance designation requires direct engagement.
- **Key angle:** Stripe is actively looking for compliance partners given their entry into stablecoin settlement. FlowLink's regulated-entity positioning is a differentiated value proposition for Stripe's enterprise merchant base.

### Open Source Status

**Partially open.** MPP spec is published at `mpp.dev` and on Stripe's blog. The Shared Payment Token (SPT) implementation is Stripe-proprietary (closed). Tempo chain code and node software — not confirmed open-source at launch. Integration via Stripe's existing PaymentIntents API (documented, public).

---

## 3. AP2 — Agent Payments Protocol (Google)

### Current Status and Volume

**Specification-stage. No live consumer-facing product as of March 20, 2026.**

- Announced: September 16, 2025 (simultaneous with ACP)
- Partner ecosystem: 60+ organizations
- Live transaction volume: Zero (no deployed product)
- Status: Available on GitHub for developer experimentation; no merchant deployment

**Partners:** Mastercard, PayPal, American Express, Coinbase, Salesforce, Adyen, Etsy, Revolut, ServiceNow, UnionPay, Worldpay, Intuit, Ant International, Mysten Labs, Alibaba, Adobe, Trulioo (KYA partner)

**Companion standards:** Universal Commerce Protocol (UCP) — full agentic commerce stack from discovery through post-purchase. A2A (Agent2Agent protocol) — lower-level agent-to-agent communication.

### Technical Architecture

AP2 is a three-mandate trust system built as an open extension of the Agent2Agent (A2A) and Model Context Protocol (MCP) protocols. It is payment-agnostic — the protocol governs authorization and trust, not the settlement rails.

**Three Verifiable Digital Credentials (VDCs) called Mandates:**

1. **Intent Mandate**
   - Records what the user wants to accomplish
   - Cryptographically signed by the user
   - Authorizes the agent to act in human-not-present scenarios within defined constraints (price range, category, timing)
   - Provides auditable context of the original user instruction

2. **Cart Mandate** (human-present scenario)
   - Captures explicit user authorization for specific items at specific prices
   - Contains the user's cryptographic signature
   - Creates a tamper-proof, unchangeable record at time of user approval
   - Used when the agent presents options and the user chooses one

3. **Payment Mandate**
   - Shared with payment networks and issuers
   - Signals agent involvement and human-presence context
   - Enables transaction context assessment for fraud and risk engines at the network level

**Trust model:** Non-repudiable, cryptographic audit trail. Every step from user instruction through agent action to payment is linked by cryptographic proof. Directly addresses AI hallucination risk: agents cannot fabricate user consent. Deterministic proof of user intent.

**Payment support (current):** Credit and debit cards (pull payments) via partner PSPs. Roadmap: real-time bank transfers (UPI, PIX), stablecoins/crypto via x402 extension (co-developed with Coinbase and Ethereum Foundation).

**Crypto extension:** An A2A-x402 extension enables crypto payments within the AP2 framework. Mandates carry the proof of user intent; x402 handles settlement.

**Role-based architecture:** Separates agent orchestration from payment processing, protecting sensitive payment data at each layer.

**Privacy design:** Privacy-first — user controls what information flows to agents, merchants, and payment networks.

### Where Compliance Fits

AP2 is the most compliance-aware protocol by design. Its mandate architecture directly creates:
- Non-repudiable audit trail (compliance-ready by default)
- Cryptographic proof of user intent (addresses consent disputes)
- Role-based access control (payment data compartmentalized)
- Dispute resolution foundation (mandate chain = evidentiary record)

**Gaps:**
- Mandate verification does not include sanctions screening or AML monitoring
- KYA for the agent itself (not just user delegation) is partially addressed via Trulioo integration but not native to the spec
- Travel Rule compliance is unspecified — the mandate chain proves intent but does not package IVMS101 data for VASP reporting
- No live deployment means no tested compliance edge cases

**The compliance gap FlowLink fills:** AP2's mandate architecture is the ideal substrate for FlowLink's ProofLink Engine. FlowLink can act as a registered Validator in the AP2 trust chain: after mandate verification, FlowLink appends a compliance attestation (sanctions clean, KYA verified, Travel Rule packaged). This creates a four-mandate effectively: Intent → Cart → Payment → **Compliance Proof**.

### How FlowLink Integrates

**Integration model: AP2 Compliance Validator.**

AP2's architecture explicitly supports validators. FlowLink registers as a compliance validator in the AP2 ecosystem:

```
User signs Intent Mandate → Agent received
Agent → Cart Mandate (item + price confirmed)
Agent → Payment Mandate (to payment network)
FlowLink Validator:
   mandate_chain_verify(intent_mandate, cart_mandate)
   sanctions_screen(user_did, agent_did, merchant_id)
   kya_verify(agent_id, issuer_verification, behavioral_history)
   travel_rule_check(amount, threshold, currency_type)
   → prooflink_attestation(compliance_stamp, mandate_chain_hash)
Payment network receives: Payment Mandate + FlowLink Compliance Attestation
```

For Google's 60+ AP2 partners, FlowLink becomes the canonical compliance validator — embedded into the protocol flow itself rather than bolted on externally.

**UCP integration:** The Universal Commerce Protocol provides the discovery and post-purchase layers. FlowLink's compliance stamp can be surfaced at the discovery layer (merchants can advertise "FlowLink Compliant" agents) and the post-purchase layer (compliance receipts for audit).

### Partnership Decision-Maker

- **Google:** Google Cloud's AI and Machine Learning team, specifically the AP2 product lead at `cloud.google.com`. Given AP2 is also on GitHub (`google-agentic-commerce/AP2`), the technical entry point is through contributions and proposals.
- **Key contacts:** Jordan Ellis (Google, co-author of ERC-8004 and AP2 contributor) — bridge between the on-chain identity world and AP2.
- **Trulioo integration:** Trulioo is already an AP2 KYA partner. FlowLink's positioning must differentiate from Trulioo — the angle is VASP-grade compliance (Travel Rule, AML) rather than identity verification alone.
- **Access path:** GitHub contribution + direct engagement with Google Cloud's developer partnerships team. AP2's open-source nature means FlowLink can implement without permission; becoming an official compliance partner requires a direct relationship.

### Open Source Status

**Open source.** Full spec and reference implementations on GitHub (`google-agentic-commerce/AP2`). Apache 2.0 license. Developer documentation at `ap2-protocol.org`. No permission required to implement AP2 or build validators.

---

## 4. ACP — Agentic Commerce Protocol (OpenAI + Stripe)

### Current Status and Volume

**Live. The only protocol with a consumer-facing, production product at scale.**

- Launched: September 29, 2025
- Live product: ChatGPT Instant Checkout (US users)
- Spec versions shipped: v1 (2025-09-29), v2 (2025-12-12), v3 (2026-01-16), v4 (2026-01-30)
- Current merchants: Etsy US sellers, Shopify merchants (Glossier, Vuori, Spanx, SKIMS)
- Pipeline: 1 million+ Stripe merchants in rollout
- Additional support: Salesforce (announced October 14, 2025), Mastercard (Agent Pay tokens work via ACP)
- ChatGPT active users: 800M+ weekly — ACP's distribution moat is the largest in the space

### Technical Architecture

ACP is a four-party interaction model: Buyer, AI Agent, Merchant, Payment Provider.

**The core innovation: Shared Payment Tokens (SPTs)**

Users delegate payment credentials to AI agents without exposing raw card data. SPTs are:
- Programmatically controlled: usage scope is defined at token creation
- Permissioned: the agent can only charge within authorized parameters
- Logged: every SPT usage creates an audit record
- Scoped: tied to specific merchants, amounts, and time windows

**Flow:**
```
1. User stores payment method with Stripe (or compatible PSP)
2. User authorizes ACP agent (ChatGPT) with spending parameters
3. Stripe issues SPT (Shared Payment Token) to the agent
4. Agent presents items to user → user confirms
5. Agent sends checkout request to merchant with SPT
6. Merchant processes via Stripe (or compatible PSP) using SPT
7. Payment completes; SPT usage logged; user notified
```

**Technical components:**
- Delegated Payment Spec: separates credential delegation from payment processing — enables any PSP to implement (Stripe is first live implementer)
- RESTful API: standard HTTP-based commerce flows
- MCP server: merchants can publish their checkout configuration as an MCP endpoint (any MCP-compatible agent discovers and transacts immediately)
- Apache 2.0 license; spec on GitHub (`agentic-commerce-protocol/agentic-commerce-protocol`)
- Spec managed by OpenAI and Stripe; open to community contributions

**Supported transaction types:** Physical goods, digital goods, subscriptions, async purchases, fulfillment tracking.

**Merchant integration:** Existing Stripe merchants enable ACP in "as little as one line of code." Non-Stripe merchants can implement via the Delegated Payment Spec.

**Current limitation:** In production, only Stripe-issued SPTs work in the live ChatGPT integration. Other PSPs can implement the Delegated Payment Spec, but none are live as of March 2026.

### Where Compliance Fits

ACP inherits Stripe's compliance stack for the card payment layer:
- PCI DSS compliance via Stripe's token vault
- Fraud signals: merchants can "choose to accept or decline the transaction using payment and fraud signals"
- Tax calculation, refund processing, dispute management — all via Stripe

**Gaps:**
- ACP compliance is entirely delegated to the PSP (Stripe). For non-Stripe PSPs implementing the Delegated Payment Spec, compliance posture is undefined by the protocol.
- No agent-level KYA — SPTs are issued to the AI platform (OpenAI), not to individual agents. A compromised agent within the ChatGPT ecosystem gets the same SPT access as a legitimate one.
- No FATF Travel Rule for any stablecoin extension (stablecoins are not yet in ACP's live scope)
- No cross-platform compliance — ACP is currently OpenAI-centric. When other platforms (Anthropic Claude, Google Gemini) implement ACP, each will bring their own compliance posture; there is no unified layer.
- Consent model: the protocol logs SPT usage but does not produce a regulatory-grade compliance receipt that a CFO could hand to an auditor

**The compliance gap FlowLink fills:** When ACP expands beyond Stripe's direct handling (non-Stripe PSPs, stablecoin extensions, multi-platform deployments), the compliance gap opens. FlowLink's angle is twofold: (1) ACP compliance certification for non-Stripe PSPs implementing the Delegated Payment Spec, and (2) cross-platform ACP compliance monitoring when multiple AI platforms (not just ChatGPT) use the protocol.

### How FlowLink Integrates

**Integration model: Delegated Payment Spec Compliance Wrapper.**

FlowLink implements the Delegated Payment Spec as a PSP-agnostic compliance layer. Any PSP wishing to be ACP-compatible routes through FlowLink for KYA and sanctions screening before issuing their token equivalent to an SPT:

```
AI Platform → ACP checkout request → Merchant
Merchant → PSP (non-Stripe) → Delegated Payment Spec
PSP calls FlowLink:
   kya_check(platform_id, agent_session_id)
   sanctions_screen(buyer_identity, merchant_id)
   → compliance_token(prooflink_stamp)
PSP issues SPT-equivalent with FlowLink compliance stamp attached
Merchant receives: SPT + compliance attestation → accept or decline
```

**MCP angle (highest leverage):** ACP merchants publish checkout configs as MCP endpoints. FlowLink publishes a compliance check tool on the same MCP layer: before any agent triggers a checkout, it calls `flowlink.verify_transaction(agent_id, merchant_id, amount)`. If FlowLink's compliance check fails, the agent does not proceed. This makes FlowLink's compliance check a prerequisite step in the ACP checkout flow — invisible to the user, mandatory for enterprise deployments.

### Partnership Decision-Maker

- **OpenAI:** Commerce product team; ACP is maintained by OpenAI's developer platform division. Contact via `developers.openai.com/commerce` or OpenAI's enterprise partnerships team.
- **Stripe:** Platform Partnerships and the Risk/Compliance product team. Stripe actively wants compliance partners for their non-Stripe PSP rollout.
- **Salesforce:** Salesforce's MuleSoft and Commerce Cloud teams (announced ACP support October 2025).
- **Key insight:** The highest-leverage partnership is with Stripe — FlowLink as a certified compliance provider for the ACP Delegated Payment Spec gives Stripe something they need: a way to tell enterprise merchants that non-Stripe PSPs can meet Stripe-equivalent compliance standards via FlowLink.

### Open Source Status

**Apache 2.0.** Full spec on GitHub (`agentic-commerce-protocol/agentic-commerce-protocol`). Community-designed. Stripe's SPT implementation is proprietary; the spec is open. MCP server implementation is open. Any PSP can implement the Delegated Payment Spec without permission.

---

## 5. Visa TAP — Trusted Agent Protocol

### Current Status and Volume

**Live (specification and developer center). In active pilot. Full production rollout targeted mid-2026.**

- Announced: October 14, 2025
- Developer availability: Visa Developer Center + GitHub (`visa/trusted-agent-protocol`) from launch
- Sandbox: 30+ partners actively building in VIC (Visa Intelligent Commerce) sandbox
- Agent integrations: 20+ agents and agent enablers integrating directly with Visa Intelligent Commerce
- December 2025 milestone: Completed hundreds of secure, agent-initiated end-to-end transactions with partners
- Visa predicts: Millions of consumers using AI agents for purchases by 2026 holiday season
- APAC and Europe pilots: Anticipated early 2026
- Partners: Adyen, Ant International, Checkout.com, Coinbase, CyberSource, Elavon, Fiserv, Microsoft, Nuvei, Shopify, Stripe, Worldpay, Akamai (edge intelligence integration)

### Technical Architecture

TAP is a CDN-layer authentication protocol built on existing web infrastructure standards. Its key design decision: zero new infrastructure for merchants. Verification happens at the edge, before requests reach merchant backends.

**Foundation standards:**
- HTTP Message Signatures (RFC 9421 — IETF standard)
- Web Bot Auth (W3C-aligned)
- Aligned with OpenID Foundation and EMVCo standards

**Three verifiable data elements transmitted in signed HTTP messages:**

1. **Agent Identity**
   - Cryptographic proof that the agent is a Visa-trusted agent with stated purchase intent
   - Agent's public key registered in Visa's trusted Key Store
   - Private key signs the HTTP request; merchant retrieves public key from Key Store and verifies
   - Timestamps (created/expires fields) and nonces prevent replay attacks

2. **Consumer Recognition**
   - Loyalty tokens, device identifiers, location parameters
   - Allows merchant to recognize returning users (existing account detection)
   - Enables personalization without exposing raw consumer identity

3. **Payment Information**
   Three modes for different merchant integration levels:
   - **Hashed credentials** (key entry): Hash of card number for existing-account detection
   - **Complete token/address data** (API processing): Full Visa token for payment processing
   - **IOU information** (settlement): Deferred settlement signal

**Merchant integration:** TAP operates at the CDN layer via Web Bot Auth. Merchants that use Cloudflare, Akamai, or other TAP-integrated CDNs can verify agent authenticity without deploying new backend code. This is TAP's key differentiation from every other protocol.

**Standards alignment:** Visa is coordinating with IETF (HTTP Message Signatures), OpenID Foundation (agent identity), and EMVCo (payment token standards). TAP is designed to be interoperable with ACP and x402.

### Where Compliance Fits

TAP sits on top of Visa's existing payment network, which already has:
- Global AML/sanctions screening at the network level
- Fraud detection infrastructure (Visa Advanced Authorization)
- Chargeback and dispute resolution infrastructure
- PCI DSS compliance baked into the Visa tokenization stack

**What TAP adds for compliance:**
- Cryptographic agent identity — distinguishes trusted agents from malicious bots
- Consumer recognition — links agent transactions back to verified consumer accounts
- Audit trail — HTTP message signatures create non-repudiable records

**Gaps:**
- Agent-level compliance (KYA beyond Visa's trust registry) — Visa's TAP registry tells you whether an agent is Visa-trusted, not whether that agent is AML-clean or jurisdiction-compliant
- Cross-protocol compliance — TAP compliance is Visa-network-specific; a merchant accepting both TAP and x402 payments has no unified compliance view
- The KYA registry is Visa-controlled — for non-Visa payment methods, the trust signal is absent
- No Travel Rule solution for any crypto-rail integration

**The compliance gap FlowLink fills:** TAP gives Visa merchants confidence that an agent is Visa-registered. FlowLink completes the picture: that the agent is also sanctions-clean, jurisdiction-compliant, and AML-monitored. The integration angle is **FlowLink as the compliance enrichment layer** on top of TAP's identity verification — adding the regulatory substance that Visa's trust registry alone cannot provide.

### How FlowLink Integrates

**Integration model: TAP Compliance Enrichment Layer.**

FlowLink builds a TAP integration that adds compliance data to Visa's existing agent verification flow:

```
Agent → HTTP request with TAP signature
Merchant/CDN → Visa Key Store lookup (agent identity verification)
Merchant → FlowLink (parallel call):
   prooflink_verify(visa_agent_id, transaction_metadata)
   → sanctions_check(agent + principal)
   → jurisdiction_check(origin, destination)
   → behavioral_check(agent history)
   → compliance_response(pass/flag/block, reason_code)
Merchant receives: Visa trust signal + FlowLink compliance signal
Decision: accept / step-up authentication / decline
```

The CDN-layer architecture means FlowLink can integrate as a Cloudflare Worker or Akamai EdgeWorker alongside TAP verification — adding compliance decisioning at the same layer as identity verification, with no additional latency from separate backend calls.

**Enterprise angle:** Merchants processing high-value agent transactions (travel, B2B procurement, financial services) need more than "this is a Visa-registered agent." They need "this agent is sanctions-clean, its principal is KYC-verified, and this transaction pattern matches its behavioral history." FlowLink provides that second layer.

### Partnership Decision-Maker

- **Visa Intelligent Commerce (VIC):** The sandbox program is the entry point. Apply at `developer.visa.com/capabilities/trusted-agent-protocol`
- **Visa Developer Center:** Technical integration available without formal partnership; production integration with Visa's merchant and acquirer network requires Visa partnership engagement
- **Key contact tier:** Visa's Head of Agentic Commerce (VP level, likely reporting to Visa's Chief Product Officer) — the exec leading the VIC program. Visa's Fintech and Startup partnership team (for companies like FlowLink)
- **Cloudflare co-governance:** Cloudflare's Worker ecosystem team — TAP runs on Cloudflare infrastructure; being a Cloudflare Workers integration is a fast path to TAP deployment
- **Co-marketing angle:** Visa is actively looking for compliance validators to make TAP enterprise-credible. The "Visa Trusted Agent + FlowLink Compliant" two-layer message addresses enterprise procurement teams directly.

### Open Source Status

**Publicly available.** Spec and reference implementations on GitHub (`visa/trusted-agent-protocol`). Available in Visa Developer Center from launch. Not Apache 2.0-licensed (Visa-owned); collaboration terms apply for production integration in the Visa network. The Web Bot Auth component is an open web standard.

---

## 6. Mastercard Agent Pay

### Current Status and Volume

**Live. The most enterprise-deployed protocol by traditional payment infrastructure reach.**

- Announced: April 2025
- First on-network transaction: Mid-2025
- US cardholders enabled: All US Mastercard cardholders by November 2025
- Fiserv integration: Live, early 2026 (Fiserv is one of the largest payment processors globally)
- International: Pilots in UAE, Latin America (2025), Australia first authenticated transactions (January 2026)
- Global rollout: All Mastercard cardholders targeted post-US holiday season 2025
- Partners: Microsoft (Azure OpenAI + Copilot Studio), IBM (watsonx Orchestrate for B2B), PayPal (October 2025, co-developing and testing)
- Agent Suite: Launching Q2 2026 — combines customizable AI agents with Mastercard advisory services

### Technical Architecture

Agent Pay is built on Mastercard's existing tokenization infrastructure — the same technology powering Apple Pay, Google Pay, mobile contactless payments, and card-on-file.

**Three pillars:**

1. **Registered and Verified Agents (KYA — Know Your Agent)**
   - Agents must register with Mastercard before transacting
   - Registration assigns a unique Agent ID
   - KYA process: registers and verifies agent operators, assigns compliance metadata
   - Issuers and merchants can identify which agent is attempting a transaction
   - Merchants can decline requests from unregistered or high-risk agents
   - Agent Pay Acceptance Framework: the formal merchant-side acceptance infrastructure

2. **Agentic Tokens (Governed Tokenized Credentials)**
   - Short-lived, scope-limited tokens built on existing tokenization infrastructure
   - Carry governance metadata: agent ID, intent, consent proof, spending limits
   - Dynamic Token Verification Codes — submitted into standard card payment fields
   - Never expose raw PANs (primary account numbers)
   - Scope-limited: tied to specific transaction context, not reusable
   - Traceable: every token usage creates an audit entry

3. **Universal Data Exchange Protocol**
   - Privacy-preserving context sharing between banks, merchants, and agents
   - Shares: grocery purchase intent, household membership, preference signals
   - Used for: personalized offers, fraud detection, risk assessment
   - Preserves consumer privacy while enabling merchant intelligence

**Merchant integration:**
- Web Bot Auth at CDN layer (same approach as Visa TAP, co-developed with Cloudflare, Akamai, Shopify, Checkout.com, Worldpay, Adyen)
- Dynamic Token Verification Codes submitted into existing checkout forms — zero new merchant infrastructure
- Fiserv integration live: all Fiserv-served merchants can accept Agent Pay

**Interoperability:**
- Agent Pay tokens work within the ACP/OpenAI framework (Mastercard announced this alongside ChatGPT Instant Checkout launch)
- Mastercard contributed to Google's AP2 and collaborates across the value chain
- ACP, AP2, and Agent Pay are positioned as complementary, not competing

### Where Compliance Fits

Mastercard brings the deepest compliance infrastructure of any protocol in this comparison:
- Global AML/sanctions screening at the network level (all Mastercard transactions are screened)
- Chargeback and dispute resolution infrastructure
- PCI DSS compliance baked into tokenization
- KYA (Know Your Agent) as a formal process — unique among all six protocols

**What Mastercard's KYA does:**
- Registers agents before they can transact
- Assigns unique Agent IDs (traceable, revocable)
- Enables issuers and merchants to identify the agent on every transaction
- Allows blocking of unregistered or high-risk agents

**What Mastercard's KYA does NOT do:**
- No FATF Travel Rule for stablecoin payments
- No AML behavioral monitoring specific to agent-scale transaction patterns
- No cross-protocol compliance (Agent Pay compliance is Mastercard-rail-specific)
- KYA covers the agent's registration, not the agent's principal's full KYC/AML history
- No jurisdiction-level compliance beyond Mastercard's standard network rules

**The compliance gap FlowLink fills:** Mastercard has the best starting point for compliance — KYA registration, network-level AML, tokenization. What's missing is the cross-protocol compliance view (when that same agent also uses x402 or MPP), the stablecoin Travel Rule capability, and behavioral AML monitoring calibrated for agent-scale activity. FlowLink fills the gaps Mastercard's infrastructure doesn't cover natively.

### How FlowLink Integrates

**Integration model: Agent Pay Compliance Co-Validator.**

Mastercard's KYA registry and Agent Pay Acceptance Framework are the closest thing to FlowLink's own KYA capabilities in the traditional payment world. Rather than competing, FlowLink augments:

```
Agent → Agent Pay transaction attempt
Mastercard: kya_check(agent_id) → Mastercard registry lookup (is agent registered?)
Mastercard: agentic_token_issue(agent_id, scope, transaction_context)
FlowLink (called in parallel or as enrichment):
   cross_protocol_screen(agent_id, x402_history, mpp_history)
   → sanctions_check (beyond Mastercard's standard OFAC) + EU/UN/HMT
   → behavioral_aml(agent_session_pattern, baseline_model)
   → jurisdiction_check(origin, destination, regulatory_requirements)
   → prooflink_stamp(compliance_attestation)
Issuer/Merchant receives: Mastercard Agent Pay signal + FlowLink enrichment
```

**B2B angle via IBM watsonx:** Mastercard's IBM partnership targets B2B enterprise procurement. Enterprise buyers need compliance receipts for every agent payment — FlowLink's ProofLink Engine generates the audit-grade receipt that Mastercard's token alone cannot provide. This is the CFO-facing integration: "every Agent Pay transaction generates a FlowLink compliance receipt, automatically filed in your AP system."

**Agent Suite partnership (Q2 2026):** Mastercard's Agent Suite combines AI agents with advisory services. FlowLink's KYA capability can be positioned as the compliance layer of the Agent Suite — every Mastercard-deployed agent carries FlowLink compliance certification.

### Partnership Decision-Maker

- **Mastercard Developers:** `developer.mastercard.com` — Agent Pay developer documentation available. The Agent Pay Acceptance Framework is the entry point for payment processor and merchant integrations.
- **Mastercard's AI and Commerce partnership team:** For companies integrating at the compliance/trust layer level (not just merchant acceptance), the decision-maker is Mastercard's VP/SVP of AI and Emerging Commerce or their Chief Product Officer's organization.
- **IBM partnership angle:** IBM Global Business Services manages the watsonx Orchestrate relationship with Mastercard. For enterprise B2B deployments, the go-to-market path runs through IBM.
- **Agent Suite (Q2 2026):** The Agent Suite launch creates a formal partnership program. FlowLink should target this launch window for co-marketing.
- **Key insight:** Mastercard's KYA process is the closest analog to FlowLink's own KYA. Positioning FlowLink as the cross-protocol extension of Mastercard's KYA — "Mastercard KYA for their rail, FlowLink KYA for everywhere else" — avoids head-on competition and creates a complementary narrative.

### Open Source Status

**Proprietary with developer access.** Mastercard Agent Pay is not open source — it is built on Mastercard's proprietary tokenization infrastructure. Developer documentation and sandbox access available at `developer.mastercard.com/mastercard-checkout-solutions/documentation/use-cases/agent-pay/`. Web Bot Auth (the CDN verification layer) is an open standard. The Agent Toolkit (MCP server for Mastercard APIs) is published and accessible via MCP-compatible tools.

---

## Side-by-Side Comparison

| Dimension | x402 (Coinbase) | MPP (Stripe+Tempo) | AP2 (Google) | ACP (OpenAI+Stripe) | Visa TAP | Mastercard Agent Pay |
|-----------|----------------|-------------------|-------------|---------------------|----------|---------------------|
| **Launch date** | May 2025 | March 18, 2026 | Sep 2025 | Sep 29, 2025 | Oct 14, 2025 | April 2025 |
| **Live volume** | 75M txns, $24M (Dec 2025) | Just launched | Zero | Live (US ChatGPT) | Pilot (hundreds of txns) | Live (all US cardholders) |
| **Settlement rail** | USDC stablecoin (Base/Solana) | Stablecoin + fiat SPT (Tempo/Stripe) | Agnostic (card + crypto roadmap) | Card via Stripe SPT | Visa card network | Mastercard card network |
| **Open source** | Apache 2.0 (full) | Spec open, SPT proprietary | Apache 2.0 (full) | Apache 2.0 (full) | Spec public, network proprietary | Proprietary, developer access |
| **Compliance built-in** | None (Coinbase facilitator only) | Stripe layer (fiat only) | Trust model only | Stripe layer | Visa network (card only) | Mastercard KYA + network |
| **KYA (Know Your Agent)** | None | None | Trulioo partner (partial) | None | Visa registry | Formal KYA process |
| **AML monitoring** | None (unless Coinbase facilitator) | None native | None | Stripe fraud signals only | Visa network AML | Mastercard network AML |
| **Travel Rule** | None | None | Not specified | Not specified | Not applicable (card rail) | Not applicable (card rail) |
| **Sanctions screening** | Coinbase facilitator only | Via Stripe | None native | Via Stripe | Visa network | Mastercard network |
| **Integration complexity** | Low (HTTP headers, Apache 2.0) | Medium (Stripe SDK) | High (spec-stage only) | Low for Stripe merchants | Low (CDN layer) | Medium (requires Mastercard partnership) |
| **FlowLink integration model** | Compliance Facilitator | Session Compliance Hook | AP2 Compliance Validator | Delegated Payment Spec Wrapper | TAP Enrichment Layer | Cross-Protocol Co-Validator |
| **Partnership entry point** | GitHub + x402 Foundation | Stripe partnerships | Google Cloud developer program | OpenAI/Stripe developer program | Visa Developer Center + VIC sandbox | Mastercard Developers + Agent Pay Acceptance Framework |
| **Decision-maker** | Dan Kim (Coinbase BD), x402 Foundation | Stripe Platform Partnerships | Google Cloud AI/ML product team | OpenAI Commerce team + Stripe Partnerships | Visa Intelligent Commerce program | Mastercard VP AI and Emerging Commerce |
| **FlowLink priority** | 1 (highest) | 2 | 5 | 3 | 4 | 4 |

---

## Compliance Gap Matrix

The table below maps each compliance requirement against each protocol's native capability (where "—" means the protocol has no native solution and FlowLink provides the missing capability).

| Compliance Requirement | x402 | MPP | AP2 | ACP | Visa TAP | MC Agent Pay | FlowLink Provides |
|-----------------------|------|-----|-----|-----|----------|-------------|-------------------|
| OFAC sanctions screening | Coinbase facilitator only | Via Stripe | — | Via Stripe | Visa network | MC network | Cross-protocol, all rails |
| EU/UN/HMT sanctions | — | — | — | — | Visa network | MC network | All protocols |
| KYA (agent-level identity) | — | — | Trulioo (partial) | — | Visa registry | Formal KYA | Protocol-agnostic KYA |
| FATF Travel Rule (stablecoin) | — | — | — | — | N/A | N/A | First native solution |
| AML behavioral monitoring | — | — | — | Stripe fraud only | Visa fraud | MC fraud | Agent-scale models |
| Cryptographic audit trail | Tx hash only | Session record | Mandate chain | SPT usage log | HTTP signatures | Token audit | ProofLink full chain |
| Jurisdiction compliance | — | — | — | — | Visa network | MC network | Multi-jurisdiction |
| Regulatory reporting (SAR) | — | — | — | — | — | — | Automated SAR generation |
| Cross-protocol compliance view | N/A | N/A | N/A | N/A | N/A | N/A | Unified across all 6 |

The last row — cross-protocol compliance view — is the single capability that no protocol provides and that FlowLink uniquely can provide by integrating across all six.

---

## FlowLink Integration Priority Matrix

### Priority 1: x402 (Coinbase)

**Integrate first. Immediate revenue opportunity. Largest existing volume.**

**Rationale:**
- Only protocol with proven transaction volume (75M transactions, $24M value)
- Zero native compliance — the compliance gap is total
- Apache 2.0 license — zero partnership friction to launch a custom compliant facilitator
- Coinbase facilitator charges $0.001/transaction — FlowLink's compliance-enabled facilitator can charge a compliance premium
- World ID integration (March 2026) demonstrates the market is ready for trust layers on x402
- Stripe validated x402 in February 2026 — enterprise adoption is beginning
- FATF Travel Rule gap is a legal liability for any platform building on x402 at scale — FlowLink eliminates that liability
- Entry path: build a compliant x402 facilitator, publish it, approach x402 Foundation for co-marketing

**Expected enterprise buyer conversation:** "You're using x402 for API payments. Every transaction above $3,000 in aggregate requires Travel Rule information. None of your current x402 infrastructure provides this. FlowLink's compliant facilitator adds Travel Rule, OFAC screening, and KYA verification with one config change."

**Timeline to first integration: 4-6 weeks** (build compliant facilitator, test on Base, integrate ProofLink Engine)

---

### Priority 2: MPP (Stripe + Tempo)

**Integrate second. Best distribution leverage. Stripe's reach covers 1M+ merchants.**

**Rationale:**
- Stripe's PaymentIntents API integration means 1M+ merchants are one line of code from MPP
- Sessions ("OAuth for money") are a compliance monitoring nightmare — aggregated micropayment streams obscure individual transaction AML signals. FlowLink's session-level compliance monitoring fills this gap
- Stripe is actively expanding into stablecoin settlement (Tempo chain) — their compliance coverage for stablecoin sessions is materially weaker than for card payments
- Launched March 18, 2026 — FlowLink can be the first compliance partner at launch, not a follower
- Stripe enterprise sales team is a channel into large enterprise merchants who need compliance receipts
- Sessions create new regulatory questions (is a session a single "transaction" for Travel Rule purposes? When does velocity monitoring trigger?) — FlowLink can define the compliance standard here

**Expected enterprise buyer conversation:** "Your AI agents are running MPP sessions — authorizing $50 spending caps and streaming 500 micropayments per hour. Your fraud system was built for human transaction patterns. FlowLink monitors agent session behavior, detects anomalies, and produces the compliance audit trail your CFO needs."

**Timeline to first integration: 6-8 weeks** (MPP spec study + Session compliance hook implementation)

---

### Priority 3: ACP (OpenAI + Stripe)

**Integrate third. ChatGPT distribution is unmatched but compliance gap opens as ACP expands.**

**Rationale:**
- 800M+ weekly ChatGPT users is the largest distribution moat in agentic commerce
- ACP today has a compliance gap that Stripe partially covers — but as ACP expands to non-Stripe PSPs and non-OpenAI platforms, the gap opens
- The Delegated Payment Spec (the open standard within ACP) has no compliance requirement — FlowLink can become the de facto compliance standard for any PSP implementing Delegated Payment
- Salesforce's ACP integration (October 2025) signals enterprise B2B expansion — enterprise buyers will need compliance receipts that ChatGPT's SPT logs alone cannot provide
- SPT usage logs are not regulatory audit trails — FlowLink's ProofLink Stamp on SPT transactions creates the regulatory-grade receipt

**Note on timing:** ACP with Stripe-only is well-covered by Stripe's compliance infrastructure. The priority accelerates when non-Stripe PSPs go live. Watch Adyen, Worldpay, Checkout.com for ACP implementation announcements — that triggers FlowLink's entry window.

**Timeline to first integration: 8-10 weeks** (Delegated Payment Spec implementation + non-Stripe PSP partnership)

---

### Priority 4 (tied): Visa TAP and Mastercard Agent Pay

**Integrate fourth. Different reasons, same priority tier.**

**Visa TAP rationale:**
- 30+ partners actively building in sandbox — ecosystem is maturing fast
- CDN-layer architecture is ideal for FlowLink's real-time compliance checks (same latency tier)
- Visa Intelligent Commerce sandbox is accessible today
- Compliance enrichment (FlowLink layered on TAP's identity verification) is a natural two-layer message for enterprise merchants
- The "Visa Trusted + FlowLink Compliant" positioning appeals to risk and compliance teams at any merchant considering agent payments

**Mastercard Agent Pay rationale:**
- Most enterprise-deployed protocol by reach (all US cardholders, Fiserv live)
- Mastercard's own KYA process creates a natural conversation partner — FlowLink extends KYA across protocols that Mastercard's infrastructure doesn't touch
- Agent Suite launch (Q2 2026) creates a co-marketing window
- IBM watsonx Orchestrate partnership is a B2B enterprise channel that needs compliance receipts

**Why these are Priority 4 (not higher):**
- Both operate on traditional card rails where Visa/Mastercard's own network AML provides substantial baseline coverage
- The compliance incremental value FlowLink adds is cross-protocol and stablecoin-specific — neither Visa nor Mastercard has meaningful stablecoin transaction volume yet
- Partnership entry requires formal engagement with Visa and Mastercard business development teams — higher friction than x402's open-source self-serve approach
- Revenue timing: card-rail integrations are slower to generate FlowLink-specific compliance revenue because so much compliance is already handled by the network

**Timeline to first integration: 12-16 weeks** (formal partnership engagement required for production access to Visa/MC networks)

---

### Priority 5: AP2 (Google)

**Integrate fifth — but monitor closely for product launch, then re-prioritize to top.**

**Rationale for fifth:**
- Zero live volume — integration today generates no immediate revenue
- Specification-stage protocols are a moving target for integration work
- Google's 60+ partner ecosystem has not yet converged on a live deployment

**Rationale to watch:**
- AP2 has the most compliance-aligned architecture of any protocol — its mandate chain is the ideal substrate for FlowLink's ProofLink Engine
- Google's partner roster (Mastercard, PayPal, Coinbase, Adyen, American Express, Alibaba) represents the broadest coalition in the space
- AP2's Validation Registry is an explicit extension point for compliance validators — FlowLink can be a named validator
- When AP2 ships a live product (expect 2026 H2 based on partner activity), it will likely be adopted fast given Google's distribution
- ERC-8004 cross-authors (Jordan Ellis at Google, Erik Reppel at Coinbase) create a bridge between FlowLink's on-chain identity work and AP2's mandate architecture

**Recommended action now:** Contribute to the AP2 GitHub repository. Establish FlowLink as a proposed Compliance Validator in the spec. This positions FlowLink for instant integration when AP2 goes live, without building speculative integration code against an undeployed protocol.

**Timeline to production integration: 16-20 weeks** (after AP2 live product launch — follow the GitHub activity)

---

## Strategic Synthesis: FlowLink's Positioning Across All Protocols

Every protocol in this comparison has made the same architectural decision: separate identity/trust from compliance. They solve identity (who is this agent?), they solve authorization (did the user consent?), but they do not solve regulatory compliance (is this transaction FATF-compliant, sanctions-clean, AML-monitored?).

This separation is not accidental — it reflects the technical and organizational reality that payment protocol developers are not compliance experts, and compliance requirements vary by jurisdiction in ways that cannot be hardcoded into a protocol spec.

This creates a structural gap that a neutral, cross-protocol compliance layer fills. FlowLink's position is not to compete with any of these protocols but to be the compliance infrastructure they all need and none of them wants to build.

The sustainable competitive moat:
1. **First-mover in cross-protocol compliance** — the more protocols FlowLink integrates, the more valuable the unified compliance view becomes
2. **Behavioral dataset** — every agent transaction screened contributes to the behavioral baseline model; no single protocol can replicate this cross-protocol dataset
3. **Regulatory credibility** — compliance infrastructure requires regulatory relationships and licensing that protocol developers do not want to maintain
4. **The ERC-8004 validator position** — if FlowLink becomes a named validator in ERC-8004's Validation Registry with 49K+ agents already registered, the compliance attestation dataset becomes a structural moat

The single most important technical deliverable in the near term: a cross-protocol compliance API that accepts a transaction from any of the six protocols above and returns a ProofLink compliance stamp in under 200ms. That API, plugged into all six protocols, is the network effect that compounds over time.

---

## Sources

**x402:**
- [x402 GitHub](https://github.com/coinbase/x402)
- [x402 V2 Launch](https://www.x402.org/writing/x402-v2-launch)
- [Coinbase x402 Docs](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 Foundation Launch — Cloudflare](https://blog.cloudflare.com/x402/)
- [The Block — x402 V2](https://www.theblock.co/post/382284/coinbase-incubated-x402-payments-protocol-built-for-ais-rolls-out-v2)
- [CoinDesk — x402 Adoption Analysis](https://www.coindesk.com/markets/2026/03/11/coinbase-backed-ai-payments-protocol-wants-to-fix-micropayment-but-demand-is-just-not-there-yet)

**MPP:**
- [Stripe MPP Blog](https://stripe.com/blog/machine-payments-protocol)
- [Tempo Mainnet Launch](https://tempo.xyz/blog/mainnet)
- [Fortune — Stripe + Tempo](https://fortune.com/2026/03/18/stripe-tempo-paradigm-mpp-ai-payments-protocol/)
- [The Block — MPP Mainnet](https://www.theblock.co/post/394131/tempo-mainnet-goes-live-with-machine-payments-protocol-for-agents)
- [PYMNTS — MPP](https://www.pymnts.com/news/payment-methods/2026/stripe-backed-protocol-lets-ai-agents-transact-autonomously/)

**AP2:**
- [Google Cloud AP2 Blog](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- [AP2 GitHub](https://github.com/google-agentic-commerce/AP2)
- [AP2 Documentation](https://ap2-protocol.org/)
- [Everest Group — AP2 Analysis](https://www.everestgrp.com/googles-agent-payments-protocol-ap2-a-new-chapter-in-agentic-commerce-blog/)

**ACP:**
- [ACP GitHub](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)
- [Stripe ACP Blog](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce)
- [OpenAI Instant Checkout](https://openai.com/index/buy-it-in-chatgpt/)
- [Stripe ACP Docs](https://docs.stripe.com/agentic-commerce/protocol)

**Visa TAP:**
- [Visa TAP Developer Center](https://developer.visa.com/capabilities/trusted-agent-protocol)
- [Visa TAP GitHub](https://github.com/visa/trusted-agent-protocol)
- [Visa TAP Press Release](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21716.html)
- [Visa Partners Complete Transactions](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21961.html)
- [Cloudflare + Visa](https://blog.cloudflare.com/secure-agentic-commerce/)

**Mastercard Agent Pay:**
- [Mastercard Agent Pay](https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay.html)
- [Agent Pay Developer Docs](https://developer.mastercard.com/mastercard-checkout-solutions/documentation/use-cases/agent-pay/)
- [Mastercard Agentic Token Framework](https://www.mastercard.com/global/en/news-and-trends/stories/2025/agentic-commerce-framework.html)
- [Mastercard + PayPal Partnership](https://newsroom.paypal-corp.com/2025-10-27-Mastercard-and-PayPal-Join-Forces-To-Accelerate-Secure-Global-Agentic-Commerce)
- [Fiserv + Agent Pay](https://www.pymnts.com/artificial-intelligence-2/2026/fiserv-mastercard-expand-partnership-to-enable-ai-initiated-commerce/)
- [Australia First Authenticated Transactions](https://www.mastercard.com/news/ap/en/newsroom/press-releases/en/2026/mastercard-accelerates-ai-powered-commerce-with-australia-s-first-authenticated-agentic-transactions-using-agent-pay/)

---

*Research compiled by Team Delta — March 20, 2026*
*For internal FlowLink strategy use only*
