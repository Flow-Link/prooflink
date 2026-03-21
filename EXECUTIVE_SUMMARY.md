# FlowLink -- Executive Summary
**Date:** March 20, 2026 | **Classification:** Investor-Ready | **Synthesized from:** 20+ research and strategy documents

---

## What FlowLink Is

FlowLink is the compliance layer for stablecoin and AI agent payments. It sits between payment protocols (x402, MPP, AP2, ACP) and settlement rails (USDC, card networks), providing real-time sanctions screening, FATF Travel Rule compliance, and the industry's first Know Your Agent (KYA) standard for autonomous AI transactions. Every payment through FlowLink generates a cryptographically signed, on-chain compliance receipt -- the document a CFO hands to an auditor.

FlowLink is not a payment processor. It never holds funds. It is neutral compliance middleware that makes every stablecoin payment legal, auditable, and enterprise-safe.

---

## 5 Numbers That Matter

| # | Metric | Source |
|---|--------|--------|
| **$33T** | Stablecoin transaction volume in 2025, up 72% YoY, approaching ACH network scale | Artemis Analytics |
| **$1.8B** | Mastercard's acquisition of BVNK (March 17, 2026) on $90M raised -- proving compliance-native stablecoin infra commands premium exits | Mastercard / CoinDesk |
| **0** | Number of agent payment protocols with native Travel Rule compliance (across x402, MPP, AP2, ACP, Visa TAP, Mastercard Agent Pay) | Primary protocol analysis |
| **99** | Jurisdictions implementing the FATF Travel Rule; 59% have laws but zero enforcement actions -- the fine wave is coming | FATF 2025 report |
| **$100.6B** | RegTech market by 2033 (from $19.7B today, 22.6% CAGR) -- compliance infrastructure is the fastest-growing financial services category | Straits Research |

---

## Why Now

Three forces converged in the past 12 months that did not exist before and will close within 18 months:

**1. Regulation crystallized.** The GENIUS Act (signed July 2025) created the first US federal stablecoin framework. MiCA is fully enforceable across the EU by mid-2026. Compliance is no longer optional -- it is a legal requirement for every stablecoin transaction above threshold.

**2. Agent payment protocols exploded.** Six competing protocols shipped between April 2025 and March 2026. None have built-in compliance. Each new protocol creates a new compliance surface that FlowLink fills. More fragmentation = more value for the neutral middleware.

**3. Acquirers are buying now.** Mastercard bought BVNK for $1.8B. Stripe bought Bridge for $1.1B. a16z is raising a $2B crypto fund. The "build compliant stablecoin infrastructure, get acquired" thesis is proven by two $1B+ exits in 12 months.

---

## The Competitive Whitespace

After analyzing 21 competitors, 6 agent payment protocols, and 8 infrastructure projects, we identified five things nobody is building:

1. **Cross-protocol compliance orchestration.** When an agent pays via x402, with the payer's treasury on Kinexys, settled on Tempo -- no compliance layer spans all of these. FlowLink does.

2. **Travel Rule for AI agents.** Current Travel Rule protocols assume both parties are human-run VASPs. Agent-to-agent payments break this assumption entirely. Nobody has defined how originator information travels with agent transactions.

3. **MCP Compliance Server.** Payment MCP servers are proliferating (PayPal, Worldpay, Marqeta). Compliance MCP servers: zero. FlowLink makes compliance an ambient tool call -- agents call `check_sanctions()` the way they call `get_weather()`.

4. **Compliance receipts as verifiable attestations.** Every protocol creates logs. None create the structured, cryptographically signed proof that satisfies SOX, PCI DSS, or financial auditors.

5. **Agent Invoice Standard.** No machine-readable invoice format exists for agent-to-agent commerce. The gap between "transaction hash" and "CFO-approved invoice" is completely unaddressed.

---

## The Product

**Phase 1 (Now -- Q2 2026): Human-to-Human B2B stablecoin payments with compliance.**
Target: Mid-market CFOs ($10M-$500M revenue) making cross-border payments. Stablecoin invoicing + real-time sanctions screening + Travel Rule + ProofLink compliance receipts. This is a $226B/year market today, growing 733% YoY. Revenue: transaction fees (5-30 bps) + subscriptions ($99-$2,000+/month).

**Phase 2 (Q3 2026): Human-to-Agent / Agent-to-Human.**
KYA verification for agent payments. x402 compliance middleware. MPP session compliance. Compliance-as-MCP-tool. Target: enterprises deploying AI procurement agents.

**Phase 3 (2027+): Agent-to-Agent.**
Full Agent Invoice Standard. Agent Travel Rule protocol. Behavioral AML models trained on proprietary agent transaction data. Dispute resolution hooks.

**Revenue trajectory (conservative):** Year 1: $300K-$550K ARR | Year 2: $2M-$3M ARR | Year 3: agent economy expansion (upside, not a dependency). Comparable: BVNK reached $30B annualized volume before its $1.8B exit.

