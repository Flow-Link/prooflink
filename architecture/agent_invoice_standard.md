---
title: "AIS-1: Agent Invoice Standard"
description: A JSON-LD invoice schema for autonomous agent commerce, bridging on-chain payment proofs to enterprise accounting systems with embedded compliance attestation, work verification, and tax handling.
author: ProofLink Contributors
status: Draft
type: Standards Track
category: Application
created: 2026-03-20
requires: KYA-1, ERC-8004, ERC-8183, W3C Verifiable Credentials Data Model v2.0
---

## Abstract

AIS-1 defines a machine-readable, JSON-LD invoice schema purpose-built for autonomous agent commerce. It links six data domains that no existing invoice standard connects: agent identity (ERC-8004), payment proof (x402/MPP/AP2/ACP transaction evidence), work proof (ERC-8183 evaluator attestation), compliance attestation (ProofLink receipt), tax obligation, and dispute resolution terms. AIS-1 invoices are generated and consumed by autonomous agents without human intervention, anchored on IPFS with a commitment hash on Base or Ethereum for tamper evidence, and mapped bidirectionally to UBL/Peppol BIS 3.0 for integration with enterprise ERP systems (NetSuite, SAP S/4HANA, QuickBooks). The standard is open (Apache 2.0), protocol-agnostic, and designed for the three transaction modes of the agent economy: Human-to-Human (H2H), Human-to-Agent (H2A), and Agent-to-Agent (A2A).

---

## 1. Motivation

### 1.1 The Invoice Gap in Agent Commerce

As of March 2026, six competing agent payment protocols (x402, MPP, AP2, ACP, Visa TAP, Mastercard Agent Pay) have shipped. All of them produce payment proofs -- transaction hashes, session tokens, mandate confirmations. None of them produce invoices.

An invoice is not a payment proof. An invoice is a structured claim that states: *who performed what work, at what rate, for whom, with what tax obligation, under what compliance regime, payable by when, disputable how.* Without this structure, agent payments are opaque to every system downstream of settlement: accounting, tax reporting, auditing, ERP reconciliation, regulatory examination, and dispute resolution.

The gap is quantifiable. Enterprise AP systems require structured invoice data to post journal entries. 39% of enterprise invoices already contain errors (RecVue, Oct 2025). Adding autonomous agents that generate unstructured payment hashes into this workflow guarantees reconciliation failure at scale.

### 1.2 Why Existing Invoice Standards Fail for Agent Commerce

| Standard | Design Era | Agent Identity | Payment Protocol | Compliance Attestation | Work Proof | Dispute Terms |
|----------|-----------|----------------|-----------------|----------------------|------------|---------------|
| **UBL 2.3 / Peppol BIS 3.0** | 2006/2017 | None -- assumes human parties with VAT IDs | None -- assumes bank transfer or card | None | None | None -- assumes legal jurisdiction |
| **ZUGFeRD 2.4** | 2024 | None | None | None | None | None |
| **Request Network** | 2017 | Wallet address only | Ethereum-native only | None | None | None |
| **x402 PaymentPayload** | 2025 | Wallet address | x402 only | None | None | None |
| **ERC-8183 Job** | 2026 | ERC-8004 agentId | On-chain escrow only | None | Evaluator attestation | Evaluator-based |
| **PayPal MCP Invoice** | 2026 | PayPal account | PayPal only | None | None | PayPal disputes |

Every existing standard was designed for a world where both transacting parties are humans (or human-controlled legal entities), the payment rail is known in advance, compliance is handled out-of-band, and disputes follow established legal procedure. None of these assumptions hold in agent-to-agent commerce.

### 1.3 What AIS-1 Solves

AIS-1 is the missing link between six disconnected systems:

```
ERC-8004 (who)  ──┐
                   │
x402/MPP/AP2/ACP  ─┤
(payment proof)    │
                   ├──▶  AIS-1 Invoice  ──▶  ERP (NetSuite/SAP/QB)
ERC-8183           │     (JSON-LD)           Audit trail
(work proof)       │                         Tax reporting
                   │                         Regulatory examination
ProofLink receipt ─┤
(compliance)       │
                   │
Tax jurisdiction  ─┘
(obligation)
```

### 1.4 Design Goals

1. **Machine-first.** AIS-1 invoices MUST be generated, transmitted, parsed, validated, and settled by autonomous agents without human intervention.
2. **Human-readable.** AIS-1 invoices MUST render to a human-readable format (PDF, HTML) for audit and approval workflows.
3. **Protocol-agnostic.** AIS-1 MUST support payment proofs from any protocol (x402, MPP, AP2, ACP, direct stablecoin transfer) without schema modification.
4. **Compliance-native.** Every AIS-1 invoice MUST reference the compliance attestation that cleared the underlying transaction, or explicitly declare `complianceExempt: true` with a justification.
5. **ERP-compatible.** AIS-1 MUST map bidirectionally to UBL 2.3 Invoice and Peppol BIS Billing 3.0 without data loss in the core financial fields.
6. **Tamper-evident.** Finalized invoices MUST be content-addressed (IPFS CID) with the hash committed on-chain.
7. **Jurisdiction-aware.** Tax fields MUST accommodate VAT, GST, withholding tax, and sales tax across multiple jurisdictions without schema changes.

---

## 2. Specification

### 2.1 Terminology

| Term | Definition |
|------|-----------|
| **Invoice** | A structured payment claim from an issuer to a recipient for goods or services rendered |
| **Issuer** | The agent (or human principal acting through an agent) that performed work and claims payment |
| **Recipient** | The agent (or human principal) that received the work and owes payment |
| **Line Item** | A single billable unit within an invoice: description, quantity, unit, unit price, total |
| **Settlement Chain** | The blockchain network on which payment was or will be settled (e.g., `base:8453`, `ethereum:1`) |
| **Payment Proof** | Cryptographic evidence that payment was executed: transaction hash, protocol identifier, facilitator |
| **Work Proof** | Cryptographic evidence that work was performed: ERC-8183 evaluator attestation, job reference |
| **Compliance Stamp** | Reference to a ProofLink Compliance Receipt attesting that the transaction passed sanctions, AML, KYA, and Travel Rule checks |
| **Dispute Window** | The time period after invoice finalization during which either party may initiate a dispute |
| **Invoice State** | One of: `draft`, `issued`, `paid`, `settled`, `disputed`, `cancelled`, `void` |

### 2.2 JSON-LD Context Definition

The AIS-1 context extends schema.org and defines all invoice-specific terms.

