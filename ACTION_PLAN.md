# ProofLink 90-Day Action Plan
**Created:** 2026-03-20
**Status:** Active execution plan
**Owners:** Akash (A), Cofounder [NAME TBD] (C)
**Review cadence:** Weekly Monday check-in, update this doc

---

## Critical Context

This plan synthesizes findings from five strategy documents and two independent reviews. The reviews identified fatal gaps that will kill any fundraise attempt:

1. **No product traction** -- Slide 11 has placeholders
2. **Cofounder is unnamed** -- "Building Request Finance from ground up" is not a team slide
3. **Pricing model contradicts itself** -- $0.01/tx vs 30bps = 15,000x difference on a $50K invoice
4. **No legal opinion on VASP/MSB** -- a compliance company without legal counsel is not credible
5. **x402 volume figures contradict across documents** -- 15M vs 75M vs 100M

Every action below is ordered to fix these gaps before any investor conversation happens.

---

## Week 1-2: Critical Pre-Pitch Actions (March 20 - April 2)

### W1-1: Fix Document Contradictions
**Owner:** A
**Dependency:** None
**Deliverable:** Corrected research corpus

| Fix | File | Action |
|-----|------|--------|
| x402 volume: 15M -> 75.41M (30-day) | `research/market-analysis/deep_dive.md` | Update table, add wash-trading caveat |
| AP2 status: "Live" -> "Spec stage, no live product" | `research/market-analysis/deep_dive.md` | Correct table |
| BVNK multiple: 22x -> 20x (or clarify base vs contingent) | `research/market-analysis/deep_dive.md`, `strategy/product_strategy.md` | Recalculate using $1.5B guaranteed / $90M = 16.7x or $1.8B / $90M = 20x |
| $5.4T vs $226B B2B stablecoin volume | `research/market-analysis/deep_dive.md` | Pull primary source, clarify segmentation |
| ERC-8004 49K+ self-citation | `research/erc8004/deep_dive.md` | Query on-chain registry for actual count |
| Pricing model: pick one | `strategy/product_strategy.md`, pitch deck | Decision: basis points (bps) for transaction fees, not per-tx flat rate. $0.01/tx is not viable for B2B. Use 5-30 bps consistently everywhere. |

**Acceptance:** Every number in the research corpus and strategy doc is internally consistent. No figure appears with two different values across documents.

---

### W1-2: Name the Cofounder
**Owner:** A + C
**Dependency:** None
**Deliverable:** Updated team slide with full credentials

Action items:
- [ ] Get cofounder's explicit consent to be named in all materials
- [ ] Write their bio: name, title, specific role at Request Finance (not "building from ground up"), years of experience, relevant compliance/fintech/protocol expertise
- [ ] Add to pitch deck Slide 13 with photo
- [ ] If cofounder has no compliance background, acknowledge it and plan for advisory hire (W2-2)

**Acceptance:** Team slide has two named founders with specific, verifiable credentials.

---

### W1-3: Reconcile Pricing Model
**Owner:** A + C
**Dependency:** None
**Deliverable:** Single pricing doc used everywhere

**Decision required:** The strategy doc uses 10-30 bps. The pitch deck uses $0.01/tx flat. These are irreconcilable for B2B invoices.

**Recommendation:** Adopt the bps model (aligned with BVNK, Bridge, industry standard):
- Free: OFAC screening only, 100 tx/month
- Starter: 30 bps, <$1M/month volume
- Growth: 15 bps, $1M-$10M/month
- Enterprise: 5-10 bps, $10M+/month, custom

Plus subscription tiers for compliance-as-a-service features (KYA, Travel Rule, receipts):
- Developer: $99/month (10K tx, API access, basic AML)
- Business: $499/month (100K tx, full compliance stack, ProofLink receipts)
- Enterprise: $2,000+/month (unlimited, custom rules, ERP integration, SLA)

**Then:** Update product_strategy.md Section 7, pitch deck Slide 9, and funding_strategy.md SOM model to use the same numbers. Run the unit economics: at $10M/month volume (Growth tier, 15 bps), ProofLink generates $15K/month in transaction revenue. Add subscription revenue. Subtract Notabene + TRM + infra costs. Show gross margin.

**Acceptance:** One pricing model appears identically in every document. Unit economics spreadsheet exists.

---

