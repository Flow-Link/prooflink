---
title: "KYA-1: Know Your Agent Verifiable Credential Standard"
description: A W3C Verifiable Credential profile for establishing the identity, authorization, and compliance status of autonomous AI agents participating in financial transactions.
author: ProofLink Contributors
status: Draft
type: Standards Track
category: Application
created: 2026-03-20
requires: W3C Verifiable Credentials Data Model v2.0, W3C Decentralized Identifiers v1.0, ERC-8004
---

## Abstract

KYA-1 defines a Verifiable Credential profile that binds an autonomous AI agent's on-chain identity (ERC-8004) to its controlling principal (human or legal entity), its authorized operational scope, and its real-time compliance status. The credential enables any relying party -- a payment protocol, a counterparty agent, a regulatory auditor -- to answer three questions before transacting: *Who is this agent? Who authorized it? Is it compliant?* KYA-1 is designed for issuance by trusted verification providers, off-chain storage with on-chain commitment, selective disclosure via zero-knowledge proofs, and integration with existing payment protocols (x402, MPP, AP2, ACP) and identity infrastructure (ERC-8004 Identity Registry, GLEIF vLEI, W3C DIDs).

---

## 1. Motivation

### 1.1 The Agent Identity Gap

As of March 2026, over 49,000 agents are registered on the ERC-8004 Identity Registry and 3 million AI agents are active in the US and UK alone. Six competing payment protocols (x402, MPP, AP2, ACP, Visa TAP, Mastercard Agent Pay) enable agents to initiate and receive payments. None of these protocols answer the fundamental compliance question: *Is this agent authorized to transact, by whom, and under what constraints?*

### 1.2 Regulatory Pressure Without Standards

The FATF Travel Rule (Recommendation 16, updated June 2025) requires originator and beneficiary information to accompany virtual asset transfers. Current implementations assume both parties are VASPs with registered compliance officers. Agent-to-agent payments break this assumption entirely. The GENIUS Act (signed July 2025) and MiCA (fully enforceable July 2026) mandate AML/CTF compliance for all virtual asset transactions -- but provide no guidance on how to identify an autonomous agent's principal.

### 1.3 Why Existing Standards Are Insufficient

| Standard | Limitation for Agent Identity |
|----------|-------------------------------|
| ERC-8004 Identity Registry | Provides on-chain agent ID and reputation, but no compliance metadata, no principal linkage, no delegation scope |
| W3C Verifiable Credentials | General-purpose credential format; no agent-specific schema or verification flow defined |
| ERC-3643 ONCHAINID | Designed for human/entity token holders; no concept of agent delegation or behavioral scope |
| Mastercard Verifiable Intent | Proprietary, consumer retail focused, does not address B2B or agent-to-agent |
| AP2 Mandates | Protocol-specific authorization; not portable across x402, MPP, or ACP |

KYA-1 fills the gap between on-chain agent identity (ERC-8004) and regulatory compliance requirements by defining a portable, verifiable, privacy-preserving credential that works across all payment protocols.

### 1.4 Design Goals

1. **Protocol-agnostic.** A KYA credential MUST be verifiable regardless of which payment protocol carries the transaction.
2. **Privacy-preserving.** Raw PII MUST NOT appear on-chain. Selective disclosure MUST be supported.
3. **Machine-verifiable.** Verification MUST complete in under 100ms without human intervention.
4. **Revocable.** Compromised or expired credentials MUST be revocable in real time.
5. **Composable.** KYA credentials MUST extend ERC-8004 without requiring changes to the ERC-8004 contracts.
6. **Jurisdiction-aware.** The credential schema MUST accommodate jurisdiction-specific compliance requirements without schema changes.

---

## 2. Specification

### 2.1 Terminology

| Term | Definition |
|------|-----------|
| **Agent** | An autonomous software system registered on the ERC-8004 Identity Registry, identified by a unique `agentId` (ERC-721 token) |
| **Principal** | The human or legal entity that controls, deploys, and is legally responsible for an agent's actions |
| **KYA Issuer** | A trusted entity that verifies agent-principal relationships and issues KYA credentials (e.g., ProofLink, a licensed CASP, a compliance provider) |
| **Relying Party** | Any entity that consumes and verifies a KYA credential before transacting (e.g., a payment facilitator, a counterparty agent, a VASP) |
| **Delegation Scope** | The set of constraints defining what an agent is authorized to do on behalf of its principal |
| **Compliance Attestation** | A signed statement that specific regulatory checks (sanctions, AML) have been performed and passed |

### 2.2 JSON-LD Context

The KYA-1 context extends the W3C Credentials v2 context and defines all KYA-specific terms.

```json
{
  "@context": {
    "@version": 1.1,
    "@protected": true,
    "kya": "https://prooflink.dev/kya/v1#",
    "erc8004": "https://eips.ethereum.org/EIPS/eip-8004#",
    "KYACredential": "kya:KYACredential",
    "KYAComplianceAttestation": "kya:KYAComplianceAttestation",
    "agentIdentity": {
      "@id": "kya:agentIdentity",
      "@type": "@id"
    },
    "agentId": "erc8004:agentId",
    "agentDID": {
      "@id": "kya:agentDID",
      "@type": "@id"
    },
    "chainId": "erc8004:chainId",
    "registryAddress": "erc8004:registryAddress",
    "tokenId": "erc8004:tokenId",
    "principalEntity": {
      "@id": "kya:principalEntity",
      "@type": "@id"
    },
    "principalHuman": {
      "@id": "kya:principalHuman",
      "@type": "@id"
    },
    "entityType": "kya:entityType",
    "legalEntityIdentifier": "kya:legalEntityIdentifier",
    "verifiableLEI": {
      "@id": "kya:verifiableLEI",
      "@type": "@id"
    },
    "kybStatus": "kya:kybStatus",
    "jurisdiction": "kya:jurisdiction",
    "humanDID": {
      "@id": "kya:humanDID",
      "@type": "@id"
    },
    "humanVerificationMethod": "kya:humanVerificationMethod",
    "humanVerificationCredential": {
      "@id": "kya:humanVerificationCredential",
      "@type": "@id"
    },
    "delegationScope": {
      "@id": "kya:delegationScope",
      "@type": "@id"
    },
    "maxTransactionValue": "kya:maxTransactionValue",
    "maxDailyVolume": "kya:maxDailyVolume",
    "allowedCurrencies": {
      "@id": "kya:allowedCurrencies",
      "@container": "@set"
    },
    "allowedCounterpartyTypes": {
      "@id": "kya:allowedCounterpartyTypes",
      "@container": "@set"
    },
    "blockedJurisdictions": {
      "@id": "kya:blockedJurisdictions",
      "@container": "@set"
    },
    "allowedProtocols": {
      "@id": "kya:allowedProtocols",
      "@container": "@set"
    },
    "requiresHumanApprovalAbove": "kya:requiresHumanApprovalAbove",
    "complianceStatus": {
      "@id": "kya:complianceStatus",
      "@type": "@id"
    },
    "sanctionsScreened": "kya:sanctionsScreened",
    "sanctionsLists": {
      "@id": "kya:sanctionsLists",
      "@container": "@set"
    },
    "sanctionsScreenDate": {
      "@id": "kya:sanctionsScreenDate",
      "@type": "http://www.w3.org/2001/XMLSchema#dateTime"
    },
    "amlRiskScore": "kya:amlRiskScore",
    "amlProvider": "kya:amlProvider",
    "travelRuleCapable": "kya:travelRuleCapable",
    "travelRuleProtocols": {
      "@id": "kya:travelRuleProtocols",
      "@container": "@set"
    },
    "reputationScore": "kya:reputationScore",
    "behavioralScore": "kya:behavioralScore",
    "transactionCount": "kya:transactionCount",
    "activeMonths": "kya:activeMonths"
  }
}
```

