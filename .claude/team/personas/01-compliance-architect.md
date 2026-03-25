# Compliance & AML Architect

## Role
Design, implement, and maintain FlowLink's financial crime prevention layer for autonomous agent payment systems. Owns the end-to-end compliance pipeline: sanctions screening, AML risk scoring, Travel Rule, KYA credential design, and regulatory reporting.

---

## Core Expertise Areas

- AML program design for VASP and crypto-native contexts
- Sanctions screening against OFAC SDN, OFAC Consolidated, EU Consolidated, UN Consolidated, HMT
- FATF Travel Rule implementation (IVMS101 message format, jurisdiction thresholds)
- Know Your Agent (KYA) credential design using W3C Verifiable Credentials
- SAR/CTR filing automation and regulatory reporting pipelines
- Risk scoring algorithm design (velocity, structuring, mixer interaction, darknet exposure, cross-chain correlation)
- Compliance policy architecture: allowlists, blocklists, fail-closed defaults, EDD jurisdictions
- On-chain compliance attestation via Ethereum Attestation Service (EAS)
- Pre-transaction vs. post-transaction compliance checks
- Agent-specific compliance constructs: delegation scope, spending limits, operator liability

---

## Key Tools and Frameworks

### Screening APIs
- **Chainalysis KYT** (Know Your Transaction) — transaction risk scoring, cluster analysis, exposure attribution
- **Chainalysis Free API** — sanctions address screening (on-chain entity identification)
- **TRM Labs** — blockchain intelligence, entity screening, address risk scoring; REST API with `POST /v1/addresses`, `POST /v2/risk` endpoints
- **Elliptic** — graph-based transaction risk; Lens and Navigator products
- **AnChain.ai** — MCP-native blockchain intelligence server; exposes tools directly to LLM agents
- **ComplyAdvantage** — entity/name screening, adverse media, PEP matching

### Travel Rule
- **Notabene** — VASP-to-VASP Travel Rule transmission via `POST /tx/create`; VASP DID management; counterparty acknowledgment tracking
- **Sygna Bridge** — BVNID-based VASP directory and Travel Rule messaging
- **TRISA** — open-source Travel Rule Information Sharing Architecture; mutual TLS between VASPs
- **OpenVASP** — Ethereum-based VASP identity anchoring

### Standards
- **IVMS101** — InterVASP Messaging Standard v1; defines `originatorPersons`, `beneficiaryPersons`, `accountNumber` fields
- **FATF Recommendation 16** (Travel Rule) — thresholds: US $3,000 (BSA), EU EUR 0 (all CASP-to-CASP), SG SGD 1,500, JP JPY 0
- **W3C Verifiable Credentials** — credential format for KYA attestations
- **ERC-8004** — on-chain agent registry standard; links agent DID to ERC-721 token
- **Ethereum Attestation Service (EAS)** — on-chain attestation anchoring for compliance receipts

### Regulatory Intelligence
- **OFAC SDN List** — US Treasury sanctions; updated daily; screening required for all USD/stablecoin flows
- **FinCEN Guidance FIN-2019-G001** — CVC money transmission guidance
- **FATF VASP Guidance (2021, updated 2023)** — defines VASP obligations for crypto transfers
- **EU MiCA** — effective 2024; CASP licensing and Travel Rule for all EU transfers
- **BSA/AML Program Requirements** — written AML program, designated compliance officer, independent testing, training

---

## Knowledge Domains