```json
{
  "@context": {
    "@version": 1.1,
    "@protected": true,
    "ais": "https://prooflink.dev/ais/v1#",
    "schema": "https://schema.org/",
    "kya": "https://prooflink.dev/kya/v1#",
    "erc8004": "https://eips.ethereum.org/EIPS/eip-8004#",
    "erc8183": "https://eips.ethereum.org/EIPS/eip-8183#",

    "AgentInvoice": "ais:AgentInvoice",
    "InvoiceLineItem": "ais:InvoiceLineItem",
    "PaymentProof": "ais:PaymentProof",
    "WorkProof": "ais:WorkProof",
    "ComplianceStamp": "ais:ComplianceStamp",
    "TaxInfo": "ais:TaxInfo",
    "DisputeTerms": "ais:DisputeTerms",
    "PartyIdentity": "ais:PartyIdentity",

    "invoiceId": {
      "@id": "ais:invoiceId",
      "@type": "xsd:string"
    },
    "invoiceVersion": {
      "@id": "ais:invoiceVersion",
      "@type": "xsd:string"
    },
    "invoiceState": {
      "@id": "ais:invoiceState",
      "@type": "xsd:string"
    },
    "issuer": {
      "@id": "ais:issuer",
      "@type": "@id"
    },
    "recipient": {
      "@id": "ais:recipient",
      "@type": "@id"
    },
    "agentId": {
      "@id": "erc8004:agentId",
      "@type": "xsd:string"
    },
    "agentDID": {
      "@id": "ais:agentDID",
      "@type": "@id"
    },
    "principalEntity": {
      "@id": "ais:principalEntity",
      "@type": "@id"
    },
    "kyaCredential": {
      "@id": "kya:credential",
      "@type": "@id"
    },
    "walletAddress": {
      "@id": "ais:walletAddress",
      "@type": "xsd:string"
    },
    "humanPrincipal": {
      "@id": "ais:humanPrincipal",
      "@type": "@id"
    },
    "entityName": {
      "@id": "schema:legalName",
      "@type": "xsd:string"
    },
    "vLEI": {
      "@id": "ais:vLEI",
      "@type": "xsd:string"
    },
    "lineItems": {
      "@id": "ais:lineItems",
      "@type": "@id",
      "@container": "@list"
    },
    "description": {
      "@id": "schema:description",
      "@type": "xsd:string"
    },
    "quantity": {
      "@id": "schema:amount",
      "@type": "xsd:decimal"
    },
    "unit": {
      "@id": "schema:unitCode",
      "@type": "xsd:string"
    },
    "unitPrice": {
      "@id": "schema:price",
      "@type": "xsd:decimal"
    },
    "lineTotal": {
      "@id": "ais:lineTotal",
      "@type": "xsd:decimal"
    },
    "serviceCategory": {
      "@id": "ais:serviceCategory",
      "@type": "xsd:string"
    },
    "periodStart": {
      "@id": "ais:periodStart",
      "@type": "xsd:dateTime"
    },
    "periodEnd": {
      "@id": "ais:periodEnd",
      "@type": "xsd:dateTime"
    },
    "subtotalAmount": {
      "@id": "ais:subtotalAmount",
      "@type": "xsd:decimal"
    },
    "taxAmount": {
      "@id": "ais:taxAmount",
      "@type": "xsd:decimal"
    },
    "totalAmount": {
      "@id": "ais:totalAmount",
      "@type": "xsd:decimal"
    },
    "currency": {
      "@id": "schema:priceCurrency",
      "@type": "xsd:string"
    },
    "settlementChain": {
      "@id": "ais:settlementChain",
      "@type": "xsd:string"
    },
    "issuedAt": {
      "@id": "schema:datePublished",
      "@type": "xsd:dateTime"
    },
    "dueAt": {
      "@id": "schema:paymentDueDate",
      "@type": "xsd:dateTime"
    },
    "paidAt": {
      "@id": "ais:paidAt",
      "@type": "xsd:dateTime"
    },
    "paymentProof": {
      "@id": "ais:paymentProof",
      "@type": "@id"
    },
    "protocol": {
      "@id": "ais:protocol",
      "@type": "xsd:string"
    },
    "txHash": {
      "@id": "ais:txHash",
      "@type": "xsd:string"
    },
    "facilitator": {
      "@id": "ais:facilitator",
      "@type": "xsd:string"
    },
    "blockNumber": {
      "@id": "ais:blockNumber",
      "@type": "xsd:integer"
    },
    "sessionId": {
      "@id": "ais:sessionId",
      "@type": "xsd:string"
    },
    "mandateHash": {
      "@id": "ais:mandateHash",
      "@type": "xsd:string"
    },
    "workProof": {
      "@id": "ais:workProof",
      "@type": "@id"
    },
    "standard": {
      "@id": "ais:standard",
      "@type": "xsd:string"
    },
    "evaluatorAttestation": {
      "@id": "ais:evaluatorAttestation",
      "@type": "xsd:string"
    },
    "jobId": {
      "@id": "erc8183:jobId",
      "@type": "xsd:string"
    },
    "evaluatorAddress": {
      "@id": "ais:evaluatorAddress",
      "@type": "xsd:string"
    },
    "deliverableHash": {
      "@id": "ais:deliverableHash",
      "@type": "xsd:string"
    },
    "complianceStamp": {
      "@id": "ais:complianceStamp",
      "@type": "@id"
    },
    "proofLinkReceiptId": {
      "@id": "ais:proofLinkReceiptId",
      "@type": "xsd:string"
    },
    "ipfsHash": {
      "@id": "ais:ipfsHash",
      "@type": "xsd:string"
    },
    "sanctionsCleared": {
      "@id": "ais:sanctionsCleared",
      "@type": "xsd:boolean"
    },
    "sanctionsListsChecked": {
      "@id": "ais:sanctionsListsChecked",
      "@type": "@id",
      "@container": "@list"
    },
    "sanctionsScreenTimestamp": {
      "@id": "ais:sanctionsScreenTimestamp",
      "@type": "xsd:dateTime"
    },
    "travelRuleTransmitted": {
      "@id": "ais:travelRuleTransmitted",
      "@type": "xsd:boolean"
    },
    "travelRuleProtocol": {
      "@id": "ais:travelRuleProtocol",
      "@type": "xsd:string"
    },
    "jurisdictionsApplied": {
      "@id": "ais:jurisdictionsApplied",
      "@type": "xsd:string",
      "@container": "@list"
    },
    "complianceExempt": {
      "@id": "ais:complianceExempt",
      "@type": "xsd:boolean"
    },
    "exemptionReason": {
      "@id": "ais:exemptionReason",
      "@type": "xsd:string"
    },
    "taxInfo": {
      "@id": "ais:taxInfo",
      "@type": "@id"
    },
    "vatApplicable": {
      "@id": "ais:vatApplicable",
      "@type": "xsd:boolean"
    },
    "vatRate": {
      "@id": "ais:vatRate",
      "@type": "xsd:decimal"
    },
    "vatAmount": {
      "@id": "ais:vatAmount",
      "@type": "xsd:decimal"
    },
    "vatRegistrationId": {
      "@id": "ais:vatRegistrationId",
      "@type": "xsd:string"
    },
    "withholdingTaxRate": {
      "@id": "ais:withholdingTaxRate",
      "@type": "xsd:decimal"
    },
    "withholdingTaxAmount": {
      "@id": "ais:withholdingTaxAmount",
      "@type": "xsd:decimal"
    },
    "taxJurisdiction": {
      "@id": "ais:taxJurisdiction",
      "@type": "xsd:string"
    },
    "taxCategory": {
      "@id": "ais:taxCategory",
      "@type": "xsd:string"
    },
    "reverseCharge": {
      "@id": "ais:reverseCharge",
      "@type": "xsd:boolean"
    },
    "disputeTerms": {
      "@id": "ais:disputeTerms",
      "@type": "@id"
    },
    "disputeWindow": {
      "@id": "ais:disputeWindow",
      "@type": "xsd:duration"
    },
    "disputeOracleContract": {
      "@id": "ais:disputeOracleContract",
      "@type": "xsd:string"
    },
    "disputeOracleType": {
      "@id": "ais:disputeOracleType",
      "@type": "xsd:string"
    },
    "disputeStakeRequired": {
      "@id": "ais:disputeStakeRequired",
      "@type": "xsd:decimal"
    },
    "escalationPath": {
      "@id": "ais:escalationPath",
      "@type": "xsd:string"
    },
    "anchorHash": {
      "@id": "ais:anchorHash",
      "@type": "xsd:string"
    },
    "anchorChain": {
      "@id": "ais:anchorChain",
      "@type": "xsd:string"
    },
    "anchorTxHash": {
      "@id": "ais:anchorTxHash",
      "@type": "xsd:string"
    },
    "previousInvoiceId": {
      "@id": "ais:previousInvoiceId",
      "@type": "xsd:string"
    },
    "relatedInvoices": {
      "@id": "ais:relatedInvoices",
      "@type": "xsd:string",
      "@container": "@list"
    },
    "memo": {
      "@id": "ais:memo",
      "@type": "xsd:string"
    }
  }
}
```

### 2.3 Invoice Schema

An AIS-1 `AgentInvoice` is a JSON-LD document with the following structure. Fields marked **REQUIRED** MUST be present. Fields marked **CONDITIONAL** MUST be present when their condition is met. Fields marked **OPTIONAL** MAY be omitted.

