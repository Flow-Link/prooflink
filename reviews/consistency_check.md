# ProofLink — Final Consistency Check
**Reviewer:** Final Comprehensive Review (Consistency Pass)
**Date:** March 20, 2026
**Documents reviewed:**
- `EXECUTIVE_SUMMARY.md`
- `strategy/pitch_deck_v2.md`
- `strategy/unit_economics.md`
- `strategy/investor_faq.md`
- `reviews/final_quality_check.md`
- `ACTION_PLAN.md`

---

## 1. Key Metrics Consistency Table

Each row shows the value of a critical metric as it appears in each document. A dash (—) means the metric is not mentioned in that document. Values in **bold** are the ones that conflict.

| Metric | EXECUTIVE_SUMMARY | PITCH_DECK_V2 | UNIT_ECONOMICS | INVESTOR_FAQ | FINAL_QUALITY_CHECK | ACTION_PLAN | Consistent? |
|--------|------------------|--------------|----------------|-------------|---------------------|-------------|-------------|
| Pre-seed raise range | **$750K–$1.5M** (body) / **$500K–$2M** (noted as prior inconsistency by final_quality_check) | $750K–$1.5M | — | $750K–$1.5M (Q32) | Flags $500K–$2M vs $750K–$1.5M as inconsistency | $500K–$1.5M (Slide 14 note in W9-1) | **PARTIAL — exec summary body says $750K–$1.5M (fixed) but final_quality_check cites $500K–$2M as the exec summary value; ACTION_PLAN references $500K–$1.5M for Slide 14** |
| Year 1 ARR | $300K–$550K (body); implies $550K only | $300K–$550K | **$810K** (end-of-year); $430K cumulative revenue | $300K–$810K (Q1, citing SOM) | Year 1 ARR: deck $300K–$550K; exec summary shows $550K upper bound; unit economics shows $810K | — | **FAIL — three different Year 1 ARR figures: $300K–$550K (exec/deck), $810K (unit economics end-of-year), $809.4K (unit economics Q4 run rate)** |
| Year 2 ARR | **$5.5M** (old v1 figure; flagged as inconsistency) | **$2M–$3M** (Appendix A) | **$5.6M** (end-of-year) | $2M–$3M implied (Q5) | Flags $5.5M (exec) vs $2M–$3M (deck) as FAIL | — | **FAIL — three values: exec summary $5.5M (stale), pitch deck $2M–$3M, unit economics $5.6M** |
| Year 3 ARR | **$23M** (stale v1 figure) | Not stated in main deck body | **$59.7M** (unit economics, upside); $25M conservative | — | Flags $23M as stale, cannot confirm alignment | — | **FAIL — exec summary $23M vs unit economics $25M–$59.7M** |
| SOM Year 1 (cumulative volume) | — | $50M–$100M | $300M cumulative (Section 7.1) | $50M–$100M (Q1) | — | — | **FAIL — pitch deck $50M–$100M vs unit economics $300M** |
| Month 12 platform volume | — | $10M/month (Slide 9 model) | $25M/month (Q4 revenue model, 50 customers × $500K each) | — | Flags Slide 9 ($10M/month) vs Slide 4 SOM ($50M–$100M cumulative) as internal inconsistency | — | **FAIL — Slide 9 uses $10M/month while unit economics uses $25M/month for same 50-customer scenario** |
| Month 12 MRR | $40K–$55K (Slide 9) | $40K–$55K | **$67,450** (unit economics Q4) | ~$60K (Q23, break-even) | Notes Slide 9 ($480K–$660K ARR) vs SOM ($300K–$550K ARR) discrepancy | — | **PARTIAL — Slide 9 $40K–$55K; unit economics $67K; FAQ $60K — all in same ballpark but not identical** |
| Break-even MRR | — | ~$60K/month (Slide 9, Series A section) | $60,167/month | $60K/month (Q23) | — | — | YES |
| Break-even month | — | Month 10–12 | Month 10–12 (base case); Month 11 (sensitivity) | Month 10–12 (Q23) | — | — | YES |
| Gross margin at scale | >98% (Slide 9) | >98% | 97–99% (Year 2 blended) | 99.97% (Q20, on $50K invoice) | — | — | YES (minor phrasing variation, no material conflict) |
| COGS per transaction (full stack) | ~$0.04–$0.09 (Slide 9 table) | ~$0.04–$0.09 | **~$0.017–$0.018** (Section 4.2) / **$0.002–$0.003** at 10M tx/mo | **~$0.02** (Q20 quick reference) | — | — | **FAIL — Slide 9 cites $0.04–$0.09; unit economics Section 4.2 shows $0.017–$0.018 at 1M tx/mo; FAQ cites $0.02** |
| BVNK acquisition price | $1.8B | $1.8B | — | $1.8B | — | $1.8B | YES |
| BVNK capital raised | $90M | $90M | — | $90M | — | — | YES |
| BVNK acquisition multiple | 22x (exec summary) | 22x (Slide 12) | — | 22x (Q23) | — | **16.7x–20x options noted as requiring clarification** | **PARTIAL — all investor-facing documents say 22x; ACTION_PLAN flags this may need to be 16.7x or 20x depending on contingent consideration** |
| Bridge acquisition price | $1.1B | $1.1B | — | $1.1B | — | — | YES |
| Total stablecoin volume 2025 | $33T | $33T | — | $33T | — | — | YES |
| Stablecoin YoY growth | 72% | 72% | — | 72% | — | — | YES |
| B2B stablecoin volume (annualized) | $226B | $226B | — | $226B | — | — | YES |
| B2B volume YoY growth | 733% | 733% | — | 733% | — | — | YES |
| x402 real commerce volume | $28K/day | $28K/day | — | $28K/day | $28K/day | $28K/day | YES |
| x402 30-day transactions | 75M+ | 75M+ | — | 75M+ | — | 75.41M | YES (minor rounding) |
| Travel Rule jurisdictions | 99 | 99 | — | 99 | — | — | YES |
| Unenforced jurisdictions | 59% | 59% | — | 59% | — | — | YES |
| RegTech market (2025) | $19.7B | $19.7B | — | $19.7B | — | — | YES |
| RegTech market (2033) | $100.6B | $100.6B | — | $100.6B | — | — | YES |
| RegTech CAGR | 22.6% | 22.6% | — | 22.6% | — | — | YES |
| Series A ARR target | $1M–$2M | $1M–$2M | — | $1M–$2M | $1M–$2M | $1M–$2M | YES |
| Series A customer target | 20–30 | 20–30 | — | 20–30 | 20–30 | — | YES |
| Series A volume target | $500M+ cumulative | $500M+ cumulative | — | $500M+ cumulative | $500M+ cumulative | — | YES |
| Series A KYA milestone | "Referenced in regulatory guidance" | "Adopted by at least one major protocol" | — | "Adopted by at least one major protocol" | Flags this as NO — different milestones | — | **FAIL — exec summary vs pitch deck/FAQ** |
| Phase 3 (A2A) timing | **Q1 2027** | **2027+** | — | 2027–2028 (Q17) | Flags Q1 2027 vs 2027+ as NO | — | **FAIL — exec summary more aggressive than deck and FAQ** |
| Legal budget (VASP opinion) | $5–15K | $5–15K | $75K (legal opinions line, broader scope) | $5–15K | $5–15K | $5–15K | PARTIAL — $75K in unit economics is a full-year legal budget, not just the VASP memo; not a true conflict but context matters |
| Notabene annual cost | — | ~$0.02–0.05/tx (Slide 9 table) | $24K–$56K/yr enterprise | ~$45K/yr (Q20 detailed table: $0.004/tx at 1M) | — | — | **PARTIAL — Slide 9 per-tx estimate ($0.02–$0.05) is at different volume than unit economics ($0.004–$0.023 depending on volume)** |
| TRM Labs pricing | $100K+/yr (Slide 5) | $100K+/yr | $100K–$1.4M/yr | $100K+/yr; $693K average | — | — | YES |
| Design partner threshold | $10M+ cross-border payables/yr (deck) | $10M+ cross-border payables/yr | — | — | Flags vs exec summary $5M+/month as ambiguous | $5M–$50M/month (W4-3) | **FAIL — deck uses annual figure; action plan uses monthly figures; exec summary (per final_quality_check) uses yet another unit** |
| Request Finance monthly volume | $27.2M (implied) | — | $27.2M Dec 2025 | $27.2M | — | — | YES |
| Request Finance pricing | $499/mo + 15bps (competitive matrix) | — | $600/month Basic | $600/month (Q11) | — | — | **FAIL — Slide 5 competitive matrix shows ProofLink pricing of $499/mo, implicitly comparing to Request Finance, but does not clearly state Request Finance at $600. Unit economics correctly states $600. Minor but creates reader confusion in Slide 5.** |
| Chainalysis valuation | — | $8.6B (Slide 16) | $2.5B (2024, down from $8.6B peak) | $2.5B (Q9) | — | — | **FAIL — Slide 16 cites $8.6B (peak 2022) without noting it is the historical peak, while FAQ and unit economics correctly use $2.5B (current). An uninformed reader of Slide 16 will assume current valuation is $8.6B.** |
| Rain valuation | $1.95B (Slide 12) | $1.95B | — | $1.95B | — | — | YES |
| a16z fund size | $2B | $2B | — | — | — | — | YES |

