# FlowLink -- Pitch Deck v2 (Pre-Seed)
**Positioning:** Compliance-first B2B stablecoin invoicing with an agent payments expansion path
**Stage:** Pre-seed ($750K-$1.5M)
**Last updated:** March 20, 2026

---

## PRE-PITCH CHECKLIST -- Mandatory Minimums

Do NOT take this deck into any investor meeting until all five are completed:

- [ ] **Slide 11 has real numbers.** Every placeholder replaced with actual metrics or a concrete 90-day plan with weekly milestones. No "[Current metrics]" or "[Hackathon wins]" anywhere in the deck.
- [ ] **Cofounder is named with credentials.** Full name, specific role at Request Finance (e.g., "Led protocol engineering for Request Network's V2 invoicing engine processing $X/month"), and relevant compliance/fintech background stated explicitly.
- [ ] **Legal memo on VASP/MSB classification obtained.** A fintech attorney ($5-15K budget) has reviewed the non-custodial architecture and issued a written opinion confirming FlowLink does not trigger MSB/MTL requirements. Redacted version available for investor meetings.
- [ ] **Pricing model reconciled.** One fee structure used consistently across pitch deck, strategy doc, website, and any leave-behind materials. The bps model (Section 7.1 of strategy) is the correct one for B2B -- the per-transaction flat fee model is dead.
- [ ] **One design partner LOI signed.** At least one mid-market crypto company ($10M+ cross-border payables) has signed a letter of intent to pilot FlowLink. Their name appears in Slide 11.

---

## Slide 1: Title

**FlowLink** -- The Compliance Layer for Stablecoin Payments

*"The compliance infrastructure that makes AI agent payments legal -- because regulators are already watching."*

[Logos: Base, x402, USDC, W3C DID]

> NOTE: Drop "Agentic Economy" from the title. Lead with what is fundable today (compliance infrastructure). The agent narrative is the expansion story, not the headline.

---

## Slide 2: The Problem

**"Would you let an AI agent spend your company's money without an invoice?"**

That is happening right now. Every day. With zero compliance.

- $33 TRILLION in stablecoin transactions in 2025 -- growing 72% YoY
- Six agent payment protocols shipped in 12 months (x402, MPP, AP2, ACP, Visa TAP, Mastercard Agent Pay)
- x402 has processed 75M+ transactions in 30 days -- but real commerce volume is still early-stage ($28K/day actual commerce, rest is testing/micro-transactions)
- **No compliance infrastructure exists for any of this:**
  - No KYC for AI agents
  - No FATF Travel Rule for agent-to-agent transfers
  - No invoicing -- just raw on-chain transfers with no audit trail
  - No way for a CFO to prove a stablecoin payment was legal

Every protocol is racing to move money faster. Nobody is making it legal.

> NOTE: The $600M annualized figure from v1 is removed. Honest framing: 75M transactions exist but real commerce volume is early. VCs respect honesty about nascent markets more than inflated annualized projections.

---

## Slide 3: The Regulatory Tailwind

Compliance is no longer optional -- it is infrastructure.

- **GENIUS Act** (signed July 2025): Stablecoins are regulated financial instruments. AML/BSA requirements apply to all stablecoin issuers and service providers. Non-compliance is now a federal offense.
- **MiCA** (EU, fully enforceable July 2026): Every CASP must comply. Cross-border stablecoin payments without compliance documentation are illegal in all 27 EU member states.
- **FATF Travel Rule**: 99 jurisdictions enforcing, more coming
- **59% of jurisdictions with Travel Rule laws have issued zero enforcement actions** -- the fine wave has not started yet. When it does, every company making stablecoin payments without compliance infrastructure gets hit.

The companies building compliance today become essential infrastructure tomorrow. The companies waiting become enforcement targets.

---

## Slide 4: The Market

**TAM (Revenue Opportunity):**
- B2B stablecoin payment volume: $226B annualized (2026), growing 733% YoY
- If compliance infrastructure captures 15 bps of B2B stablecoin volume: **$339M ARR addressable today**
- RegTech market: $19.7B (2025) growing to $100.6B (2033) at 22.6% CAGR