### 2.3 KYA Credential Schema

A KYA credential is a W3C Verifiable Credential v2.0 with the following structure. Fields marked **REQUIRED** MUST be present for the credential to be considered valid. Fields marked **OPTIONAL** MAY be included based on the issuer's verification depth and the relying party's requirements.

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://prooflink.dev/kya/v1"
  ],
  "id": "urn:uuid:3978344f-8596-4c3a-a978-8fcaba3903c5",
  "type": ["VerifiableCredential", "KYACredential"],
  "issuer": {
    "id": "did:web:prooflink.dev",
    "name": "ProofLink ProofLink Engine"
  },
  "validFrom": "2026-03-20T00:00:00Z",
  "validUntil": "2026-06-20T00:00:00Z",
  "credentialStatus": {
    "id": "https://prooflink.dev/kya/status/3978344f",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "94567",
    "statusListCredential": "https://prooflink.dev/kya/status-list/1"
  },
  "credentialSubject": {
    "id": "did:ethr:base:0xAgentWalletAddress",

    "agentIdentity": {
      "agentId": "erc8004:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432:42",
      "chainId": 8453,
      "registryAddress": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      "tokenId": 42,
      "agentDID": "did:ethr:base:0xAgentWalletAddress"
    },

    "principalEntity": {
      "entityType": "LegalEntity",
      "legalEntityIdentifier": "5493001KJTIIGC8Y1R17",
      "verifiableLEI": "did:web:gleif.org:lei:5493001KJTIIGC8Y1R17",
      "kybStatus": "verified",
      "jurisdiction": "US"
    },

    "principalHuman": {
      "humanDID": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "humanVerificationMethod": "world_id_orb",
      "humanVerificationCredential": "urn:uuid:human-vc-reference",
      "delegationScope": {
        "maxTransactionValue": { "amount": "10000", "currency": "USDC" },
        "maxDailyVolume": { "amount": "50000", "currency": "USDC" },
        "allowedCurrencies": ["USDC", "EURC"],
        "allowedCounterpartyTypes": ["KYACredential", "verified_vasp"],
        "blockedJurisdictions": ["IR", "KP", "CU", "SY", "RU"],
        "allowedProtocols": ["x402", "MPP", "AP2"],
        "requiresHumanApprovalAbove": { "amount": "5000", "currency": "USDC" },
        "expiresAt": "2026-06-20T00:00:00Z"
      }
    },

    "complianceStatus": {
      "sanctionsScreened": true,
      "sanctionsLists": ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED", "HMT"],
      "sanctionsScreenDate": "2026-03-20T14:30:00Z",
      "amlRiskScore": 12,
      "amlProvider": "chainalysis_kyt",
      "travelRuleCapable": true,
      "travelRuleProtocols": ["notabene", "trisa"]
    },

    "reputationScore": 87,
    "behavioralScore": 92,
    "transactionCount": 1547,
    "activeMonths": 4
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "ecdsa-jcs-2019",
    "created": "2026-03-20T14:35:00Z",
    "verificationMethod": "did:web:prooflink.dev#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3FXQjecWufY46yg7e..."
  }
}
```

### 2.4 Field Definitions

#### 2.4.1 Required Fields

| Field Path | Type | Description |
|------------|------|-------------|
| `credentialSubject.agentIdentity.agentId` | string | Canonical ERC-8004 identifier in format `erc8004:{chainId}:{registryAddress}:{tokenId}` |
| `credentialSubject.agentIdentity.chainId` | integer | EIP-155 chain ID where the agent is registered |
| `credentialSubject.agentIdentity.registryAddress` | string | Address of the ERC-8004 Identity Registry contract |
| `credentialSubject.agentIdentity.tokenId` | integer | ERC-721 token ID within the Identity Registry |
| `credentialSubject.agentIdentity.agentDID` | string (DID) | The agent's Decentralized Identifier, resolvable to a DID Document containing verification keys |
| `credentialSubject.principalEntity.entityType` | string | One of: `LegalEntity`, `NaturalPerson`, `DAO`, `MultisigWallet` |
| `credentialSubject.principalEntity.jurisdiction` | string | ISO 3166-1 alpha-2 country code of the principal's legal jurisdiction |
| `credentialSubject.principalHuman.humanDID` | string (DID) | DID of the human with ultimate authority over the agent |
| `credentialSubject.principalHuman.humanVerificationMethod` | string | Method used to verify the human's identity. Enumerated: `world_id_orb`, `world_id_device`, `kyc_credential`, `eidas_eudi`, `civic_sbt`, `polygon_id_zk` |
| `credentialSubject.principalHuman.delegationScope` | object | Constraints on the agent's authority (see 2.4.3) |
| `credentialSubject.complianceStatus.sanctionsScreened` | boolean | Whether the agent's wallet and principal have been screened against sanctions lists |
| `credentialSubject.complianceStatus.sanctionsScreenDate` | dateTime | ISO 8601 timestamp of the most recent sanctions screening |
| `credentialSubject.complianceStatus.travelRuleCapable` | boolean | Whether the agent can participate in Travel Rule data exchange |
| `validFrom` | dateTime | Credential validity start |
| `validUntil` | dateTime | Credential validity end. MUST NOT exceed 90 days from `validFrom` |
| `credentialStatus` | object | W3C BitstringStatusListEntry for revocation checking |

#### 2.4.2 Optional Fields

| Field Path | Type | Description |
|------------|------|-------------|
| `credentialSubject.principalEntity.legalEntityIdentifier` | string | 20-character LEI from GLEIF |
| `credentialSubject.principalEntity.verifiableLEI` | string (DID) | DID URI resolving to a GLEIF vLEI Verifiable Credential |
| `credentialSubject.principalEntity.kybStatus` | string | One of: `verified`, `pending`, `expired`, `failed` |
| `credentialSubject.complianceStatus.amlRiskScore` | integer | 0-100 risk score from AML provider. 0 = lowest risk |
| `credentialSubject.complianceStatus.amlProvider` | string | Identifier of the AML screening provider |
| `credentialSubject.complianceStatus.sanctionsLists` | array of string | Which lists were screened (e.g., `OFAC_SDN`, `EU_CONSOLIDATED`) |
| `credentialSubject.complianceStatus.travelRuleProtocols` | array of string | Supported Travel Rule protocols (e.g., `notabene`, `trisa`, `sygna`) |
| `credentialSubject.reputationScore` | integer | 0-100 aggregate reputation derived from ERC-8004 Reputation Registry |
| `credentialSubject.behavioralScore` | integer | 0-100 behavioral anomaly score from continuous monitoring |
| `credentialSubject.transactionCount` | integer | Total completed transactions |
| `credentialSubject.activeMonths` | integer | Months since first transaction |

#### 2.4.3 Delegation Scope Object

The delegation scope defines the operational envelope within which the agent is authorized to act. Relying parties MUST reject transactions that exceed any constraint in the delegation scope.

| Field | Type | Description |
|-------|------|-------------|
| `maxTransactionValue` | `{amount: string, currency: string}` | Maximum single transaction value |
| `maxDailyVolume` | `{amount: string, currency: string}` | Maximum aggregate daily transaction volume |
| `allowedCurrencies` | array of string | Permitted settlement currencies |
| `allowedCounterpartyTypes` | array of string | Types of acceptable counterparties |
| `blockedJurisdictions` | array of string | ISO 3166-1 alpha-2 codes the agent MUST NOT transact with |
| `allowedProtocols` | array of string | Payment protocols the agent is authorized to use |
| `requiresHumanApprovalAbove` | `{amount: string, currency: string}` | Threshold above which human approval is required before execution |
| `expiresAt` | dateTime | When the delegation scope expires (independent of credential expiry) |

### 2.5 Credential Lifecycle

```
                                      +-----------+
                                      |  EXPIRED  |
                                      +-----^-----+
                                            |
                                     validUntil reached
                                            |