---

## 2. Remaining Inconsistencies (Detailed)

The following are the material inconsistencies that remain unresolved after the final_quality_check pass. They are ordered by investor-impact severity.

### INCONSISTENCY 1: Year 1 ARR — Three Different Numbers (CRITICAL)

**Pitch deck Slide 4 SOM:** $300K–$550K ARR (Year 1)
**Unit economics Section 6.2:** $810K ARR (end of Year 1 — Q4 run rate); $430K cumulative revenue for the year
**Investor FAQ Q1:** $300K–$810K ARR cited together in one answer

These are reconcilable (the $810K is end-of-year run rate; $300K–$550K is cumulative/blended; $430K is total cash received) but they are **presented as the same metric without qualification**. A VC reading all three documents will see three different "Year 1 ARR" numbers. The correct unambiguous statement is: "Year 1 ending ARR (run rate): ~$810K. Year 1 blended ARR (full-year average): ~$430K."

**Fix:** Standardize on two clearly labeled figures everywhere: (a) end-of-Year-1 ARR run rate and (b) Year 1 cumulative cash revenue. Never state them as interchangeable.

---

### INCONSISTENCY 2: Year 2 ARR — Three Different Numbers (CRITICAL)

**Executive Summary:** $5.5M (stale v1 figure, not updated)
**Pitch deck Appendix A:** $2M–$3M
**Unit economics Section 6.3:** $5.6M