**SAM (What FlowLink can reach in 3 years):**
- Mid-market companies ($10M-$500M revenue) making cross-border stablecoin payments
- Crypto-native companies with active B2B payables in stablecoins
- Enterprises deploying AI agents for procurement (2027+)
- Target: $500M-$2B monthly volume through the platform by Year 3

**SOM (Year 1):**
- 50+ paying business customers
- $50M-$100M cumulative volume
- $300K-$550K ARR from subscriptions + transaction fees

> NOTE: TAM is stated as revenue opportunity (bps of volume), not raw payment volume. The $150T cross-border figure is removed -- it makes the real opportunity look small and VCs dismiss it as a "slide number."

---

## Slide 5: Competitive Landscape

| Capability | FlowLink | Request Finance | Chainalysis/Elliptic | TRM Labs | Notabene | BVNK (Mastercard) | Skyfire |
|-----------|----------|----------------|---------------------|----------|----------|-------------------|---------|
| B2B stablecoin invoicing | Yes | Yes | No | No | No | Yes (enterprise) | No |
| Real-time sanctions screening (pre-payment) | Native | No | Post-hoc monitoring | API (post-hoc) | No | Partial | No |
| FATF Travel Rule | Native, in-flow | No | No | No | Yes (their core) | Unclear | No |
| AML transaction monitoring | Native, pre-payment | No | Yes (post-hoc, $150K+/yr) | Yes (API, $100K+/yr) | No | Yes | No |
| AI agent identity (KYA) | Native (ERC-8004) | No | No | No | No | No | Partial |
| Multi-protocol (x402+MPP+AP2) | Yes | No | No | No | No | Card rails only | x402 only |
| Compliance receipts (on-chain) | Yes | No | No | No | No | No | No |
| Pricing | $499/mo + 15bps | $600/mo entry | $150K-$500K/yr | $100K+/yr | Enterprise | Enterprise | Enterprise |

**The whitespace:** Nobody does pre-payment compliance in the transaction flow across multiple protocols. Chainalysis/TRM/Elliptic monitor after the fact at enterprise pricing. Request Finance invoices without compliance. Notabene does Travel Rule but not payments. BVNK does payments but got acquired. FlowLink is the only product that combines invoicing + pre-payment compliance + agent identity + multi-protocol support at developer-accessible pricing.

**On TRM Labs specifically:** TRM is the closest architectural threat -- API-first, growing fast, deep regulatory relationships. But TRM sells monitoring tools to compliance teams at $100K+/year. FlowLink sells compliance-as-infrastructure to developers and CFOs at $499/month. Different buyer, different price point, different integration model. TRM is a potential acquirer, not a direct competitor at our market tier.

---

## Slide 6: What FlowLink Does

**One concrete scenario:**

> Acme Corp's AI procurement agent needs to pay DataVendor Inc. $50,000 USDC for API services. Here is exactly what happens in 500 milliseconds with FlowLink:

1. **Agent initiates payment** via x402 protocol
2. **FlowLink intercepts** -- resolves agent identity via ERC-8004 registry, confirms human principal (Acme Corp CFO) authorized this agent's spending scope
3. **Sanctions screening** (<100ms) -- screens both Acme Corp and DataVendor against OFAC SDN, EU, UN, HMT consolidated lists. Screens wallet addresses against known sanctioned wallets.
4. **Travel Rule** -- collects originator info (Acme Corp LEI, agent DID, principal identity), transmits to DataVendor's compliance counterpart via Notabene Gateway
5. **AML risk scoring** -- transaction graph analysis, agent behavioral velocity check. Risk score: 12/100 (low).
6. **ProofLink Compliance Receipt issued** -- cryptographically signed attestation proving all checks passed. Anchored on IPFS + Base chain. Machine-verifiable.
7. **Payment executes** with ProofLink receipt attached. DataVendor receives $50,000 USDC + a compliance receipt their auditor can verify independently.