---

## What's Proven vs. What's Planned

| Proven | Planned |
|--------|---------|
| The market need: 6 protocols, zero native compliance | Live H2H product with paying customers |
| Regulatory mandate: GENIUS Act + MiCA make compliance non-optional | KYA standard adopted by major protocol |
| Exit path: two $1B+ acquisitions of stablecoin infra in 12 months | Regulatory engagement with FATF/FinCEN |
| Whitespace: exhaustive competitive analysis confirms no competitor does this | Enterprise design partners with LOIs |
| Architecture: ProofLink engine, KYA schema, Agent Invoice schema designed | Production deployment at scale |

**Honest assessment:** The thesis is strong and well-timed. The product architecture is sound. Execution evidence is early-stage. This is a pre-seed/seed opportunity, not a Series A.

---

## 3 Biggest Risks and Mitigations

**Risk 1: Coinbase or Stripe vertically integrates compliance into their protocol.**
Severity: High. Probability: High. This is the existential threat.
*Mitigation:* FlowLink is cross-protocol -- it works across x402 AND MPP AND AP2 AND ACP simultaneously. Coinbase's compliance only covers Coinbase. Stripe's only covers Stripe. A neutral compliance layer is structurally different from a vertically integrated one. Additionally, publishing the KYA standard as an open spec creates ecosystem adoption that a proprietary solution cannot match. Speed is everything -- establish the standard before incumbents prioritize this.

**Risk 2: FlowLink classified as a VASP/MSB, triggering expensive licensing requirements.**
Severity: High. Probability: Medium.
*Mitigation:* Architecture is explicitly non-custodial -- FlowLink never holds or transmits funds. However, this classification has not been confirmed by legal counsel. A formal legal opinion on MSB/VASP status is required before any investor meeting. Budget: $5-15K. If reclassified, fallback is a partner bank model.

**Risk 3: Agentic commerce develops slower than projected.**
Severity: Medium. Probability: Medium. x402 real volume is $28K/day (not the headline 75M transactions, which include significant artificial activity).
*Mitigation:* Phase 1 (H2H B2B stablecoin payments) is the revenue engine. The $226B/year B2B stablecoin market exists today with real paying customers. Agent compliance is the Year 2-3 expansion, not the Year 1 dependency. If A2A is 3 years away instead of 12 months, FlowLink still builds a viable compliance business on H2H alone.

---

## Team Gaps to Fix Before Fundraising

The strategy review identified five mandatory actions before any VC meeting:

1. **Name the cofounder and add a compliance advisor.** A compliance company with no compliance or fintech regulatory background on the team is a fatal credibility gap. One former FinCEN/FATF official or CCO from a regulated crypto firm changes this entirely.

2. **Get a legal opinion on VASP/MSB classification.** The entire non-custodial thesis is unvalidated by counsel. $5-15K investment removes the biggest existential question.

3. **Secure one design partner with a letter of intent.** One mid-market crypto company processing $10M+ in cross-border stablecoin payables willing to be named is worth more than all the market research combined.

4. **Reconcile the pricing model.** The strategy document and pitch deck show different pricing ($0.01/tx vs. 30 bps -- a 15,000x difference on a $50K invoice). Unit economics and cost model (Notabene + TRM + Chainalysis API costs) must be built.

5. **Ship one working integration.** A live x402 compliance middleware on GitHub with a working demo wins more than 15 slides of architecture diagrams. The hackathon strategy (ETHGlobal, Coinbase Agents in Action, Base Batches) is the fastest path to proof.

---

## What We Need

**Raise:** Pre-seed ($750K-$1.5M)

**Use of funds:**
- Ship the MCP Compliance Server (4-6 weeks) and EAS-based compliance receipts (6-8 weeks) -- the two highest-impact, most feasible innovations identified across all research
- Win one hackathon (ETHGlobal or Coinbase Agents in Action) to establish developer credibility
- Secure 3-5 design partners processing real B2B stablecoin volume
- Publish the KYA standard draft on GitHub and submit to W3C Credentials Community Group
- Obtain legal opinion on VASP/MSB classification
- Hire: one compliance/regulatory lead, one senior protocol engineer

**18-month target (Series A metrics):** $1M-$2M ARR, 20-30 paying enterprise customers, $500M+ cumulative volume processed, KYA standard adopted by at least one major protocol.

**The exit thesis:** Mastercard paid $1.8B for BVNK. Stripe paid $1.1B for Bridge. The next billion-dollar stablecoin acquisition will go to the company that owns the agent payment compliance layer. We are building that company.

---

*Synthesized from 20+ research documents, 100+ primary sources, covering March 2025 -- March 2026.*
*Data accuracy: Research corpus rated 7.5/10 overall. Five critical numerical inconsistencies identified and flagged for correction before investor use (see reviews/research_review.md).*
