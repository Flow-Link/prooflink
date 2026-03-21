# FlowLink Hackathon Strategy

**Research Date:** 2026-03-20
**Status:** Actionable — first target (ETHGlobal Cannes) is 2 weeks away

---

## Part 1: What x402 Hackathon Winners Actually Did

### SF Agentic Commerce x402 Hackathon (Feb 11-13, 2026 — $50K prize)

**Sponsors:** SKALE, Google, Coinbase, Virtuals, Edge & Node, Vodafone

**Winners:**
- 1st (SKALE Track): World of Geneva — AI agents autonomously playing an MMORPG with real x402 transactions
- 1st (Coinbase Track): Superpage — infrastructure for AI agents in real-world commerce
- 1st (Google Track): RequestTap — open-source x402 router for AI agents
- 1st (Virtuals Track): Moltbet — prediction market infrastructure for autonomous agents
- 2nd (SKALE Track): Pixie
- 2nd (Overall): Legasi — credit + reputation layer for AI agents (credit lines, x402 payments, yield on idle funds, on-chain reputation)

**Judging criteria:**
1. Partner/protocol integration depth
2. Agentic sophistication — did agents actually make autonomous decisions?
3. Commerce realism — does real money move in a real flow?
4. Polish and ship-ability — could this go to production?

**Key signal:** "Builders are ready to ship real, working prototypes." Judges valued execution and tangible demos over concepts.

### Cronos x402 PayTech Hackathon (Jan 2026 — $42K prize, 191 submissions)

**Winners:**
- 1st ($24K): AgentFabric — "connective tissue" framework for agents to move capital with zero friction via scoped, programmable permissions
- 2nd ($5K): Cronos Shield — automated risk management engine for agent-driven transactions
- Best Crypto.com Integration ($3K): Faktory — AI-native treasury managing invoices and yield, praised for "polish of a premium fintech experience"
- Best Dev Tooling ($3K): x402 Intent Firewall — sanity-check layer filtering malicious intents before payment execution, "production-ready"
- AI Finance: SoulForge Market — AI agents interacting with financial markets in real time

**Critical pattern:** The judges explicitly valued projects addressing infrastructure safety, risk management, and production-readiness. Not gimmicks — real guardrails.

**Faktory is the closest analog to FlowLink that has won.** It won $3K for the integration category despite being a direct product fit. FlowLink is a more complete, protocol-agnostic version of that idea.

### Coinbase Agents in Action Hackathon

**Winners included:** Decentralized payroll systems, protocol fee routers, pay-per-use marketplaces.

**Tracks:** x402 + CDP Wallet + AgentKit; partner tracks from AWS, Akash, Pinata.

**Takeaway:** Coinbase consistently rewards projects that build compliance/financial infrastructure for real business use cases, not demos.

### What Made Winners Win — Pattern Synthesis

1. **Real transactions happened.** Not simulated. Actual USDC moved on testnet/mainnet during the demo.
2. **Solved a specific gap in x402** rather than "using x402." Winners identified what x402 doesn't do (safety, compliance, routing, invoicing) and filled it.
3. **Infrastructure > applications.** Dev tooling and compliance layers won over consumer apps. The x402 Intent Firewall won on tooling alone.
4. **Production framing.** Winners talked like they were about to deploy, not about to delete their repo.
5. **Specificity in naming.** AgentFabric, Legasi, Faktory — tight names for tight problem statements. No generic "PaymentAgent" projects won.

---

## Part 2: ETHGlobal Winning Patterns

### 2025-2026 Pattern Analysis

**Buenos Aires 2025 ($500K pool):** Payment winner — Paybot. Built x402 Payment Required for physical device access (robot rental) with QUSD stablecoin, zero gas via CDP.

**Cannes 2025:** Beam Pay — single-transaction ERC20 + metadata payments via EIP-7702 with multi-chain support.

**New York 2025:** Winners covered gaming, payments, DeFi, dev tools. Cross-chain and AI integration were dominant themes.