The unit economics $5.6M and the pitch deck $2M–$3M are irreconcilable without scenario labeling. The unit economics model includes agent-economy acceleration in Year 2 (H2A phase, KYA revenue). The pitch deck's $2M–$3M is a "slow-agent-adoption" scenario from Appendix A. Neither document makes this distinction explicit. The executive summary $5.5M appears to be an orphaned v1 figure that has never been updated.

**Fix:** Label all Year 2 projections with scenario names. "Base case (H2H only): $2M–$3M. Upside case (H2H + H2A with agent adoption): $5.6M." Update the executive summary from $5.5M to one of these two labeled figures.

---

### INCONSISTENCY 3: Year 1 Cumulative Volume — $50M–$100M vs $300M (HIGH)

**Pitch deck Slide 4 SOM / Investor FAQ Q1:** $50M–$100M cumulative volume Year 1
**Unit economics Section 7.1:** $300M cumulative volume Year 1

The unit economics model shows 50 customers × $500K/month × 12 months = $300M cumulative. The pitch deck SOM says $50M–$100M. The pitch deck figure appears to use a ramping assumption (customers acquired throughout the year, not 50 from Month 1), while the unit economics Section 7.1 summary table uses the full-year total across all quarters. By the unit economics' own quarterly model (Section 6.2), Q1 is $2.5M/month, Q4 is $25M/month — the actual annual total is closer to $130M–$150M, not $300M. The Section 7.1 "$300M cumulative" figure is itself internally inconsistent with the unit economics quarterly build.

**Fix:** Recalculate cumulative Year 1 volume from the quarterly model (sum of monthly volumes across all 12 months), replace the $300M figure in Section 7.1, and align the SOM in the pitch deck to match.

---

### INCONSISTENCY 4: COGS Per Transaction — $0.04–$0.09 vs $0.017–$0.018 (HIGH)

**Pitch deck Slide 9 COGS table:** Notabene ~$0.02–$0.05/tx; TRM ~$0.01–$0.03/tx; Chainalysis ~$0.005/tx; Infrastructure ~$0.005/tx; **Total: ~$0.04–$0.09/tx**
**Unit economics Section 4.2 (Scenario A):** Total COGS $0.018/tx at 1M tx/month (Business stack)
**Investor FAQ Q20 quick reference table:** Total COGS ~$0.005–$0.02/tx