#### 2.3.1 Top-Level Fields

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@context` | array | REQUIRED | Must include `"https://schema.org"` and `"https://prooflink.dev/ais/v1"` |
| `@type` | string | REQUIRED | Must be `"AgentInvoice"` |
| `invoiceId` | string | REQUIRED | Globally unique identifier. Format: `ais_{issuerPrefix}_{YYYY}_{random12}` |
| `invoiceVersion` | string | REQUIRED | Schema version. This specification defines `"1.0"` |
| `invoiceState` | enum | REQUIRED | One of: `draft`, `issued`, `paid`, `settled`, `disputed`, `cancelled`, `void` |
| `issuer` | PartyIdentity | REQUIRED | The party claiming payment (see 2.3.2) |
| `recipient` | PartyIdentity | REQUIRED | The party owing payment (see 2.3.2) |
| `lineItems` | array[InvoiceLineItem] | REQUIRED | One or more line items (see 2.3.3). MUST contain at least one item |
| `subtotalAmount` | decimal | REQUIRED | Sum of all `lineTotal` values before tax |
| `taxAmount` | decimal | REQUIRED | Total tax amount. `0` if no tax applies |
| `totalAmount` | decimal | REQUIRED | `subtotalAmount + taxAmount` |
| `currency` | string | REQUIRED | ISO 4217 code or stablecoin symbol: `USDC`, `EURC`, `USDT`, `USD`, `EUR` |
| `settlementChain` | string | REQUIRED | CAIP-2 chain identifier (e.g., `eip155:8453` for Base, `eip155:1` for Ethereum, `solana:mainnet`) or `"fiat"` for off-chain settlement |
| `issuedAt` | ISO 8601 datetime | REQUIRED | When the invoice was issued |
| `dueAt` | ISO 8601 datetime | CONDITIONAL | REQUIRED when `invoiceState` is `issued`. Payment deadline |
| `paidAt` | ISO 8601 datetime | CONDITIONAL | REQUIRED when `invoiceState` is `paid` or `settled` |
| `paymentProof` | PaymentProof | CONDITIONAL | REQUIRED when `invoiceState` is `paid` or `settled` (see 2.3.4) |
| `workProof` | WorkProof | OPTIONAL | Evidence of work performed (see 2.3.5) |
| `complianceStamp` | ComplianceStamp | CONDITIONAL | REQUIRED unless `complianceExempt` is `true` (see 2.3.6) |
| `taxInfo` | TaxInfo | REQUIRED | Tax classification and amounts (see 2.3.7) |
| `disputeTerms` | DisputeTerms | REQUIRED | How disputes are handled (see 2.3.8) |
| `anchorHash` | string | OPTIONAL | IPFS CID of the finalized invoice document |
| `anchorChain` | string | OPTIONAL | Chain where `anchorHash` commitment is stored |
| `anchorTxHash` | string | OPTIONAL | Transaction hash of the on-chain anchor commitment |
| `previousInvoiceId` | string | OPTIONAL | For credit notes or amended invoices: the original invoice ID |
| `relatedInvoices` | array[string] | OPTIONAL | IDs of related invoices (recurring series, split payments) |
| `memo` | string | OPTIONAL | Free-text note (max 500 characters) |

#### 2.3.2 PartyIdentity

A `PartyIdentity` identifies one side of the invoice. It MUST contain enough information to resolve the party to either an ERC-8004 agent or a legal entity.

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"PartyIdentity"` |
| `agentId` | string | CONDITIONAL | REQUIRED for agent parties. ERC-8004 identifier: `erc8004:{chainId}:{registryAddress}:{tokenId}` |
| `agentDID` | string | OPTIONAL | W3C DID of the agent: `did:ethr:0x...` or `did:pkh:...` |
| `principalEntity` | object | REQUIRED | The legal entity or human principal responsible for this party |
| `principalEntity.entityName` | string | REQUIRED | Legal name of the controlling entity |
| `principalEntity.vLEI` | string | CONDITIONAL | REQUIRED for B2B invoices. GLEIF Legal Entity Identifier (20 characters) |
| `principalEntity.jurisdiction` | string | REQUIRED | ISO 3166-1 alpha-2 country code of the principal's jurisdiction |
| `principalEntity.registrationId` | string | OPTIONAL | National business registration number |
| `humanPrincipal` | object | OPTIONAL | The natural person who authorized this agent |
| `humanPrincipal.did` | string | OPTIONAL | DID of the authorizing human: `did:world:0x...`, `did:key:...` |
| `humanPrincipal.humanVerification` | string | OPTIONAL | Verification method: `world_id_zk_proof`, `kyc_credential`, `verifiable_intent` |
| `kyaCredential` | string | CONDITIONAL | REQUIRED for agent parties. URI of the agent's KYA-1 Verifiable Credential |
| `walletAddress` | string | CONDITIONAL | REQUIRED when `settlementChain` is not `"fiat"`. The wallet address for settlement |

#### 2.3.3 InvoiceLineItem

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"InvoiceLineItem"` |
| `description` | string | REQUIRED | Human-readable description of the service or good |
| `serviceCategory` | string | REQUIRED | Machine-readable category. Enumerated values: `api_call`, `inference`, `compute`, `storage`, `data_retrieval`, `code_generation`, `analysis`, `content_creation`, `orchestration`, `physical_good`, `subscription`, `consulting`, `other` |
| `quantity` | decimal | REQUIRED | Number of units consumed |
| `unit` | string | REQUIRED | Unit of measure: `api_call`, `token`, `gpu_second`, `gb_hour`, `request`, `hour`, `item`, `word`, `image`, `unit` |
| `unitPrice` | decimal | REQUIRED | Price per unit in the invoice `currency` |
| `lineTotal` | decimal | REQUIRED | `quantity * unitPrice` |
| `periodStart` | ISO 8601 datetime | OPTIONAL | Start of the billing period for this line item |
| `periodEnd` | ISO 8601 datetime | OPTIONAL | End of the billing period |
| `metadata` | object | OPTIONAL | Protocol-specific or domain-specific metadata (freeform key-value) |

#### 2.3.4 PaymentProof

Evidence that payment was executed. The structure accommodates all six agent payment protocols.

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"PaymentProof"` |
| `protocol` | string | REQUIRED | Payment protocol: `x402`, `mpp`, `ap2`, `acp`, `visa_tap`, `mc_agent_pay`, `direct_transfer`, `bank_wire`, `other` |
| `txHash` | string | CONDITIONAL | REQUIRED for on-chain protocols. Transaction hash on the settlement chain |
| `facilitator` | string | OPTIONAL | The payment facilitator (e.g., `cdp.coinbase.com`, `stripe.com`, `tempo.network`) |
| `blockNumber` | integer | OPTIONAL | Block number containing the transaction |
| `sessionId` | string | OPTIONAL | MPP session identifier, when `protocol` is `mpp` |
| `mandateHash` | string | OPTIONAL | AP2 mandate hash, when `protocol` is `ap2` |
| `cardNetworkRef` | string | OPTIONAL | Card network reference, when `protocol` is `visa_tap`, `mc_agent_pay`, or `acp` |
| `paymentTimestamp` | ISO 8601 datetime | REQUIRED | When the payment was confirmed |

#### 2.3.5 WorkProof

Evidence that work was performed. Ties the invoice to verifiable deliverables.

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"WorkProof"` |
| `standard` | string | REQUIRED | Work verification standard: `ERC-8183`, `self_attested`, `third_party_attestation`, `oracle_verified` |
| `evaluatorAttestation` | string | CONDITIONAL | REQUIRED when `standard` is `ERC-8183`. Signed attestation from the ERC-8183 evaluator |
| `jobId` | string | CONDITIONAL | REQUIRED when `standard` is `ERC-8183`. Format: `erc8183:{chainId}:{contractAddress}:{jobId}` |
| `evaluatorAddress` | string | OPTIONAL | Ethereum address of the evaluator |
| `deliverableHash` | string | OPTIONAL | Content hash (IPFS CID or SHA-256) of the deliverable |
| `deliverableURI` | string | OPTIONAL | URI where the deliverable can be retrieved |
| `completedAt` | ISO 8601 datetime | REQUIRED | When work was completed |

#### 2.3.6 ComplianceStamp

Links the invoice to the compliance attestation that cleared the underlying transaction.

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"ComplianceStamp"` |
| `proofLinkReceiptId` | string | REQUIRED | ProofLink ProofLink receipt identifier |
| `ipfsHash` | string | REQUIRED | IPFS CID of the full compliance receipt |
| `easAttestationId` | string | OPTIONAL | EAS attestation UID on-chain |
| `sanctionsCleared` | boolean | REQUIRED | Whether all applicable sanctions screens passed |
| `sanctionsListsChecked` | array[string] | REQUIRED | Lists checked: `OFAC_SDN`, `EU_CFSL`, `UN_SCL`, `HMT_CFL` |
| `sanctionsScreenTimestamp` | ISO 8601 datetime | REQUIRED | When sanctions screening was performed |
| `amlRiskScore` | integer | OPTIONAL | AML risk score (0-100, lower is safer) |
| `amlThresholdApplied` | integer | OPTIONAL | The threshold used for pass/fail determination |
| `travelRuleTransmitted` | boolean | REQUIRED | Whether Travel Rule data was transmitted |
| `travelRuleProtocol` | string | CONDITIONAL | REQUIRED when `travelRuleTransmitted` is `true`. Protocol used: `notabene`, `trisa`, `sygna`, `openvasp` |
| `travelRuleExemptionReason` | string | CONDITIONAL | REQUIRED when `travelRuleTransmitted` is `false`. Reason: `below_threshold`, `same_vasp`, `not_applicable` |
| `jurisdictionsApplied` | array[string] | REQUIRED | ISO 3166-1 alpha-2 codes of jurisdictions whose rules were applied |
| `kyaVerified` | boolean | OPTIONAL | Whether KYA verification was performed on the agent parties |

When the transaction is exempt from compliance (e.g., internal transfers, test transactions), the invoice MAY omit `complianceStamp` and instead set these top-level fields:

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `complianceExempt` | boolean | CONDITIONAL | `true` when no compliance checks were required |
| `exemptionReason` | string | CONDITIONAL | REQUIRED when `complianceExempt` is `true`. Reason for exemption |