**What happens when a check fails:** If sanctions screening flags a match, payment is blocked. The agent receives a structured rejection with reason code. The human principal (CFO) is notified. A suspicious activity report is queued for compliance review. The transaction never executes -- FlowLink is pre-payment, not post-hoc.

> NOTE: The "what happens on failure" flow is critical. This is where compliance products live or die. VCs will ask this question -- answer it before they do.

---

## Slide 7: Why Now -- The Convergence

[Timeline]:
- **May 2025:** x402 launched (Coinbase) -- first permissionless agent payment protocol
- **Jul 2025:** GENIUS Act signed -- stablecoin compliance is federal law
- **Sep 2025:** AP2 launched (Google), x402 Foundation formed
- **Oct 2025:** Visa TAP, Mastercard Agent Pay -- TradFi enters agent payments
- **Dec 2025:** MiCA fully live -- EU compliance mandatory
- **Jan 2026:** ERC-8004 on mainnet -- agent identity standard ships
- **Feb 2026:** Stripe joins x402, Coinbase Agentic Wallets
- **Mar 2026:** Stripe MPP + Tempo mainnet, **BVNK acquired by Mastercard for $1.8B**
- **Mar 2026:** a16z raising $2B crypto fund -- institutional capital deploying NOW

**The window:** Payment protocols exist. Compliance does not. Regulators are watching but have not yet enforced. The company that builds the compliance layer now becomes essential infrastructure before enforcement begins. This window is 12-18 months.

---

## Slide 8: The Product

**FlowLink is four things:**

**1. ProofLink Engine** -- Compliance middleware that sits between any payment protocol and settlement. Sanctions screening, Travel Rule, AML monitoring, all in <500ms, all pre-payment.

**2. KYA (Know Your Agent) Standard** -- Open standard (W3C Verifiable Credential + ERC-8004) for verifying AI agent identity and human authorization chains. Published as open spec, operated by FlowLink as verification infrastructure.

**3. Agent Invoice Standard** -- JSON-LD machine-readable invoices that link agent identity to service description to payment proof to compliance stamp. The missing document between "agent paid" and "CFO approved."

**4. Cross-Protocol Compliance Router** -- Works with x402, MPP, AP2, ACP. Protocol-agnostic. FlowLink wins regardless of which protocol wins the horse race.

> NOTE: This is a stronger framing than v1's six-item feature list. Four clear products, each with a one-sentence explanation. Concrete beats abstract.

---

## Slide 9: Business Model + Unit Economics

### Pricing (Consistent Across All Materials)

**Transaction fees (primary revenue):**

| Volume Tier | Monthly Volume | Fee |
|------------|---------------|-----|
| Starter | <$1M/month | 30 bps (0.30%) |
| Growth | $1M-$10M/month | 15 bps (0.15%) |
| Enterprise | $10M+/month | 5-10 bps (negotiated) |

**Subscription tiers (compliance-as-a-service):**

| Tier | Price | Included |
|------|-------|---------|
| Free | $0 | OFAC screening only, 100 tx/month |
| Developer | $99/month | Full sanctions screening, 10K tx/month, API access |
| Business | $499/month | Full compliance stack (sanctions + Travel Rule + AML), 100K tx/month, ProofLink receipts, KYA verification |
| Enterprise | $2,000+/month | Unlimited volume, custom rules, ERP integration, audit support, SLA |

**KYA credential fees:** $0.10/verification, $0.05/month renewal, bulk discounts at 10K+ agents.

### Unit Economics

| Cost Item | Per-Transaction Cost (est.) | Notes |
|-----------|---------------------------|-------|
| Notabene Travel Rule API | ~$0.02-0.05/tx | Volume-tiered, negotiable |
| TRM Labs AML scoring | ~$0.01-0.03/tx | API pricing, volume discounts |
| Chainalysis sanctions screening | ~$0.005/tx (free tier: $0) | Free SDN API for basic; paid for enhanced |
| Infrastructure (Base, IPFS, compute) | ~$0.005/tx | Low at scale |
| **Total COGS per transaction** | **~$0.04-0.09/tx** | |