The pitch deck COGS table uses raw per-API-call estimates at low volume without specifying the volume basis. The unit economics uses allocated fixed costs at 1M tx/month. The FAQ Q20 detailed table allocates fixed costs at 1M tx/month and arrives at $0.005–$0.02/tx. These are not contradictory if the volume basis is specified, but without that context they look like three different cost models.

**Fix:** Add a volume basis annotation to the Slide 9 COGS table: "(estimates at 100K–1M tx/month; see unit economics model for volume-scaled figures)." The FAQ Q20 table is the most defensible version — use it as the canonical reference.

---

### INCONSISTENCY 5: Chainalysis Valuation — $8.6B vs $2.5B (MEDIUM)

**Pitch deck Slide 16 (Exit section):** "Chainalysis: $8.6B valuation"
**Unit economics Section 1.1:** "$2.5B (2024), down from $8.6B peak (2022)"
**Investor FAQ Q9:** "Chainalysis is valued at $2.5B"

Slide 16 uses the 2022 peak valuation as though it is current. Any VC who follows crypto company valuations will know Chainalysis took a significant markdown. This erodes credibility on the exit slide — the one place you least want credibility erosion.

**Fix:** Update Slide 16 to: "Chainalysis: $8.6B peak valuation (2022), $2.5B current" or simply "Chainalysis: ~$2.5B valuation (marked down from $8.6B peak)."

---

### INCONSISTENCY 6: Phase 3 A2A Timeline — Q1 2027 vs 2027+ (MEDIUM)

**Executive Summary:** "Phase 3 (Q1 2027): Agent-to-Agent"
**Pitch deck Slide 10:** "Phase 3 (2027+): Agent-to-Agent Economy"
**Investor FAQ Q17:** "2027–2028"

The strategy review explicitly criticized the Q1 2027 timeline as credibility-damaging. The pitch deck v2 corrected this to "2027+". The executive summary was not updated. The FAQ uses "2027–2028" which is actually the most defensible framing. All three documents will be read by the same investor.

**Fix:** Update executive summary Phase 3 to "2027–2028" to match FAQ. This was identified by final_quality_check and remains unresolved.

---

### INCONSISTENCY 7: Series A KYA Milestone — Protocol Adoption vs Regulatory Citation (MEDIUM)

**Executive Summary (18-month target):** "KYA standard referenced in regulatory guidance"
**Pitch deck Slide 14 (Series A target):** "KYA standard adopted by at least one major protocol"
**Investor FAQ Q33:** "KYA standard adopted by at least one major protocol"

Protocol adoption in 18 months is achievable (it requires one partnership). Regulatory citation in regulatory guidance in 18 months is almost certainly not achievable — regulatory guidance cycles operate on multi-year timelines. The executive summary sets an unmeetable milestone that will make the company look like it missed its Series A targets.

**Fix:** Update executive summary to "KYA standard adopted by at least one major protocol" to match the pitch deck and FAQ.

---

### INCONSISTENCY 8: Design Partner Revenue Threshold — Ambiguous Units (LOW–MEDIUM)

**Pitch deck pre-pitch checklist and Slide 11:** "$10M+ cross-border payables" (ambiguous — annual or monthly?)
**Action plan W4-3:** "$5M–$50M/month"
**Final quality check:** Notes exec summary "$5M+/month" vs deck "$10M+ cross-border payables"

If the deck means $10M/year, that is only $833K/month — a much smaller business than $5M–$50M/month. If it means $10M/month, it aligns with the action plan midpoint.

**Fix:** Specify units explicitly and consistently: "companies processing $5M+/month in cross-border stablecoin payments" across all documents.

---

### INCONSISTENCY 9: BVNK Acquisition Multiple — 22x vs Possibly 16.7x (LOW)

**All investor-facing documents (exec summary, pitch deck, FAQ):** 22x multiple ($1.8B / $90M)
**Action plan W1-1:** Notes this may need to be recalculated as 16.7x ($1.5B guaranteed / $90M) if the $1.8B includes contingent/earnout consideration

This is a minor issue if $1.8B is confirmed as the total consideration (not all contingent). However, if an informed VC probes the earnout structure and the actual guaranteed consideration is lower, quoting "22x" could be challenged.

