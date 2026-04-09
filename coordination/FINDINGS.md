# Cross-Team Findings & Key Insights

> This file is the shared knowledge base. Teams append findings here for cross-pollination.

---

## Key Findings (append below)

---

### [Team Alpha] x402 Protocol — Key Takeaways for ProofLink

**Date:** 2026-03-20

1. **x402 explicitly does NOT handle compliance, KYC, invoicing, audit trails, or refunds** — these are ProofLink's exact value proposition. x402 is the payment primitive; ProofLink is the trust/compliance wrapper.

2. **Operate as a compliance-enriched x402 facilitator.** Servers point `facilitatorUrl` at ProofLink instead of Coinbase CDP. ProofLink runs OFAC/AML/KYT before settling. This is the fastest enterprise GTM path.

3. **Coinbase CDP's built-in OFAC checks are table stakes.** ProofLink's differentiation: FATF Travel Rule, structured invoice generation, ERP integration, agent identity validation (ERC-8004), full AML monitoring, audit trail export. None of these exist in any current facilitator.

4. **Stripe joined February 2026** — this signals enterprise legitimacy. Stripe's x402 integration bridges crypto rails with traditional payment reconciliation. ProofLink should offer similar bridges for CFOs (invoice generation, ERP-compatible receipts).

5. **World ID (March 2026)** integrated human identity with x402 agent payments. ProofLink should integrate ERC-8004 (agent identity/reputation) in the same vein — validating agent identity before allowing payment settlement.

6. **x402 V2 (December 2025)** adds multi-chain, multi-rail (fiat ACH/SEPA), session payments, and dynamic routing. ProofLink's compliance layer needs to handle all these new routing patterns, especially dynamic `payTo` (new attack vector: servers can redirect payments).

7. **The gap is auditability.** x402 delivers a transaction hash. Enterprise finance needs: invoice IDs, line items, cost center codes, VAT computation, PDF/XML exports, ERP ingestion. Zero existing x402 tools do this.

8. **Protocol risk:** ACP (OpenAI + Stripe) and AP2 (Google) are potential x402 alternatives with full commerce lifecycle features. ProofLink must be **protocol-agnostic** — compliance middleware for any agentic payment protocol, not just x402.

9. **Adoption metrics:** 119M cumulative transactions on Base, 38.6M on Solana. ~$600M annualized volume. Average daily volume ~$28K — the narrative is ahead of the actual volume, but the trajectory is clear. Stripe + Google + AWS validation in 2026 suggests enterprise volume will follow.

10. **Key technical dependency:** 98.7% of x402 volume uses USDC. USDT excluded. EIP-3009 is only natively supported by Circle products (USDC, EURC). If USDT adds EIP-3009, this changes dramatically.