**At a $50K B2B invoice (typical mid-market):**
- Revenue at 15 bps: **$75**
- COGS: ~$0.07
- **Gross margin: >99%**

**At $10M/month platform volume (Month 12 target):**
- Transaction revenue: ~$15K-$30K/month (blended 15-30 bps)
- Subscription revenue: ~$25K/month (50 Business tier customers)
- **Monthly revenue: $40K-$55K**
- **Monthly COGS: <$500**
- **Gross margin: >98%**

> NOTE: The per-transaction flat fee model ($0.01/tx) from v1 is eliminated. B2B stablecoin invoices average $10K-$500K per transaction. A flat $0.01 fee on a $50K invoice is economically absurd. The bps model aligns revenue with value delivered.

---

## Slide 10: Go-to-Market

### Phase 1 (NOW -- Q3 2026): Compliance-First B2B Invoicing

**Target:** Mid-market CFOs ($10M-$500M revenue companies) who have received board pressure to adopt stablecoin payments following GENIUS Act but need compliance documentation to do it.

**Secondary target:** Crypto-native companies with active cross-border payables ($10M+/year) who currently use Request Finance without compliance.

**Distribution (ranked by effectiveness for a 2-person team):**
1. **Hackathons** (primary): ETHGlobal, SF Agentic Commerce, Coinbase "Agents in Action", Base Batches application ($50K grant). Win one hackathon = developer mindshare + press + reference integration.
2. **Developer-first free tier**: Ship a working x402 compliance middleware on GitHub. Stars and forks are traction.
3. **Compliance community**: ACAMS conferences, BSA Coalition events -- where compliance buyers actually gather.
4. **Partner channels**: Accounting firms advising clients on crypto adoption (Big 4 are all active here).
5. **Direct outreach**: CFOs at companies already making stablecoin payments via Request Finance (they need compliance and their current tool does not provide it).

**NOT doing:** Cold LinkedIn outreach to Fortune 500 CFOs. That is a 12-18 month sales cycle for a 2-person team. Wrong motion for pre-seed.

**Phase 1 success metrics:** 50+ paying customers, $50M cumulative volume, $300K+ ARR.

### Phase 2 (Q3 2026 -- Q2 2027): Agent-Assisted Commerce

**Target:** Enterprises with deployed AI procurement agents who need a compliance story for their finance team. Mid-market first (60-90 day sales cycles), not Fortune 500 (12-18 months).

**Product additions:** KYA verification, agent spending policy engine, x402/MPP compliance middleware.

**Phase 2 success metrics:** 10,000+ KYA-credentialed agents, 1M+ agent transactions screened/month.

### Phase 3 (2027+): Agent-to-Agent Economy

**Target:** Autonomous agent commerce at scale.

**Honest framing:** x402 real commerce volume is $28K/day today. A2A at scale is a 2027-2028 story, not a 2026 revenue driver. FlowLink builds for this future but does not depend on it. If A2A takes 3 years instead of 12 months, the H2H B2B invoicing business alone supports $2-3M ARR by Year 2. The agent economy is upside, not a dependency.

---

## Slide 11: 90-Day Plan + Milestones

> NOTE: This slide replaces the placeholder traction slide from v1. If real metrics exist at pitch time, add them above this plan. If not, this plan demonstrates execution clarity.

### What We Have Done
- [INSERT REAL METRICS: transactions processed, API calls, developer signups, GitHub stars]
- [INSERT: hackathon results, demo links]
- [INSERT: design partner name and LOI status]
- Completed 7 research deep dives across TradFi, compliance, agentic protocols, competitive landscape
- Product architecture designed: ProofLink Engine, KYA standard, Agent Invoice schema
- KYA credential schema specified (W3C Verifiable Credential format)

### 90-Day Execution Plan

**Week 1-4: Ship**
- ProofLink Engine MVP live on Base testnet: OFAC screening + basic Travel Rule for x402
- Open-source x402 compliance middleware on GitHub
- KYA draft spec published on GitHub, submitted to W3C Credentials Community Group