### W1-4: Build Unit Economics Model
**Owner:** A
**Dependency:** W1-3 (pricing decision)
**Deliverable:** Spreadsheet showing COGS per transaction

Research and estimate:
- [ ] Notabene Travel Rule API cost per transaction (contact sales or check docs)
- [ ] TRM Labs AML scoring cost per API call
- [ ] Chainalysis free SDN API limits + paid tier pricing
- [ ] IPFS pinning cost per compliance receipt (Pinata/web3.storage)
- [ ] EAS attestation gas cost on Base (estimate from recent transactions)
- [ ] Infrastructure: server/CDN/database per 1K transactions

**Output:** A table showing:
| Volume Tier | Revenue/tx | COGS/tx | Gross Margin |
|-------------|-----------|---------|-------------|
| Starter (30 bps on $1K avg tx) | $3.00 | $X.XX | XX% |
| Growth (15 bps on $50K avg tx) | $75.00 | $X.XX | XX% |
| Enterprise (7 bps on $200K avg tx) | $140.00 | $X.XX | XX% |

**Acceptance:** Gross margin is calculated and positive at every tier. If not, adjust pricing before any pitch.

---

### W2-1: Engage Fintech Attorney for VASP/MSB Opinion
**Owner:** A
**Dependency:** None (start immediately)
**Deliverable:** Legal memo confirming non-custodial classification
**Budget:** $5,000 - $15,000
**Timeline:** Engagement by end of Week 2; memo delivered by Week 4-5

Action items:
- [ ] Identify 3 fintech attorneys with VASP/MSB classification experience. Candidates:
  - Anderson Kill (crypto regulatory practice)
  - Debevoise & Plimpton (fintech/blockchain group)
  - Fenwick & West (crypto compliance)
  - A boutique like Collins Belton or Paradigm Ops (lower cost, crypto-native)
- [ ] Send 1-page architecture summary explaining non-custodial design
- [ ] Ask for written opinion on: (a) MSB classification risk under FinCEN, (b) VASP classification under MiCA, (c) whether ProofLink's middleware position triggers MTL requirements in any US state
- [ ] Request the memo in a format suitable for sharing (redacted) with investors

**Acceptance:** Written legal opinion from a qualified attorney stating ProofLink's non-custodial architecture does or does not trigger MSB/VASP classification. If it does trigger, the memo includes a remediation path.

---

### W2-2: Approach Compliance Advisor Candidates
**Owner:** A + C
**Dependency:** None
**Deliverable:** 1 named compliance advisor on the team slide by Week 4

Target profiles (pick 3, approach all):
- [ ] Former FinCEN official or examiner
- [ ] ACAMS board member or certified CAMS professional
- [ ] Chief Compliance Officer at a regulated crypto firm (Coinbase, Circle, Kraken alumni)
- [ ] FATF Virtual Assets Contact Group participant
- [ ] Big 4 partner from their crypto/blockchain advisory practice

Approach:
1. Warm intro via LinkedIn, crypto conferences, or YC/accelerator networks
2. Offer: Advisory board seat, token equity (0.25-0.5%), quarterly time commitment
3. What they get: early positioning in the agent compliance space, which will be their next career chapter

**Acceptance:** At least one named compliance advisor has agreed to be listed on the team slide with their title and credentials.

---

### W2-3: Add TRM Labs to Competitive Matrix
**Owner:** A
**Dependency:** None
**Deliverable:** Updated competitor analysis

The strategy review flagged TRM Labs as the "sleeper threat" -- closer to ProofLink's architecture than Chainalysis. The research corpus has zero TRM Labs analysis.

- [ ] Research TRM Labs product roadmap, pricing, API capabilities, investor base
- [ ] Add TRM Labs row to feature matrix in `strategy/product_strategy.md` Section 3.1
- [ ] Add TRM Labs to `research/competitors/deep_dive.md`
- [ ] Write the specific answer to "why can't TRM Labs just add this?" for investor Q&A prep

**Acceptance:** TRM Labs appears in the competitive matrix. The differentiation argument is documented.

---

### W2-4: Prepare for ETHGlobal Cannes (April 3-5)
**Owner:** A (build) + C (demo prep)
**Dependency:** Existing v0 product at v0-prooflink.vercel.app
**Deliverable:** Hackathon-ready compliance middleware demo