+--------+    issue    +--------+    revoke    +---------+
| PENDING | ---------> | ACTIVE | -----------> | REVOKED |
+--------+             +--------+              +---------+
     |                      |
     |                      | renew (new credential issued)
     |                      v
     |                 +--------+
     +--- reject ----> | DENIED |
                       +--------+
```

- **PENDING**: Agent has submitted verification request; issuer is performing checks.
- **ACTIVE**: Credential issued and valid. Relying parties accept this credential.
- **REVOKED**: Credential revoked by issuer (compromise, policy violation, sanctions match). Checked via BitstringStatusList.
- **EXPIRED**: `validUntil` timestamp has passed. Agent must renew.
- **DENIED**: Verification failed. Agent may re-apply after remediating the cause.

### 2.6 Verification Flow

A relying party verifies a KYA credential through the following steps. All steps are REQUIRED unless marked otherwise.

```
Relying Party receives KYA credential (e.g., in x402 payment header)
    |
    v
Step 1: SCHEMA VALIDATION
    - Verify @context includes "https://prooflink.dev/kya/v1"
    - Verify type includes "KYACredential"
    - Verify all REQUIRED fields are present
    - Verify validFrom <= now <= validUntil
    |
    v
Step 2: PROOF VERIFICATION
    - Resolve issuer DID (did:web:prooflink.dev)
    - Retrieve issuer's public key from DID Document
    - Verify DataIntegrityProof signature over the credential
    - Verify proofPurpose is "assertionMethod"
    |
    v
Step 3: ISSUER TRUST CHECK
    - Verify issuer DID is in the relying party's trusted issuer list
    - (OPTIONAL) Verify issuer is a registered ERC-8004 validator
      via ValidationRegistry.getValidationStatus()
    |
    v
Step 4: REVOCATION CHECK
    - Fetch the BitstringStatusList credential from credentialStatus.statusListCredential
    - Check bit at statusListIndex
    - If bit is set: credential is REVOKED -> reject
    |
    v
Step 5: ON-CHAIN IDENTITY BINDING
    - Query ERC-8004 IdentityRegistry on chainId at registryAddress
    - Call ownerOf(tokenId) -> verify the credential subject controls the agent NFT
    - Call getAgentWallet(tokenId) -> verify agentDID resolves to the same address
    - If mismatch: credential does not bind to a live agent -> reject
    |
    v
Step 6: DELEGATION SCOPE CHECK (transaction-specific)
    - Verify transaction value <= maxTransactionValue
    - Verify daily cumulative volume <= maxDailyVolume
    - Verify settlement currency is in allowedCurrencies
    - Verify counterparty jurisdiction is NOT in blockedJurisdictions
    - Verify payment protocol is in allowedProtocols
    - If value > requiresHumanApprovalAbove: require co-signature from principalHuman
    |
    v
Step 7: COMPLIANCE FRESHNESS CHECK
    - Verify sanctionsScreenDate is within acceptable staleness window
      (RECOMMENDED: 24 hours for standard transactions, 1 hour for high-value)
    - If stale: request re-screening or reject
    |
    v
ACCEPT: Transaction may proceed with KYA credential attached as provenance
```

### 2.7 Selective Disclosure

KYA credentials MUST support selective disclosure to satisfy GDPR data minimization requirements. Two mechanisms are defined:

**Mechanism A: SD-JWT (Selective Disclosure JSON Web Token)**

The KYA credential MAY be issued as an SD-JWT where each field is individually disclosable. A relying party that only needs to confirm `sanctionsScreened == true` and `delegationScope.maxTransactionValue >= transactionAmount` receives only those claims, not the principal's LEI or human DID.

**Mechanism B: Zero-Knowledge Proof Derived Credential**

For privacy-critical contexts (e.g., DeFi protocol interaction), the credential holder MAY generate a ZK proof that demonstrates:
- The agent holds a valid, non-revoked KYA credential
- The credential was issued by a trusted issuer
- The delegation scope permits the requested transaction
- Sanctions screening passed within N hours

Without revealing: the principal's identity, the LEI, the human DID, or the exact delegation limits.

Implementations SHOULD use BBS+ signatures (compatible with W3C VC Data Integrity BBS Cryptosuite) for ZK-derivable credentials.

---

## 3. Integration with ERC-8004

### 3.1 Architecture

KYA-1 is a **layer above** ERC-8004, not a modification to it. The ERC-8004 contracts remain unchanged.

```
+-----------------------------------------------------------+
|                    KYA Credential (off-chain)              |
|  W3C VC containing agent identity, principal, compliance   |
+----------------------------+------------------------------+
                             |
                             | references
                             v