#### 2.3.7 TaxInfo

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"TaxInfo"` |
| `vatApplicable` | boolean | REQUIRED | Whether VAT/GST applies |
| `vatRate` | decimal | CONDITIONAL | REQUIRED when `vatApplicable` is `true`. Rate as a percentage (e.g., `19.0`) |
| `vatAmount` | decimal | CONDITIONAL | REQUIRED when `vatApplicable` is `true`. Absolute VAT amount |
| `vatRegistrationId` | string | OPTIONAL | Issuer's VAT/GST registration number |
| `withholdingTaxRate` | decimal | REQUIRED | Withholding tax rate. `0` when none applies |
| `withholdingTaxAmount` | decimal | REQUIRED | Absolute withholding tax amount |
| `taxJurisdiction` | string | REQUIRED | ISO 3166-1 alpha-2 code of the tax jurisdiction |
| `taxCategory` | string | REQUIRED | Tax classification: `standard`, `reduced`, `zero_rated`, `exempt`, `reverse_charge`, `not_subject` |
| `reverseCharge` | boolean | REQUIRED | Whether reverse charge mechanism applies (common in cross-border EU B2B) |

#### 2.3.8 DisputeTerms

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `@type` | string | REQUIRED | `"DisputeTerms"` |
| `disputeWindow` | ISO 8601 duration | REQUIRED | Time after `paidAt` during which a dispute may be opened. e.g., `PT72H` (72 hours), `P7D` (7 days) |
| `disputeOracleContract` | string | CONDITIONAL | REQUIRED for on-chain dispute resolution. Contract address of the dispute oracle |
| `disputeOracleType` | string | REQUIRED | Dispute resolution mechanism: `erc8183_evaluator`, `kamiyo`, `kleros`, `uma_optimistic`, `circle_refund`, `manual`, `card_chargeback` |
| `disputeStakeRequired` | decimal | OPTIONAL | Amount (in `currency`) the disputing party must stake |
| `escalationPath` | string | OPTIONAL | Fallback if primary dispute mechanism fails: `legal_arbitration`, `card_network`, `none` |

### 2.4 Invoice State Machine

```
                  ┌──────────┐
                  │  draft   │
                  └────┬─────┘
                       │ finalize()
                       v
                  ┌──────────┐       cancel()      ┌───────────┐
                  │  issued  │──────────────────────▶│ cancelled │
                  └────┬─────┘                      └───────────┘
                       │ recordPayment()
                       v
                  ┌──────────┐       openDispute()  ┌───────────┐
                  │   paid   │──────────────────────▶│ disputed  │
                  └────┬─────┘                      └─────┬─────┘
                       │ confirmSettlement()              │ resolveDispute()
                       v                                  │
                  ┌──────────┐                            │
                  │ settled  │◀───────────────────────────┘
                  └──────────┘        (if upheld)
                                          │
                                          │ (if reversed)
                                          v
                                     ┌──────────┐
                                     │   void   │
                                     └──────────┘
```

**State transition rules:**
- `draft` -> `issued`: Invoice MUST be complete (all REQUIRED fields populated). IPFS anchor SHOULD be created at this transition.
- `issued` -> `paid`: `paymentProof` MUST be attached. `complianceStamp` MUST be attached (or `complianceExempt` set).
- `issued` -> `cancelled`: Issuer cancels before payment. `previousInvoiceId` preserved for audit trail.
- `paid` -> `settled`: Settlement confirmed on-chain (block finality) or off-chain (bank confirmation). On-chain anchor MUST be created.
- `paid` -> `disputed`: Either party opens a dispute within `disputeWindow`.
- `disputed` -> `settled`: Dispute resolved in favor of current payment standing.
- `disputed` -> `void`: Dispute resolved in favor of reversal. Refund proof SHOULD be attached.

### 2.5 Invoice Identification

Invoice IDs MUST follow the format:

```
ais_{issuerPrefix}_{YYYY}_{random12}
```

Where:
- `ais_` is the fixed AIS namespace prefix
- `{issuerPrefix}` is a 2-8 character identifier for the issuer (e.g., `fl` for ProofLink, `acme` for Acme Corp)
- `{YYYY}` is the four-digit year
- `{random12}` is 12 alphanumeric characters (base36, lowercase)

Example: `ais_fl_2026_a7bk3mq9x2p1`

### 2.6 Cryptographic Integrity

#### 2.6.1 Invoice Signing

The issuer MUST sign the finalized invoice using one of:
- **EIP-712 typed data signature** (recommended for on-chain verification)
- **JWS (JSON Web Signature)** with the agent's DID key (recommended for off-chain verification)

The signature covers the canonical JSON-LD representation of the invoice (JSON-LD expansion + canonicalization per RDF Dataset Canonicalization 1.0).

#### 2.6.2 Content Addressing

Finalized invoices (state `issued` or later) SHOULD be stored as IPFS content-addressed documents. The IPFS CID is recorded in `anchorHash`.

#### 2.6.3 On-Chain Commitment

For invoices requiring tamper evidence, the `anchorHash` SHOULD be committed on-chain:

```
InvoiceRegistry.commitInvoice(
    invoiceId: bytes32,
    ipfsCid: bytes32,
    issuer: address,
    recipient: address,
    totalAmount: uint256,
    currency: bytes4,
    timestamp: uint256
)
```

This emits an event that indexers and auditors can query.

---

## 3. Interoperability with UBL / Peppol

### 3.1 Design Principle

AIS-1 is not a replacement for UBL/Peppol. It is a superset. Every AIS-1 invoice MUST be expressible as a valid UBL 2.3 Invoice document (with agent-specific fields mapped to UBL extension points). Every UBL 2.3 Invoice SHOULD be importable as an AIS-1 invoice (with agent-specific fields left empty).

### 3.2 Field Mapping: AIS-1 to UBL 2.3

| AIS-1 Field | UBL 2.3 Path | Notes |
|-------------|-------------|-------|
| `invoiceId` | `cbc:ID` | Direct mapping |
| `issuedAt` | `cbc:IssueDate` + `cbc:IssueTime` | Split date and time |
| `dueAt` | `cbc:DueDate` | Direct mapping |
| `issuer.principalEntity.entityName` | `cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName` | Legal entity name |
| `issuer.principalEntity.vLEI` | `cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID[@schemeID='LEI']` | LEI as company ID |
| `issuer.principalEntity.vatRegistrationId` | `cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID` | VAT number |
| `recipient.principalEntity.entityName` | `cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName` | Legal entity name |
| `recipient.principalEntity.vLEI` | `cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:CompanyID[@schemeID='LEI']` | LEI as company ID |
| `lineItems[n].description` | `cac:InvoiceLine[n]/cac:Item/cbc:Name` | Line item name |
| `lineItems[n].quantity` | `cac:InvoiceLine[n]/cbc:InvoicedQuantity` | With `@unitCode` from `unit` |
| `lineItems[n].unitPrice` | `cac:InvoiceLine[n]/cac:Price/cbc:PriceAmount` | With `@currencyID` |
| `lineItems[n].lineTotal` | `cac:InvoiceLine[n]/cbc:LineExtensionAmount` | Line total |
| `subtotalAmount` | `cac:LegalMonetaryTotal/cbc:LineExtensionAmount` | Pre-tax total |
| `taxAmount` | `cac:TaxTotal/cbc:TaxAmount` | Total tax |
| `totalAmount` | `cac:LegalMonetaryTotal/cbc:PayableAmount` | Grand total |
| `currency` | `cbc:DocumentCurrencyCode` | ISO 4217 mapping: `USDC`->`USD`, `EURC`->`EUR` |
| `taxInfo.vatRate` | `cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:Percent` | VAT percentage |
| `taxInfo.taxCategory` | `cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:ID` | UBL tax category code |

### 3.3 Agent-Specific Fields in UBL

Agent-specific fields that have no UBL equivalent are stored in `UBLExtensions`:

```xml
<ext:UBLExtensions>
  <ext:UBLExtension>
    <ext:ExtensionURI>https://prooflink.dev/ais/v1</ext:ExtensionURI>
    <ext:ExtensionContent>
      <ais:AgentInvoiceExtension>
        <ais:IssuerAgentId>erc8004:8453:0xABC...:42</ais:IssuerAgentId>
        <ais:RecipientAgentId>erc8004:8453:0xDEF...:99</ais:RecipientAgentId>
        <ais:SettlementChain>eip155:8453</ais:SettlementChain>
        <ais:PaymentProtocol>x402</ais:PaymentProtocol>
        <ais:TransactionHash>0xabc123...</ais:TransactionHash>
        <ais:WorkProofStandard>ERC-8183</ais:WorkProofStandard>
        <ais:WorkProofJobId>erc8183:8453:0x...:7</ais:WorkProofJobId>
        <ais:ComplianceReceiptId>pl_receipt_xyz</ais:ComplianceReceiptId>
        <ais:ComplianceReceiptIPFS>QmX...</ais:ComplianceReceiptIPFS>
        <ais:DisputeWindow>PT72H</ais:DisputeWindow>
        <ais:DisputeOracleContract>0x...</ais:DisputeOracleContract>
      </ais:AgentInvoiceExtension>
    </ext:ExtensionContent>
  </ext:UBLExtension>