**Common thread in payment winners:**
- Used the sponsor's exact protocol/tool as the primary integration, not as an afterthought
- Demonstrated an end-to-end user flow (not just a smart contract)
- Added a novel UX insight (gasless, single-tx, QR code) that made the demo visually compelling
- Solved a real pain point (gas friction, cross-border fees, trust in autonomous transactions)

**ETHGlobal judges consistently note:** Projects that win multiple sponsor prizes (not just one) are disproportionately likely to win overall finalists. The strategy is to be genuinely relevant to 3-4 sponsors, not marginally relevant to all 29.

---

## Part 3: Base Batches 2026 — The Accelerator Path

**Program structure:**
- 6 global buildathons (regions: North America, India, others TBD)
- Demo Day in San Francisco (late May 2026)
- 10 finalists per buildathon
- Top teams: $10K grant + 8-week virtual incubator + $50K investment from Base Ecosystem Fund

**What Base is looking for:**
- Onchain apps with actual Base mainnet transactions (1+ required at submission)
- Consumer apps, DeFi protocols, AI agents, mini-apps — all valid
- Pre-product/pre-seed stage preferred (raised < ~$250K)
- Strong founder-market fit even without existing product

**FlowLink fit:** Extremely strong. Base's x402 integration with Coinbase CDP means compliance infrastructure on Base is directly in scope. The fact that FlowLink already has a live product (v0-flowlink.vercel.app) with real sanctions screening differentiates it from pre-product entrants.

**Submission requirements:**
- Functioning onchain app at public URL
- Open-source GitHub repo
- 1-minute minimum video (intro, demo, problem, solution, architecture)
- Proof of deployment with 1+ transactions on Base mainnet

**Deadline:** Startup track deadline was March 9 (may have passed). Student track: April 27. Confirm current status at basebatches.xyz.

---

## Part 4: What Judges Look For in Payment Infrastructure

### The Four Hard Requirements (across all observed competitions)

1. **Working demo with real transactions.** Pre-funded wallets, fast testnet, no waiting. If the transaction takes 45 seconds during the demo, you lose the room. Use SKALE (gasless, instant) or Base (fast + gasless via Paymaster).

2. **Novel use of the core protocol.** Winners don't just "integrate x402" — they expose a specific gap and fill it. FlowLink's gap: compliance, auditability, and invoicing that x402 explicitly excludes.

3. **Business viability.** Judges ask: "Could a real company pay for this?" FlowLink's CFO-targeting and ProofLink Engine branding answers this immediately.

4. **Technical sophistication.** Not complexity theater. Sophistication means: the system makes correct decisions under adversarial conditions (sanctioned address, malformed payment, agent identity fraud). Live sanctions screening scores on this.

### Compliance Specifically

The Chainlink Convergence hackathon has an explicit **Risk & Compliance track** ($16K first prize). The stated focus: "monitoring, safeguards, and automated controls across onchain systems including risk detection, reserve verification, and automated responses based on real-world or blockchain conditions."

AnChain.AI demonstrated the value of compliance in x402 specifically: sub-200ms OFAC/FATF screening, audit trail generation, high-risk wallet detection. This is the exact capability FlowLink's ProofLink Engine provides.

**The compliance demo moment that wins:** Show a payment attempt from a sanctioned OFAC wallet. Show it blocked in real time with a structured audit record. Then show the same payment from a clean wallet going through instantly. That 20-second sequence communicates everything judges need.

---

## Part 5: Demo Strategy for FlowLink

### The 3-Minute Demo Script (backward-built)

**Ending moment (what judges remember):** An AI agent attempts to pay a sanctioned wallet. FlowLink intercepts it in real time, blocks it with a structured compliance record, and the agent receives a 402 rejection with embedded compliance reason code. The CFO gets an automatic audit log. Total elapsed time from agent initiation to block: under 500ms.

**Structure:**