+-----------------------------------------------------------+
|               ERC-8004 Identity Registry (on-chain)        |
|  agentId (ERC-721) | agentURI | metadata | agentWallet    |
+----------------------------+------------------------------+
                             |
                             | metadata key: "kya:credentialHash"
                             v
+-----------------------------------------------------------+
|          ERC-8004 Metadata Store (on-chain, minimal)       |
|  key: "kya:credentialHash" -> value: SHA-256 of KYA VC    |
|  key: "kya:issuer"         -> value: issuer DID bytes      |
|  key: "kya:validUntil"     -> value: expiry timestamp      |
+-----------------------------------------------------------+
```

### 3.2 On-Chain Commitment

When a KYA credential is issued, the issuer (or the agent operator) writes the credential hash to the ERC-8004 metadata store:

```
setMetadata(agentId, "kya:credentialHash", sha256(kyaCredentialBytes))
setMetadata(agentId, "kya:issuer", bytes(issuerDID))
setMetadata(agentId, "kya:validUntil", bytes(expiryTimestamp))
```

This allows on-chain contracts (e.g., ERC-8183 escrow hooks) to gate operations on KYA status without storing the full credential on-chain.

### 3.3 Validation Registry Integration

KYA issuers SHOULD register as validators in the ERC-8004 Validation Registry. When a KYA credential is issued, the issuer calls:

```
validationResponse(
    requestHash = keccak256(agentId, "kya_verification"),
    response = 100,  // 100 = fully verified
    responseURI = "ipfs://QmKYACredentialHash",
    responseHash = sha256(kyaCredentialBytes),
    tag = "kya_v1"
)
```

This creates a publicly queryable, on-chain record that a specific agent has been KYA-verified by a specific issuer, without exposing the credential contents.

### 3.4 Reputation Registry Interaction

KYA credentials MAY include a `reputationScore` field derived from the ERC-8004 Reputation Registry. The derivation:

1. Query `ReputationRegistry.getSummary(agentId, [], "", "")` for aggregate feedback.
2. Normalize to 0-100 scale.
3. Weight by transaction value if `feedbackURI` contains payment proof references.
4. Include in KYA credential as an attestation of historical behavior.

Relying parties MAY use this score for tiered trust decisions (see ERC-8004 Trust Tiering, Section 6 of the ERC-8004 specification).

---

## 4. Integration with Payment Protocols

### 4.1 x402 (Coinbase)

**Attachment point:** The KYA credential (or a selective disclosure subset) is included in the `PAYMENT-SIGNATURE` header alongside the `PaymentPayload`.

```
POST /api/resource HTTP/1.1
PAYMENT-SIGNATURE: <base64(PaymentPayload)>
X-KYA-CREDENTIAL: <base64(KYACredentialOrSDJWT)>
```

**Verification by x402 facilitator:**
1. Facilitator receives payment + KYA credential.
2. Runs verification flow (Section 2.6).
3. If KYA verification fails, returns `403 Forbidden` with `X-KYA-ERROR` header.
4. If KYA verification passes, processes payment and includes KYA credential hash in the payment receipt.

**Compliance receipt linkage:** The x402 payment receipt references the KYA credential hash, creating an auditable chain: `Agent Identity (ERC-8004) -> KYA Credential -> x402 Payment Receipt -> Compliance Receipt (ProofLink)`.

### 4.2 MPP (Stripe/Tempo Machine Payments Protocol)

**Attachment point:** KYA credential is presented at session initialization.

```
Session Open Request:
{
  "agent_id": "erc8004:8453:0x...:42",
  "kya_credential": "<base64(KYACredential)>",
  "requested_budget": { "amount": "1000", "currency": "USDC" },
  "session_duration": "3600"
}
```

**Verification:** The MPP session validator checks the KYA credential once at session open. All payments within the session inherit the KYA verification if they fall within the delegation scope. Re-verification is triggered if a payment would exceed `requiresHumanApprovalAbove`.

### 4.3 AP2 (Google Agent Payments Protocol)

**Attachment point:** KYA credential is embedded in the AP2 Mandate as a linked Verifiable Credential.

```json
{
  "@type": "PaymentMandate",
  "agent": {
    "did": "did:ethr:base:0x...",
    "kyaCredential": {
      "@type": "VerifiablePresentation",
      "verifiableCredential": ["<KYACredential>"]
    }
  },
  "intent": { ... },
  "cart": { ... }
}
```

AP2's existing ECDSA signature chain validates the mandate; the KYA credential adds the compliance layer. AP2's role separation (User, Shopping Agent, Credentials Provider, Merchant, Issuer) maps to KYA as: the Credentials Provider issues or presents the KYA credential on the Shopping Agent's behalf.

### 4.4 ACP (OpenAI/Stripe Agentic Commerce Protocol)

**Attachment point:** KYA credential is included in the Shared Payment Token (SPT) metadata.

Before SPT execution, the compliance layer verifies the agent's KYA credential and checks that the SPT parameters fall within the delegation scope. The SPT is rejected if the agent's KYA credential is revoked, expired, or the transaction exceeds authorized limits.

---

## 5. Travel Rule Compliance for Agent Transactions

### 5.1 The Agent Travel Rule Problem

FATF Recommendation 16 requires originator and beneficiary information to travel with virtual asset transfers. For agent-to-agent transactions, the "originator" is not the agent itself but the human principal who authorized it. KYA-1 solves this by carrying the principal's identity reference within the credential.

### 5.2 IVMS101 Mapping

The InterVASP Messaging Standard 101 (IVMS101) defines the data format for Travel Rule information exchange. KYA credentials map to IVMS101 as follows:

| IVMS101 Field | KYA Source |
|---------------|-----------|
| Originator Name | Resolved from `principalEntity.verifiableLEI` or `principalHuman.humanDID` |
| Originator Account | `agentIdentity.agentDID` (agent's wallet address) |
| Originator VASP | KYA issuer DID (if issuer is a registered VASP) or the principal entity's VASP |
| Originator Address | Resolved from `principalEntity.jurisdiction` + LEI registered address |
| Beneficiary Name | From the counterparty's KYA credential |
| Beneficiary Account | Counterparty agent's DID |

### 5.3 Travel Rule Data Exchange Flow

```
Agent A (originator) presents KYA credential to ProofLink
    |
    v
ProofLink extracts IVMS101-compatible originator data from KYA
    |
    v
ProofLink transmits to counterparty VASP via Notabene Gateway
(or direct protocol: TRISA, Sygna, TRP)
    |
    v