</ext:UBLExtensions>
```

### 3.4 Peppol Access Point Integration

AIS-1 invoices transmitted through the Peppol network MUST:

1. Be converted to UBL 2.3 + AIS extension as shown above.
2. Use the Peppol BIS Billing 3.0 profile with `CustomizationID` set to `urn:cen.eu:en16931:2017#compliant#urn:prooflink.dev:ais:1.0`.
3. Register the AIS extension namespace with the Peppol Authority (pending; ProofLink to submit extension request).

### 3.5 ZUGFeRD 2.4 Compatibility

For jurisdictions requiring ZUGFeRD (Germany, France), AIS-1 invoices MUST:

1. Generate a PDF/A-3 visual representation.
2. Embed the UBL 2.3 + AIS extension XML as an attachment per ZUGFeRD 2.4 Factur-X specification.
3. The AIS-1 JSON-LD MAY be embedded as an additional attachment for machine consumers.

---

## 4. On-Chain Anchoring

### 4.1 Purpose

On-chain anchoring provides tamper evidence without storing invoice content on-chain. The full invoice is stored on IPFS; only a commitment hash is written to the blockchain.

### 4.2 Anchor Contract Interface

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

interface IAISInvoiceAnchor {

    event InvoiceAnchored(
        bytes32 indexed invoiceIdHash,
        bytes32 ipfsCid,
        address indexed issuer,
        address indexed recipient,
        uint256 totalAmount,
        bytes4 currency,
        uint256 timestamp
    );

    event InvoiceStateChanged(
        bytes32 indexed invoiceIdHash,
        uint8 previousState,
        uint8 newState,
        uint256 timestamp
    );

    /// @notice Anchor a finalized invoice on-chain.
    /// @param invoiceIdHash keccak256 of the invoiceId string
    /// @param ipfsCid The IPFS CID of the full invoice document (as bytes32)
    /// @param recipient The wallet address of the invoice recipient
    /// @param totalAmount Total invoice amount in smallest currency unit
    /// @param currency 4-byte currency code (e.g., "USDC")
    function anchorInvoice(
        bytes32 invoiceIdHash,
        bytes32 ipfsCid,
        address recipient,
        uint256 totalAmount,
        bytes4 currency
    ) external;

    /// @notice Record a state transition for an anchored invoice.
    /// @param invoiceIdHash keccak256 of the invoiceId string
    /// @param newState The new invoice state (enum as uint8)
    function updateState(
        bytes32 invoiceIdHash,
        uint8 newState
    ) external;

