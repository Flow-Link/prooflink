# FlowLink — Pitch Deck Outline

> "The compliance infrastructure that makes AI agent payments safe, legal, and auditable"

---

## Slide 1: Title
**FlowLink** — The Trust Layer for the Agentic Economy
- Tagline: "Making stablecoin payments safe for CFOs today and AI agents tomorrow"

---

## Slide 2: The Problem (Pain)
- $33 TRILLION in stablecoin transactions in 2025 — growing 72% YoY
- AI agents are becoming autonomous economic actors (x402: 500K tx/week, $600M annualized)
- **But:** No compliance infrastructure exists for agentic payments
  - No KYC for AI agents
  - No FATF Travel Rule for agent-to-agent transfers
  - No invoicing — just raw on-chain transfers
  - No audit trail for CFOs
- "Would you let an AI agent spend your company's money without an invoice?"

---

## Slide 3: The Regulatory Tailwind
- **GENIUS Act** (signed July 2025): Stablecoins are now regulated financial instruments
- **MiCA** (EU, fully live): Every crypto payment needs compliance
- **FATF Travel Rule**: 99 jurisdictions enforcing, more coming
- **The enforcement wave is coming** — 59% of jurisdictions haven't enforced yet
- Compliance is no longer optional — it's infrastructure

---

## Slide 4: The Market
- **$150T** in cross-border B2B payments annually — 0.01% on-chain today
- **$33T** stablecoin volume (2025) — approaching ACH network scale
- **$7.84B → $52.6B** AI agent economy (2025→2030, 46.3% CAGR)
- **$19.72B → $100.6B** RegTech market (2025→2033, 22.6% CAGR)
- TAM: $260B+ stablecoin payments market × compliance layer

---

## Slide 5: The Competitive Landscape
[Feature matrix showing]:
- **Request Finance**: Invoicing ✅, Compliance ❌, AI Agents ❌
- **x402**: Payments ✅, Compliance ❌, Invoicing ❌
- **Superfluid/Sablier**: Streaming ✅, Compliance ❌, Invoicing ❌
- **Chainalysis/TRM**: Monitoring ✅, Payments ❌, Agents ❌
- **FlowLink**: Compliance ✅, Invoicing ✅, AI Agents ✅, Payments ✅

---

## Slide 6: What FlowLink Does
**ProofLink Engine** — compliance middleware for every payment protocol

```
AI Agent / Business
    ↓ Payment Request
FlowLink ProofLink Engine:
    1. Identity: KYA (Know Your Agent) / KYC verification
    2. Sanctions: OFAC, EU, UN, HMT screening (<100ms)
    3. Travel Rule: FATF-compliant data transmission
    4. AML: Real-time transaction monitoring
    5. Invoice: Structured, machine-readable invoice generation
    6. Compliance Receipt: Cryptographically signed proof
    ↓ Approved + Documented
Settlement (x402 / MPP / AP2 / any rail)
```

---

## Slide 7: Why Now — The Convergence
[Timeline graphic]:
- May 2025: x402 launched (Coinbase)
- Jul 2025: GENIUS Act signed
- Sep 2025: AP2 launched (Google), x402 Foundation formed
- Oct 2025: Visa TAP, Mastercard Agent Pay
- Dec 2025: MiCA fully live
- Jan 2026: ERC-8004 on mainnet (agent identity)
- Feb 2026: Stripe joins x402, Coinbase Agentic Wallets
- Mar 2026: Stripe MPP + Tempo mainnet, BVNK acquired for $1.8B
- **NOW: Payment protocols exist. Compliance doesn't. FlowLink fills the gap.**

---

## Slide 8: The Product — Deep Dive
1. **Compliance-as-Infrastructure**: Sits between ANY payment protocol and settlement
2. **KYA Standard**: Open standard for verifying AI agent identity (W3C DID + ERC-8004)
3. **Agent Invoice Standard**: JSON-LD machine-readable invoices for agent transactions
4. **Compliance Receipts**: On-chain attestations proving all checks passed
5. **Cross-Protocol Router**: Works with x402, MPP, AP2, ACP — protocol agnostic
6. **MCP Server**: Any AI agent can call FlowLink for compliant payments

---

## Slide 9: Business Model
| Tier | Price | Target |
|------|-------|--------|
| Free | OFAC screening only | Developers, hackathons |
| Developer | $0.01/transaction | Startups, agents |
| Business | $299/mo + $0.005/tx | SMBs, crypto companies |
| Enterprise | Custom | CFOs, compliance teams |

Revenue streams:
- Per-transaction compliance fees
- Subscription for monitoring + reporting
- Enterprise compliance audit services
- KYA verification fees

---

## Slide 10: Go-to-Market
**Phase 1 (NOW)**: Human-to-Human
- B2B stablecoin payments with compliance
- Target: Crypto-native companies paying contractors/vendors
- Distribution: x402 facilitator integration

**Phase 2 (Q3 2026)**: Human-to-Agent
- Enterprises using AI agents for procurement
- KYA verification for agent authorization
- Target: Fortune 500 AI agent deployments

**Phase 3 (Q1 2027)**: Agent-to-Agent
- Autonomous agentic commerce
- Full invoice + compliance + dispute resolution
- Target: The entire AI agent economy

---

## Slide 11: Traction / Milestones
- [Current metrics from live product]
- ProofLink Engine processing live transactions
- x402 facilitator integration
- ERC-8004 integration (49K+ registered agents)
- [Hackathon wins]

---

## Slide 12: The Validation
- **BVNK acquired by Mastercard for $1.8B** (March 17, 2026) — on $90M raised
- **Bridge acquired by Stripe for $1.1B** (2025)
- Both were compliance-native stablecoin infrastructure — exactly FlowLink's thesis
- **22x capital efficiency** at BVNK — the market rewards lean infrastructure builders

---

## Slide 13: Team
- **Akash** — Systems-level ML engineer (IIT Patna, CERN GSoC, vLLM contributor). Agentic payments.
- **Cofounder** — Building Request Finance from ground up. Protocol engineering.
- [Advisors]

---

## Slide 14: The Ask
- Raising: $[X] pre-seed / seed
- Use of funds: Engineering (60%), compliance licensing (20%), GTM (20%)
- Timeline: 18 months to Series A metrics
- Target VCs: a16z Crypto, Paradigm, Pantera, Dragonfly, ICONIQ, Haun Ventures

---

## Slide 15: Vision
"Every AI agent transaction — compliant, invoiced, auditable. FlowLink is the trust infrastructure that makes the agentic economy safe for business."

$150 trillion in B2B payments. $52 billion in AI agents. $100 billion in RegTech.
**FlowLink sits at the intersection of all three.**