**Fix:** Confirm the deal structure (guaranteed vs contingent). If $1.8B is confirmed total, 22x is correct. If it includes significant contingent consideration, cite the guaranteed multiple with a footnote.

---

### INCONSISTENCY 10: Month 12 MRR — Slide 9 vs Unit Economics (LOW)

**Pitch deck Slide 9:** "$40K–$55K MRR" at $10M/month platform volume (Month 12)
**Unit economics Section 6.2:** $67,450 MRR at $25M/month platform volume (Month 12, 50 customers)

These use different volume assumptions ($10M vs $25M/month). The pitch deck's Slide 9 uses $10M/month as its Month 12 volume, which is lower than the unit economics' 50-customer model ($25M/month). Neither is labeled as the "base case" vs "conservative case."

**Fix:** Either align the Month 12 volume assumption across Slide 9 and unit economics, or label them explicitly as conservative ($10M/month) and base case ($25M/month).

---

## 3. Investor FAQ Coverage of Strategy Review Questions

The final_quality_check flagged several VC questions that needed answers. Assessment of FAQ coverage:

| Question from Strategy Review | FAQ Coverage | Complete? |
|------------------------------|-------------|-----------|
| "Why can't Coinbase just do this?" | Q8 — three specific differentiators (cross-protocol, ecosystem boundary, open standard) | YES |
| "What happens when a sanctions match fails?" | Q15 — 10-step detailed flow including SAR queue | YES |
| "Why will Chainalysis keep selling you data?" | Appendix C (pitch deck) + Q9 (FAQ) | YES |
| "What if ERC-8004 registry is exploited?" | Q18 — verification layer vs registration layer distinction | YES |
| "Who at FATF/FinCEN have you spoken to?" | Appendix C (pitch deck) + Q18 (FAQ) — honest "not yet, here's the plan" | YES |
| "What's your unfair advantage?" | Q26 — infrastructure problem framing, hiring plan, advisory board gap acknowledged | YES |
| "Are you a money transmitter?" | Q29 — 31 CFR 1010.100(ff)(5)(ii)(A) cited, legal memo required | YES (requires memo) |
| EU MiCA exposure | Q31 — specifically addressed; gray zone acknowledged honestly | YES |
| Path to $10M ARR | Q21 — bottoms-up math with two paths | YES |
| Break-even scenario | Q23 — Month 10–12 break-even, cash remaining calculation | YES |
| What if A2A takes 3 years? | Q5, Q17; pitch deck Appendix A | YES |
| What if regulators don't enforce? | Q6, Q7; pitch deck Appendix B | YES |

**Assessment:** The FAQ is comprehensive and directly addresses every hard question identified in the strategy review. The answers are honest, specific, and anticipate follow-up questions. No material gaps in coverage.

---

## 4. Action Plan vs Review Priorities Alignment

| Priority from Reviews | In Action Plan? | Timeline | Owner |
|----------------------|----------------|----------|-------|
| Name cofounder with credentials | YES — W1-2 | Week 1–2 | A + C |
| Obtain VASP/MSB legal opinion | YES — W2-1 | Week 2–5 | A |
| Secure design partner LOI | YES — W7-1 | Week 7 | C |
| Reconcile pricing model | YES — W1-3 | Week 1 | A + C |
| Fix document contradictions | YES — W1-1 | Week 1 | A |
| Add compliance advisor | YES — W2-2 | Week 2–4 | A + C |
| Add TRM Labs to competitive matrix | YES — W2-3 | Week 2 | A |
| Add Skyfire competitive deep dive | YES — W10-2 | Week 10 | A |
| Build unit economics model | YES — W1-4 | Week 1–2 | A |
| Write stress test (A2A delayed) | Present in deck Appendix A; action plan risk section | Before first pitch | A |
| Answer regulatory non-enforcement scenario | Present in deck Appendix B; action plan risk section | Before first pitch | A |
| Ship working x402 integration | YES — W2-4, W3-1 | Weeks 2–4 | A |
| Publish KYA standard on GitHub | YES — W3-2 | Week 3–4 | A + C |
| Update exec summary (Year 2 ARR, Phase 3 timeline) | **NOT explicitly tasked** | — | — |
| Fix Chainalysis valuation on Slide 16 | **NOT explicitly tasked** | — | — |
| Fix Year 1 ARR labeling across documents | **NOT explicitly tasked** | — | — |
| Fix cumulative Year 1 volume ($50M vs $300M) | **NOT explicitly tasked** | — | — |