Counterparty VASP receives originator data + KYA credential hash
    |
    v
Counterparty VASP verifies KYA credential independently
    |
    v
If Travel Rule satisfied: transaction proceeds
If not: transaction held pending additional information
```

### 5.4 Jurisdiction Threshold Application

| Jurisdiction | Threshold | KYA Behavior |
|-------------|-----------|-------------|
| EU (MiCA/TFR) | None (CASP-to-CASP); EUR 1,000 (self-hosted) | Always transmit full IVMS101 data for CASP transfers; enhanced due diligence above EUR 1,000 for self-hosted |
| US (BSA) | $3,000 | Transmit IVMS101 data when transaction >= $3,000; maintain records below threshold |
| UK (FCA) | None (inter-business) | Always transmit for business-to-business |
| Singapore (MAS) | SGD 1,500 | Transmit above threshold |
| UAE (ADGM) | AED 3,500 | Transmit above threshold |

---

## 6. Privacy Considerations

### 6.1 On-Chain vs. Off-Chain Data Separation

| Data | Storage | Rationale |
|------|---------|-----------|
| KYA credential hash | On-chain (ERC-8004 metadata) | Enables on-chain contracts to verify KYA existence without credential contents |
| KYA issuer DID | On-chain (ERC-8004 metadata) | Public information; allows counterparties to check issuer trust |
| Credential expiry | On-chain (ERC-8004 metadata) | Enables time-based gating in smart contracts |
| Full KYA credential | Off-chain (agent custody, IPFS pinning optional) | Contains compliance-sensitive data; subject to GDPR |
| Principal identity (LEI, human DID) | Off-chain (within credential, selectively disclosable) | PII or PII-adjacent; MUST NOT be stored on-chain |
| Sanctions screening details | Off-chain (within credential) | Operational compliance data; time-sensitive |
| AML risk score | Off-chain (within credential) | Proprietary scoring; subject to provider terms |
| Revocation status | On-chain (BitstringStatusList) | Must be publicly queryable for real-time revocation checking |

### 6.2 GDPR Compliance

- The `principalHuman.humanDID` field contains a pseudonymous identifier, not raw PII. The mapping from DID to natural person identity is held by the KYC provider, not by the KYA issuer or on-chain.
- Selective disclosure (Section 2.7) ensures relying parties receive only the minimum claims necessary for their verification purpose.
- The right to erasure (Art. 17 GDPR) is satisfied because the credential is off-chain and under the holder's control. The on-chain hash cannot be reversed to PII.
- Credential expiry (max 90 days) limits the temporal scope of any data exposure.

### 6.3 Data Minimization by Relying Party Type

| Relying Party | Claims Required | Claims NOT Needed |
|---------------|----------------|-------------------|
| x402 facilitator | `sanctionsScreened`, `delegationScope`, `agentIdentity` | `principalEntity.legalEntityIdentifier`, `humanDID` |
| VASP (Travel Rule) | Full IVMS101 mapping from `principalEntity` and `principalHuman` | `reputationScore`, `behavioralScore` |
| DeFi protocol | ZK proof of valid credential + sanctions clearance | All raw fields |
| Enterprise counterparty | `principalEntity`, `complianceStatus`, `delegationScope` | `humanVerificationMethod` details |

---

## 7. Security Considerations

### 7.1 Sybil Resistance

**Threat:** An attacker creates many agents with KYA credentials to distribute sanctioned activity across apparently-clean identities.

**Mitigations:**
1. **Principal binding:** Every KYA credential links to a verified human principal. The issuer MUST verify that the human has not exceeded a configurable agent-per-principal limit (RECOMMENDED: 50 agents per natural person, 500 per legal entity).
2. **Human verification requirement:** The `humanVerificationMethod` field MUST reference a Sybil-resistant proof of personhood (World ID orb verification, government-issued eIDAS credential, or KYC provider liveness check). Device-only verification (`world_id_device`) SHOULD carry reduced trust weight.
3. **Cost of issuance:** KYA credential issuance incurs a verification cost (identity checks, sanctions screening). This creates economic friction against mass Sybil creation.
4. **Behavioral correlation:** The optional `behavioralScore` field reflects continuous monitoring that can detect coordinated activity patterns across agents sharing infrastructure or transaction patterns.

### 7.2 Credential Revocation

**Mechanism:** W3C BitstringStatusList (formerly StatusList2021).

- The KYA issuer maintains a status list credential at a stable URL.
- Each KYA credential is assigned a `statusListIndex`.
- To revoke: the issuer sets the bit at that index in the status list.
- Relying parties MUST fetch and cache the status list. RECOMMENDED cache TTL: 60 seconds for payment contexts, 300 seconds for discovery contexts.
- Revocation is permanent for a given credential. The agent must obtain a new credential post-remediation.

**Revocation triggers:**
- Agent wallet appears on a newly updated sanctions list
- Principal entity's KYB status changes to `failed` or `expired`
- Behavioral anomaly detection flags the agent (velocity spike, new jurisdiction activity, counterparty risk change)
- Principal human explicitly revokes the agent's delegation
- KYA issuer's periodic re-screening finds a compliance failure

### 7.3 Credential Theft and Replay

- KYA credentials are bound to a specific `agentDID` and `agentIdentity.tokenId`. Presenting a stolen credential requires controlling the agent's private key AND the ERC-8004 NFT.
- Relying parties MUST perform the on-chain identity binding check (Step 5 in Section 2.6) to confirm the presenter controls the agent.
- The `validUntil` field limits the window of exposure for any compromised credential.
- For high-value transactions, relying parties SHOULD require a fresh signature from the agent's wallet over the transaction payload, proving live key control.

### 7.4 Issuer Compromise

- If a KYA issuer's signing key is compromised, all credentials issued by that key are suspect.
- Mitigation: issuers MUST support key rotation via DID Document updates. Relying parties MUST resolve the issuer's DID Document at verification time (not cache indefinitely).
- Issuers SHOULD use hardware security modules (HSMs) for signing key custody.
- The trusted issuer list maintained by each relying party provides a circuit breaker: removing a compromised issuer from the list immediately invalidates all its credentials from the relying party's perspective.

### 7.5 Collusion Between Issuer and Agent

- A dishonest issuer could issue KYA credentials to non-compliant agents.
- Mitigation: the ERC-8004 Validation Registry provides a public, auditable record of which issuers verified which agents. Cross-issuer verification (requiring credentials from 2+ independent issuers for high-value thresholds) reduces single-issuer risk.
- Regulatory oversight of KYA issuers (similar to VASP registration) is expected to emerge as the standard gains adoption.

---

## 8. Reference Implementation Outline

### 8.1 Core Interfaces

```typescript
// KYA Issuer Interface
interface IKYAIssuer {
  // Verify agent identity and principal, then issue a KYA credential
  issueCredential(request: KYAIssuanceRequest): Promise<VerifiableCredential>;