```
00:00-00:20 — Hook (problem statement)
  "An AI agent just tried to wire $50K to a sanctioned entity.
   Your x402 server approved it. Your CFO found out from the regulators."

00:20-00:45 — The gap
  "x402 delivers payments. It doesn't check who you're paying.
   No compliance. No audit trail. No invoices your CFO can sign off on.
   That's not a fintech product — that's a liability."

00:45-01:30 — Live demo sequence
  [Screen: Agent sends x402 payment request]
  [Screen: FlowLink intercepts — OFAC screen in 180ms — BLOCKED]
  [Screen: Structured compliance record with flagged entity, reason, timestamp]
  [Screen: Clean wallet sends same payment — APPROVED in 210ms]
  [Screen: Auto-generated invoice with line items, VAT, ERP-compatible export]

01:30-02:00 — Technical depth
  "FlowLink sits between your x402 server and any facilitator.
   ProofLink Engine runs OFAC, FATF Travel Rule, AML monitoring.
   Protocol-agnostic: x402, ACP, AP2 — we wrap any agentic payment standard."

02:00-02:30 — Traction + vision
  "Live at v0-flowlink.vercel.app. [X] screened transactions.
   The agentic economy moves $600M/year today. Zero of it has compliance infrastructure.
   We're building the trust layer before the regulators mandate it."

02:30-03:00 — Ask / closing
  [Adapt per hackathon: "We're targeting [sponsor] track because..."
   or "We're raising a pre-seed round."]
```

### Making Compliance Visually Compelling

1. **Use a real sanctioned address.** OFAC publishes the SDN list. Pre-load a known SDN wallet (e.g., Tornado Cash contract address). When the screen shows "BLOCKED — SDN Match: 0x..." it's immediately credible.

2. **Show the audit trail.** A JSON/PDF export with: timestamp, screened addresses, screening result, risk score, transaction hash. This is what a CFO actually needs. No other x402 demo shows this.

3. **Make the agent visible.** Use a terminal-style UI showing the agent's decision process. When FlowLink blocks the payment, show the agent receiving the structured 402 rejection and adapting (e.g., selecting an alternative payee). This demonstrates agentic depth — not just "compliance happened" but "the agent understood and responded."

4. **Speed is the proof.** Show a clock. Sub-200ms screening. Judges come from TradFi where compliance checks take hours. Real-time screening on every transaction is genuinely novel.

### Anti-Patterns to Avoid

- Do not demo with `localhost`. Use a public URL with a deployed backend.
- Do not use Metamask prompts that require manual confirmation. Use smart wallets (CDP Wallet, EIP-4337) for single-click approval.
- Do not explain how sanctions screening works in theory. Show it happen.
- Do not show a loading spinner during compliance checks. Pre-warm the API.
- Do not use testnet USDC with a request for "imaginary" approval. Use Base Sepolia with the Paymaster to show gasless flow — it feels more real.

---

## Part 6: Upcoming Hackathons — Ranked by FlowLink Fit

### Tier 1: Must Enter