    /// @notice Verify an invoice anchor exists and matches.
    /// @param invoiceIdHash keccak256 of the invoiceId string
    /// @param ipfsCid Expected IPFS CID
    /// @return valid True if the anchor exists and CID matches
    function verifyAnchor(
        bytes32 invoiceIdHash,
        bytes32 ipfsCid
    ) external view returns (bool valid);
}
```

### 4.3 Chain Selection

| Chain | Use Case | Rationale |
|-------|----------|-----------|
| **Base (eip155:8453)** | Default for USDC-settled invoices | Low gas cost (~$0.001), fast finality, Coinbase ecosystem alignment |
| **Ethereum (eip155:1)** | High-value invoices, regulatory-sensitive | Maximum security, broad tooling support |
| **Solana** | x402 transactions on Solana | Native settlement chain |

Implementers SHOULD anchor on the same chain where settlement occurs to enable atomic verification.

### 4.4 EAS Integration (Optional)

Invoices MAY additionally be registered as EAS (Ethereum Attestation Service) attestations. The EAS schema:

```json
{
  "name": "AIS-1 Invoice Attestation",
  "schema": "bytes32 invoiceIdHash, bytes32 ipfsCid, address issuer, address recipient, uint256 totalAmount, bytes4 currency, uint8 state, uint256 issuedAt, uint256 dueAt",
  "resolver": "0x...",
  "revocable": true
}
```

This enables composable querying: "Show me all invoices issued by agent X that are in `disputed` state."

---

## 5. ERP Integration

### 5.1 Design Principle

Enterprise ERP systems (NetSuite, SAP S/4HANA, QuickBooks) expect invoices as structured records that map to General Ledger (GL) accounts. AIS-1 defines a canonical mapping from its schema to ERP journal entry fields. The integration is unidirectional at minimum (AIS-1 -> ERP) and bidirectional where supported.

### 5.2 GL Account Mapping

| AIS-1 Field | GL Concept | NetSuite Field | SAP S/4HANA Field | QuickBooks Field |
|-------------|-----------|----------------|-------------------|------------------|
| `issuer.principalEntity.entityName` | Vendor | `vendor.companyName` | `LFA1-NAME1` | `Vendor.DisplayName` |
| `recipient.principalEntity.entityName` | Customer | `customer.companyName` | `KNA1-NAME1` | `Customer.DisplayName` |
| `lineItems[n].description` | Item description | `item.displayName` | `EKPO-TXZ01` | `Line.Description` |
| `lineItems[n].serviceCategory` | GL account selector | Maps to expense account via lookup | Cost center + GL | Account category |
| `lineItems[n].lineTotal` | Line amount | `lineAmount` | `BSEG-WRBTR` | `Line.Amount` |
| `subtotalAmount` | Subtotal | `subtotal` | Document net | `TotalAmt` (pre-tax) |
| `taxInfo.vatAmount` | Tax | `taxAmount` | `BSET-FWSTE` | `TxnTaxDetail.TotalTax` |
| `totalAmount` | Total | `total` | `BKPF-WRBTR` | `TotalAmt` |
| `currency` | Currency | `currency.symbol` | `WAERS` | `CurrencyRef` |
| `invoiceId` | External reference | `externalId` | `BKPF-XBLNR` | `DocNumber` |
| `issuedAt` | Invoice date | `tranDate` | `BKPF-BLDAT` | `TxnDate` |
| `dueAt` | Due date | `dueDate` | `BSEG-ZFBDT` | `DueDate` |

### 5.3 Service Category to GL Account Mapping

Implementers MUST maintain a configurable mapping from AIS-1 `serviceCategory` values to GL account codes. The default mapping:

| `serviceCategory` | Default GL Category | Typical Account |
|-------------------|-------------------|-----------------|
| `api_call` | Software & SaaS | 6110 - Cloud Services |
| `inference` | Software & SaaS | 6110 - Cloud Services |
| `compute` | Infrastructure | 6120 - Compute Infrastructure |
| `storage` | Infrastructure | 6120 - Compute Infrastructure |
| `data_retrieval` | Data Services | 6130 - Data & Analytics |
| `code_generation` | Professional Services | 6200 - Contract Services |
| `analysis` | Professional Services | 6200 - Contract Services |
| `content_creation` | Marketing | 6300 - Marketing Services |
| `orchestration` | Software & SaaS | 6110 - Cloud Services |
| `physical_good` | Cost of Goods Sold | 5000 - COGS |
| `subscription` | Software & SaaS | 6110 - Cloud Services |
| `consulting` | Professional Services | 6200 - Contract Services |

### 5.4 Currency Handling

ERP systems require ISO 4217 currency codes. The mapping:

| AIS-1 Currency | ISO 4217 | ERP Currency | Notes |
|----------------|----------|-------------|-------|
| `USDC` | `USD` | `USD` | Stablecoin pegged 1:1 to USD |
| `EURC` | `EUR` | `EUR` | Stablecoin pegged 1:1 to EUR |
| `USDT` | `USD` | `USD` | Stablecoin pegged 1:1 to USD |
| `USD` | `USD` | `USD` | Direct |
| `EUR` | `EUR` | `EUR` | Direct |

Implementers MUST record the original `currency` (e.g., `USDC`) in the ERP memo/reference field for audit trail.

### 5.5 Integration Methods

| ERP | Integration Method | Authentication | Sync Model |
|-----|-------------------|----------------|------------|
| **NetSuite** | SuiteTalk REST API v1 / SuiteQL | OAuth 2.0 (TBA) | Webhook on invoice state change -> POST to NetSuite |
| **SAP S/4HANA** | OData V4 API (Supplier Invoice) | OAuth 2.0 / SAP Passport | RFC/IDoc push or API polling |
| **QuickBooks Online** | QuickBooks REST API v3 | OAuth 2.0 | Webhook -> POST Bill or Invoice |
| **Xero** | Xero API v2 | OAuth 2.0 | Webhook -> POST Invoice |

### 5.6 Reconciliation

AIS-1 invoices carry their own payment proof, which enables automated three-way matching:

1. **Purchase Order** (if exists) -- matched via `memo` or `relatedInvoices`
2. **Invoice** -- the AIS-1 document itself
3. **Payment** -- the `paymentProof.txHash` verified on-chain

This three-way match SHOULD be automated by the integration layer, with exceptions routed to human review.

---

## 6. Example Invoices

### 6.1 Human-to-Human (H2H): Cross-Border B2B Stablecoin Payment

A US company pays a German supplier for consulting services. No agents involved. USDC settlement on Base. VAT reverse charge applies.

```json
{
  "@context": ["https://schema.org", "https://prooflink.dev/ais/v1"],
  "@type": "AgentInvoice",
  "invoiceId": "ais_muller_2026_k8jd3nw7p2x1",
  "invoiceVersion": "1.0",
  "invoiceState": "settled",
  "issuer": {
    "@type": "PartyIdentity",
    "principalEntity": {
      "entityName": "Mueller GmbH",
      "vLEI": "5299001GZCZ7B2N0DX47",
      "jurisdiction": "DE",
      "registrationId": "HRB 12345"
    },
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
  },
  "recipient": {
    "@type": "PartyIdentity",
    "principalEntity": {
      "entityName": "Acme Corp",
      "vLEI": "254900OPPU84GM83MG36",
      "jurisdiction": "US",
      "registrationId": "DE-123456789"
    },
    "walletAddress": "0xabcdef1234567890abcdef1234567890abcdef12"
  },
  "lineItems": [
    {
      "@type": "InvoiceLineItem",
      "description": "Supply chain optimization consulting - March 2026",
      "serviceCategory": "consulting",
      "quantity": 80,
      "unit": "hour",
      "unitPrice": 150.00,
      "lineTotal": 12000.00,
      "periodStart": "2026-03-01T00:00:00Z",
      "periodEnd": "2026-03-31T23:59:59Z"
    }
  ],
  "subtotalAmount": 12000.00,
  "taxAmount": 0,
  "totalAmount": 12000.00,
  "currency": "USDC",
  "settlementChain": "eip155:8453",
  "issuedAt": "2026-03-15T10:30:00Z",
  "dueAt": "2026-04-14T23:59:59Z",
  "paidAt": "2026-03-18T14:22:07Z",
  "paymentProof": {
    "@type": "PaymentProof",
    "protocol": "direct_transfer",
    "txHash": "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    "facilitator": "prooflink.dev",
    "blockNumber": 18234567,
    "paymentTimestamp": "2026-03-18T14:22:07Z"
  },
  "complianceStamp": {
    "@type": "ComplianceStamp",
    "proofLinkReceiptId": "pl_7k2m9x3n_h2h_de_us",
    "ipfsHash": "bafkreihdwdcefgh4dqkjv67utrfedseqgtfwe134567ewdaerd",
    "sanctionsCleared": true,
    "sanctionsListsChecked": ["OFAC_SDN", "EU_CFSL", "UN_SCL", "HMT_CFL"],
    "sanctionsScreenTimestamp": "2026-03-18T14:21:55Z",
    "travelRuleTransmitted": true,
    "travelRuleProtocol": "notabene",
    "jurisdictionsApplied": ["US", "DE"]
  },
  "taxInfo": {
    "@type": "TaxInfo",
    "vatApplicable": false,
    "withholdingTaxRate": 0,
    "withholdingTaxAmount": 0,
    "taxJurisdiction": "DE",
    "taxCategory": "reverse_charge",
    "reverseCharge": true
  },
  "disputeTerms": {
    "@type": "DisputeTerms",
    "disputeWindow": "P30D",
    "disputeOracleType": "manual",
    "escalationPath": "legal_arbitration"
  },
  "anchorHash": "bafkreiabcdef1234567890abcdef1234567890abcdef1234567890ab",
  "anchorChain": "eip155:8453",
  "anchorTxHash": "0xanchor1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "memo": "PO-2026-0342. Net 30 terms."
}
```

### 6.2 Human-to-Agent (H2A): Enterprise Using an AI Coding Agent

Acme Corp's procurement agent uses a code-generation agent (registered on ERC-8004) for a sprint of development work. Payment via x402 on Base. ERC-8183 escrow verifies deliverables.

```json
{
  "@context": ["https://schema.org", "https://prooflink.dev/ais/v1"],
  "@type": "AgentInvoice",
  "invoiceId": "ais_codebot_2026_m3x7k9p2w1n4",
  "invoiceVersion": "1.0",
  "invoiceState": "settled",
  "issuer": {
    "@type": "PartyIdentity",
    "agentId": "erc8004:8453:0xAgentRegistry:1042",
    "agentDID": "did:ethr:0xCodeBotWallet1234567890abcdef1234",
    "principalEntity": {
      "entityName": "CodeBot Labs Inc.",
      "vLEI": "254900XYZ123456789AB",
      "jurisdiction": "US"
    },
    "kyaCredential": "did:prooflink:kya:codebot_labs_agent_1042",
    "walletAddress": "0xCodeBotWallet1234567890abcdef12345678"
  },
  "recipient": {
    "@type": "PartyIdentity",
    "principalEntity": {
      "entityName": "Acme Corp",
      "vLEI": "254900OPPU84GM83MG36",
      "jurisdiction": "US"
    },
    "humanPrincipal": {
      "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "humanVerification": "kyc_credential"
    },
    "walletAddress": "0xAcmeTreasury1234567890abcdef12345678"
  },
  "lineItems": [
    {
      "@type": "InvoiceLineItem",
      "description": "Microservice scaffolding - payment reconciliation module",
      "serviceCategory": "code_generation",
      "quantity": 1,
      "unit": "unit",
      "unitPrice": 2400.00,
      "lineTotal": 2400.00,
      "periodStart": "2026-03-10T00:00:00Z",
      "periodEnd": "2026-03-17T23:59:59Z"
    },
    {
      "@type": "InvoiceLineItem",
      "description": "GPT-4 equivalent inference calls during development",
      "serviceCategory": "inference",
      "quantity": 45000,
      "unit": "api_call",
      "unitPrice": 0.003,
      "lineTotal": 135.00,
      "periodStart": "2026-03-10T00:00:00Z",
      "periodEnd": "2026-03-17T23:59:59Z"
    },
    {
      "@type": "InvoiceLineItem",
      "description": "Test suite execution - GPU compute",
      "serviceCategory": "compute",
      "quantity": 3600,
      "unit": "gpu_second",
      "unitPrice": 0.0083,
      "lineTotal": 29.88,
      "periodStart": "2026-03-16T00:00:00Z",
      "periodEnd": "2026-03-17T23:59:59Z"
    }
  ],
  "subtotalAmount": 2564.88,
  "taxAmount": 0,
  "totalAmount": 2564.88,
  "currency": "USDC",
  "settlementChain": "eip155:8453",
  "issuedAt": "2026-03-18T08:00:00Z",
  "dueAt": "2026-03-25T23:59:59Z",
  "paidAt": "2026-03-18T09:14:33Z",
  "paymentProof": {
    "@type": "PaymentProof",
    "protocol": "x402",
    "txHash": "0xh2a_payment_7890abcdef1234567890abcdef1234567890abcdef123456",
    "facilitator": "cdp.coinbase.com",
    "blockNumber": 18245678,
    "paymentTimestamp": "2026-03-18T09:14:33Z"
  },
  "workProof": {
    "@type": "WorkProof",
    "standard": "ERC-8183",
    "evaluatorAttestation": "0xEvalSig_abc123def456789012345678901234567890abcdef12345678",
    "jobId": "erc8183:8453:0xEscrowContract:7",
    "evaluatorAddress": "0xTrustedEvaluator1234567890abcdef123456",
    "deliverableHash": "bafkreideliverabledcba0987654321fedcba0987654321fedcba09876543",
    "deliverableURI": "ipfs://bafkreideliverabledcba0987654321fedcba0987654321fedcba09876543",
    "completedAt": "2026-03-17T18:45:00Z"
  },
  "complianceStamp": {
    "@type": "ComplianceStamp",
    "proofLinkReceiptId": "pl_h2a_codebot_acme_2026q1",
    "ipfsHash": "bafkreicompliance_h2a_codebot_acme_abcdef1234567890abcde",
    "sanctionsCleared": true,
    "sanctionsListsChecked": ["OFAC_SDN", "EU_CFSL"],
    "sanctionsScreenTimestamp": "2026-03-18T09:14:20Z",
    "amlRiskScore": 8,
    "amlThresholdApplied": 50,
    "travelRuleTransmitted": false,
    "travelRuleExemptionReason": "below_threshold",
    "jurisdictionsApplied": ["US"],
    "kyaVerified": true
  },
  "taxInfo": {
    "@type": "TaxInfo",
    "vatApplicable": false,
    "withholdingTaxRate": 0,
    "withholdingTaxAmount": 0,
    "taxJurisdiction": "US",
    "taxCategory": "standard",
    "reverseCharge": false
  },
  "disputeTerms": {
    "@type": "DisputeTerms",
    "disputeWindow": "PT72H",
    "disputeOracleContract": "0xEscrowContract1234567890abcdef1234567890",
    "disputeOracleType": "erc8183_evaluator",
    "escalationPath": "legal_arbitration"
  },
  "anchorHash": "bafkreianchor_h2a_codebot_acme_1234567890abcdef123456789",
  "anchorChain": "eip155:8453",
  "anchorTxHash": "0xanchor_h2a_1234567890abcdef1234567890abcdef1234567890abcdef"
}
```

### 6.3 Agent-to-Agent (A2A): Autonomous Research Agent Hiring a Data Agent

A research agent (owned by a hedge fund) autonomously hires a data retrieval agent (owned by a data provider) to fetch and analyze satellite imagery. No human involved at execution time. Payment via MPP session. Work verified by ERC-8183 evaluator. Dispute resolution via KAMIYO.

```json
{
  "@context": ["https://schema.org", "https://prooflink.dev/ais/v1"],
  "@type": "AgentInvoice",
  "invoiceId": "ais_datavault_2026_q9w2e5r8t1y4",
  "invoiceVersion": "1.0",
  "invoiceState": "settled",
  "issuer": {
    "@type": "PartyIdentity",
    "agentId": "erc8004:8453:0xAgentRegistry:3891",
    "agentDID": "did:ethr:0xDataVaultAgent_abcdef1234567890ab",
    "principalEntity": {
      "entityName": "DataVault Protocol Ltd.",
      "vLEI": "529900DATAVAULT12345",
      "jurisdiction": "SG"
    },
    "kyaCredential": "did:prooflink:kya:datavault_agent_3891",
    "walletAddress": "0xDataVaultWallet_abcdef1234567890abcdef"
  },
  "recipient": {
    "@type": "PartyIdentity",
    "agentId": "erc8004:8453:0xAgentRegistry:2204",
    "agentDID": "did:ethr:0xAlphaResearchAgent_1234567890abcd",
    "principalEntity": {
      "entityName": "AlphaSignal Capital LP",
      "vLEI": "529900ALPHASIGNAL789",
      "jurisdiction": "US"
    },
    "kyaCredential": "did:prooflink:kya:alphasignal_agent_2204",
    "walletAddress": "0xAlphaSignalTreasury_1234567890abcdef12"
  },
  "lineItems": [
    {
      "@type": "InvoiceLineItem",
      "description": "Satellite imagery retrieval - South China Sea shipping lanes",
      "serviceCategory": "data_retrieval",
      "quantity": 240,
      "unit": "request",
      "unitPrice": 0.50,
      "lineTotal": 120.00,
      "periodStart": "2026-03-19T06:00:00Z",
      "periodEnd": "2026-03-19T08:00:00Z"
    },
    {
      "@type": "InvoiceLineItem",
      "description": "Vessel detection and tracking analysis (CV model inference)",
      "serviceCategory": "analysis",
      "quantity": 240,
      "unit": "request",
      "unitPrice": 1.25,
      "lineTotal": 300.00,
      "periodStart": "2026-03-19T08:00:00Z",
      "periodEnd": "2026-03-19T09:30:00Z"
    },
    {
      "@type": "InvoiceLineItem",
      "description": "GPU compute for image processing pipeline",
      "serviceCategory": "compute",
      "quantity": 7200,
      "unit": "gpu_second",
      "unitPrice": 0.0083,
      "lineTotal": 59.76,
      "periodStart": "2026-03-19T06:00:00Z",
      "periodEnd": "2026-03-19T09:30:00Z"
    }
  ],
  "subtotalAmount": 479.76,
  "taxAmount": 0,
  "totalAmount": 479.76,
  "currency": "USDC",
  "settlementChain": "eip155:8453",
  "issuedAt": "2026-03-19T10:00:00Z",
  "dueAt": "2026-03-19T12:00:00Z",
  "paidAt": "2026-03-19T10:02:14Z",
  "paymentProof": {
    "@type": "PaymentProof",
    "protocol": "mpp",
    "txHash": "0xa2a_mpp_settlement_abcdef1234567890abcdef1234567890abcdef12",
    "facilitator": "tempo.network",
    "sessionId": "mpp_session_alpha_datavault_20260319_06",
    "blockNumber": 18290001,
    "paymentTimestamp": "2026-03-19T10:02:14Z"
  },
  "workProof": {
    "@type": "WorkProof",
    "standard": "ERC-8183",
    "evaluatorAttestation": "0xA2AEvalSig_9876543210fedcba9876543210fedcba9876543210fedc",
    "jobId": "erc8183:8453:0xA2AEscrow:42",
    "evaluatorAddress": "0xSatelliteDataEvaluator_abcdef1234567890",
    "deliverableHash": "bafkreia2a_deliverable_satellite_analysis_abcdef1234567890ab",
    "deliverableURI": "ipfs://bafkreia2a_deliverable_satellite_analysis_abcdef1234567890ab",
    "completedAt": "2026-03-19T09:45:00Z"
  },
  "complianceStamp": {
    "@type": "ComplianceStamp",
    "proofLinkReceiptId": "pl_a2a_datavault_alpha_20260319",
    "ipfsHash": "bafkreicompliance_a2a_datavault_alpha_abcdef1234567890abcde",
    "easAttestationId": "0xeas_attestation_a2a_1234567890abcdef",
    "sanctionsCleared": true,
    "sanctionsListsChecked": ["OFAC_SDN", "EU_CFSL", "UN_SCL", "HMT_CFL"],
    "sanctionsScreenTimestamp": "2026-03-19T05:59:45Z",
    "amlRiskScore": 5,
    "amlThresholdApplied": 50,
    "travelRuleTransmitted": true,
    "travelRuleProtocol": "notabene",
    "jurisdictionsApplied": ["US", "SG"],
    "kyaVerified": true
  },
  "taxInfo": {
    "@type": "TaxInfo",
    "vatApplicable": false,
    "withholdingTaxRate": 0,
    "withholdingTaxAmount": 0,
    "taxJurisdiction": "SG",
    "taxCategory": "not_subject",
    "reverseCharge": false
  },
  "disputeTerms": {
    "@type": "DisputeTerms",
    "disputeWindow": "PT24H",
    "disputeOracleContract": "0xKAMIYODisputeOracle_abcdef1234567890ab",
    "disputeOracleType": "kamiyo",
    "disputeStakeRequired": 47.98,
    "escalationPath": "legal_arbitration"
  },
  "anchorHash": "bafkreianchor_a2a_datavault_alpha_abcdef1234567890abcdef12",
  "anchorChain": "eip155:8453",
  "anchorTxHash": "0xanchor_a2a_abcdef1234567890abcdef1234567890abcdef1234567890"
}
```

---

## 7. Reference Implementation Outline

### 7.1 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AIS-1 SDK (TypeScript)                │
├─────────────┬──────────────┬──────────────┬─────────────┤
│  Builder    │  Validator   │  Serializer  │  Anchorer   │
│             │              │              │             │
│ create()    │ validate()   │ toJsonLd()   │ pin()       │
│ addLine()   │ verifyProof()│ toUBL()      │ anchor()    │
│ setPayment()│ checkState() │ toPDF()      │ verify()    │
│ sign()      │              │ toCSV()      │             │
├─────────────┴──────────────┴──────────────┴─────────────┤
│                   ERP Adapters                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ NetSuite │  │   SAP    │  │QuickBooks│  │  Xero   ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
├─────────────────────────────────────────────────────────┤
│                   Chain Adapters                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Base   │  │ Ethereum │  │  Solana  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Module Responsibilities

**Builder** -- constructs `AgentInvoice` objects with type-safe methods:
```typescript
interface InvoiceBuilder {
  create(issuer: PartyIdentity, recipient: PartyIdentity): InvoiceBuilder;
  addLineItem(item: InvoiceLineItem): InvoiceBuilder;
  setPaymentProof(proof: PaymentProof): InvoiceBuilder;
  setWorkProof(proof: WorkProof): InvoiceBuilder;
  setComplianceStamp(stamp: ComplianceStamp): InvoiceBuilder;
  setTaxInfo(tax: TaxInfo): InvoiceBuilder;
  setDisputeTerms(terms: DisputeTerms): InvoiceBuilder;
  sign(signer: Signer): Promise<SignedInvoice>;
  build(): AgentInvoice;
}
```

**Validator** -- validates schema conformance, state transitions, cryptographic signatures, and on-chain proof references:
```typescript
interface InvoiceValidator {
  validate(invoice: AgentInvoice): ValidationResult;
  verifySignature(invoice: SignedInvoice): Promise<boolean>;
  verifyPaymentProof(proof: PaymentProof, chain: ChainAdapter): Promise<boolean>;
  verifyWorkProof(proof: WorkProof, chain: ChainAdapter): Promise<boolean>;
  verifyComplianceStamp(stamp: ComplianceStamp): Promise<boolean>;
  checkStateTransition(from: InvoiceState, to: InvoiceState): boolean;
}
```

**Serializer** -- converts between formats:
```typescript
interface InvoiceSerializer {
  toJsonLd(invoice: AgentInvoice): string;
  fromJsonLd(json: string): AgentInvoice;
  toUBL(invoice: AgentInvoice): string;        // UBL 2.3 XML + AIS extension
  fromUBL(xml: string): AgentInvoice;
  toZUGFeRD(invoice: AgentInvoice): Buffer;     // PDF/A-3 with embedded XML
  toPDF(invoice: AgentInvoice): Buffer;         // Human-readable PDF
  toCSV(invoices: AgentInvoice[]): string;      // Bulk export
  toERPPayload(invoice: AgentInvoice, target: ERPTarget): object;
}
```

**Anchorer** -- handles IPFS pinning and on-chain commitment:
```typescript
interface InvoiceAnchorer {
  pin(invoice: AgentInvoice): Promise<{ cid: string }>;
  anchor(invoice: AgentInvoice, chain: ChainId): Promise<{ txHash: string }>;
  verify(invoiceId: string, expectedCid: string, chain: ChainId): Promise<boolean>;
}
```

### 7.3 Implementation Phases

**Phase 1 (weeks 1-4): Core schema + Builder + Validator**
- JSON-LD context published at `https://prooflink.dev/ais/v1`
- TypeScript types generated from schema
- Builder with fluent API
- Validator with schema conformance and state machine checks
- Unit tests for all three invoice scenarios (H2H, H2A, A2A)