**Week 5-8: Prove**
- Enter 2+ hackathons (ETHGlobal, Coinbase "Agents in Action")
- Apply to Base Batches ($50K grant + accelerator)
- First 5 developer signups on free tier
- Legal memo on VASP/MSB classification obtained

**Week 9-12: Sell**
- First design partner onboarded (target: crypto-native company with $10M+ annual cross-border payables)
- ProofLink Engine on Base mainnet
- 3+ Business tier ($499/month) paying customers
- Named compliance advisor on board

**End of 90 days:** Working product, real transactions, at least one paying customer, legal clarity on regulatory posture.

---

## Slide 12: Validation -- The Market Is Proving Our Thesis

- **BVNK acquired by Mastercard for $1.8B** (March 17, 2026) on $90M raised -- 22x capital efficiency. BVNK was compliance-native stablecoin infrastructure. This is exactly FlowLink's thesis.
  - *BVNK built stablecoin payments infrastructure. FlowLink is building the compliance layer that BVNK needed but did not have.*

- **Bridge acquired by Stripe for $1.1B** (2025) -- largest crypto acquisition of the year. Stablecoin infrastructure attracts strategic acquirers at $1B+ valuations.

- **Rain raised $250M Series C at $1.95B valuation** (ICONIQ-led, January 2026) -- stablecoin infrastructure is the hottest category in fintech.

- **a16z raising $2B crypto fund** (March 2026) with stated thesis on payments infrastructure -- institutional capital is deploying now.

- **Six agent payment protocols shipped in 12 months** -- each one creates a new compliance surface that FlowLink fills.

The pattern: Build compliance-native stablecoin infrastructure. Get acquired by a card network or payment platform at $1B+ valuation. FlowLink is building the next piece of that infrastructure.

---

## Slide 13: Team

**[Akash]** -- CEO / Technical Lead
- Systems-level ML engineer, IIT Patna
- CERN GSoC contributor, vLLM contributor (production-grade ML systems)
- Built FlowLink's architecture: ProofLink Engine, KYA standard, cross-protocol compliance router
- Designed the agent behavioral analysis models that become FlowLink's data moat

**[Cofounder Name -- FILL BEFORE ANY PITCH]** -- CTO / Protocol Engineering
- [Specific role at Request Finance -- e.g., "Led protocol engineering for Request Network's invoicing engine"]
- [Specific technical contribution -- e.g., "Architected the multi-chain payment settlement system processing $X/month"]
- [Any compliance/fintech/regulatory background]
- Deep knowledge of crypto invoicing infrastructure, payment protocol integration, and the specific gaps in Request Finance's compliance story

**Advisors** [FILL BEFORE ANY PITCH -- at least one]:
- [Compliance Advisor] -- [Former FinCEN/FATF official, or CCO at regulated crypto firm, or ACAMS board member]. Provides regulatory credibility and guidance on Travel Rule implementation.
- [Technical Advisor] -- [Optional: someone from Coinbase/Base/x402 ecosystem or compliance infrastructure space]

**Why us:**
- Technical depth in ML systems (behavioral analysis moat) + protocol engineering (multi-protocol integration)
- Direct knowledge of Request Finance's architecture and its compliance gaps -- we know exactly what is missing
- [If applicable: specific compliance/regulatory experience]

**Honest gap:** Neither founder has a compliance/regulatory background. This is why the compliance advisor is critical -- and why we are raising to hire a Head of Compliance as one of the first three hires.

> NOTE: The "why us" question is the hardest one for this team. The answer must be: (1) technical depth that compliance-background founders lack, (2) insider knowledge of the competitive landscape (Request Finance), (3) compensating with advisory relationships. Do not dodge this question.

---

## Slide 14: The Ask

**Raising:** $750K-$1.5M pre-seed

**Use of funds (18 months runway):**
| Category | Allocation | Specifics |
|----------|-----------|-----------|
| Engineering | 55% | 2 additional engineers (protocol integration + compliance backend) |
| Compliance | 25% | Head of Compliance hire, legal opinions, Notabene/TRM API costs, potential CASP application |
| GTM | 15% | Hackathons, developer relations, initial sales |
| Operations | 5% | Infrastructure, tooling |