#### 1. ETHGlobal Cannes — April 3-5, 2026
**Prize pool:** $311,500+ across 29 sponsor tracks
**Location:** Cannes, France (IRL)
**FlowLink-relevant tracks:**
- Circle ($10K) — Compliance Engine for Smart Wallets + USDC multichain payments
- Self Protocol ($10K) — KYC/AML proofs on Celo (FlowLink's agent identity layer)
- World ($20K) — Identity + human verification (ProofLink Engine integration point)
- LayerZero ($20K) — Cross-chain compliance routing

**Target:** Win Circle + Self Protocol tracks. Build compliance middleware that wraps Circle's Compliance Engine with FlowLink's OFAC screening. One integration, two prize tracks.

**Registration:** Apply at ethglobal.com/events/cannes. Staking requirement (small ETH). Teams up to 5.

**Prep needed:** 2 weeks. Build the Circle Compliance Engine integration + Self Protocol KYC proof verification into the ProofLink pipeline. Must show live on-chain demo.

---

#### 2. Agentic Commerce Hackathon Berlin — April 10-12, 2026
**Prize pool:** TBD (preceded by $1K Ideathon; full hackathon likely $20-50K)
**Location:** Berlin (IRL)
**Organizer:** Algorand Foundation
**Focus:** x402 on Algorand + agentic commerce production builds

**FlowLink fit:** Perfect. This is the exact community building x402 infrastructure. FlowLink as a compliance-enriched x402 facilitator is the canonical missing piece in Algorand's agentic stack.

**Registration:** Algorand Builders Berlin via DoraHacks / Luma. Watch algorand.co for announcement.

**Strategy:** Position FlowLink as the production-readiness layer for Algorand x402. Show that without FlowLink, no enterprise can deploy Algorand x402 due to OFAC liability.

---

#### 3. Chainlink Convergence Hackathon — Feb 6 – Mar 8 (check if still accepting)
**Prize pool:** $120K+
**Risk & Compliance Track:** $16K (1st), $10K (2nd), $6K (3rd)
**CRE & AI Track:** $17K (1st)
**Format:** Virtual

**FlowLink fit:** The Risk & Compliance track was built for FlowLink. "Monitoring, safeguards, and automated controls across onchain systems" is the exact ProofLink Engine description.

**Required:** Projects must use Chainlink Runtime Environment (CRE) as orchestration layer. FlowLink would integrate CRE to trigger compliance checks via Chainlink's oracle network.

**Deadline:** March 8. May have passed — verify at chain.link/hackathon. If live, submit immediately.

---

#### 4. Base Batches — Demo Day Late May 2026
**Investment:** $10K grant + up to $50K from Base Ecosystem Fund
**This is not a hackathon — it's an accelerator.** Treat it as such.
**Student track deadline:** April 27, 2026

**Strategy:** Apply to the Startup track if still open. If deadline passed, focus on being application-ready for the next cohort. FlowLink is the ideal Base Batches candidate:
- Building on Base mainnet
- x402 (Coinbase's protocol) as primary integration
- Pre-product / early stage
- Clear enterprise GTM (CFOs, not consumers)

**Required to apply:** Live app, GitHub repo, proof of Base mainnet transactions, 1-min video.

---

### Tier 2: Strong Fit

#### 5. ETHGlobal New York — June 12-14, 2026
**Location:** New York City (IRL)
**Prize pool:** Typically $300K+ based on prior years
**Relevance:** NYC is the TradFi capital. Compliance infrastructure is especially resonant here. Circle, Coinbase, JP Morgan's crypto team all sponsor ETHGlobal NYC.

**Strategy:** By June, FlowLink should have 2+ months of production usage data. Lead with traction, not just demo. "We processed X screened transactions with $Y in blocked funds."

---

#### 6. StableHacks — Demo Day April 8, 2026 (Zurich)
**Prize pool:** $202K total (includes $100K in pilot opportunities with AMINA Bank)
**Focus:** Institutional stablecoin infrastructure on Solana

**FlowLink fit:** Strong but requires Solana deployment. If FlowLink adds Solana support before April, this is a $100K pilot partnership opportunity that could define the enterprise GTM.

**Requirement:** Teams only, no solo submissions. Demo Day in Zurich.

---

#### 7. ETHGlobal Open Agents — April 24 – May 6, 2026
**Format:** Async (online)
**Focus:** Onchain AI agents

**FlowLink fit:** Good. Async format means lower barrier to enter. Use this to refine the agent-to-agent compliance demo that will be used in NYC in June.

---

### Tier 3: Monitor

- **ETHGlobal Lisbon** (July 24-26, 2026) — good summer target
- **ETHGlobal Tokyo** (Sept 25-27, 2026) — APAC expansion story
- **HackMoney 2026 Online** — DeFi/stablecoin focus; good for FATF Travel Rule angle
- **Solana x402 Hackathon** (if they run a 2026 edition) — $135K prior year pool

---

## Part 7: Specific Game Plan by Event

### Immediate (next 2 weeks) — ETHGlobal Cannes, April 3-5

**Build target:** FlowLink Compliance Middleware for Circle + Self Protocol

**Deliverables:**
1. ProofLink Engine endpoint that wraps Circle's Compliance Engine with OFAC/FATF screening
2. Self Protocol integration: verify agent KYC proof before allowing payment initiation
3. Live demo on Base Sepolia with Circle CCTP V2 for multi-chain USDC
4. Auto-generated compliance receipt (JSON + PDF) attached to each x402 payment

**Demo flow:**
1. Show AI agent attempting payment to SDN address → instant block → compliance record
2. Show clean payment → 200ms screen → approval → invoice generated
3. Show the invoice: line items, VAT placeholder, ERP JSON export
4. Show it working cross-chain (Ethereum → Base) via CCTP V2

**Prize targets:** Circle ($10K), Self Protocol ($10K), potentially World ($20K) if World ID integration added for human-in-loop approval flows.

**Team:** 3-4 people. Frontend: 1. Backend/compliance: 1. Smart contracts/integrations: 1. Demo + pitching: 1 (can double).

---

### 1 Month — Agentic Commerce Berlin, April 10-12

**Build target:** FlowLink as production x402 facilitator for Algorand

**Deliverables:**
1. x402 facilitator server that routes through ProofLink Engine before settling
2. Algorand-native ARC-0060 (or Algorand x402) payment flow
3. Travel Rule compliance: originator/beneficiary data transmitted automatically
4. Dashboard showing real-time screening results per transaction

**Demo narrative:** "Every Algorand x402 payment flows through FlowLink before it settles. OFAC screening happens in the HTTP layer — no smart contract changes needed. The payment either gets a 200 or a 402 with a compliance reason."

**Position:** FlowLink is the compliance wrapper that makes Algorand x402 enterprise-safe. Show the flow with a known test SDN wallet.

---

### 3 Months — ETHGlobal New York, June 12-14

**By this point FlowLink should have:**
- 2+ months of live transaction data
- At least one design partner (even if unpaid)
- API documentation
- Open-source SDK (even if core is closed)

**Build target for NYC:** FATF Travel Rule automation + ERP integration demo

**Deliverables:**
1. Automatic Travel Rule data transmission for x402 payments over $3K threshold
2. QuickBooks/Xero invoice export from compliance records
3. Multi-protocol support: x402, ACP (OpenAI), AP2 (Google)
4. Live production transactions (not testnet if possible)

**Prize targets:** Any sponsor with compliance, DeFi, or stablecoin infrastructure tracks.

**Demo narrative:** "Your AI agent just paid an invoice. Here's the receipt your CFO can sign. Here's the Travel Rule data your compliance officer needs. Here's the OFAC screening your auditor requires. All automatic. Zero human intervention."

---

### Ongoing — Base Batches Accelerator Application

**This is the strategic priority above all hackathons.**

Base Batches offers $50K investment + 8 weeks of mentorship + Demo Day at Coinbase HQ. A hackathon win is worth $5-20K. Base Batches is worth $50K+ and distribution.

**Application requirements (prepare now):**
- [ ] FlowLink live on Base mainnet with real transactions
- [ ] Open GitHub repo with clean README
- [ ] 2-min video: problem, demo, architecture (can reuse hackathon demo video)
- [ ] Pitch deck (see pitch_deck_outline.md in this directory)
- [ ] Written description: why FlowLink, why now, why Base

**Key message for Base application:** "We're building the compliance infrastructure that makes x402 (Coinbase's protocol) safe for enterprise adoption. Every company building on Base needs us before their CFO or general counsel will sign off on stablecoin payments. We are the trust layer between Coinbase's payment protocol and the real world."

---

## Part 8: Cross-Cutting Strategic Decisions

### Open-Source Strategy

The x402 Intent Firewall won on open-source dev tooling. FlowLink should release:
- `flowlink-sdk` — x402 compliance middleware SDK (open source)
- ProofLink Engine API — commercial, closed
- Compliance receipt schema — open standard to drive adoption

Open-source the wrapper, commercialize the intelligence. This pattern (Kong, Nginx, Grafana) wins enterprise sales and hackathon developer tooling prizes simultaneously.

### Protocol Positioning

Do NOT position as "x402 compliance" exclusively. Multiple winning projects (and the FINDINGS.md research) confirm that ACP (OpenAI + Stripe) and AP2 (Google) are live alternatives. Position FlowLink as:

**"Protocol-agnostic compliance and invoicing middleware for agentic payments. Works with x402, ACP, AP2, and any future HTTP-native payment standard."**

This is a stronger moat and a better story for investors.

### The Compliance Demo Asset

Build once, reuse everywhere. The core 90-second demo clip — sanctioned address blocked in real time, audit record generated, clean payment approved — should be:
1. Pre-recorded as a polished screen capture (backup for live demo failures)
2. Embedded in the website
3. Tweeted as a standalone clip
4. Submitted as the hackathon video

This clip is the single most important marketing asset FlowLink can create.

### Sponsor Relationship Strategy

After every hackathon, immediately follow up with the sponsors whose tracks you won or placed in. Specifically:
- **Circle:** Compliance Engine partnership discussion. FlowLink + Circle = enterprise-grade stablecoin payments.
- **Coinbase CDP:** x402 facilitator partner listing. Being listed as a "compliance-enriched facilitator" on x402.org is worth more than prize money.
- **Chainlink:** CRE integration partner. Compliance oracles as a product line.

---

## Summary: Priority Order

| Priority | Event | Date | Prize | Action Required |
|----------|-------|------|-------|-----------------|
| 1 | ETHGlobal Cannes | April 3-5 | $311K pool | Build Circle + Self Protocol integration NOW |
| 2 | Agentic Commerce Berlin | April 10-12 | ~$20-50K | Build Algorand x402 facilitator by April 8 |
| 3 | Base Batches Accelerator | Demo Day: May | $50K invest | Application ongoing — top strategic priority |
| 4 | ETHGlobal Open Agents | Apr 24-May 6 | TBD | Use to refine A2A compliance demo |
| 5 | ETHGlobal New York | June 12-14 | $300K+ pool | Go with production traction + FATF demo |
| 6 | Chainlink Convergence | Feb 6–Mar 8 | $32K (R&C) | Check if deadline passed — submit if open |

**The meta-strategy:** Hackathons are not the goal. They are the distribution channel. Every hackathon entry generates:
1. A shippable integration (Circle, Chainlink, Algorand, Base)
2. A demo video that becomes marketing content
3. Sponsor relationships that become design partners
4. Credibility that supports the Base Batches and seed raise narrative

Win the hackathon, then convert the win into a design partner agreement within 2 weeks.

---

## Sources Consulted

- [SF Agentic Commerce x402 Hackathon Recap — SKALE Blog](https://blog.skale.space/blog/san-francisco-agentic-commerce-x402-hackathon-recap-winners)
- [Cronos x402 Hackathon Winners — Bryan/Cronos Blog](https://blog.cronos.org/p/announcing-the-cronos-x402-hackathon)
- [x402 + AnChain.AI Compliance Integration](https://www.anchain.ai/blog/x402)
- [ETHGlobal Cannes 2026 Prize Tracks](https://ethglobal.com/events/cannes/prizes)
- [ETHGlobal 2026 Calendar](https://x.com/ETHGlobal/status/1992919708589576215)
- [Base Batches 2026](https://www.basebatches.xyz/)
- [Chainlink Convergence Hackathon Prizes](https://chain.link/hackathon/prizes)
- [Solana x402 Hackathon](https://solana.com/x402/hackathon)
- [Algorand x402 Ideathon Berlin Recap](https://algorand.co/blog/x402-ideathon-berlin-recap-web3-builders-exploring-agentic-commerce)
- [StableHacks Hackathon — DoraHacks](https://dorahacks.io/hackathon/stablehacks/detail)
- [Coinbase Agents in Action Winners](https://www.coinbase.com/developer-platform/discover/launches/agents-in-action-winners)
- [Devpost: 10-Time Blockchain Hackathon Champion Tips](https://info.devpost.com/blog/user-story-tristan)
- [AWS Blog: x402 and Agentic Commerce in Financial Services](https://aws.amazon.com/blogs/industries/x402-and-agentic-commerce-redefining-autonomous-payments-in-financial-services/)
- [HackMoney 2026 Prize Tracks](https://ethglobal.com/events/hackmoney2026/prizes)