Build targets (in priority order):
1. [ ] Circle Compliance Engine integration into ProofLink pipeline
2. [ ] Self Protocol KYC proof verification for agent identity
3. [ ] Live OFAC screening demo with real SDN address (Tornado Cash contract)
4. [ ] Auto-generated compliance receipt (JSON + PDF)
5. [ ] x402 payment flow: agent pays -> ProofLink screens -> approve/block -> receipt

Prize targets: Circle track ($10K), Self Protocol track ($10K), World track ($20K if World ID added)

Demo script: Follow the 3-minute script from hackathon_strategy.md Part 5.

**Acceptance:** Working demo on Base Sepolia showing: (1) sanctioned address blocked in <500ms, (2) clean address approved with compliance receipt, (3) invoice generated with line items.

---

## Week 3-4: Build Phase 1 (April 3 - April 16)

### W3-1: Ship x402 Compliance Middleware (MVP)
**Owner:** A
**Dependency:** W2-4 (hackathon builds feed into this)
**Deliverable:** Open-source `prooflink-sdk` on GitHub + commercial ProofLink API

The hackathon builds (Cannes, Berlin) produce working integrations. Productize them:

- [ ] Extract reusable middleware from hackathon code
- [ ] Create `prooflink-sdk` npm package:
  - `screenSanctions(address)` -- OFAC/EU/UN/HMT screening
  - `verifyKYA(agentDID)` -- ERC-8004 registry lookup + credential check
  - `checkTravelRule(originator, beneficiary, amount)` -- jurisdiction threshold check
  - `issueReceipt(txHash, checksPerformed)` -- compliance receipt generation
- [ ] Deploy ProofLink API on Base mainnet (not just testnet)
- [ ] Process at least 100 real transactions on mainnet
- [ ] Write API documentation (OpenAPI spec)

Open-source strategy: SDK wrapper is open (MIT license). ProofLink Engine API is commercial (API key required, free tier available).

**Acceptance:** `prooflink-sdk` is published on npm and GitHub. ProofLink API is live on Base mainnet. 100+ transactions processed. API docs are published.

---

### W3-2: Publish KYA Standard Draft on GitHub
**Owner:** A (schema design) + C (documentation)
**Dependency:** None
**Deliverable:** `prooflink-kya-standard` GitHub repo with draft spec

Contents:
- [ ] KYA Verifiable Credential schema (W3C VC format, as specified in product_strategy.md Section 5.3)
- [ ] Agent Invoice Standard schema (JSON-LD, as specified in product_strategy.md Section 5.4)
- [ ] README explaining the problem, the standard, and how to implement
- [ ] Reference implementation in TypeScript
- [ ] Submit as draft ERC/EIP (optional but high-signal)
- [ ] Cross-post announcement to W3C Credentials Community Group mailing list

**Why now:** The Ethereum Foundation ESP grant requires open-source outputs. Publishing the KYA standard unlocks the EF grant application. It also establishes standards-authorship positioning before any competitor.

**Acceptance:** Public GitHub repo with the KYA standard. At least one external reference (forum post, social media, W3C mailing list).

---

### W3-3: Create ProofLink MCP Server Prototype
**Owner:** A
**Dependency:** W3-1 (ProofLink API must be live)
**Deliverable:** MCP server exposing compliance tools

The innovation map ranks this #1 (composite score 900). Build time estimate: 4-6 weeks. Start in Week 3.

MCP server exposes these tools:
- `screen_sanctions(agent_id, counterparty_address)` -> pass/fail + details
- `verify_kya(agent_did, principal_did)` -> credential status
- `check_travel_rule(originator, beneficiary, amount, jurisdiction)` -> compliant/non-compliant
- `issue_compliance_receipt(tx_hash, checks_passed)` -> receipt ID + IPFS hash
- `verify_receipt(receipt_id)` -> receipt contents + verification status

**Why this matters:** Zero MCP compliance servers exist. Every AI agent using MCP can add compliance as a tool call. This is the lowest-friction distribution channel possible.

**Acceptance:** MCP server is deployed and callable by any MCP-compatible AI agent. At least one demo showing an AI agent calling `screen_sanctions()` before executing a payment.

---