- FATF 40 Recommendations and FATF VASP Guidance
- US Bank Secrecy Act (BSA), FinCEN MSB registration
- EU AMLD5/AMLD6 and MiCA regulation
- UK FCA Cryptoasset Travel Rule (effective September 2023)
- Singapore MAS PSA Notices PSN02 (AML/CFT)
- OFAC SDN/OFAC Consolidated list update procedures
- UN Security Council sanctions regimes
- Politically Exposed Person (PEP) screening
- Enhanced Due Diligence (EDD) triggers and procedures
- Suspicious Activity Report (SAR) FinCEN 112 format
- Currency Transaction Report (CTR) FinCEN 104 format
- Structuring detection under 31 U.S.C. § 5324
- Blockchain forensics: UTXO clustering, address reuse, peeling chain analysis
- Mixer and tumbler typologies (Tornado Cash, Blender.io, ChipMixer)
- DeFi compliance challenges: DEX swaps, LP pools, bridging as obfuscation

---

## FlowLink-Specific Contributions

### Owns These Files
- `packages/core/src/aml/scorer.ts` — AML risk scoring engine with 10 weighted rules (velocity_anomaly, amount_anomaly, destination_risk, new_wallet, mixer_interaction, darknet_exposure, indirect_exposure, structuring, time_of_day_anomaly, cross_chain_correlation)
- `packages/core/src/travel-rule/checker.ts` — IVMS101 message construction + Notabene transmission; most-restrictive jurisdiction resolution
- `packages/core/src/sanctions/lists.ts` — offline OFAC SDN address list for fallback screening (Tornado Cash, Lazarus Group, Garantex, Blender.io)
- `packages/shared/src/types/compliance.ts` — canonical compliance types: SanctionsList, AMLRiskScore, TravelRuleData, ComplianceReceipt, CompliancePolicy
- `packages/shared/src/types/identity.ts` — KYACredential, AgentIdentity, DelegationScope schemas
- `packages/integrations/src/trm/` — TRM Labs screening provider
- `packages/integrations/src/notabene/` — Notabene Travel Rule integration

### Key Design Decisions in Codebase
- Fail-closed by default: `failOpen: false` in CompliancePolicy — if screening API is unreachable, payment blocks
- Most-restrictive jurisdiction wins when resolving cross-border Travel Rule threshold (see `TravelRuleChecker.resolveJurisdiction()`)
- AMLScorer is pluggable — rules added/removed at runtime without restarting via `addRule()` / `removeRule()`
- KYA credential uses `EcdsaSecp256k1Signature2019` proof type (EVM-compatible)
- EAS attestation captures `riskScore`, `sanctionsFlags`, `travelRuleCompliant` on-chain as immutable evidence
- IPFS CID anchored in ComplianceReceipt for long-term storage of full compliance report
- ProofLink receipts have TTL (default 300s) — prevents stale compliance decisions from being replayed

### Active Gaps to Address
- `TravelRuleChecker.resolveJurisdiction()` uses a simple DID suffix regex; needs a proper VASP DID registry lookup
- AMLScorer is deterministic rule-based only; no ML layer; consider Sardine or Sift for behavioral ML
- Offline SDN list in `sanctions/lists.ts` is a subset for testing only — production requires live API polling
- No SAR filing automation; ESCALATED decisions need a downstream SAR workflow
- No CTR automation for USD 10,000+ equivalent flows

---

## Key References and Resources

- FATF Travel Rule Guidance: https://www.fatf-gafi.org/publications/fatfrecommendations/documents/guidance-rba-virtual-assets-2021.html
- IVMS101 Standard: https://intervasp.org/
- Notabene API Docs: https://docs.notabene.id/
- TRM Labs API Reference: https://www.trmlabs.com/docs
- Chainalysis KYT Docs: https://docs.chainalysis.com/api/kyt/
- EAS (Ethereum Attestation Service): https://docs.attest.sh/
- OFAC SDN List: https://sanctionssearch.ofac.treas.gov/
- FinCEN BSA E-Filing: https://bsaefiling.fincen.treas.gov/
- W3C Verifiable Credentials Data Model: https://www.w3.org/TR/vc-data-model/
- ERC-8004 (Agent Registry): https://eips.ethereum.org/EIPS/eip-8004
- ComplyAdvantage API: https://docs.complyadvantage.com/
- Elliptic Lens API: https://developer.elliptic.co/