  // Revoke an existing credential by setting its status bit
  revokeCredential(credentialId: string, reason: RevocationReason): Promise<void>;

  // Re-screen an agent and renew the credential if still compliant
  renewCredential(agentId: ERC8004AgentId): Promise<VerifiableCredential>;

  // Batch re-screening for all active credentials
  batchRescreen(filter: RescreenFilter): Promise<RescreenResult[]>;
}

// KYA Verifier Interface (used by relying parties)
interface IKYAVerifier {
  // Full verification flow (Section 2.6)
  verifyCredential(
    credential: VerifiableCredential,
    transaction: TransactionContext
  ): Promise<KYAVerificationResult>;

  // Check only revocation status (fast path)
  checkRevocationStatus(credentialId: string): Promise<RevocationStatus>;

  // Verify delegation scope against a specific transaction
  checkDelegationScope(
    credential: VerifiableCredential,
    transactionValue: Amount,
    counterpartyJurisdiction: string,
    protocol: string
  ): Promise<ScopeCheckResult>;
}

// On-chain KYA gate (Solidity, for ERC-8183 hooks)
interface IKYAGate {
  // Check if an agent has a valid KYA commitment in ERC-8004 metadata
  function hasValidKYA(uint256 agentId) external view returns (bool);

  // Check if the KYA issuer is trusted
  function isTrustedIssuer(bytes calldata issuerDID) external view returns (bool);

  // Full gate check for escrow release
  function canReleaseFunds(
    uint256 providerAgentId,
    uint256 clientAgentId
  ) external view returns (bool);
}
```

### 8.2 Issuance Flow Pseudocode

```
function issueCredential(request):
    // 1. Verify ERC-8004 identity exists and is active
    agent = erc8004.ownerOf(request.tokenId)
    assert agent != address(0), "Agent not registered"
    agentWallet = erc8004.getAgentWallet(request.tokenId)
    assert agentWallet == request.agentWalletAddress, "Wallet mismatch"

    // 2. Verify principal identity
    if request.principalType == "LegalEntity":
        vLEI = gleif.resolveVLEI(request.lei)
        assert vLEI.isValid(), "Invalid or expired vLEI"
        kybResult = kybProvider.verify(request.lei)
        assert kybResult.status == "verified", "KYB failed"
    end

    // 3. Verify human principal
    humanProof = verifyHumanProof(request.humanVerificationMethod, request.humanProof)
    assert humanProof.isValid(), "Human verification failed"
    assert humanProof.isUnique(), "Sybil check failed"

    // 4. Run sanctions screening
    sanctionsResult = sanctionsProvider.screen(
        addresses: [agentWallet, request.principalAddress],
        lists: ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED", "HMT"]
    )
    assert sanctionsResult.clear == true, "Sanctions match found"

    // 5. Run AML screening
    amlResult = amlProvider.score(agentWallet)

    // 6. Build credential
    credential = buildKYACredential(
        agentIdentity: { chainId, registryAddress, tokenId, agentDID },
        principalEntity: { entityType, lei, kybStatus, jurisdiction },
        principalHuman: { humanDID, verificationMethod, delegationScope },
        complianceStatus: { sanctionsResult, amlResult }
    )

    // 7. Sign credential
    signedCredential = sign(credential, issuerSigningKey)

    // 8. Write on-chain commitment
    erc8004.setMetadata(tokenId, "kya:credentialHash", sha256(signedCredential))
    erc8004.setMetadata(tokenId, "kya:issuer", bytes(issuerDID))
    erc8004.setMetadata(tokenId, "kya:validUntil", bytes(credential.validUntil))

    // 9. Register in Validation Registry
    erc8004.validationResponse(
        requestHash: keccak256(tokenId, "kya_verification"),
        response: 100,
        responseURI: storageURI,
        responseHash: sha256(signedCredential),
        tag: "kya_v1"
    )

    return signedCredential
```

### 8.3 Verification Flow Pseudocode

```
function verifyCredential(credential, transactionContext):
    // Step 1: Schema validation
    assert credential.type.includes("KYACredential")
    assert credential.validFrom <= now() <= credential.validUntil

    // Step 2: Proof verification
    issuerDIDDoc = didResolver.resolve(credential.issuer.id)
    publicKey = issuerDIDDoc.getVerificationMethod(credential.proof.verificationMethod)
    assert verifyProof(credential, publicKey), "Invalid signature"

    // Step 3: Issuer trust
    assert trustedIssuers.includes(credential.issuer.id), "Untrusted issuer"

    // Step 4: Revocation check
    statusList = fetch(credential.credentialStatus.statusListCredential)
    bit = statusList.getBit(credential.credentialStatus.statusListIndex)
    assert bit == 0, "Credential revoked"

    // Step 5: On-chain binding
    onChainOwner = erc8004.ownerOf(credential.credentialSubject.agentIdentity.tokenId)
    assert onChainOwner != address(0), "Agent not registered on-chain"
    onChainWallet = erc8004.getAgentWallet(tokenId)
    assert resolvesDID(credential.credentialSubject.agentIdentity.agentDID, onChainWallet)

    // Step 6: Delegation scope
    scope = credential.credentialSubject.principalHuman.delegationScope
    assert transactionContext.value <= scope.maxTransactionValue
    assert transactionContext.counterpartyJurisdiction not in scope.blockedJurisdictions
    assert transactionContext.protocol in scope.allowedProtocols
    if transactionContext.value > scope.requiresHumanApprovalAbove:
        assert transactionContext.hasHumanCoSignature, "Human approval required"

    // Step 7: Compliance freshness
    staleness = now() - credential.credentialSubject.complianceStatus.sanctionsScreenDate
    if transactionContext.value > HIGH_VALUE_THRESHOLD:
        assert staleness < 1 hour, "Sanctions screening too stale for high-value tx"
    else:
        assert staleness < 24 hours, "Sanctions screening too stale"

    return { valid: true, trustLevel: computeTrustLevel(credential) }