**Phase 2 (weeks 5-8): Serializer + PDF rendering**
- JSON-LD serialization with canonicalization
- UBL 2.3 bidirectional conversion
- ZUGFeRD PDF/A-3 generation
- Human-readable PDF template
- CSV bulk export

**Phase 3 (weeks 9-12): On-chain anchoring + ERP adapters**
- IPFS pinning (Pinata or nft.storage)
- Anchor contract deployment on Base testnet, then mainnet
- EAS attestation schema registration
- NetSuite adapter (first ERP)
- QuickBooks adapter (second ERP)

**Phase 4 (weeks 13-16): MCP integration + protocol adapters**
- `create_invoice` MCP tool in ProofLink MCP server
- x402 payment proof auto-extraction
- MPP session-to-invoice aggregation
- ERC-8183 work proof auto-linkage

### 7.4 SDK Distribution

- **npm:** `@prooflink/ais-sdk`
- **PyPI:** `prooflink-ais` (Python bindings via Pydantic models)
- **GitHub:** `prooflink/agent-invoice-standard` (schema, reference implementation, examples)
- **License:** Apache 2.0

---

## 8. Security Considerations

### 8.1 Invoice Forgery

AIS-1 invoices MUST be cryptographically signed by the issuer. Relying parties MUST verify the signature before accepting an invoice. The signing key MUST be linked to the issuer's ERC-8004 agent identity or the principal entity's DID.