**Series A target (18 months):**
- $1M-$2M ARR
- 20-30 paying enterprise/business customers
- $500M+ cumulative volume processed
- KYA standard adopted by at least one major protocol
- Named compliance advisory board
- Evidence of regulatory engagement (comment letters, working group participation)

**Target investors (in priority order for pre-seed):**
1. Haun Ventures -- regulatory-aware fund, compliance thesis resonates
2. Dragonfly Capital -- capital efficiency focus, crypto infrastructure
3. Pantera Capital -- active in payment protocols
4. Angel syndicates around compliance/fintech founders
5. Base Batches grant ($50K) + hackathon wins as supplementary proof

> NOTE: a16z, Paradigm, and ICONIQ are Series A/B targets, not pre-seed. Paradigm has a conflict (Tempo investor). ICONIQ's minimum check size is too large. Be realistic about who funds a 2-person team with no traction.

---

## Slide 15: The Coinbase Question

*"What stops Coinbase from adding a compliance checkbox to AgentKit and making FlowLink irrelevant?"*

We get asked this in every conversation. Here is the honest answer:

**Nothing stops Coinbase from building x402 compliance. Three things stop them from replacing FlowLink:**

1. **FlowLink is cross-protocol. Coinbase is x402-only.** Stripe's MPP, Google's AP2, OpenAI's ACP, Visa TAP -- Coinbase has no incentive to make compliance work for competing protocols. An enterprise using three protocols needs one compliance layer, not three. That is FlowLink.

2. **Coinbase's compliance covers Coinbase's ecosystem.** A payment from a Coinbase wallet to a non-Coinbase wallet, settled via a non-Coinbase rail, falls outside Coinbase's compliance perimeter. FlowLink covers the entire transaction regardless of ecosystem.

3. **The KYA open standard creates ecosystem lock-in that proprietary solutions cannot replicate.** If KYA becomes the adopted standard for agent identity verification (and we are publishing it before anyone else), then Coinbase's proprietary agent identity is just one implementation of the FlowLink-authored standard.

**The deeper answer:** Coinbase building basic x402 compliance actually validates our thesis and grows the market. It proves compliance is mandatory. And it does not solve cross-protocol compliance, which is FlowLink's core value.

**The realistic risk:** If Coinbase ships native compliance before FlowLink establishes customer lock-in, our x402-specific value shrinks. The mitigation is speed: ship the product, win the hackathons, publish the standard, sign the design partners -- all within 90 days.

---

## Slide 16: The Exit

**This is an acquisition story.**

| Acquirer | What They Get | Comparable |
|----------|--------------|-----------|
| **Mastercard** | Just bought BVNK for $1.8B (payments). FlowLink adds the compliance layer BVNK lacked. | BVNK: $1.8B on $90M raised |
| **Visa** | Invested in agent payments (TAP). Needs compliance infrastructure for the agentic commerce they are enabling. | Visa acquired Tink ($2.2B), Plaid bid ($5.3B) |
| **Stripe** | Acquired Bridge ($1.1B). Building MPP. Needs cross-protocol compliance that goes beyond Stripe's ecosystem. | Bridge: $1.1B |
| **JPMorgan** | Running Kinexys (blockchain division). Needs agent payment compliance for institutional clients. | $430B+ tokenized transactions |
| **Chainalysis/TRM Labs** | Adds pre-payment compliance (offensive product) to their post-hoc monitoring (defensive product). New revenue stream, new market. | Chainalysis: $8.6B valuation |

**The pattern is proven:**
- Mastercard paid $1.8B for BVNK
- Stripe paid $1.1B for Bridge
- Both were compliance-aware stablecoin infrastructure

The next $1B+ stablecoin compliance acquisition goes to the company that owns the agent payment compliance layer. FlowLink is building that company.

> NOTE: End on acquisition narrative, not TAM. VCs at pre-seed care about the exit path more than the theoretical market size. Two recent $1B+ exits in the exact same category is the strongest possible closing argument.

---

## APPENDIX A: Stress Test -- What If Agents Take 3 Years?