```

### 8.4 On-Chain KYA Gate (Solidity Outline)

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

interface IERC8004IdentityRegistry {
    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract KYAGate {
    IERC8004IdentityRegistry public immutable identityRegistry;
    mapping(bytes32 => bool) public trustedIssuers;  // keccak256(issuerDID) => trusted

    function hasValidKYA(uint256 agentId) external view returns (bool) {
        bytes memory credHash = identityRegistry.getMetadata(agentId, "kya:credentialHash");
        if (credHash.length == 0) return false;

        bytes memory issuerBytes = identityRegistry.getMetadata(agentId, "kya:issuer");
        if (!trustedIssuers[keccak256(issuerBytes)]) return false;

        bytes memory expiryBytes = identityRegistry.getMetadata(agentId, "kya:validUntil");
        uint256 expiry = abi.decode(expiryBytes, (uint256));
        if (block.timestamp > expiry) return false;

        return true;
    }

    function canReleaseFunds(
        uint256 providerAgentId,
        uint256 clientAgentId
    ) external view returns (bool) {
        return hasValidKYA(providerAgentId) && hasValidKYA(clientAgentId);
    }
}
```

---

## 9. Conformance Requirements

### 9.1 KYA Issuer Conformance

A conformant KYA issuer MUST:
1. Issue credentials conforming to the schema in Section 2.3.
2. Include all REQUIRED fields defined in Section 2.4.1.
3. Perform sanctions screening against at minimum OFAC SDN before issuance.
4. Verify the human principal via at least one method listed in `humanVerificationMethod`.
5. Support credential revocation via BitstringStatusList.
6. Set `validUntil` to no more than 90 days after `validFrom`.
7. Write the credential hash to ERC-8004 metadata upon issuance.
8. Re-screen all active credentials against updated sanctions lists within 24 hours of list publication.

A conformant KYA issuer SHOULD:
1. Screen against all four major sanctions lists (OFAC, EU, UN, HMT).
2. Include AML risk scoring from a recognized provider.
3. Register as a validator in the ERC-8004 Validation Registry.
4. Support both SD-JWT and BBS+ selective disclosure.

### 9.2 Relying Party Conformance

A conformant relying party MUST:
1. Execute all REQUIRED steps in the verification flow (Section 2.6).
2. Reject credentials with missing REQUIRED fields.
3. Check revocation status with a cache TTL of no more than 300 seconds.
4. Verify on-chain identity binding (Step 5).
5. Enforce delegation scope constraints (Step 6).

A conformant relying party SHOULD:
1. Maintain a configurable trusted issuer list.
2. Implement compliance freshness thresholds appropriate to transaction value.
3. Log verification results for audit purposes.

---

## 10. Rationale

### 10.1 Why W3C Verifiable Credentials

W3C VCs provide: a mature data model with broad tooling support, built-in proof mechanisms, a path to selective disclosure via SD-JWT and BBS+, and compatibility with the emerging EU eIDAS 2.0 framework (effective June 2026). Using VCs ensures KYA credentials are interoperable with government-issued digital identity wallets.

### 10.2 Why ERC-8004 as the Identity Anchor

ERC-8004 is the most widely deployed agent identity registry (49,000+ agents, 35+ networks). Its ERC-721 base provides portable, transferable identity. Its metadata store provides an extensible key-value surface for KYA commitment without contract modifications. Its Validation Registry provides a natural attestation channel. No other standard offers this combination.

### 10.3 Why Off-Chain Credential Storage

Storing full KYA credentials on-chain would expose compliance-sensitive data (principal identity, delegation limits, AML scores) to public inspection, violating GDPR and creating competitive intelligence leakage. The on-chain commitment hash proves credential existence and freshness while preserving privacy.

### 10.4 Why 90-Day Maximum Validity

Sanctions lists update frequently (OFAC adds approximately 12 crypto addresses per week as of 2025). AML risk scores change as transaction patterns evolve. A 90-day maximum ensures credentials are re-verified regularly without imposing excessive re-issuance burden. For high-risk agents or jurisdictions, issuers SHOULD use shorter validity periods (30 days).

---

## 11. Backwards Compatibility

KYA-1 introduces no changes to:
- The ERC-8004 Identity Registry, Reputation Registry, or Validation Registry contracts
- The W3C Verifiable Credentials Data Model v2.0
- Any existing payment protocol (x402, MPP, AP2, ACP)

KYA-1 uses only existing extension points: ERC-8004 metadata keys, W3C VC context extension, and HTTP header extension for payment protocols.

---

## 12. Test Vectors