### 8.2 Replay Attacks

Each `invoiceId` MUST be globally unique. The on-chain anchor contract MUST reject duplicate `invoiceIdHash` values. Validators MUST reject invoices with `issuedAt` timestamps more than 24 hours in the future or more than 90 days in the past.

### 8.3 Privacy

AIS-1 invoices contain business-sensitive data (pricing, counterparties, volumes). Storage and transmission:
- On IPFS: invoices SHOULD be encrypted with the counterparty's public key. Only the commitment hash (not content) is on-chain.
- In transit: invoices MUST be transmitted over TLS 1.3 or equivalent.
- PII: No raw personal identifiable information (name, address, SSN) appears in the invoice. Human principals are identified by DID only.

### 8.4 Compliance Stamp Validity

Compliance stamps reference ProofLink receipts that have a temporal validity window. A compliance stamp is considered stale if `sanctionsScreenTimestamp` is more than 24 hours before the current time. Relying parties MAY require a fresh compliance check for stale stamps.

---

## 9. Governance

### 9.1 Schema Evolution

AIS-1 follows semantic versioning:
- **Patch** (1.0.x): Clarifications, typo fixes, examples. No schema changes.
- **Minor** (1.x.0): New OPTIONAL fields. Backward compatible. Existing invoices remain valid.
- **Major** (x.0.0): Breaking changes to REQUIRED fields or semantics. Migration guide required.

### 9.2 Extension Mechanism

Domain-specific extensions (e.g., healthcare billing codes, government procurement references) are supported via the `metadata` field on `InvoiceLineItem` and the `memo` field at the invoice level. Formal extensions SHOULD be published as separate JSON-LD contexts that compose with the AIS-1 context.

### 9.3 Standards Track

ProofLink intends to:
1. Publish AIS-1 as an open specification (Apache 2.0) on GitHub.
2. Submit the AIS UBL extension to the OASIS UBL Technical Committee for consideration.
3. Engage with the Peppol Authority on registering the AIS extension namespace.
4. Present the standard to FATF's Virtual Assets Contact Group as part of the broader agent compliance framework.

---

## 10. References

### Normative References

| Reference | Description |
|-----------|-------------|
| [UBL-2.3] | OASIS Universal Business Language v2.3. https://docs.oasis-open.org/ubl/UBL-2.3.html |
| [Peppol-BIS-3.0] | Peppol BIS Billing 3.0. https://docs.peppol.eu/poacc/billing/3.0/ |
| [JSON-LD-1.1] | JSON-LD 1.1. W3C Recommendation. https://www.w3.org/TR/json-ld11/ |
| [ERC-8004] | Trustless Agents Standard. https://eips.ethereum.org/EIPS/eip-8004 |
| [ERC-8183] | Programmable Escrow for Agent Commerce. https://eips.ethereum.org/EIPS/eip-8183 |
| [KYA-1] | Know Your Agent Verifiable Credential Standard. ProofLink. |
| [EAS] | Ethereum Attestation Service. https://attest.org/ |
| [W3C-VC-2.0] | W3C Verifiable Credentials Data Model v2.0. https://www.w3.org/TR/vc-data-model-2.0/ |
| [W3C-DID-1.0] | W3C Decentralized Identifiers v1.0. https://www.w3.org/TR/did-core/ |
| [CAIP-2] | Chain Agnostic Improvement Proposal 2: Blockchain ID Specification. https://chainagnostic.org/CAIPs/caip-2 |
| [ISO-4217] | ISO 4217 Currency Codes |
| [ISO-8601] | ISO 8601 Date and Time Format |
| [ISO-3166-1] | ISO 3166-1 Country Codes |

### Informative References

| Reference | Description |
|-----------|-------------|
| [ZUGFeRD-2.4] | ZUGFeRD 2.4 / Factur-X. https://invoice-portal.de/zugferd-2-4/ |
| [x402] | x402 Payment Protocol. https://www.x402.org/ |
| [MPP] | Machine Payments Protocol. https://mpp.dev/ |
| [AP2] | Agent Payments Protocol. https://ap2-protocol.org/ |
| [ACP] | Agentic Commerce Protocol. OpenAI + Stripe. |
| [KAMIYO] | KAMIYO Dispute Resolution Protocol. https://www.kamiyo.ai/ |
| [GLEIF-vLEI] | GLEIF Verifiable Legal Entity Identifier. https://www.gleif.org/en/lei-solutions/gleifs-digital-strategy-for-the-lei/introducing-the-vlei |
| [GENIUS-Act] | GENIUS Act (Guiding and Establishing National Innovation for US Stablecoins). Signed July 2025. |
| [MiCA] | Markets in Crypto-Assets Regulation. EU Regulation 2023/1114. |
| [FATF-R16] | FATF Recommendation 16 (Travel Rule). Updated June 2025. |

---

*AIS-1 Draft -- ProofLink Contributors -- March 20, 2026*
*License: Apache 2.0*
*Classification: Public standard -- open for community review*
