# FlowLink: VASP/MSB Classification Risk Analysis
**Research Date:** March 2026
**Classification:** Existential Risk Assessment — Legal Strategy
**Prepared for:** FlowLink founding team / legal counsel

---

## Executive Summary

The central question: **Is FlowLink a Money Services Business (MSB) / money transmitter under US law, or a Virtual Asset Service Provider (VASP) / CASP under global standards?**

The answer is not automatically yes — but it is not automatically no either. It depends entirely on how FlowLink is architected and what it actually does in a transaction. There is a defensible path to non-classification as an MSB/VASP, but it requires deliberate structural decisions made before product launch, not retrofitted after.

**Bottom line:** FlowLink should structure as a pure compliance infrastructure provider — a "software-only" layer — never taking custody of, controlling, or transmitting funds. The 31 CFR § 1010.100(ff)(5)(ii)(A) network/software provider exemption is the primary legal shield. Corroborating administrative rulings and industry precedent support this path, but the risk is real and legal counsel is non-optional.

---

## Table of Contents

1. [FinCEN MSB / Money Transmitter Framework](#1-fincen-msb--money-transmitter-framework)
2. [The Software Provider Exemption — The Critical Shield](#2-the-software-provider-exemption--the-critical-shield)
3. [FinCEN Administrative Ruling Precedents](#3-fincen-administrative-ruling-precedents)
4. [EU MiCA / CASP Classification](#4-eu-mica--casp-classification)
5. [How Comparable Companies Avoid MSB Classification](#5-how-comparable-companies-avoid-msb-classification)
6. [State Money Transmitter License Landscape](#6-state-money-transmitter-license-landscape)
7. [FlowLink-Specific Risk Analysis](#7-flowlink-specific-risk-analysis)
8. [Structural Recommendation](#8-structural-recommendation)
9. [Required Legal Work](#9-required-legal-work)
10. [Sources](#10-sources)

---

## 1. FinCEN MSB / Money Transmitter Framework

### The Statutory Definition

Under **31 CFR § 1010.100(ff)(5)(i)**, a money transmitter is:

> "A person that provides money transmission services. The term 'money transmission services' means the acceptance of **currency, funds, or other value that substitutes for currency from one person and the transmission of currency, funds, or other value that substitutes for currency to another location or person by any means.**"

This is deliberately broad. No activity threshold applies to the money transmitter definition — unlike other MSB categories where a $1,000/day threshold exists. The moment you accept value from Person A and transmit it to Person B as a business, you are a money transmitter regardless of dollar amount.

### The Three-Category Model (2013 and 2019 FinCEN Guidance)

FinCEN's 2013 and 2019 guidance documents establish three categories for virtual currency participants:

| Category | Definition | MSB Status |
|---|---|---|
| **User** | Obtains virtual currency to purchase goods/services or for investment in their own account | NOT an MSB |
| **Exchanger** | Accepts value and exchanges it for virtual currency (or vice versa) as a business for others | MSB (money transmitter) |
| **Administrator** | Issues virtual currency into circulation and has authority to redeem/withdraw it | MSB (money transmitter) |

**The decisive phrase is "for others."** The moment a platform facilitates the movement of value on behalf of third parties as its business model, it enters money transmitter territory.

### The Four-Factor Test for Custodial Status

FinCEN's guidance establishes a functional test to determine if an intermediary is a money transmitter (specifically for wallet/custody determinations, but the logic extends broadly):

1. **Who owns the value?** (Customer vs. platform)
2. **Where is the value stored?** (Customer-controlled vs. platform-controlled)
3. **Does the owner interact directly with the payment system?** (Customer-directed vs. platform-directed)
4. **Does the intermediary have independent control over the assets?** (Custodial vs. non-custodial)

If a platform has independent control — i.e., can move funds without the customer's real-time instruction — it is custodial and almost certainly an MSB. If customers retain control and the platform only provides software, the exemption applies.

### Unhosted Wallets Are Not MSBs

FinCEN's 2019 guidance (FIN-2019-G001) explicitly confirmed that **unhosted wallet providers are not MSBs**. The rationale: the provider supplies the delivery/communication/network access infrastructure; the user retains control of the underlying value. This is the foundational logic FlowLink should build on.

---

## 2. The Software Provider Exemption — The Critical Shield

### Statutory Text

**31 CFR § 1010.100(ff)(5)(ii)(A)** carves out from the money transmitter definition:

> A person that **only** "provides the delivery, communication, or network access services used by a money transmitter to support money transmission services."

This is the primary legal basis for why Chainalysis, TRM Labs, Notabene, and comparable companies are not MSBs.

### How the Exemption Works

A company qualifies when it:
- Provides software, APIs, or communication infrastructure
- Used by an actual money transmitter (a VASP, exchange, bank)
- To support that entity's money transmission activities
- WITHOUT itself accepting, holding, or transmitting the value

The exemption's scope extends explicitly to **anonymizing software**, **network infrastructure**, and **compliance tooling** — FinCEN has confirmed that building and distributing software used in money transmission does not, by itself, constitute money transmission.

### The Critical Word: "Only"

The exemption fails the moment FlowLink does anything beyond pure software provision:
- Accepting customer funds — even temporarily — destroys the exemption
- Having discretionary control over fund routing destroys the exemption
- Acting as an intermediary that settles value on behalf of users destroys the exemption
- Commingling FlowLink's operational funds with customer transaction flows destroys the exemption

**The exemption is binary.** It does not permit partial participation in money transmission.

### Confirmed Software-Not-MSB Activities

Based on FinCEN rulings and guidance, the following activities do NOT trigger MSB classification:

- Providing KYC/AML screening APIs
- Building compliance dashboards for VASPs
- Providing travel rule messaging software
- Providing address screening tools
- Providing risk scoring APIs
- Providing blockchain analytics tools
- Issuing cryptographically signed compliance attestations
- Operating a VASP registry (identity directory)
- Providing agent identity credentials and registries
- Building compliance orchestration middleware

All of these are "delivery, communication, or network access services" used by money transmitters. The value moves between the VASP and its customers; FlowLink merely provides the software through which compliance checks run.

---

## 3. FinCEN Administrative Ruling Precedents

### FIN-2014-R002: Software + Investment Activity

**Facts:** Company wanted to develop software automating virtual currency purchases for its own investment account.

**Ruling:** NOT a money transmitter.

**Key language:** "The production and distribution of software, in and of itself, does not constitute acceptance and transmission of value." What matters is "what the person uses the convertible virtual currency for, and for whose benefit."

**Relevance to FlowLink:** Confirms that building software used in virtual currency activity is not MSB-triggering, provided FlowLink does not act on behalf of third parties in moving their funds.

### Merchant Payment Processor Administrative Ruling

**Facts:** Company that submitted ACH payment instructions on behalf of merchants, remitting received funds to merchants.

**Ruling:** NOT a money transmitter.

**Key reasoning:** The processor "acts on behalf of merchants receiving payments rather than on behalf of customers making payments." Its role was "limited to submitting payment instructions obtained from a merchant to a bank for ACH processing" — a portal function, not a transmission function.

**Relevance to FlowLink:** This "portal function" framing is directly applicable. FlowLink's ProofLink Engine routes compliance decisions, not funds. FlowLink is the compliance checkpoint, not the settlement layer.

### Computer System Rental for Mining (FIN-2014-R001)

**Facts:** Company renting computer systems to third parties who used them to mine and exchange virtual currency.

**Ruling:** NOT a money transmitter.

**Key reasoning:** Even renting infrastructure that third parties use to exchange virtual currency does not make the infrastructure provider a money transmitter. The provider of the tool is not the user of the tool.

**Relevance to FlowLink:** Directly supports the proposition that providing compliance infrastructure to VASPs does not classify FlowLink as a VASP.

### The "Payment Processing" Exemption (31 CFR § 1010.100(ff)(5)(ii)(B))

A separate exemption covers payment processors that:
1. Facilitate purchases of goods/services (not money transmission itself)
2. Operate through clearance/settlement systems admitting only BSA-regulated institutions
3. Have a formal agreement with the seller/creditor

This is a secondary potential shield if FlowLink's payment orchestration features ever approach closer to transmission territory.

---

## 4. EU MiCA / CASP Classification

### The Ten CASP-Triggering Services

Under MiCA (fully effective December 30, 2024, with transitional provisions until July 1, 2026), any entity providing these services as its profession or business to clients is a CASP requiring authorization:

1. Custody and administration of crypto-assets on behalf of clients
2. Operating a trading platform
3. Exchanging crypto-assets for fiat
4. Exchanging crypto-assets for other crypto-assets
5. Executing orders on behalf of clients
6. Placing crypto-assets
7. Receiving and transmitting orders
8. Providing advice on crypto-assets
9. Portfolio management
10. **Transfer services for crypto-assets**

Numbers 1, 5, 7, and 10 are the highest-risk categories for FlowLink depending on product features.

### The Critical Gap: No Explicit Technology Provider Exemption in MiCA

Unlike FinCEN's regulations, **MiCA does not contain an explicit carve-out for technology/software providers**. MiCA's exemptions apply only to entities already regulated as:
- Credit institutions
- Central securities depositories
- MiFID investment firms
- Market operators
- Electronic money institutions
- UCITS management companies
- AIFMs

A standalone compliance middleware company like FlowLink does not fit any of these categories.

### The Functional Test Is Still the Operative Question

Despite the textual gap, MiCA regulators are still applying a functional test: **does the entity actually provide crypto-asset services to clients, or does it provide software to entities that do?** The ESMA and national competent authorities (NCAs) have consistently interpreted "crypto-asset service" as requiring a direct service relationship with the end user.

A company providing APIs and compliance software to CASPs, where the CASP remains the licensed party interacting with end clients, is not itself providing a crypto-asset service under MiCA. The CASP is. The software vendor is a B2B infrastructure supplier.

**This is the Notabene model — it works in practice, but has not been formally blessed by ESMA with a written opinion.** This is a legal gray zone in the EU that requires either a national regulatory opinion or conservative operating approach.

### VASP vs. CASP Terminology

FATF's original framework uses "VASP"; MiCA replaced this with "CASP" (Crypto Asset Service Provider). The definitions overlap significantly — both capture entities that hold, exchange, transfer, or administer virtual assets on behalf of others. The functional logic is the same: if you don't do those things, you aren't in scope.

### Risk Level: EU vs. US

The EU presents **higher regulatory ambiguity** for FlowLink than the US. The FinCEN software provider exemption is explicit statutory text with administrative ruling support. MiCA has no equivalent explicit carve-out. The EU risk requires more active legal mitigation — either a formal regulatory opinion in a favorable jurisdiction (e.g., Netherlands, Luxembourg, Ireland) or a structural arrangement where FlowLink operates solely as a B2B software vendor with no direct client-facing function.

---

## 5. How Comparable Companies Avoid MSB Classification

### Chainalysis

**Structure:** Pure analytics and forensics software company. Chainalysis does not hold, transmit, or control any cryptocurrency. It ingests on-chain data, enriches it with attribution intelligence, and delivers risk scores, transaction monitoring alerts, and investigation tools via API and SaaS dashboard.

**Why not an MSB:** Chainalysis never accepts or transmits value. It analyzes value that moves elsewhere. It is a data company whose subject matter happens to be financial transactions. This is no different from a bank's core banking software vendor not being a bank.

**Revenue model:** Annual enterprise SaaS contracts ($150K–$500K/yr). No transaction-based revenue that could imply participation in money transmission.

### TRM Labs

**Structure:** Identical to Chainalysis in regulatory positioning. Provides blockchain intelligence APIs — risk scoring, wallet screening, entity attribution — to banks, exchanges, and government agencies.

**Why not an MSB:** Same reasoning. Data and software provision only.

### Notabene

**Structure:** Provides the "plumbing" for travel rule data exchange — a multi-protocol gateway that lets VASPs send counterparty information alongside transfers. Critically: **Notabene transmits data, not funds.** The money moves between the originating VASP and the beneficiary VASP on blockchain rails. Notabene's software routes the accompanying PII and compliance data.

**Why not an MSB:** Notabene is a messaging middleware provider. It moves information (originator/beneficiary data). The funds move separately on chain. This is the critical distinction — transmitting travel rule data is not money transmission.

**What Notabene explicitly does NOT do:** It does not hold customer funds, does not settle transactions, does not custody crypto, and does not control transaction execution.

**Self-identification:** Notabene describes itself as "serving VASPs rather than being one" — a compliance infrastructure provider, not a VASP itself.

### Elliptic

Same structure as Chainalysis — analytics/forensics SaaS. Never handles funds.

### The Common Thread

All of these companies share one structural characteristic: **the money never touches them.** The following table shows the bright-line distinction:

| Function | VASP/MSB Territory | Safe Territory |
|---|---|---|
| Holds customer crypto | YES | |
| Executes trades | YES | |
| Transmits funds on behalf of users | YES | |
| Settles transactions | YES | |
| Controls routing of funds | YES | |
| Provides risk scoring API | | NOT MSB |
| Provides KYC verification API | | NOT MSB |
| Transmits travel rule data | | NOT MSB |
| Provides compliance dashboards | | NOT MSB |
| Issues compliance attestations | | NOT MSB |
| Provides agent identity credentials | | NOT MSB |
| Orchestrates compliance checks pre-payment | | NOT MSB |

---

## 6. State Money Transmitter License Landscape

### The Scale of the Problem (If MTL Is Required)

If FlowLink were classified as a money transmitter, the compliance burden would be existential at seed stage:

| Cost Category | Year 1 | Annual Ongoing |
|---|---|---|
| State application fees (49 states) | $100K–$130K | $80K–$120K renewal |
| Surety bonds (1–3% premium) | $120K–$160K | $130K+ |
| Legal + registered agents | $15K–$30K | $15K–$30K |
| **Total (49 states)** | **$250K–$350K** | **$225K–$280K** |
| NY BitLicense (additional) | $15K–$80K | $50K–$200K |
| 5-year total cost of ownership | | **$1.2M–$2M+** |

Most expensive individual states:
- Texas and Hawaii: $10,000 application fee each
- Colorado: $1,000,000 surety bond requirement
- New York: Full BitLicense process, 12–24 month approval timeline
- Pennsylvania, Michigan: Among highest bond requirements

**Montana** is the only state with no MTL requirement.

### Crypto-Specific State Considerations

**Wyoming** has the most favorable framework for non-custodial crypto companies:
- The Wyoming Money Transmitter Act explicitly exempts virtual currency businesses from MTL requirements in certain circumstances
- HB 19 ("Virtual Currency Exemption") exempts cryptocurrency from the Wyoming Money Transmitter Act
- Non-custodial exchange facilitators have explicit protections
- SPDI (Special Purpose Depository Institution) charter available for custody if needed

**Nebraska and Louisiana** have enacted narrow crypto-specific exemptions.

**Texas** provides regulatory clarity guidance distinguishing when crypto activities require licensing; generally favorable interpretation of non-custodial models.

**California** (effective July 1, 2026): New Digital Asset Business Licensing regime — stricter than prior framework, includes quarterly CPA examinations of reserves.

### Recommended State Sequencing If MTL Were Needed

(For context only — the goal is to avoid needing MTLs entirely)

- **Tier 1 (mandatory coverage):** NY, CA, TX, FL, IL — 40%+ of US population
- **Tier 2:** WA, PA, GA, MA, CO
- **Staged approach:** Seed-stage companies use partner bank model (10–30% revenue share); direct licensing at Series A/B after product-market fit

---

## 7. FlowLink-Specific Risk Analysis

### Features That Are Clearly Safe (Non-MSB)

| Feature | Risk Level | Reasoning |
|---|---|---|
| Sanctions screening API | NONE | Data provision only; no funds involved |
| AML transaction monitoring API | NONE | Data provision only |
| KYC verification orchestration | NONE | Identity data; no funds |
| Travel Rule data transmission | NONE | Information routing; money moves separately on-chain |
| Agent identity registry (KYA) | NONE | Identity credentials; no funds |
| Compliance receipt issuance | NONE | Cryptographic attestations; no funds |
| VASP directory/registry | NONE | Data directory service |
| Risk scoring API | NONE | Data product |
| Compliance rules engine | NONE | Decision software |
| ProofLink attestations on-chain | NONE | Cryptographic proof artifacts |

### Features That Create Elevated Risk (Require Architecture Review)

| Feature | Risk Level | Risk Factor |
|---|---|---|
| Payment initiation/routing | MEDIUM-HIGH | If FlowLink "initiates" the payment (vs. the customer/VASP), distinction blurs |
| Smart contract execution | MEDIUM | If FlowLink controls execution logic and funds flow through FlowLink contracts |
| Escrow/hold for compliance review | HIGH | Holding funds — even briefly — triggers MSB classification |
| Multi-sig co-signing | MEDIUM | If FlowLink holds a key required to move funds, this approaches custodial control |
| Compliance gateway that blocks/releases funds | MEDIUM | "Blocking" a payment vs. providing a risk decision for the VASP to act on |
| Fee collection in crypto | LOW-MEDIUM | Collecting service fees in stablecoin is generally fine; structuring matters |

### The Critical Architectural Distinction

The difference between being a compliance middleware provider (non-MSB) and being a money transmitter comes down to **one question at every product decision:**

> **Does the money flow through FlowLink, or does FlowLink's data flow alongside the money?**

- Money flows through FlowLink → MSB territory
- FlowLink's data flows alongside money that moves between counterparties → Safe territory

This must be a design constraint embedded in every engineering decision, not an afterthought.

### Specific FlowLink Product Architecture Decisions

**CORRECT architecture:**
```
User/Agent → initiates payment on VASP/protocol
           → VASP calls FlowLink API (sanctions check, KYC verify, travel rule)
           → FlowLink returns: PASS/FAIL + signed compliance receipt
           → VASP executes (or blocks) the payment
           → Payment settles between counterparties on blockchain
           → FlowLink never touches the funds
```

**DANGEROUS architecture:**
```
User/Agent → sends funds to FlowLink smart contract
           → FlowLink performs compliance check
           → FlowLink routes funds to destination
           → This is money transmission — MSB classification likely
```

**The ProofLink Engine should be a decision service, not a settlement service.** The VASP or protocol executes; FlowLink certifies.

### The "Compliance Gateway" Gray Zone

One specific FlowLink feature concept requires careful legal analysis: a compliance gateway that **prevents** non-compliant transactions from executing. There are two implementations:

**Safe implementation:** FlowLink API returns a risk decision (PASS/FAIL/REVIEW). The VASP or smart contract that holds the funds acts on this decision. FlowLink has no control over the funds themselves — it issues opinions, the VASP executes.

**Risky implementation:** FlowLink holds a cryptographic key or smart contract control that must be used to execute the transaction. If without FlowLink's involvement the transaction cannot proceed, FlowLink may be deemed to have "control" over value movement.

The line between "providing the compliance decision" and "controlling fund movement" is legally contested. Multiple law firms would give different opinions on this. Structural decisions must be made conservatively.

---

## 8. Structural Recommendation

### Primary Structure: Pure B2B Software Provider

FlowLink should incorporate and operate as a **pure B2B software and data services company** with the following structural commitments:

**1. Never touch customer funds**
FlowLink's bank accounts, wallets, and smart contracts must never hold, transmit, or co-mingle customer funds. FlowLink charges customers for API calls and subscriptions — it does not participate in the value flow.

**2. All payment execution occurs at the VASP/protocol layer**
The FlowLink API returns compliance decisions. The VASP, exchange, or DeFi protocol that calls FlowLink executes (or does not execute) the actual payment. This is the Notabene model applied to the full compliance stack.

**3. Never be a co-signer or co-controller of customer wallets**
If FlowLink issues agent identity credentials (KYA), these should be attestations, not keys. FlowLink cannot be a required co-signer on any wallet that holds customer funds.

**4. Contractually define the relationship**
Every customer agreement should explicitly state:
- Customer (the VASP/protocol) is the money transmitter / MSB / CASP
- FlowLink is a technology services vendor
- FlowLink does not hold, transmit, or control customer funds
- Customer is responsible for all regulatory compliance obligations
- FlowLink provides tools; customer applies them

**5. Bill for software, not for transactions**
Charging per-API-call or per-subscription is safe. Charging a percentage of transaction value processed could be re-characterized as participating in money transmission. If transaction-based pricing is used, it should be priced on API calls (which happen to correlate with transactions) not on transaction value.

**6. Incorporate in Wyoming (or Delaware + Wyoming operations)**
Wyoming's explicit virtual currency exemption from its Money Transmitter Act provides the friendliest state-level baseline. Delaware for corporate structure, Wyoming registration for operational headquarters.

**7. Obtain a formal legal opinion before launch**
Before processing any live transactions, commission a written opinion from a law firm specializing in fintech/crypto regulatory law confirming non-MSB status. This is not optional — it is both a legal safeguard and a due diligence requirement investors will demand at Series A.

### EU Structure: Explicit B2B-Only Positioning

Given MiCA's lack of an explicit technology provider exemption:

**1. Engage a European regulatory counsel in Netherlands or Ireland**
Obtain an informal regulatory opinion from the Dutch AFM or Irish CBI — both are known for pragmatic, business-friendly MiCA interpretation — confirming FlowLink's B2B SaaS model does not require CASP authorization.

**2. Operate through a "technology services" entity in the EU**
A separate EU entity (Dutch BV or Irish Ltd) that only sells software licenses/API access to licensed CASPs — no direct end-user relationships.

**3. No direct relationships with retail users in the EU**
All EU-based retail user interactions must go through a licensed CASP customer. FlowLink's EU entity has no relationship with end users.

**4. Document the CASP-as-customer relationship clearly**
Every EU customer agreement should identify the customer as the licensed CASP bearing all MiCA obligations. FlowLink's liability is software SLA, not regulatory compliance.

### The Non-Starter Alternative: Becoming a VASP/MSB

For reference, here is what becoming a VASP/MSB would entail:

- Federal: Register with FinCEN as MSB; implement full BSA AML/KYC program; file SARs/CTRs
- State MTLs: $250K–$350K in year 1 across 49 states; $225K–$280K annual ongoing
- NY BitLicense: Additional $200K–$800K year 1; 12–24 month approval
- EU: CASP authorization in each member state; substantial capital requirements; appointment of compliance officers
- Ongoing: External audits, regulator examinations, SAR filing infrastructure, compliance staff
- **Total year-1 cost: $1.5M–$4M+ in regulatory compliance alone**

This is not a seed-stage option. Avoiding MSB/VASP classification is the only viable path to market at the current stage.

---

## 9. Required Legal Work

### Immediate (Pre-Launch)

**Priority 1 — Hire Crypto Regulatory Counsel (US)**

Engage one of the following firms with established crypto regulatory practices:

- Debevoise & Plimpton (crypto regulatory team)
- Covington & Burling (financial services + crypto)
- Hogan Lovells (fintech regulatory)
- Nelson Mullins (crypto-focused practice)
- Katten Muchin Rosenman (strong crypto BSA practice — authored the FIN-2019-G001 analysis)

Budget: $50K–$150K for initial opinion and ongoing monthly retainer.

**Priority 2 — Obtain Written Non-MSB Legal Opinion**

Commission a formal written legal opinion covering:
- FlowLink's product architecture as non-custodial compliance middleware
- Applicability of 31 CFR § 1010.100(ff)(5)(ii)(A) to FlowLink's specific features
- Analysis of any features in the "gray zone" (compliance gateway, smart contract execution, fee collection)
- State-by-state MTL exemption analysis for top 10 states
- Specific guidance on what product features would and would not trigger MSB status

This opinion must be updated any time FlowLink adds significant new features.

**Priority 3 — Embed Regulatory Review in Product Development**

Establish a "regulatory gate" in the product development process:
- Before building any feature that involves fund flow (even tangentially), require legal sign-off
- Maintain a live "regulatory risk register" document per feature
- The distinction between "compliance decision provider" and "payment executor" must be active in every engineering architecture review

**Priority 4 — Customer Agreement Language**

Draft customer agreements that:
- Clearly define FlowLink as technology vendor, customer as regulated entity
- Require customers to represent that they hold all required licenses
- Disclaim FlowLink's participation in money transmission
- Allocate regulatory compliance responsibility to the customer
- Include indemnification from customers for their regulatory violations

**Priority 5 — FinCEN Administrative Ruling (Optional but Valuable)**

Consider submitting a request for an administrative ruling from FinCEN on FlowLink's specific business model. This is a formal process where FinCEN issues a written determination on how its regulations apply to the described facts. A favorable ruling would be:
- Definitive legal protection against FinCEN enforcement
- Highly credible due diligence artifact for institutional investors
- Public precedent benefiting the broader compliance infrastructure sector

This takes 6–18 months and costs $50K–$150K in legal fees. Worth pursuing once the product architecture is finalized.

### Near-Term (First 12 Months)

**EU Regulatory Opinion**
Engage EU counsel (Netherlands or Ireland) for an informal regulatory opinion on MiCA non-applicability to FlowLink's EU operations. Budget: €30K–€80K.

**State-by-State MTL Exemption Analysis**
For the top 15 states by customer concentration, obtain a written analysis of MTL exemption applicability. Wyoming, Texas, Montana are likely fully safe; New York and California require specific analysis.

**Ongoing Regulatory Monitoring**
FinCEN and FATF are actively developing guidance on agentic payments. FlowLink's KYA (Know Your Agent) product is in entirely uncharted regulatory territory — the first-mover advantage is real, but the first-mover regulatory risk is also real. Subscribe to FinCEN guidance updates and FATF working group publications.

### Red Flags That Would Require Immediate Legal Escalation

The following product or business model changes would require immediate re-analysis before implementation:

1. FlowLink smart contracts holding customer funds at any point
2. FlowLink requiring co-signature authority over customer wallets
3. FlowLink acting as the settlement layer for any transaction
4. FlowLink earning a percentage of transaction value (vs. flat API pricing)
5. FlowLink offering fiat on/off ramps
6. FlowLink operating its own exchange or swap functionality
7. FlowLink offering custodial wallet services to end users
8. EU-facing direct retail product (vs. B2B only)

---

## 10. Sources

### Primary Regulatory Sources

- [31 CFR § 1010.100 — General Definitions (Cornell LII)](https://www.law.cornell.edu/cfr/text/31/1010.100) — The money transmitter definition and all exemptions
- [FinCEN Guidance FIN-2019-G001 — Application of FinCEN's Regulations to Certain Business Models Involving CVCs](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models) — The comprehensive 2019 guidance
- [FinCEN Guidance FIN-2013-G001 — Application of FinCEN's Regulations to Persons Administering, Exchanging, or Using Virtual Currencies](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering) — The foundational user/exchanger/administrator framework
- [FinCEN MSB Money Services Business Definition](https://www.fincen.gov/money-services-business-definition)
- [FinCEN Administrative Ruling — Virtual Currency Software Development (FIN-2014-R002)](https://www.fincen.gov/resources/statutes-regulations/administrative-rulings/application-fincens-regulations-virtual) — Software production does not = money transmission
- [FinCEN Administrative Ruling — Merchant Payment Processor](https://www.fincen.gov/resources/statutes-regulations/administrative-rulings/definition-money-transmitter-merchant-payment) — Portal/processor not a money transmitter
- [FinCEN Administrative Ruling — Computer System Rental for Mining](https://www.fincen.gov/resources/statutes-regulations/administrative-rulings/application-money-services-business-0) — Infrastructure rental not = MSB

### MiCA / EU Sources

- [ESMA: Markets in Crypto-Assets Regulation (MiCA)](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)
- [Global Law Experts: What Is The CASP Under MiCA Regulation?](https://globallawexperts.com/what-is-the-casp-crypto-asset-service-provider-under-mica-regulation/)
- [Dechert: Application of Second Part of MiCA](https://www.dechert.com/knowledge/onpoint/2025/1/application-of-second-part-of-mica---regulation-of-casps-and-oth.html)
- [Hacken: VASP to CASP Transition Under MiCAR](https://hacken.io/discover/vasp-casp-transition-under-micar/)
- [Lawrange: VASP vs CASP and MiCA — What's the Difference](https://lawrange.net/en/vasp-vs-casp-and-mica-what-s-the-difference/)

### State MTL Sources

- [Brico.ai: Money Transmitter License Costs — Complete Fee Guide 2025](https://www.brico.ai/post/how-much-do-mtls-cost)
- [Astraea Counsel: Money Transmitter Licensing in 2025 — State-by-State Strategy for Crypto Startups](https://astraea.law/insights/money-transmitter-licensing-state-strategy-2025)
- [Astraea Counsel: Crypto Exchange License State Requirements 2025](https://astraea.law/insights/crypto-exchange-license-state-requirements-2025)
- [Hodder Law: Guide to Money Transmitter Licenses in the U.S. (Updated 2025)](https://hodder.law/hodder-laws-guide-to-money-transmitter-licenses-in-the-u-s-updated-for-2025/)
- [NY DFS: Virtual Currency Business Licensing](https://www.dfs.ny.gov/virtual_currency_businesses)

### Comparable Company Analysis

- [Notabene: VASPs — Virtual Asset Service Providers](https://notabene.id/crypto-travel-rule-101/vasps-virtual-asset-service-providers)
- [Chainalysis: The Blockchain Data Platform](https://www.chainalysis.com/)
- [Contrary Research: Chainalysis Business Breakdown](https://research.contrary.com/company/chainalysis)
- [TRM Labs: What Is a VASP?](https://www.trmlabs.com/glossary/virtual-asset-service-provider-vasp)

### Wyoming Exemption

- [LegalClarity: Wyoming Crypto Laws](https://legalclarity.org/wyoming-crypto-laws-regulations-for-digital-assets-and-banks/)
- [Gemini: Wyoming Blockchain Bills, Laws, and Regulations](https://www.gemini.com/cryptopedia/wyoming-blockchain-bill-law)

### Analysis / Secondary Sources

- [Hodder Law: FinCEN's Crypto Guidance — Who Needs to Register as an MSB?](https://hodder.law/fincen-crypto-guidance/)
- [O'Melveny: FinCEN Speaks Crypto — Extensive New Guidance for ICOs, Digital Wallets, DApps, etc.](https://www.omm.com/insights/alerts-publications/fincen-speaks-crypto-extensive-new-guidance-for-icos-digital-wallets-dapps-trading-platforms-decentralized-exchanges-and-others-in-the-blockchain-and-crypto-space/)
- [Katten: FinCEN Publishes Guidance Pertaining to Certain Business Models Involving CVCs](https://katten.com/fincen-publishes-guidance-pertaining-to-certain-business-models-involving-convertible-virtual-currencies/)
- [Faisal Khan: Agent of Payee Exemption](https://faisalkhan.com/solutions/licensing/agent-of-payee-exemption/)
- [Modern Treasury: How Do Money Transmission Laws Work?](https://www.moderntreasury.com/journal/how-do-money-transmission-laws-work)
- [InnReg: FinCEN Cryptocurrency Regulation — All You Need To Know](https://www.innreg.com/blog/fincen-cryptocurrency-regulation)

---

*This document is research and analysis, not legal advice. All structural and compliance decisions must be validated by qualified legal counsel specializing in US Bank Secrecy Act compliance and EU MiCA regulation before implementation.*