### W4-1: Set Up EAS Compliance Receipt Schema
**Owner:** A
**Dependency:** W3-1 (need transaction data to attest)
**Deliverable:** EAS schema deployed on Base, receipts being issued

Design the schema:
```
{
  txHash: bytes32,
  screenerAddress: address,       // ProofLink's attester
  sanctionsLists: string[],       // ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED"]
  sanctionsResult: bool,          // true = cleared
  amlRiskScore: uint8,            // 0-100
  kya: {
    agentId: string,              // ERC-8004 reference
    principalVerified: bool,
    delegationScope: string       // hash of delegation parameters
  },
  travelRule: {
    transmitted: bool,
    counterpartyVASP: string,
    ivms101Hash: bytes32          // hash of IVMS101 data bundle
  },
  jurisdictionsApplied: string[], // ["US", "EU"]
  timestamp: uint64,
  receiptIPFS: string             // IPFS CID of full receipt document
}
```

Action items:
- [ ] Register schema on EAS (Base deployment)
- [ ] Build attestation issuance into ProofLink Engine pipeline
- [ ] Pin full receipt document to IPFS (Pinata or web3.storage)
- [ ] Commit schema hash on-chain with each attestation
- [ ] Build receipt verification endpoint: given a receipt ID, return the full compliance proof

**Acceptance:** EAS schema is deployed. At least 10 compliance receipts are issued as on-chain attestations. A third party can verify any receipt without contacting ProofLink.

---

### W4-2: Enter Agentic Commerce Hackathon Berlin (April 10-12)
**Owner:** A + C
**Dependency:** W3-1 (x402 facilitator must work)
**Deliverable:** ProofLink as production x402 facilitator for Algorand

Build targets:
- [ ] x402 facilitator server routing through ProofLink Engine
- [ ] Algorand-native payment flow (ARC-0060 or Algorand x402)
- [ ] Travel Rule compliance: automatic originator/beneficiary data transmission
- [ ] Real-time screening dashboard

**Acceptance:** Working demo showing Algorand x402 payment blocked/approved by ProofLink compliance middleware.

---

### W4-3: Identify Design Partner Candidates
**Owner:** C
**Dependency:** W3-1 (need a working product to show)
**Deliverable:** 5-10 warm conversations with potential design partners

Target profiles:
- Mid-market crypto companies processing $5M-$50M/month in cross-border stablecoin payments
- VASPs that need Travel Rule compliance and are currently using manual processes
- DeFi protocol treasuries (MakerDAO, Uniswap Foundation, Compound) managing large stablecoin holdings
- Web3 payroll companies (similar to what Request Finance serves)

Approach:
1. [ ] List 20 companies matching the ICP from the research corpus
2. [ ] Warm intro via hackathon connections, x402 community, Base ecosystem
3. [ ] Offer: free compliance middleware for 3 months in exchange for feedback + logo rights + willingness to be named in deck
4. [ ] Goal: 1 signed design partner LOI by Week 8

**Acceptance:** 5+ conversations initiated. At least 2 companies actively testing ProofLink.

---

## Week 5-8: Hackathon & Distribution (April 17 - May 14)

### W5-1: Enter ETHGlobal Open Agents (April 24 - May 6)
**Owner:** A
**Dependency:** W3-3 (MCP server), W4-1 (EAS receipts)
**Deliverable:** Agent-to-agent compliance demo using MCP

This is an async/online hackathon. Use it to refine the A2A compliance demo:
- [ ] Two AI agents transacting via x402
- [ ] Both agents call ProofLink MCP server for compliance checks before payment
- [ ] Compliance receipts issued as EAS attestations
- [ ] Show the full flow: agent negotiation -> compliance check -> payment -> receipt -> invoice

**Acceptance:** Submitted project with working demo video and live deployment.

---

### W5-2: Apply to Base Batches 2026
**Owner:** A + C
**Dependency:** W3-1 (live product on Base mainnet with real transactions)
**Deliverable:** Submitted application

Requirements checklist:
- [ ] ProofLink live on Base mainnet with 100+ transactions (from W3-1)
- [ ] Open-source GitHub repo with clean README
- [ ] 2-minute video: problem statement, live demo, architecture, why Base
- [ ] Pitch deck (updated with all fixes from Week 1-2)
- [ ] Written description: "ProofLink is the compliance infrastructure that makes x402 safe for enterprise adoption"