**Gap:** The action plan correctly identifies all structural execution gaps. It does not include a document synchronization task for the specific numerical inconsistencies identified above. These are editorial fixes (30–60 minutes total) but will be missed if not explicitly assigned.

---

## 5. Final Verdict

**OVERALL CORPUS: CONDITIONAL FAIL**

The corpus is significantly improved from any prior state. The investor FAQ is excellent. The pitch deck v2 is structurally sound. The unit economics model is detailed and credible. The action plan is realistic and well-sequenced.

The corpus fails investor-readiness for two categories of reasons:

**Category A — Execution gaps (not editorial):** Five items the pitch deck's own pre-flight checklist calls mandatory are unresolved. These require real-world actions (hiring, legal engagement, customer acquisition), not document edits. The action plan correctly sequences these within 90 days.

**Category B — Editorial inconsistencies (fixable in under 2 hours):** The numerical inconsistencies catalogued above — particularly Year 1 ARR labeling, Year 2 ARR ($5.5M stale in exec summary), Chainalysis valuation ($8.6B on Slide 16), Phase 3 timing (Q1 2027 in exec summary), and the Series A KYA milestone — will be noticed by any VC who reads more than one document. These do not require new research or decisions. They require three targeted edits to the executive summary and one edit to Slide 16.

**The corpus passes on:** Market analysis, regulatory framing, competitive analysis, unit economics logic, investor FAQ completeness, stress-test scenarios, exit narrative, and pricing model consistency within any single document.

**The corpus fails on:** Cross-document numerical alignment (specifically exec summary), five mandatory checklist items remaining open, and COGS presentation requiring volume-basis context.

---

## 6. Top 5 Improvements for Next Iteration

**1. Synchronize the executive summary with pitch deck v2 (highest priority editorial fix).**
Four specific changes: Year 2 ARR ($5.5M → "$2M–$3M base / $5.6M upside"); Phase 3 timing (Q1 2027 → 2027–2028); Series A KYA milestone ("regulatory guidance" → "protocol adoption"); pre-seed range (ensure $750K–$1.5M is stated consistently throughout, not $500K–$2M in any section). Estimated time: 45 minutes. Blocking impact: any VC who reads both documents will catch these.

**2. Fix Chainalysis valuation on Slide 16 from $8.6B to $2.5B (current).**
The exit narrative is the strongest closing argument in the deck. Citing a peak 2022 valuation as a current figure undermines precisely the slide where credibility matters most. One-line edit.

**3. Standardize Year 1 ARR labeling with explicit scenario tags across all three documents.**
The FAQ answer to Q1 currently cites both $300K–$810K. Unit economics says $810K. Pitch deck says $300K–$550K. Resolution: define two canonical figures — "Year 1 ending ARR run rate: ~$810K" and "Year 1 blended revenue (cash received): ~$430K" — and use these labels consistently everywhere. This turns a credibility gap into a demonstration of financial precision.

**4. Reconcile cumulative Year 1 volume across pitch deck ($50M–$100M) and unit economics ($300M).**
The unit economics' own quarterly model implies ~$130M–$150M cumulative, not $300M (the $300M figure in Section 7.1 appears to be a calculation error). Correcting the unit economics to ~$150M cumulative, and explaining that the SOM's $50M–$100M is a conservative target while the model's $150M is the plan-of-record, removes a potential due diligence flag.

**5. Add a "Definitions and Assumptions" header to the unit economics document.**
The unit economics model is the most detailed and credible financial document in the corpus. Its weakness is implicit assumptions — volume basis for per-tx costs, average invoice size ($25K), churn rate (3%/month Year 1). These assumptions are stated in the body but not summarized. A one-page "key assumptions" table at the top of Section 6 would allow a VC's associate to immediately test sensitivities without reading through the full model. This is standard practice for financial models shared in due diligence.

---

*Consistency check completed: March 20, 2026*
*All six corpus documents reviewed in full.*
*Document accuracy: Cross-document numerical consistency rated 6.5/10. Single-document internal consistency rated 8.5/10. Editorial fixes required before investor distribution: see Category B above.*