**Scenario:** A2A commerce does not materialize at scale until 2028-2029. x402 real commerce stays under $1M/day through 2027.

**FlowLink's business in this scenario:**
- H2H B2B stablecoin invoicing with compliance is a $226B/year market that exists today
- Year 1: $300K-$550K ARR from B2B invoicing + compliance subscriptions
- Year 2: $2M-$3M ARR from expanded B2B customer base + compliance upsells
- Year 3: Agent economy begins to materialize, FlowLink is positioned with infrastructure already built

**Conclusion:** FlowLink is a viable B2B compliance invoicing business without the agent narrative. The agent economy is a 10x expansion opportunity, not a survival dependency. If we pitch the agent story and deliver a B2B invoicing business, that is an honest outcome that still generates venture returns at acquisition.

This is actually the strongest pitch framing: "Fund us for the B2B compliance business that works today. The agent economy is free upside."

---

## APPENDIX B: What If Regulators Do Not Enforce for Agents?

**Scenario:** FATF exempts agent-to-agent micro-transactions from Travel Rule. Regulators treat AI agents as software of their human principals, not as independent actors requiring compliance.

**FlowLink still wins because:**
1. The Travel Rule obligation falls on the VASP processing the transaction -- VASPs still need compliance middleware, and FlowLink provides it.
2. Enterprise CFOs still need audit trails and compliance documentation for internal controls, regardless of whether regulators mandate it. SOX compliance, internal audit, board reporting -- these do not disappear because FATF exempts agents.
3. The KYA standard still has value as an enterprise trust layer even without regulatory mandate. "Verify the agent you are paying" is good business practice, not just a legal requirement.
4. The H2H B2B invoicing business is completely independent of agent-specific regulation.

**The honest framing:** Regulatory mandate creates "must-have" demand. Without mandate, FlowLink is "should-have" for agents but "must-have" for H2H stablecoin compliance. The business case narrows but does not collapse.

---

## APPENDIX C: Responses to Anticipated VC Questions

**"Who is your first paying customer and what are they paying?"**
[Answer with real customer data before any pitch. If no customer exists yet: "We have a signed LOI with [Company Name] for a pilot starting [date]. They process $X/month in cross-border stablecoin payments and currently have no compliance documentation."]

**"Chainalysis sells sanctions data for $150K/year. You offer OFAC screening for $99/month. Why will they keep selling you data at a price that lets you undercut them?"**
FlowLink's free tier uses Chainalysis's free SDN API (publicly available, no contract required). Paid tiers use TRM Labs and ChainAware as primary data sources. We are not dependent on Chainalysis's enterprise pricing. If Chainalysis restricts access, we have alternative providers already integrated.

**"What happens if the ERC-8004 registry gets exploited or a malicious agent registers legitimate-looking credentials?"**
ERC-8004 registration is permissionless, but FlowLink's KYA verification is not. Registration alone does not grant compliance status. FlowLink independently verifies the human principal behind every agent, checks the delegation scope, and screens the principal entity. A malicious agent with fake ERC-8004 credentials fails KYA verification because the human principal cannot be verified.

**"You say regulators will adopt your architecture. Who at FATF, FinCEN, or ESMA have you spoken to?"**
[If no engagement yet, be honest:] "We have not yet engaged directly with regulators. Our 90-day plan includes publishing the KYA spec and submitting a comment letter to FinCEN on agent payment classification. Our compliance advisor [name] has [specific regulatory relationships]. We are not claiming regulatory adoption -- we are claiming we are building the architecture that will be the most technically sound option when regulators do act."

**"What is your founder's unfair advantage?"**
Technical depth in ML systems (for behavioral analysis moat that Chainalysis cannot replicate without being in the payment flow) + insider knowledge of Request Finance's architecture and its specific compliance gaps + first-mover on the KYA standard. We are not ex-Chainalysis compliance officers -- we are systems engineers building infrastructure. Our compliance advisory board compensates for regulatory domain expertise.

---

*FlowLink Pitch Deck v2 -- March 20, 2026*
*Addresses all feedback from Strategy Review (Review Team 2)*