If the startup track deadline (March 9) has passed:
- [ ] Contact Base team directly about late application or next cohort
- [ ] Apply to student track if applicable (deadline April 27)
- [ ] Monitor basebatches.xyz for next cycle announcement

**Acceptance:** Application submitted. If deadline passed, direct outreach to Base team completed.

---

### W6-1: Ship Developer Documentation
**Owner:** A
**Dependency:** W3-1, W3-2, W3-3 (all products must be functional)
**Deliverable:** docs.prooflink.dev (or equivalent)

Contents:
- [ ] Quick Start: screen your first transaction in 5 minutes
- [ ] API Reference: OpenAPI spec for ProofLink API
- [ ] SDK Reference: prooflink-sdk TypeScript documentation
- [ ] MCP Server: how to add compliance to your AI agent
- [ ] KYA Standard: specification + reference implementation guide
- [ ] EAS Receipts: how to verify compliance attestations
- [ ] Integration guides: x402, ACP, AP2, MPP (as available)

**Acceptance:** A developer can go from zero to screening their first transaction in under 10 minutes using only the documentation.

---

### W6-2: Apply to Grant Programs (Batch 1)
**Owner:** C (applications) + A (technical descriptions)
**Dependency:** W3-2 (KYA standard published), W3-1 (live product)

| Grant | Amount | Action | Deadline |
|-------|--------|--------|----------|
| Ethereum Foundation ESP | $10K-$50K | Apply with KYA standard as open-source public good | Rolling |
| Base Builder Grant (retroactive) | 1-5 ETH | Apply with ProofLink Engine live on Base | Rolling |
| Base Weekly Builder Rewards | 2 ETH/week | Post weekly demos of ProofLink processing x402 | Ongoing |
| CDP Builder Grants | $3K-$10K | Apply with x402 facilitator using CDP infrastructure | Monitor for cycle |

**Acceptance:** At least 2 grant applications submitted. Weekly builder rewards submissions started.

---

### W7-1: Get First Design Partner (Signed LOI)
**Owner:** C
**Dependency:** W4-3 (candidate pipeline), W3-1 (working product)
**Deliverable:** One signed Letter of Intent from a design partner

The LOI should state:
- Company name and what they do
- They are evaluating/using ProofLink for compliance on stablecoin payments
- They are willing to be referenced in investor materials
- Timeline: 90-day pilot, no cost

**Why this is the #1 priority for fundraising:** The strategy review states "One live customer, fully named, with real transaction volume" is worth more than all the market research combined. A single design partner LOI converts the pitch from concept to product.

**Acceptance:** Signed LOI from one named company. Their name goes on the traction slide.

---

### W8-1: ETHGlobal New York Prep (June 12-14)
**Owner:** A + C
**Dependency:** All prior work
**Deliverable:** Production-grade demo plan

By ETHGlobal NYC, ProofLink should have:
- 2+ months of live transaction data
- At least one design partner
- API documentation published
- MCP server operational
- KYA standard published

NYC build target: FATF Travel Rule automation + ERP integration
- [ ] Automatic Travel Rule data transmission for x402 payments over $3K
- [ ] QuickBooks/Xero invoice export from compliance records
- [ ] Multi-protocol support demo: x402 + ACP
- [ ] Live production transactions (not testnet)

**Acceptance:** Demo plan finalized. All NYC build targets have clear technical specs.

---

## Week 9-12: Pre-Seed Fundraise Prep (May 15 - June 18)

### W9-1: Finalize Pitch Deck
**Owner:** A + C
**Dependency:** All prior fixes (W1-1 through W7-1)
**Deliverable:** 15-slide pitch deck ready for investor meetings

Slide-by-slide fixes from strategy review:

| Slide | Fix Required |
|-------|-------------|
| 1 (Title) | Replace tagline with: "The compliance layer that makes AI agent payments legal" |
| 2 (Problem) | Remove $600M annualized x402 figure (contradicts $28K/day reality). Lead with "Would you let an AI agent spend your company's money without an invoice?" |
| 3 (Regulatory) | Add: "59% of jurisdictions with Travel Rule laws have issued zero enforcement actions -- the fine wave is coming" |
| 4 (Market) | Fix TAM: state as revenue opportunity ($390M SAM at 15bps of $260B), not volume. Remove $150T figure. |
| 5 (Competitive) | Add TRM Labs, Notabene, thirdweb. Remove Superfluid/Sablier. |
| 9 (Business Model) | Use reconciled bps pricing. Show unit economics. |
| 11 (Traction) | Replace ALL placeholders with: real tx count, hackathon wins, design partner name, API calls, GitHub stars |
| 13 (Team) | Named cofounder + compliance advisor + Akash's full credentials |
| 14 (The Ask) | Decide: pre-seed ($500K-$1.5M) at $5M-$10M post-money SAFE |
| 15 (Vision) | End with acquisition narrative: "Mastercard paid $1.8B for BVNK. The next $1B+ acquisition goes to the company that owns agent payment compliance." |

New slide to add:
- **Unit economics slide** between Business Model and GTM: "At $10M/month volume, ProofLink generates $X in revenue. Cost of revenue: $Y. Gross margin: Z%."

**Acceptance:** Deck has zero placeholders. Every number is sourced and internally consistent. The deck has been presented to 3 friendly/advisor audiences for feedback before any VC meeting.

---

### W9-2: Build VC Target List and Warm Intro Pipeline
**Owner:** C
**Dependency:** None (start building relationships now, formalize in Week 9)
**Deliverable:** Ranked list of 20 target investors with intro paths

**Tier 1 -- Pre-seed leads (approach first):**
| VC | Why | Check Size | Intro Path |
|----|-----|-----------|------------|
| Haun Ventures | Backed BVNK + Bridge, exact thesis match | $500K-$2M | x402 ecosystem, hackathon sponsors |
| Coinbase Ventures | Strategic, x402 ecosystem | $250K-$1M | Base Batches, CDP community |
| Dragonfly Capital | $650M fresh fund, payments infra focus | $500K-$2M | Crypto conferences, portfolio founders |
| Circle Ventures | USDC compliance infra, Circle grant pipeline | $250K-$750K | Circle grant program -> Ventures |

**Tier 2 -- Pre-seed participants:**
| VC | Why | Check Size | Intro Path |
|----|-----|-----------|------------|
| Pantera Capital | "Crypto as a service" thesis | $250K-$1M | Fintech networks |
| Base Ecosystem Fund | Direct Base builder | $50K-$250K | Base Batches Demo Day |
| Galaxy Ventures | Crypto infrastructure | $250K-$1M | Conference circuit |

**Tier 3 -- Angels:**
- Ex-BVNK founders (Jesse Hemson-Struthers, Donald Jackson)
- Ex-Bridge founders (Zach Abrams, Sean Yu)
- Compliance leaders from Coinbase, Circle, Kraken

**Action:** For each target, identify the specific person to contact and the warmest intro path. One spreadsheet, updated weekly.

**Acceptance:** 20 targets listed. At least 5 have identified warm intro paths. At least 3 intros requested.

---

### W10-1: Apply to Grant Programs (Batch 2)
**Owner:** C
**Dependency:** W6-2 results, live product metrics
**Deliverable:** Additional grant applications submitted

| Grant | Amount | Status | Action |
|-------|--------|--------|--------|
| Circle Developer Grant | $5K-$100K | Monitor for Q2 2026 reopening | Submit application the day it opens |
| Optimism RetroPGF | Variable | Need usage metrics first | Prepare submission for Q3 |
| Uniswap Foundation | Variable | DeFi compliance angle | Research applicability |

**Acceptance:** Circle grant application ready to submit. RetroPGF submission drafted.

---

### W10-2: Skyfire Competitive Deep Dive
**Owner:** A
**Dependency:** None
**Deliverable:** Dedicated analysis document

The research review flagged Skyfire as "the single most important missing competitive deep dive." Skyfire has a16z CSX backing, KYAPay protocol, and direct overlap with ProofLink's KYA positioning.

- [ ] Document Skyfire's product, pricing, technical architecture, investor base
- [ ] Identify specific differentiation: ProofLink = compliance-specific, portable, cross-protocol. Skyfire = access-control, x402-only.
- [ ] Write the investor Q&A answer for "how are you different from Skyfire?"
- [ ] Add to `research/competitors/` directory

**Acceptance:** Investor-ready Skyfire competitive analysis exists. The differentiation argument is crisp.

---