### 12.1 Minimal Valid KYA Credential

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://prooflink.dev/kya/v1"
  ],
  "id": "urn:uuid:00000000-0000-0000-0000-000000000001",
  "type": ["VerifiableCredential", "KYACredential"],
  "issuer": { "id": "did:web:test-issuer.example.com" },
  "validFrom": "2026-03-20T00:00:00Z",
  "validUntil": "2026-06-18T00:00:00Z",
  "credentialStatus": {
    "id": "https://test-issuer.example.com/kya/status/1",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "0",
    "statusListCredential": "https://test-issuer.example.com/kya/status-list/1"
  },
  "credentialSubject": {
    "id": "did:ethr:0x1234567890abcdef1234567890abcdef12345678",
    "agentIdentity": {
      "agentId": "erc8004:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432:1",
      "chainId": 1,
      "registryAddress": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      "tokenId": 1,
      "agentDID": "did:ethr:0x1234567890abcdef1234567890abcdef12345678"
    },
    "principalEntity": {
      "entityType": "NaturalPerson",
      "jurisdiction": "US"
    },
    "principalHuman": {
      "humanDID": "did:key:z6MkTest",
      "humanVerificationMethod": "kyc_credential",
      "delegationScope": {
        "maxTransactionValue": { "amount": "100", "currency": "USDC" },
        "blockedJurisdictions": ["IR", "KP", "CU", "SY"],
        "allowedProtocols": ["x402"],
        "expiresAt": "2026-06-18T00:00:00Z"
      }
    },
    "complianceStatus": {
      "sanctionsScreened": true,
      "sanctionsScreenDate": "2026-03-20T00:00:00Z",
      "travelRuleCapable": false
    }
  }
}
```

### 12.2 Invalid Credential: Missing Required Field

A credential missing `principalHuman.delegationScope` MUST be rejected by conformant verifiers.

### 12.3 Invalid Credential: Expired

A credential with `validUntil` in the past MUST be rejected at Step 1 of the verification flow.

### 12.4 Invalid Credential: Delegation Scope Exceeded

A credential with `maxTransactionValue` of 100 USDC presented for a 500 USDC transaction MUST be rejected at Step 6 of the verification flow.

---

## 13. References

### Normative References

- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [W3C BitstringStatusList v1.0](https://www.w3.org/TR/vc-bitstring-status-list/)
- [W3C VC Data Integrity](https://www.w3.org/TR/vc-data-integrity/)
- [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [EIP-712: Typed Structured Data Hashing and Signing](https://eips.ethereum.org/EIPS/eip-712)
- [GLEIF vLEI Ecosystem Governance Framework](https://www.gleif.org/en/vlei/introducing-the-verifiable-lei-vlei)
- [IVMS101 InterVASP Messaging Standard](https://intervasp.org/)
- [ISO 3166-1 Country Codes](https://www.iso.org/iso-3166-country-codes.html)

### Informative References

- [ERC-3643: T-REX Token Standard](https://eips.ethereum.org/EIPS/eip-3643)
- [ERC-8183: Programmable Escrow for AI Agents](https://ethereum-magicians.org/)
- [x402 Protocol Specification](https://www.x402.org/)
- [FATF Recommendation 16 (Travel Rule)](https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html)
- [GENIUS Act (S.1582)](https://www.congress.gov/bill/119th-congress/senate-bill/1582/text)
- [MiCA Regulation (EU 2023/1114)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114)
- [Notabene Travel Rule Gateway](https://notabene.id/)
- [SD-JWT Specification](https://datatracker.ietf.org/doc/draft-ietf-oauth-selective-disclosure-jwt/)
- [BBS+ Signatures](https://www.w3.org/TR/vc-di-bbs/)

---

## 14. Copyright

Copyright and related rights waived via [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

---

## Appendix A: KYA Credential JSON Schema (for validation tooling)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://prooflink.dev/kya/v1/schema.json",
  "title": "KYA Credential Subject Schema",
  "type": "object",
  "required": [
    "agentIdentity",
    "principalEntity",
    "principalHuman",
    "complianceStatus"
  ],
  "properties": {
    "agentIdentity": {
      "type": "object",
      "required": ["agentId", "chainId", "registryAddress", "tokenId", "agentDID"],
      "properties": {
        "agentId": { "type": "string", "pattern": "^erc8004:\\d+:0x[0-9a-fA-F]{40}:\\d+$" },
        "chainId": { "type": "integer", "minimum": 1 },
        "registryAddress": { "type": "string", "pattern": "^0x[0-9a-fA-F]{40}$" },
        "tokenId": { "type": "integer", "minimum": 0 },
        "agentDID": { "type": "string", "pattern": "^did:" }
      }
    },
    "principalEntity": {
      "type": "object",
      "required": ["entityType", "jurisdiction"],
      "properties": {
        "entityType": { "type": "string", "enum": ["LegalEntity", "NaturalPerson", "DAO", "MultisigWallet"] },
        "legalEntityIdentifier": { "type": "string", "pattern": "^[A-Z0-9]{20}$" },
        "verifiableLEI": { "type": "string", "pattern": "^did:" },
        "kybStatus": { "type": "string", "enum": ["verified", "pending", "expired", "failed"] },
        "jurisdiction": { "type": "string", "pattern": "^[A-Z]{2}$" }
      }
    },
    "principalHuman": {
      "type": "object",
      "required": ["humanDID", "humanVerificationMethod", "delegationScope"],
      "properties": {
        "humanDID": { "type": "string", "pattern": "^did:" },
        "humanVerificationMethod": {
          "type": "string",
          "enum": ["world_id_orb", "world_id_device", "kyc_credential", "eidas_eudi", "civic_sbt", "polygon_id_zk"]
        },
        "humanVerificationCredential": { "type": "string" },
        "delegationScope": {
          "type": "object",
          "required": ["maxTransactionValue", "blockedJurisdictions", "allowedProtocols", "expiresAt"],
          "properties": {
            "maxTransactionValue": {
              "type": "object",
              "required": ["amount", "currency"],
              "properties": {
                "amount": { "type": "string", "pattern": "^\\d+(\\.\\d+)?$" },
                "currency": { "type": "string" }
              }
            },
            "maxDailyVolume": {
              "type": "object",
              "properties": {
                "amount": { "type": "string" },
                "currency": { "type": "string" }
              }
            },
            "allowedCurrencies": { "type": "array", "items": { "type": "string" } },
            "allowedCounterpartyTypes": { "type": "array", "items": { "type": "string" } },
            "blockedJurisdictions": { "type": "array", "items": { "type": "string", "pattern": "^[A-Z]{2}$" } },
            "allowedProtocols": { "type": "array", "items": { "type": "string" } },
            "requiresHumanApprovalAbove": {
              "type": "object",
              "properties": {
                "amount": { "type": "string" },
                "currency": { "type": "string" }
              }
            },
            "expiresAt": { "type": "string", "format": "date-time" }
          }
        }
      }
    },
    "complianceStatus": {
      "type": "object",
      "required": ["sanctionsScreened", "sanctionsScreenDate", "travelRuleCapable"],
      "properties": {
        "sanctionsScreened": { "type": "boolean" },
        "sanctionsLists": { "type": "array", "items": { "type": "string" } },
        "sanctionsScreenDate": { "type": "string", "format": "date-time" },
        "amlRiskScore": { "type": "integer", "minimum": 0, "maximum": 100 },
        "amlProvider": { "type": "string" },
        "travelRuleCapable": { "type": "boolean" },
        "travelRuleProtocols": { "type": "array", "items": { "type": "string" } }
      }
    },
    "reputationScore": { "type": "integer", "minimum": 0, "maximum": 100 },
    "behavioralScore": { "type": "integer", "minimum": 0, "maximum": 100 },
    "transactionCount": { "type": "integer", "minimum": 0 },
    "activeMonths": { "type": "integer", "minimum": 0 }
  }
}
```

---

## Appendix B: Registered Sanctions List Identifiers

| Identifier | Full Name | Maintainer |
|-----------|-----------|------------|
| `OFAC_SDN` | Specially Designated Nationals and Blocked Persons List | US Treasury OFAC |
| `OFAC_CONSOLIDATED` | OFAC Consolidated Sanctions List | US Treasury OFAC |
| `EU_CONSOLIDATED` | EU Consolidated Financial Sanctions List | European Commission |
| `UN_CONSOLIDATED` | UN Security Council Consolidated List | United Nations |
| `HMT` | HM Treasury Consolidated List | UK HM Treasury |

---

## Appendix C: Human Verification Method Registry

| Method ID | Description | Sybil Resistance Level | Privacy |
|-----------|-------------|----------------------|---------|
| `world_id_orb` | World ID biometric iris verification | High | ZK proof, no biometric data shared |
| `world_id_device` | World ID device-based verification | Medium | Device attestation only |
| `kyc_credential` | Traditional KYC via licensed provider (Jumio, Onfido, Persona) | High | Full identity verified, VC issued |
| `eidas_eudi` | EU Digital Identity Wallet (eIDAS 2.0) | Very High | Government-issued, legally binding |
| `civic_sbt` | Civic soulbound identity token | Medium | On-chain attestation |
| `polygon_id_zk` | Polygon ID zero-knowledge credential | High | ZK proof of identity claims |

---

## Appendix D: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-03-20 | Initial draft |