### W11-1: Prepare Investor Q&A Document
**Owner:** A + C
**Dependency:** All prior work
**Deliverable:** Written answers to the 7 killer questions from the strategy review

| Question | Answer Required |
|----------|----------------|
| "Who is your first paying customer and what are they paying?" | Design partner name + what they're using + what they'll pay post-pilot |
| "Walk me through the exact flow when a sanctions match happens" | Step-by-step: detection -> block -> structured rejection -> audit record -> SAR preparation path -> human-in-the-loop |
| "Why will Chainalysis keep selling you data at a price that lets you undercut them?" | Multi-vendor strategy, free OFAC API baseline, TRM Labs as alternative, ChainAware as fallback. We are distribution for their data, not competition. |
| "What if ERC-8004 registry gets exploited?" | KYA credentials are one input, not sole input. Multi-factor: ERC-8004 + DID resolution + behavioral scoring. Registry exploit = credential revocation, not system failure. |
| "Who at FATF/FinCEN have you spoken to?" | [Must have honest answer by Week 11. If no engagement: "We've published the KYA standard as an open spec and submitted it to W3C. Regulatory engagement is our Q3-Q4 priority, starting with a comment letter to FinCEN on agent payment classification."] |
| "What stops Coinbase from adding compliance to AgentKit?" | ProofLink is cross-protocol (x402 + MPP + AP2 + ACP). Coinbase only covers x402. Coinbase's compliance covers Coinbase ecosystem; ProofLink covers everything else. The open KYA standard creates ecosystem lock-in Coinbase's proprietary solution cannot match. |
| "Why are you the people to build this?" | [Craft specific answer: Akash's ML/systems background at CERN/vLLM + Cofounder's Request Finance experience + compliance advisor's regulatory credentials = the team that understands both the protocol engineering and the compliance requirements] |

**Acceptance:** Written, rehearsed answers for all 7 questions. Both founders can deliver each answer in under 60 seconds.

---

### W11-2: Research YC Fall 2026 Batch
**Owner:** C
**Dependency:** None
**Deliverable:** YC application strategy document

- [ ] Confirm Fall 2026 application timeline (typically opens March-April for fall)
- [ ] YC now offers $500K in USDC -- verify terms (7% equity?)
- [ ] Draft application: 1-minute video, written responses
- [ ] Identify YC alumni in the x402/stablecoin/compliance space for mock interviews

**Acceptance:** YC Fall 2026 application timeline confirmed. Draft application started.

---

### W12-1: Begin Pre-Seed Outreach
**Owner:** A + C
**Dependency:** W9-1 (deck), W9-2 (target list), W11-1 (Q&A prep)
**Deliverable:** First 5 investor meetings scheduled

**Before any meeting, mandatory minimums (from strategy review):**
1. Every placeholder on Slide 11 replaced with real numbers -- DONE (via W9-1)
2. Cofounder named with credentials -- DONE (via W1-2)
3. Legal opinion on VASP/MSB classification -- DONE (via W2-1)
4. Pricing model reconciled -- DONE (via W1-3)
5. One design partner LOI -- DONE (via W7-1)

**Outreach sequence:**
1. Week 12: Send warm intros to Haun Ventures, Coinbase Ventures, Dragonfly
2. Week 12: Send cold but researched outreach to Pantera, Galaxy
3. Week 12: Approach angel investors (ex-BVNK/Bridge founders)
4. Week 13+: First meetings (outside this 90-day plan)

**Acceptance:** 5 investor meetings scheduled for Week 13-14.

---

### W12-2: ETHGlobal New York Execution (June 12-14)
**Owner:** A + C
**Dependency:** All prior work
**Deliverable:** Hackathon submission with production-grade demo

Go to NYC with:
- Live transaction data (2+ months)
- Named design partner
- Published API docs + SDK
- MCP server operational
- KYA standard published
- FATF Travel Rule automation demo
- Multi-protocol support (x402 + at least one other)

This is the culmination hackathon. Win here and the pre-seed story writes itself.

**Acceptance:** Top 10 finalist at ETHGlobal NYC, or win at least one sponsor track.

---

## Dependency Graph

```
Week 1-2 (Foundations)
  W1-1 Fix contradictions -----> All documents
  W1-2 Name cofounder ---------> W9-1 Pitch deck
  W1-3 Pricing model ----------> W1-4 Unit economics -> W9-1 Pitch deck
  W2-1 Legal opinion ----------> W11-1 Q&A prep -> W12-1 Outreach
  W2-2 Compliance advisor -----> W9-1 Pitch deck (team slide)
  W2-4 Cannes prep ------------> W3-1 x402 middleware

Week 3-4 (Build)
  W3-1 x402 middleware ---------> W3-3 MCP server -> W5-1 Open Agents
  W3-1 x402 middleware ---------> W4-1 EAS receipts
  W3-2 KYA standard -----------> W6-2 Grant applications (EF ESP)
  W4-3 Design partners --------> W7-1 Signed LOI -> W9-1 Pitch deck

Week 5-8 (Distribution)
  W5-2 Base Batches ------------> Demo Day exposure
  W6-1 Developer docs ----------> Developer adoption
  W7-1 Design partner LOI -----> W12-1 Investor outreach (mandatory)

Week 9-12 (Fundraise Prep)
  W9-1 Pitch deck + W9-2 VC list + W11-1 Q&A -> W12-1 Outreach
```

---

## Parallel Opportunities

These can be executed concurrently without blocking:

**Track 1 (Akash): Engineering**
- W2-4/W3-1: Build x402 middleware + hackathon entries
- W3-3: MCP compliance server
- W4-1: EAS receipt schema
- W6-1: Developer documentation

**Track 2 (Cofounder): Business Development + Operations**
- W1-2: Bio and team slide
- W2-2: Compliance advisor outreach
- W4-3/W7-1: Design partner pipeline and LOI
- W5-2: Base Batches application
- W6-2/W10-1: Grant applications
- W9-2: VC target list and warm intros

**Track 3 (Both): Strategic**
- W1-1: Fix document contradictions (A leads, C reviews)
- W1-3: Pricing decision (joint)
- W2-1: Legal engagement (A leads)
- W9-1: Pitch deck finalization (joint)
- W11-1: Q&A rehearsal (joint)

---

## Risk Mitigation Actions Not in the Timeline

These are strategic items flagged by the reviews that should be addressed as capacity allows:

| Item | Priority | When |
|------|----------|------|
| Stress-test: what if A2A is 3 years away, not 12 months? | High | Before first VC meeting. Write 1-page scenario showing H2H alone supports $2-3M ARR by Year 2. |
| Skyfire competitive deep dive | High | W10-2 (scheduled above) |
| Answer: "What if regulators DON'T enforce for agents?" | High | Before first VC meeting. Write the "ProofLink creates value even without enforcement" argument. |
| Primary customer interviews (5-10) | Medium | Ongoing through W4-3 and W7-1 pipeline |
| Singapore/UAE/HK regulatory research | Medium | Post-fundraise |
| MoonPay Agents analysis | Low | Post-fundraise |
| Circle Refund Protocol technical analysis | Low | When building dispute resolution (Month 6+) |
| DeFi treasury customer segment analysis | Low | When expanding ICP |

---

## Success Metrics at Day 90

| Metric | Target | Status |
|--------|--------|--------|
| Transactions processed (mainnet) | 1,000+ | |
| Design partner LOIs signed | 1+ | |
| Hackathon prizes won | 2+ tracks across events | |
| Grant money received/approved | $20K+ | |
| Legal opinion obtained | Yes | |
| Compliance advisor on team | Yes | |
| KYA standard published (GitHub) | Yes | |
| MCP server live | Yes | |
| EAS receipts being issued | Yes | |
| Investor meetings scheduled | 5+ | |
| Pitch deck: zero placeholders | Yes | |
| All document contradictions fixed | Yes | |

---

## What This Plan Does NOT Cover

- Product decisions beyond MVP (cross-protocol router, behavioral AML, SAR generation -- these are Month 6+ per the innovation map sequencing)
- Hiring plan (comes after pre-seed closes)
- Regulatory licensing applications (MiCA CASP, FCA -- comes after legal opinion and revenue justify the cost)
- Series A preparation (18 months out)
- Token strategy (deliberately avoided per funding strategy recommendations)

---

*This is a living document. Update weekly at Monday check-in.*
*Created: 2026-03-20 by Action Items Agent*
*Sources: strategy_review.md, research_review.md, product_strategy.md, innovation_map.md, funding_strategy.md, hackathon_strategy.md*
