# ProofLink Technical Architecture
**Version:** 1.0
**Date:** March 20, 2026
**Status:** Architecture Design (Pre-Implementation)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
                                  EXTERNAL CLIENTS
                    +-----------+-----------+-----------+
                    | Web App   | AI Agents | ERP/API   |
                    | (React)   | (MCP/x402)| (REST)    |
                    +-----+-----+-----+-----+-----+----+
                          |           |           |
                +---------v-----------v-----------v---------+
                |              API GATEWAY (Kong/Envoy)      |
                |  REST | GraphQL | WebSocket | x402 Proxy   |
                +--+----------+----------+----------+-------+
                   |          |          |          |
        +----------v---+ +---v------+ +-v--------+ +v-----------+
        | ProofLink    | | Agent    | | Payment  | | Invoice    |
        | Engine       | | Identity | | Protocol | | Service    |
        | (Compliance) | | (KYA)    | | Router   | |            |
        +-+--+--+--+---+ +----+-----+ +----+-----+ +-----+-----+
          |  |  |  |          |             |              |
          |  |  |  |     +----v-----+  +----v------+  +---v------+
          |  |  |  |     | ERC-8004 |  | x402 Fac. |  | Invoice  |
          |  |  |  |     | Registry |  | MPP Sess. |  | Contracts|
          |  |  |  |     | DID Reg. |  | AP2 Mand. |  |          |
          |  |  |  |     +----------+  +-----------+  +----------+
          |  |  |  |
     +----+  |  |  +--------+
     |       |  |           |
+----v---+ +-v--v----+ +---v---------+ +--v-----------+
|Sanctions| |Travel   | |AML Monitor | |Compliance    |
|Screener | |Rule Eng.| |(Behavioral)| |Receipt Issuer|
|Chainal. | |Notabene | |            | |(EAS Attester)|
+----+----+ +----+----+ +-----+------+ +------+-------+
     |           |             |               |
     +-----+----+------+------+-------+-------+
           |           |              |
    +------v------+ +--v-----------+ +v--------------+
    | PostgreSQL  | | Redis/Valkey | | Blockchain     |
    | (Compliance | | (Cache/Queues| | Nodes          |
    |  Audit Log) | |  Sessions)   | | (Base/ETH/SOL) |
    +-------------+ +--------------+ +----------------+
```

### 1.2 Component Breakdown

| Component | Responsibility | Latency Budget |
|-----------|---------------|----------------|
| **API Gateway** | Rate limiting, auth, routing, x402 proxy | <10ms |
| **ProofLink Engine** | Compliance decision pipeline (sanctions, AML, Travel Rule) | <500ms total |
| **Agent Identity (KYA)** | DID resolution, VC verification, ERC-8004 registry | <100ms |
| **Payment Protocol Router** | Multi-protocol routing (x402, MPP, AP2, ACP) | <50ms |
| **Invoice Service** | Invoice creation, storage, ERP sync, on-chain anchoring | <200ms |
| **Compliance Receipt Issuer** | Cryptographic proof generation, on-chain attestation | <100ms |

### 1.3 Data Flow: Happy Path (Agent-Initiated Payment)

```
1. Agent discovers ProofLink-registered service via ERC-8004 registry
2. Agent initiates payment via x402 header / MPP session / AP2 mandate
3. API Gateway routes to Payment Protocol Router
4. Router identifies protocol, extracts payment intent
5. Router calls ProofLink Engine with (sender, receiver, amount, protocol_metadata)
6. ProofLink Engine executes compliance pipeline:
   a. Resolve agent DID -> verify KYA credential (Agent Identity)
   b. Screen sender wallet (Chainalysis sanctions API) [<100ms]
   c. Screen receiver wallet (Chainalysis sanctions API) [<100ms]
   d. Evaluate AML risk score (behavioral model) [<50ms]
   e. Check Travel Rule applicability -> transmit via Notabene if required [<200ms]
   f. Apply jurisdictional rules (GENIUS Act, MiCA thresholds) [<10ms]
7. ProofLink returns PASS/FAIL + risk score + compliance receipt hash
8. If PASS: Payment Protocol Router authorizes settlement on underlying rail
9. Invoice Service generates/updates invoice record
10. Compliance Receipt Issuer creates signed receipt, anchors hash on-chain
11. Response returned to agent with compliance attestation
```

---

## 2. ProofLink Engine

### 2.1 Compliance Decision Pipeline

The ProofLink Engine is a synchronous pipeline that must complete in <500ms. It is the core product.

```
                         ProofLink Decision Pipeline
                         ==========================

Input: ComplianceRequest {
  sender: WalletAddress | AgentDID
  receiver: WalletAddress | AgentDID
  amount: Decimal
  asset: "USDC" | "EURC" | ...
  chain: CAIP2ChainId
  protocol: "x402" | "mpp" | "ap2" | "acp"
  protocolMetadata: ProtocolSpecificPayload
  jurisdiction: { sender: ISO3166, receiver: ISO3166 }
}

Pipeline Steps (sequential, fail-fast):

Step 1: Identity Resolution [<50ms]
  - If sender is AgentDID -> resolve via KYA service
  - If sender is WalletAddress -> lookup in identity cache
  - Extract: principal entity, delegation scope, credential status
  - FAIL if: agent unregistered, credentials expired, delegation revoked

Step 2: Sanctions Screening [<100ms, parallelized]
  - Screen sender address via Chainalysis API
  - Screen receiver address via Chainalysis API
  - Screen sender principal entity name against OFAC/EU/UN/HMT
  - Screen receiver entity against same lists
  - FAIL if: any match (SDN, EU consolidated, UN, HMT)
  - WARN if: indirect exposure (2+ hops from sanctioned address)

Step 3: AML Risk Scoring [<50ms]
  - Query transaction history for sender agent
  - Compute velocity score (transactions/hour vs baseline)
  - Compute destination risk score (receiver risk profile)
  - Compute amount anomaly score (vs sender historical pattern)
  - Aggregate into composite risk score [0-100]
  - FAIL if: score > configurable threshold (default: 85)
  - ESCALATE if: score > configurable threshold (default: 60)

Step 4: Travel Rule Check [<200ms]
  - Determine if Travel Rule applies:
    - US: amount > $3,000
    - EU: always for CASP-to-CASP; enhanced at EUR 1,000+ for unhosted
    - Singapore: SGD 1,500
    - Japan: no threshold
  - If applicable:
    - Construct IVMS101 message from sender/receiver identity data
    - Transmit via Notabene Gateway to counterparty VASP
    - Await ACK (async; settlement can proceed with pending status)
  - If unhosted wallet: apply risk-based enhanced due diligence

Step 5: Jurisdictional Rule Engine [<10ms]
  - Check MiCA compliance: is stablecoin MiCA-authorized EMT?
  - Check GENIUS Act compliance: is issuer GENIUS-compliant?
  - Check per-jurisdiction stablecoin restrictions
  - Check cross-border transfer limits
  - FAIL if: stablecoin not authorized in target jurisdiction

Output: ComplianceDecision {
  status: "APPROVED" | "REJECTED" | "ESCALATED"
  riskScore: number (0-100)
  receiptId: UUID
  receiptHash: bytes32
  checks: CheckResult[]
  travelRuleStatus: "NOT_REQUIRED" | "TRANSMITTED" | "PENDING" | "FAILED"
  timestamp: ISO8601
  ttl: number (seconds this decision is valid, default: 300)
}
```

### 2.2 Sanctions Screening Integration (Chainalysis)

**Tier 1 (MVP / Free):** Chainalysis Free Sanctions API
- Endpoint: `https://public.chainalysis.com/api/v1/address/{address}`
- Coverage: OFAC SDN list wallet addresses only
- Cost: Free
- Latency: <50ms typical
- Limitation: No indirect exposure, no heuristic clustering

**Tier 2 (Growth):** Chainalysis Address Screening API
- Coverage: OFAC + EU + UN + HMT + hacks + exploits + darknet + terrorism financing
- Cost: $150K-$500K/year (enterprise contract)
- Features: Risk categories, indirect exposure scoring, continuous monitoring webhooks

**Integration Interface:**

```typescript
interface SanctionsScreener {
  // Synchronous single-address check
  screenAddress(params: {
    address: string;
    chain: CAIP2ChainId;
    asset?: string;
  }): Promise<SanctionsResult>;

  // Batch check for multi-party transactions
  screenBatch(params: {
    addresses: { address: string; chain: CAIP2ChainId; role: "sender" | "receiver" }[];
  }): Promise<SanctionsResult[]>;

  // Entity name screening (for principal behind agent)
  screenEntity(params: {
    name: string;
    jurisdiction?: string;
    entityType: "individual" | "organization";
  }): Promise<SanctionsResult>;
}

interface SanctionsResult {
  address: string;
  isSanctioned: boolean;
  riskLevel: "none" | "low" | "medium" | "high" | "severe";
  matchedLists: ("OFAC" | "EU" | "UN" | "HMT")[];
  indirectExposure?: {
    hops: number;
    sanctionedCounterparty: string;
    exposurePercentage: number;
  };
  checkedAt: string; // ISO8601
  provider: "chainalysis_free" | "chainalysis_kyt" | "trm" | "chainaware";
}
```

**Caching strategy:**
- Cache PASS results for 5 minutes (sanctions lists update at most daily)
- Never cache FAIL results (always re-verify on retry)
- Invalidate cache on Chainalysis webhook notification (list update)

### 2.3 KYC/KYA Verification Flow

ProofLink does NOT perform KYC directly. It verifies that KYC has been performed by a trusted issuer and that the result is valid.

```
Human User Flow:
  1. User completes KYC with a trusted provider (Jumio, Onfido, Sumsub, Persona)
  2. Provider issues a Verifiable Credential (VC) to user's DID
  3. User presents VC to ProofLink during onboarding
  4. ProofLink verifies VC signature against trusted issuer registry
  5. ProofLink stores VC hash (not PII) in compliance database
  6. Subsequent transactions reference stored verification status

Agent (KYA) Flow:
  1. Controlling entity (human/business) registers agent on ERC-8004
  2. Controlling entity's vLEI or KYB credential attached to agent registration
  3. ProofLink validates:
     a. Agent exists in ERC-8004 Identity Registry
     b. Controlling entity has valid KYB/KYC credential from trusted issuer
     c. Delegation scope is explicitly defined
     d. Agent wallet is verified via EIP-712 or ERC-1271 signature
  4. ProofLink issues a KYA Verifiable Credential to the agent's DID
  5. KYA credential encodes: controlling entity LEI, delegation scope, expiry
```

### 2.4 FATF Travel Rule Implementation (Notabene)

```
Integration Architecture:
  ProofLink -> Notabene Gateway -> [TRP | OpenVASP | TRUST | Sygna | TRISA]
                                     -> Counterparty VASP

ProofLink acts as a VASP or on behalf of a VASP for Travel Rule purposes.

IVMS101 Message Construction:
{
  "originator": {
    "originatorPersons": [{
      "naturalPerson": {
        "name": { "nameIdentifier": [{ "primaryIdentifier": "...", "secondaryIdentifier": "..." }] },
        "geographicAddress": [{ "addressLine": ["..."], "country": "US" }],
        "nationalIdentification": { "nationalIdentifier": "...", "nationalIdentifierType": "PASSPORT" }
      }
    }],
    "accountNumber": ["0x..."]  // wallet address
  },
  "beneficiary": {
    "beneficiaryPersons": [{
      "naturalPerson": {
        "name": { "nameIdentifier": [{ "primaryIdentifier": "..." }] }
      }
    }],
    "accountNumber": ["0x..."]
  },
  "originatingVASP": {
    "legalPerson": { "name": { "nameIdentifier": [{ "legalPersonName": "ProofLink Inc." }] } }
  }
}

For Agent Transactions (ProofLink Extension):
  - originatorPersons includes the agent's controlling entity (not the agent itself)
  - agentMetadata (custom field): { agentId: ERC-8004 ID, delegationScope: "...", kyaCredentialHash: "..." }
  - This is ProofLink's proposed extension to IVMS101 for agent-mediated transfers
```

### 2.5 AML Transaction Monitoring

```
Two modes:

1. Real-time (in-flow, <50ms):
   - Velocity check: tx count in rolling 1h/24h window
   - Amount anomaly: deviation from 30-day moving average
   - Destination risk: pre-computed risk score for receiver address
   - Cross-agent correlation: same principal entity across multiple agents

2. Batch (post-hoc, scheduled):
   - Pattern analysis across all transactions (structuring detection)
   - Network graph analysis (layering detection)
   - Peer group comparison (agent vs similar agents)
   - SAR candidate identification
   - Reporting: generate suspicious activity narratives for compliance team
```

### 2.6 Performance Requirements

| Operation | Target Latency | P99 Latency | Throughput |
|-----------|---------------|-------------|------------|
| Full compliance check | <500ms | <800ms | 1,000 req/s |
| Sanctions screen (single) | <100ms | <200ms | 5,000 req/s |
| KYA credential verify | <50ms | <100ms | 10,000 req/s |
| Travel Rule transmit | <200ms | <500ms | 500 req/s |
| AML risk score | <50ms | <100ms | 5,000 req/s |
| Compliance receipt issue | <100ms | <200ms | 2,000 req/s |

---

## 3. Agent Identity System (KYA)

### 3.1 W3C DID-Based Agent Identity

Each agent in ProofLink has a DID that resolves to a DID Document containing its capabilities, wallet, and controlling entity.

```
DID Method: did:prooflink:<network>:<agentId>
Example:    did:prooflink:base:0x1234abcd

DID Document Structure:
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://prooflink.io/ns/kya/v1"],
  "id": "did:prooflink:base:42",
  "controller": "did:web:acme-corp.com",
  "verificationMethod": [{
    "id": "did:prooflink:base:42#wallet-key",
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": "did:prooflink:base:42",
    "publicKeyHex": "0x04..."
  }],
  "authentication": ["did:prooflink:base:42#wallet-key"],
  "service": [
    {
      "id": "did:prooflink:base:42#erc8004",
      "type": "ERC8004Identity",
      "serviceEndpoint": "ethereum:0x.../42"
    },
    {
      "id": "did:prooflink:base:42#x402",
      "type": "x402PaymentEndpoint",
      "serviceEndpoint": "https://agent.acme-corp.com/api"
    },
    {
      "id": "did:prooflink:base:42#mcp",
      "type": "MCPServer",
      "serviceEndpoint": "https://agent.acme-corp.com/mcp"
    }
  ],
  "prooflink:kya": {
    "controllingEntity": {
      "lei": "5493001KJTIIGC8Y1R12",
      "vleiCredential": "https://vlei.gleif.org/cred/..."
    },
    "delegationScope": {
      "maxTransactionAmount": "10000",
      "currency": "USDC",
      "allowedCounterparties": ["*"],
      "restrictedJurisdictions": ["IR", "KP", "SY", "CU"],
      "expiresAt": "2027-01-01T00:00:00Z"
    },
    "complianceStatus": {
      "sanctionsScreened": true,
      "lastScreenedAt": "2026-03-20T10:00:00Z",
      "kyaCredentialId": "urn:uuid:..."
    }
  }
}
```

### 3.2 ERC-8004 Integration

ProofLink operates as a **Validator** in the ERC-8004 Validation Registry. When an agent requests ProofLink compliance validation:

```solidity
// ProofLink registers as a validator in ERC-8004 Validation Registry
// Agent owner requests validation from ProofLink's validator address
// ProofLink performs KYA checks off-chain, then submits score on-chain

// ERC-8004 Validation Registry interaction:
interface IValidationRegistry {
    function requestValidation(
        uint256 agentId,
        address validator,       // ProofLink's validator address
        bytes32 commitmentHash   // hash of validation criteria
    ) external;

    function submitValidation(
        uint256 agentId,
        uint256 requestId,
        uint8 score,             // 0-100 compliance score
        string calldata evidenceURI  // IPFS URI to detailed compliance report
    ) external;
}

// ProofLink's validation criteria (encoded in commitmentHash):
// - Controlling entity has valid KYB credential
// - Controlling entity has valid vLEI
// - Agent wallet verified via EIP-712
// - Sanctions screening passed for controlling entity
// - Delegation scope explicitly defined
// - Agent not on any internal blocklist
```

### 3.3 Verifiable Credentials for Agents

```json
// KYA Verifiable Credential issued by ProofLink
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://prooflink.io/ns/kya/v1"
  ],
  "type": ["VerifiableCredential", "KYACredential"],
  "issuer": "did:web:prooflink.io",
  "issuanceDate": "2026-03-20T10:00:00Z",
  "expirationDate": "2026-09-20T10:00:00Z",
  "credentialSubject": {
    "id": "did:prooflink:base:42",
    "type": "AutonomousAgent",
    "erc8004Id": 42,
    "controllingEntity": {
      "type": "LegalEntity",
      "lei": "5493001KJTIIGC8Y1R12",
      "jurisdiction": "US",
      "kybVerified": true,
      "kybProvider": "did:web:sumsub.com"
    },
    "complianceChecks": {
      "sanctionsScreened": true,
      "sanctionsProvider": "chainalysis",
      "sanctionsDate": "2026-03-20T10:00:00Z",
      "amlRiskScore": 12,
      "travelRuleCapable": true
    },
    "delegationScope": {
      "maxSingleTransaction": "10000 USDC",
      "maxDailyVolume": "100000 USDC",
      "allowedAssets": ["USDC", "EURC"],
      "allowedChains": ["eip155:8453", "eip155:1"],
      "restrictedCountries": ["IR", "KP", "SY", "CU"]
    }
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2026-03-20T10:00:00Z",
    "verificationMethod": "did:web:prooflink.io#signing-key",
    "proofPurpose": "assertionMethod",
    "jws": "eyJ..."
  }
}
```

### 3.4 GLEIF vLEI for Controlling Entities

Every agent must be linked to a Legal Entity Identifier. ProofLink validates the vLEI credential chain:

```
GLEIF Root of Trust
    -> Qualified vLEI Issuer (QVI)
        -> Legal Entity vLEI Credential (controlling entity)
            -> Agent DID (linked via controllingEntity field)

Validation Steps:
1. Fetch vLEI credential from controlling entity's DID Document
2. Verify credential signature chain back to GLEIF root
3. Verify LEI status is "ISSUED" (not lapsed/retired)
4. Cross-reference LEI data with KYB provider records
5. Cache vLEI validation for 24 hours (LEI updates are infrequent)
```

### 3.5 Agent Registration and Validation Flow

```
Registration Sequence:

1. Controlling Entity (CE) deploys agent
2. CE registers agent on ERC-8004 Identity Registry
   -> tx: identityRegistry.register(registrationFileURI)
   -> returns: agentId (ERC-721 tokenId)
3. CE submits KYA validation request to ProofLink
   -> POST /api/v1/agents/validate
   -> body: { agentId, erc8004Registry, controllingEntityDID, vleiCredential }
4. ProofLink performs off-chain validation:
   a. Fetch ERC-8004 registration file
   b. Verify CE's vLEI credential
   c. Verify CE's KYB status with identity provider
   d. Screen CE against sanctions lists
   e. Verify agent wallet ownership (EIP-712 challenge-response)
   f. Validate delegation scope is within CE's authority
5. ProofLink submits validation to ERC-8004 Validation Registry
   -> tx: validationRegistry.submitValidation(agentId, requestId, score, evidenceURI)
6. ProofLink issues KYA Verifiable Credential to agent's DID
7. Agent can now transact through ProofLink with pre-validated compliance status
```

---

## 4. Payment Protocol Integration Layer

### 4.1 Multi-Protocol Router

The Payment Protocol Router detects which protocol is being used and normalizes the payment intent into a common internal format.

```typescript
interface PaymentIntent {
  protocol: "x402" | "mpp" | "ap2" | "acp" | "direct";
  sender: {
    address: string;
    chain: CAIP2ChainId;
    agentDID?: string;
  };
  receiver: {
    address: string;
    chain: CAIP2ChainId;
    agentDID?: string;
  };
  amount: string;        // decimal string
  asset: string;         // "USDC", "EURC", etc.
  protocolPayload: unknown;  // raw protocol-specific data
  metadata?: {
    invoiceId?: string;
    serviceDescription?: string;
    mandateId?: string;   // AP2 mandate reference
    sessionId?: string;   // MPP session reference
  };
}

interface ProtocolAdapter {
  detect(request: IncomingRequest): boolean;
  extractIntent(request: IncomingRequest): PaymentIntent;
  authorizeSettlement(intent: PaymentIntent, complianceDecision: ComplianceDecision): Promise<SettlementResult>;
  formatResponse(result: SettlementResult, complianceReceipt: ComplianceReceipt): OutgoingResponse;
}
```

### 4.2 x402 Integration (HTTP 402 Middleware)

ProofLink operates as a **compliance-aware x402 facilitator proxy**. It wraps the settlement facilitator with compliance checks.

```
Standard x402 Flow:
  Client -> Server (402) -> Client signs payment -> Server -> Facilitator -> Chain

ProofLink-Enhanced x402 Flow:
  Client -> Server (402) -> Client signs payment -> Server
    -> ProofLink Proxy:
       1. Extract payment from X-PAYMENT header
       2. Decode EIP-3009 / Permit2 / ERC-7710 authorization
       3. Run ProofLink compliance pipeline on (from, to, value)
       4. If APPROVED: forward to facilitator /verify then /settle
       5. Attach X-PROOFLINK-COMPLIANCE header to response
    -> Settlement on chain
    -> 200 OK + compliance receipt
```

**Express middleware integration:**

```typescript
import { x402ComplianceMiddleware } from "@prooflink/x402";

app.use("/api/paid-resource", x402ComplianceMiddleware({
  facilitatorUrl: "https://x402.cdp.coinbase.com",  // or self-hosted
  proofLinkUrl: "https://api.prooflink.io/v1/compliance/check",
  compliancePolicy: {
    sanctionsScreening: true,
    travelRule: true,
    amlThreshold: 60,
    requiredKYALevel: "basic",
  },
}));
```

### 4.3 MPP/Tempo Integration (Session-Based)

MPP uses spending sessions. ProofLink hooks into session creation and per-payment settlement.

```
MPP Session Flow with ProofLink:

1. Agent creates MPP session (spending cap authorization)
2. ProofLink validates agent identity at session creation time
3. ProofLink performs full compliance check on agent + session parameters
4. Session approved -> ProofLink issues session-level compliance token
5. Per-payment within session:
   a. Stripe PaymentIntent created
   b. ProofLink performs lightweight compliance check (sanctions only; agent pre-validated)
   c. Payment settles on Tempo/Stripe
   d. ProofLink logs payment in compliance audit trail
6. Session close: ProofLink generates session-level compliance receipt
```

**Integration point:** ProofLink registers as a webhook listener on Stripe PaymentIntents for MPP-tagged payments.

### 4.4 AP2 Integration (Mandate System)

AP2's three-mandate model maps cleanly to ProofLink's compliance pipeline.

```
AP2 Mandate Compliance Mapping:

Intent Mandate:
  - ProofLink verifies: agent has valid KYA credential
  - ProofLink verifies: intent is within delegation scope
  - ProofLink attaches: compliance pre-approval token

Cart Mandate:
  - ProofLink verifies: cart total within agent's authorized limits
  - ProofLink screens: merchant against sanctions lists
  - ProofLink checks: product category restrictions (if any)

Payment Mandate:
  - ProofLink performs: full ProofLink compliance pipeline
  - ProofLink issues: compliance receipt
  - ProofLink transmits: Travel Rule data if required

Implementation: ProofLink provides an AP2-compatible credential verifier
that AP2 agents include in their mandate chain.
```

### 4.5 ACP Compatibility

ACP operates within Stripe's infrastructure using Shared Payment Tokens (SPTs). ProofLink integrates via Stripe's webhook system.

```
ACP Flow:
  - Agent receives SPT from user
  - Agent creates Stripe PaymentIntent with SPT
  - ProofLink monitors via Stripe webhook (payment_intent.created)
  - ProofLink performs compliance check
  - If flagged: ProofLink calls Stripe API to cancel PaymentIntent
  - If approved: payment proceeds normally
  - ProofLink generates compliance receipt post-settlement
```

### 4.6 Multi-Protocol Routing Decision

```
Protocol Detection Logic (in API Gateway):

1. Check HTTP headers:
   - X-PAYMENT or PAYMENT-SIGNATURE present -> x402
   - X-MPP-SESSION present -> MPP
   - Authorization: Bearer SPT-* -> ACP

2. Check request body:
   - mandateType field present -> AP2
   - paymentIntentId with mpp_session -> MPP

3. Check URL path:
   - /x402/* -> x402 facilitator proxy
   - /mpp/* -> MPP compliance hook
   - /ap2/* -> AP2 mandate verifier

4. Default: REST API direct payment flow
```

---

## 5. Agent Invoice Standard

### 5.1 JSON-LD Schema

```json
{
  "@context": [
    "https://schema.org/",
    "https://prooflink.io/ns/invoice/v1"
  ],
  "@type": "ProofLinkAgentInvoice",
  "invoiceId": "urn:uuid:550e8400-e29b-41d4-a716-446655440000",
  "version": "1.0",
  "status": "issued",
  "issuedAt": "2026-03-20T10:00:00Z",
  "dueAt": "2026-04-20T10:00:00Z",

  "issuer": {
    "agentId": "did:prooflink:base:42",
    "erc8004Id": 42,
    "controllingEntity": {
      "name": "Acme AI Services LLC",
      "lei": "5493001KJTIIGC8Y1R12",
      "jurisdiction": "US"
    }
  },

  "recipient": {
    "agentId": "did:prooflink:base:99",
    "erc8004Id": 99,
    "controllingEntity": {
      "name": "Widget Corp",
      "lei": "213800ABCDEFG",
      "jurisdiction": "DE"
    }
  },

  "lineItems": [
    {
      "description": "LLM Inference - GPT-4 equivalent",
      "serviceType": "ai_inference",
      "units": 15000,
      "unitType": "tokens",
      "ratePerUnit": "0.00003",
      "currency": "USDC",
      "subtotal": "0.45",
      "workProof": {
        "type": "x402_transaction",
        "txHashes": ["0xabc..."],
        "sessionId": "mpp_sess_xyz"
      }
    },
    {
      "description": "Data API - Market feeds",
      "serviceType": "data_feed",
      "units": 500,
      "unitType": "api_calls",
      "ratePerUnit": "0.001",
      "currency": "USDC",
      "subtotal": "0.50",
      "workProof": {
        "type": "mcp_tool_calls",
        "callCount": 500,
        "toolNames": ["get_market_data", "get_price_history"],
        "merkleRoot": "0xdef..."
      }
    }
  ],

  "totals": {
    "subtotal": "0.95",
    "tax": "0.00",
    "total": "0.95",
    "currency": "USDC"
  },

  "paymentDetails": {
    "acceptedAssets": ["USDC", "EURC"],
    "acceptedChains": ["eip155:8453", "solana:5eykt..."],
    "payToAddress": "0x...",
    "x402Endpoint": "https://agent.acme.com/api/pay",
    "paymentDeadline": "2026-04-20T10:00:00Z"
  },

  "complianceStamp": {
    "proofLinkReceiptId": "urn:uuid:...",
    "issuerScreened": true,
    "recipientScreened": true,
    "travelRuleStatus": "not_required",
    "riskScore": 8,
    "checkedAt": "2026-03-20T10:00:00Z"
  },

  "onChainAnchor": {
    "chain": "eip155:8453",
    "txHash": "0x...",
    "attestationId": "0x...",
    "schema": "ProofLinkInvoiceV1"
  },

  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2026-03-20T10:00:00Z",
    "verificationMethod": "did:prooflink:base:42#wallet-key",
    "jws": "eyJ..."
  }
}
```

### 5.2 On-Chain Anchoring Mechanism

Invoices are stored off-chain (IPFS or ProofLink storage). A hash commitment is anchored on-chain using the Ethereum Attestation Service (EAS).

```
Anchoring Flow:
1. Invoice JSON-LD is created and signed by issuing agent
2. Invoice stored on IPFS -> CID returned
3. Compute: invoiceHash = keccak256(canonicalize(invoice))
4. Submit EAS attestation on Base:
   - schema: ProofLinkInvoiceV1
   - data: { invoiceHash, issuerAgent, recipientAgent, amount, currency, ipfsCID }
   - recipient: recipient agent's wallet address
5. EAS attestation UID stored in invoice record
6. Invoice status updates (paid, disputed, cancelled) are additional attestations
   referencing the original attestation UID
```

### 5.3 ERP Integration

```
Supported ERP Systems (Phase 1):
- NetSuite: REST API (SuiteScript 2.0 / RESTlet)
- QuickBooks Online: REST API (Intuit OAuth 2.0)
- SAP S/4HANA: OData API

Integration Pattern:
  ProofLink Invoice -> ERP Adapter -> ERP System

Mapping:
  ProofLink invoiceId        -> ERP Vendor Invoice Number
  issuer.controllingEntity   -> ERP Vendor record
  recipient.controllingEntity -> ERP Company entity
  lineItems[].description    -> ERP Line item description
  lineItems[].subtotal       -> ERP Line amount
  totals.total               -> ERP Invoice total
  paymentDetails.currency    -> ERP Currency (mapped: USDC->USD, EURC->EUR)
  complianceStamp            -> ERP Custom field / attachment

Sync Modes:
  1. Push: ProofLink pushes invoice to ERP on creation
  2. Pull: ERP queries ProofLink API for new invoices (polling)
  3. Webhook: ProofLink notifies ERP on invoice status changes
```

---

## 6. Compliance Receipt System

### 6.1 Cryptographic Proof Structure

Every transaction through ProofLink generates a compliance receipt -- a signed attestation that all required checks were performed.

```json
{
  "receiptId": "urn:uuid:550e8400-e29b-41d4-a716-446655440001",
  "version": "1.0",
  "type": "ProofLinkComplianceReceipt",
  "issuedAt": "2026-03-20T10:00:05Z",
  "expiresAt": "2026-03-20T10:05:05Z",

  "transaction": {
    "protocol": "x402",
    "chain": "eip155:8453",
    "txHash": "0x...",
    "amount": "100.00",
    "asset": "USDC",
    "sender": "0xSenderAddress",
    "receiver": "0xReceiverAddress",
    "senderAgentDID": "did:prooflink:base:42",
    "receiverAgentDID": "did:prooflink:base:99"
  },

  "checks": [
    {
      "type": "sanctions_screening",
      "provider": "chainalysis",
      "target": "sender",
      "result": "clear",
      "listsChecked": ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED", "HMT"],
      "timestamp": "2026-03-20T10:00:01Z"
    },
    {
      "type": "sanctions_screening",
      "provider": "chainalysis",
      "target": "receiver",
      "result": "clear",
      "listsChecked": ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED", "HMT"],
      "timestamp": "2026-03-20T10:00:01Z"
    },
    {
      "type": "kya_verification",
      "target": "sender",
      "result": "verified",
      "controllingEntity": "5493001KJTIIGC8Y1R12",
      "credentialValid": true,
      "timestamp": "2026-03-20T10:00:02Z"
    },
    {
      "type": "aml_risk_score",
      "target": "transaction",
      "result": "pass",
      "score": 12,
      "threshold": 85,
      "timestamp": "2026-03-20T10:00:03Z"
    },
    {
      "type": "travel_rule",
      "result": "not_required",
      "reason": "amount_below_threshold",
      "jurisdiction": "US",
      "threshold": "3000 USD",
      "timestamp": "2026-03-20T10:00:03Z"
    },
    {
      "type": "jurisdictional_rules",
      "result": "pass",
      "rulesApplied": ["GENIUS_ACT_STABLECOIN_CHECK", "MICA_EMT_CHECK"],
      "timestamp": "2026-03-20T10:00:04Z"
    }
  ],

  "decision": {
    "status": "APPROVED",
    "compositeRiskScore": 12,
    "decidedAt": "2026-03-20T10:00:05Z"
  },

  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "verificationMethod": "did:web:prooflink.io#compliance-signing-key",
    "jws": "eyJ..."
  },

  "onChainAttestation": {
    "chain": "eip155:8453",
    "easAttestationUID": "0x...",
    "schemaUID": "0x..."
  }
}
```

### 6.2 On-Chain Attestation (EAS)

ProofLink uses the Ethereum Attestation Service on Base for compliance receipt attestations.

```solidity
// EAS Schema for ProofLink Compliance Receipts
// Schema: "bytes32 receiptHash, address sender, address receiver, uint256 amount,
//          string asset, uint8 riskScore, bool sanctionsCleared, bool travelRuleSatisfied,
//          uint64 timestamp"

// Schema UID registered on Base EAS

// Attestation flow:
// 1. ProofLink computes receiptHash = keccak256(abi.encode(fullReceipt))
// 2. ProofLink submits attestation via EAS.attest():
//    - schema: ProofLinkComplianceReceiptV1
//    - recipient: receiver address
//    - data: encoded receipt summary
//    - revocable: true (for corrections)
// 3. EAS returns attestation UID
// 4. UID stored in receipt and returned to caller
```

**Why EAS over custom contracts:**
- EAS is already deployed on Base, Ethereum, Arbitrum, Optimism
- Standard tooling for verification (EAS SDK, GraphQL explorer)
- Composable: other protocols can verify ProofLink attestations without custom integration
- Revocable: receipts can be revoked if compliance status changes

### 6.3 Audit Trail Format

```
Audit Log Entry (stored in PostgreSQL, immutable append-only table):

{
  "logId": "uuid",
  "timestamp": "ISO8601 with microseconds",
  "eventType": "compliance_check | receipt_issued | receipt_revoked | escalation | sar_generated",
  "transactionRef": {
    "protocol": "x402",
    "chain": "eip155:8453",
    "txHash": "0x...",
    "invoiceId": "urn:uuid:..."
  },
  "actors": {
    "sender": { "address": "0x...", "agentDID": "did:...", "entityLEI": "..." },
    "receiver": { "address": "0x...", "agentDID": "did:...", "entityLEI": "..." }
  },
  "complianceActions": [
    { "action": "sanctions_screen", "target": "sender", "result": "clear", "provider": "chainalysis", "durationMs": 45 },
    { "action": "sanctions_screen", "target": "receiver", "result": "clear", "provider": "chainalysis", "durationMs": 42 }
    // ... all actions logged
  ],
  "decision": "APPROVED",
  "riskScore": 12,
  "receiptId": "urn:uuid:...",
  "receiptHash": "0x...",
  "attestationUID": "0x...",

  // Tamper detection
  "previousLogHash": "sha256 of previous entry",
  "logHash": "sha256(timestamp + previousLogHash + canonical(entry))"
}

// Hash chain ensures tamper detection: any modification breaks the chain.
// Periodic checkpoints anchored on-chain for external verifiability.
```

### 6.4 Enterprise Reporting Integration

```
Report Types:

1. Transaction Compliance Report (per-transaction):
   - PDF export of compliance receipt + audit trail
   - Suitable for auditor review
   - Includes: all checks performed, results, timing, receipt signature

2. Periodic Compliance Summary (daily/weekly/monthly):
   - Total transactions processed
   - Breakdown by risk score band
   - Sanctions hits / near-misses
   - Travel Rule transmissions
   - Agent activity summary
   - Exportable as CSV, PDF, or via API

3. SAR Candidate Report:
   - Transactions flagged by AML monitoring
   - Narrative generation (human-readable explanation of suspicious pattern)
   - Supporting evidence chain
   - Compliance officer review workflow

4. SOX/Audit Export:
   - Full audit trail for specified date range
   - Hash chain verification proof
   - On-chain attestation cross-references
   - Format: JSON (machine) + PDF (human)
```

---

## 7. Smart Contracts

### 7.1 Contract Architecture

```
Supported Chains:
  - Base (primary: compliance receipts, agent registry interaction)
  - Ethereum (ERC-8004 Identity Registry, high-value attestations)
  - Solana (x402 settlement support)

Contract Suite:
  1. ProofLinkComplianceAttester.sol  - EAS-based compliance attestation
  2. AgentIdentityExtension.sol      - ERC-8004 extension for KYA data
  3. InvoiceAnchor.sol               - Invoice hash commitment
  4. DisputeResolution.sol           - ERC-8183-compatible dispute hooks
```

### 7.2 ProofLink Compliance Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IEAS, AttestationRequest, AttestationRequestData } from "@eas/contracts/IEAS.sol";

contract ProofLinkComplianceAttester {
    IEAS public immutable eas;
    bytes32 public immutable complianceSchemaUID;
    address public complianceSigner;

    // Only ProofLink's compliance signer can create attestations
    modifier onlyComplianceSigner() {
        require(msg.sender == complianceSigner, "Unauthorized");
        _;
    }

    struct ComplianceAttestation {
        bytes32 receiptHash;
        address sender;
        address receiver;
        uint256 amount;
        string asset;
        uint8 riskScore;
        bool sanctionsCleared;
        bool travelRuleSatisfied;
        uint64 timestamp;
    }

    event ComplianceAttested(
        bytes32 indexed attestationUID,
        address indexed sender,
        address indexed receiver,
        bytes32 receiptHash,
        uint8 riskScore
    );

    function attestCompliance(
        ComplianceAttestation calldata data
    ) external onlyComplianceSigner returns (bytes32) {
        bytes32 uid = eas.attest(AttestationRequest({
            schema: complianceSchemaUID,
            data: AttestationRequestData({
                recipient: data.receiver,
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: abi.encode(
                    data.receiptHash,
                    data.sender,
                    data.receiver,
                    data.amount,
                    data.asset,
                    data.riskScore,
                    data.sanctionsCleared,
                    data.travelRuleSatisfied,
                    data.timestamp
                ),
                value: 0
            })
        }));

        emit ComplianceAttested(uid, data.sender, data.receiver, data.receiptHash, data.riskScore);
        return uid;
    }

    // Revoke if compliance status changes (e.g., retroactive sanctions designation)
    function revokeAttestation(bytes32 attestationUID, string calldata reason) external onlyComplianceSigner {
        eas.revoke(/* ... */);
    }
}
```

### 7.3 Agent Identity Registry Extension

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice Extension contract that stores KYA metadata for ERC-8004 agents.
/// Does NOT modify ERC-8004 — reads from Identity Registry and stores
/// ProofLink-specific compliance data in a separate mapping.
contract AgentKYAExtension {

    // Reference to the ERC-8004 Identity Registry
    IERC721 public immutable identityRegistry;

    struct KYAData {
        bytes32 kyaCredentialHash;    // hash of the off-chain KYA VC
        string controllingEntityLEI;
        uint64 validatedAt;
        uint64 expiresAt;
        uint8 complianceScore;        // 0-100
        bool isActive;
    }

    // agentId (ERC-8004 tokenId) -> KYA data
    mapping(uint256 => KYAData) public agentKYA;

    // Only the agent owner can request KYA updates
    modifier onlyAgentOwner(uint256 agentId) {
        require(identityRegistry.ownerOf(agentId) == msg.sender, "Not agent owner");
        _;
    }

    // Only ProofLink validator can submit KYA results
    address public prooflinkValidator;
    modifier onlyValidator() {
        require(msg.sender == prooflinkValidator, "Not validator");
        _;
    }

    function submitKYA(
        uint256 agentId,
        bytes32 kyaCredentialHash,
        string calldata controllingEntityLEI,
        uint8 complianceScore,
        uint64 expiresAt
    ) external onlyValidator {
        require(identityRegistry.ownerOf(agentId) != address(0), "Agent not registered");

        agentKYA[agentId] = KYAData({
            kyaCredentialHash: kyaCredentialHash,
            controllingEntityLEI: controllingEntityLEI,
            validatedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            complianceScore: complianceScore,
            isActive: true
        });
    }

    function isCompliant(uint256 agentId) external view returns (bool) {
        KYAData memory data = agentKYA[agentId];
        return data.isActive && data.expiresAt > block.timestamp && data.complianceScore > 0;
    }

    function revokeKYA(uint256 agentId) external onlyValidator {
        agentKYA[agentId].isActive = false;
    }
}
```

### 7.4 Invoice Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal on-chain invoice anchor. Full invoice data lives off-chain (IPFS).
/// This contract stores the hash commitment and tracks payment/dispute status.
contract ProofLinkInvoiceAnchor {

    enum InvoiceStatus { Issued, Paid, Disputed, Cancelled, Resolved }

    struct Invoice {
        bytes32 invoiceHash;        // keccak256 of canonical JSON-LD invoice
        string ipfsCID;             // IPFS content identifier
        address issuerAgent;        // ERC-8004 agent wallet
        address recipientAgent;     // ERC-8004 agent wallet
        uint256 amount;             // in smallest unit (e.g., USDC 6 decimals)
        address asset;              // ERC-20 token address
        InvoiceStatus status;
        uint64 issuedAt;
        uint64 paidAt;
        bytes32 paymentTxHash;      // settlement transaction hash
        bytes32 complianceReceiptId; // ProofLink compliance receipt reference
    }

    mapping(bytes32 => Invoice) public invoices;  // invoiceHash -> Invoice

    event InvoiceAnchored(bytes32 indexed invoiceHash, address indexed issuer, address indexed recipient, uint256 amount);
    event InvoicePaid(bytes32 indexed invoiceHash, bytes32 paymentTxHash);
    event InvoiceDisputed(bytes32 indexed invoiceHash, address disputedBy);
    event InvoiceResolved(bytes32 indexed invoiceHash, InvoiceStatus resolution);

    function anchorInvoice(
        bytes32 invoiceHash,
        string calldata ipfsCID,
        address recipientAgent,
        uint256 amount,
        address asset
    ) external {
        require(invoices[invoiceHash].issuedAt == 0, "Already anchored");

        invoices[invoiceHash] = Invoice({
            invoiceHash: invoiceHash,
            ipfsCID: ipfsCID,
            issuerAgent: msg.sender,
            recipientAgent: recipientAgent,
            amount: amount,
            asset: asset,
            status: InvoiceStatus.Issued,
            issuedAt: uint64(block.timestamp),
            paidAt: 0,
            paymentTxHash: bytes32(0),
            complianceReceiptId: bytes32(0)
        });

        emit InvoiceAnchored(invoiceHash, msg.sender, recipientAgent, amount);
    }

    function markPaid(bytes32 invoiceHash, bytes32 paymentTxHash, bytes32 complianceReceiptId) external {
        Invoice storage inv = invoices[invoiceHash];
        require(inv.status == InvoiceStatus.Issued, "Not payable");
        // In production: verify caller is authorized (ProofLink or recipient)

        inv.status = InvoiceStatus.Paid;
        inv.paidAt = uint64(block.timestamp);
        inv.paymentTxHash = paymentTxHash;
        inv.complianceReceiptId = complianceReceiptId;

        emit InvoicePaid(invoiceHash, paymentTxHash);
    }

    function disputeInvoice(bytes32 invoiceHash) external {
        Invoice storage inv = invoices[invoiceHash];
        require(inv.status == InvoiceStatus.Issued || inv.status == InvoiceStatus.Paid, "Cannot dispute");
        require(msg.sender == inv.issuerAgent || msg.sender == inv.recipientAgent, "Not a party");

        inv.status = InvoiceStatus.Disputed;
        emit InvoiceDisputed(invoiceHash, msg.sender);
    }
}
```

### 7.5 Dispute Resolution Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice ERC-8183-compatible dispute resolution using ProofLink compliance data.
/// Acts as an "evaluator" in ERC-8183 job lifecycle.
contract ProofLinkDisputeResolver {

    struct Dispute {
        bytes32 invoiceHash;
        address claimant;
        address respondent;
        string evidenceURI;         // IPFS link to dispute evidence
        bytes32 complianceReceiptId; // ProofLink receipt for the disputed tx
        uint64 filedAt;
        uint64 resolvedAt;
        DisputeStatus status;
        DisputeOutcome outcome;
        address resolver;           // ProofLink or external oracle (Kleros/UMA)
    }

    enum DisputeStatus { Filed, UnderReview, Resolved }
    enum DisputeOutcome { Pending, ClaimantWins, RespondentWins, Split }

    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;

    // ProofLink's authorized resolver addresses
    mapping(address => bool) public authorizedResolvers;

    function fileDispute(
        bytes32 invoiceHash,
        address respondent,
        string calldata evidenceURI,
        bytes32 complianceReceiptId
    ) external returns (uint256 disputeId) {
        disputeId = ++disputeCount;
        disputes[disputeId] = Dispute({
            invoiceHash: invoiceHash,
            claimant: msg.sender,
            respondent: respondent,
            evidenceURI: evidenceURI,
            complianceReceiptId: complianceReceiptId,
            filedAt: uint64(block.timestamp),
            resolvedAt: 0,
            status: DisputeStatus.Filed,
            outcome: DisputeOutcome.Pending,
            resolver: address(0)
        });
    }

    function resolveDispute(
        uint256 disputeId,
        DisputeOutcome outcome
    ) external {
        require(authorizedResolvers[msg.sender], "Not authorized resolver");
        Dispute storage d = disputes[disputeId];
        require(d.status != DisputeStatus.Resolved, "Already resolved");

        d.status = DisputeStatus.Resolved;
        d.outcome = outcome;
        d.resolvedAt = uint64(block.timestamp);
        d.resolver = msg.sender;
    }
}
```

---

## 8. API Design

### 8.1 REST API (Human-Facing Flows)

```
Base URL: https://api.prooflink.io/v1

Authentication: Bearer token (JWT) or API key

Endpoints:

# Compliance
POST   /compliance/check              - Run full ProofLink compliance pipeline
GET    /compliance/receipts/{id}       - Get compliance receipt by ID
GET    /compliance/receipts            - List receipts (paginated, filterable)
POST   /compliance/screen/address      - Screen a single address (sanctions)
POST   /compliance/screen/entity       - Screen an entity name (sanctions)

# Agent Identity (KYA)
POST   /agents/register                - Register agent for KYA validation
GET    /agents/{agentId}/status        - Get agent compliance status
POST   /agents/{agentId}/validate      - Request KYA validation
GET    /agents/{agentId}/credential    - Get agent's KYA Verifiable Credential
PUT    /agents/{agentId}/delegation    - Update delegation scope

# Invoices
POST   /invoices                       - Create agent invoice
GET    /invoices/{id}                  - Get invoice
PUT    /invoices/{id}/status           - Update status (paid, disputed, cancelled)
GET    /invoices                       - List invoices (paginated)
POST   /invoices/{id}/anchor           - Anchor invoice hash on-chain
GET    /invoices/{id}/erp-sync         - Trigger ERP sync

# Travel Rule
POST   /travel-rule/transmit           - Transmit Travel Rule data
GET    /travel-rule/status/{id}        - Check transmission status

# Reports
GET    /reports/compliance-summary     - Periodic compliance summary
GET    /reports/audit-trail            - Full audit trail export
GET    /reports/sar-candidates         - SAR candidate list
```

**Example: Full Compliance Check**

```http
POST /v1/compliance/check HTTP/1.1
Host: api.prooflink.io
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "sender": {
    "address": "0x1234...",
    "chain": "eip155:8453",
    "agentDID": "did:prooflink:base:42"
  },
  "receiver": {
    "address": "0x5678...",
    "chain": "eip155:8453"
  },
  "amount": "100.00",
  "asset": "USDC",
  "protocol": "x402"
}

Response (200):
{
  "status": "APPROVED",
  "riskScore": 12,
  "receiptId": "urn:uuid:...",
  "receiptHash": "0x...",
  "attestationUID": "0x...",
  "checks": [
    { "type": "sanctions_screening", "target": "sender", "result": "clear", "durationMs": 45 },
    { "type": "sanctions_screening", "target": "receiver", "result": "clear", "durationMs": 42 },
    { "type": "kya_verification", "target": "sender", "result": "verified", "durationMs": 30 },
    { "type": "aml_risk_score", "result": "pass", "score": 12, "durationMs": 20 },
    { "type": "travel_rule", "result": "not_required", "durationMs": 5 },
    { "type": "jurisdictional_rules", "result": "pass", "durationMs": 3 }
  ],
  "totalDurationMs": 145
}
```

### 8.2 x402-Compatible HTTP API

ProofLink exposes its own x402-gated endpoints (compliance-as-a-service via x402).

```
# Agents can pay for compliance checks via x402

GET /x402/compliance/screen
  -> 402 Payment Required
  -> PAYMENT-REQUIRED: { price: "0.001", asset: "USDC", network: "eip155:8453" }
  -> Client pays via x402
  -> 200 OK with sanctions screening result

# This makes compliance checks accessible to any x402-capable agent
# without API keys, accounts, or subscriptions.
```

### 8.3 MCP Server for AI Agent Integration

ProofLink exposes compliance tools as an MCP server, making compliance ambient for any MCP-compatible agent.

```json
{
  "name": "prooflink-compliance",
  "version": "1.0.0",
  "description": "Compliance-as-infrastructure for AI agent payments",
  "tools": [
    {
      "name": "check_sanctions",
      "description": "Screen a wallet address or entity against OFAC/EU/UN/HMT sanctions lists",
      "inputSchema": {
        "type": "object",
        "properties": {
          "address": { "type": "string", "description": "Wallet address to screen" },
          "chain": { "type": "string", "description": "CAIP-2 chain ID (e.g., eip155:8453)" },
          "entityName": { "type": "string", "description": "Entity name to screen (alternative to address)" }
        }
      }
    },
    {
      "name": "verify_agent",
      "description": "Verify an agent's KYA compliance status via ERC-8004",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": { "type": "number", "description": "ERC-8004 agent token ID" },
          "registryAddress": { "type": "string", "description": "ERC-8004 registry contract address" }
        },
        "required": ["agentId"]
      }
    },
    {
      "name": "run_compliance_check",
      "description": "Full ProofLink compliance pipeline for a payment",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sender": { "type": "string" },
          "receiver": { "type": "string" },
          "amount": { "type": "string" },
          "asset": { "type": "string" },
          "chain": { "type": "string" }
        },
        "required": ["sender", "receiver", "amount", "asset", "chain"]
      }
    },
    {
      "name": "create_invoice",
      "description": "Create an agent-to-agent invoice with compliance stamp",
      "inputSchema": {
        "type": "object",
        "properties": {
          "issuerAgentDID": { "type": "string" },
          "recipientAgentDID": { "type": "string" },
          "lineItems": { "type": "array" },
          "paymentChain": { "type": "string" },
          "paymentAsset": { "type": "string" }
        },
        "required": ["issuerAgentDID", "recipientAgentDID", "lineItems"]
      }
    },
    {
      "name": "get_compliance_receipt",
      "description": "Retrieve a compliance receipt by ID for audit purposes",
      "inputSchema": {
        "type": "object",
        "properties": {
          "receiptId": { "type": "string" }
        },
        "required": ["receiptId"]
      }
    }
  ]
}
```

### 8.4 WebSocket for Real-Time Compliance Events

```
WebSocket URL: wss://api.prooflink.io/v1/ws

Events:
  compliance.check.started     - Compliance pipeline started
  compliance.check.completed   - Pipeline completed (APPROVED/REJECTED)
  compliance.check.escalated   - Transaction escalated for manual review
  sanctions.alert              - New sanctions match detected
  travel_rule.transmitted      - Travel Rule data sent to counterparty
  travel_rule.ack_received     - Counterparty acknowledged Travel Rule data
  agent.kya.updated            - Agent KYA status changed
  agent.kya.revoked            - Agent KYA credential revoked
  invoice.status.changed       - Invoice status updated
  receipt.attested             - Compliance receipt anchored on-chain

Subscription model:
  { "action": "subscribe", "channels": ["compliance.*", "agent.kya.*"] }

Use case: Compliance dashboard real-time updates, agent monitoring
```

### 8.5 GraphQL for Compliance Data Querying

```graphql
type Query {
  # Compliance receipts
  complianceReceipt(id: ID!): ComplianceReceipt
  complianceReceipts(
    filter: ComplianceReceiptFilter
    pagination: PaginationInput
    orderBy: ComplianceReceiptOrderBy
  ): ComplianceReceiptConnection!

  # Agent identity
  agent(agentId: Int!, registryChain: String): Agent
  agents(filter: AgentFilter, pagination: PaginationInput): AgentConnection!

  # Invoices
  invoice(id: ID!): Invoice
  invoices(filter: InvoiceFilter, pagination: PaginationInput): InvoiceConnection!

  # Analytics
  complianceSummary(dateRange: DateRangeInput!): ComplianceSummary!
  riskDistribution(dateRange: DateRangeInput!): RiskDistribution!
  transactionVolume(dateRange: DateRangeInput!, granularity: Granularity!): [VolumeDataPoint!]!
}

type ComplianceReceipt {
  id: ID!
  status: ComplianceStatus!
  riskScore: Int!
  transaction: TransactionRef!
  checks: [ComplianceCheck!]!
  onChainAttestation: OnChainAttestation
  createdAt: DateTime!
}

type Agent {
  agentId: Int!
  did: String!
  erc8004Registry: String!
  controllingEntity: LegalEntity!
  kyaStatus: KYAStatus!
  complianceScore: Int!
  lastValidated: DateTime!
  transactionCount: Int!
  totalVolume: String!
}

type Invoice {
  id: ID!
  invoiceHash: String!
  issuer: Agent!
  recipient: Agent!
  lineItems: [InvoiceLineItem!]!
  total: Money!
  status: InvoiceStatus!
  complianceStamp: ComplianceReceipt
  onChainAnchor: OnChainAnchor
}
```

---

## 9. Infrastructure

### 9.1 Cloud Architecture

```
Primary Cloud: AWS (us-east-1, eu-west-1 for MiCA compliance)
Disaster Recovery: GCP (multi-cloud for regulatory redundancy)

                    +------------------+
                    | CloudFront CDN   |
                    +--------+---------+
                             |
                    +--------v---------+
                    | API Gateway      |
                    | (Kong on EKS)    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v-----+ +-----v------+ +----v--------+
     | ProofLink    | | Agent ID   | | Invoice     |
     | Service      | | Service    | | Service     |
     | (EKS Pod)    | | (EKS Pod)  | | (EKS Pod)   |
     +--------+-----+ +-----+------+ +----+--------+
              |              |              |
     +--------v--------------v--------------v--------+
     |              Internal Service Mesh              |
     |              (Istio on EKS)                     |
     +---+--------+--------+--------+--------+-------+
         |        |        |        |        |
    +----v--+ +---v---+ +--v---+ +-v----+ +-v--------+
    |Chainal| |Notab. | |Redis | |Postgr| |Blockchain|
    |ysis   | |API    | |Cluster| |SQL   | |Nodes     |
    |API    | |       | |(Elast)| |RDS   | |(Alchemy) |
    +-------+ +-------+ +------+ +------+ +----------+
```

**Kubernetes (EKS) Cluster:**
- Node groups: compute-optimized (c7g) for compliance pipeline, memory-optimized (r7g) for caching
- Horizontal pod autoscaling: scale ProofLink pods 3-50 based on request rate
- Pod disruption budgets: minimum 3 replicas per service always available

**Multi-Region Strategy:**
- US (us-east-1): Primary, all services
- EU (eu-west-1): Compliance data for EU entities (GDPR data residency), EAS attestations on Ethereum
- Data does not cross regions for EU-scoped compliance records

### 9.2 Database Design

**PostgreSQL (RDS Aurora Serverless v2):**

```sql
-- Core compliance data

CREATE TABLE compliance_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_hash BYTEA NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,  -- APPROVED, REJECTED, ESCALATED
    risk_score SMALLINT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    sender_address VARCHAR(128) NOT NULL,
    receiver_address VARCHAR(128) NOT NULL,
    sender_agent_did VARCHAR(256),
    receiver_agent_did VARCHAR(256),
    amount NUMERIC(38, 18) NOT NULL,
    asset VARCHAR(10) NOT NULL,
    chain VARCHAR(64) NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    checks JSONB NOT NULL,        -- array of check results
    travel_rule_status VARCHAR(20),
    eas_attestation_uid BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX idx_receipts_sender (sender_address),
    INDEX idx_receipts_receiver (receiver_address),
    INDEX idx_receipts_created (created_at),
    INDEX idx_receipts_status (status)
);

-- Append-only audit log with hash chain
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    log_hash BYTEA NOT NULL,
    previous_log_hash BYTEA NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    receipt_id UUID REFERENCES compliance_receipts(id),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent KYA records
CREATE TABLE agent_kya (
    agent_did VARCHAR(256) PRIMARY KEY,
    erc8004_id INTEGER NOT NULL,
    erc8004_registry VARCHAR(128) NOT NULL,
    controlling_entity_lei VARCHAR(20) NOT NULL,
    kya_credential_hash BYTEA NOT NULL,
    compliance_score SMALLINT NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    delegation_scope JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_hash BYTEA NOT NULL UNIQUE,
    ipfs_cid VARCHAR(128),
    issuer_agent_did VARCHAR(256) NOT NULL,
    recipient_agent_did VARCHAR(256) NOT NULL,
    amount NUMERIC(38, 18) NOT NULL,
    asset VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'issued',
    compliance_receipt_id UUID REFERENCES compliance_receipts(id),
    on_chain_tx_hash BYTEA,
    eas_attestation_uid BYTEA,
    invoice_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sanctions cache
CREATE TABLE sanctions_cache (
    address VARCHAR(128) NOT NULL,
    chain VARCHAR(64) NOT NULL,
    is_sanctioned BOOLEAN NOT NULL,
    risk_level VARCHAR(10) NOT NULL,
    matched_lists TEXT[],
    provider VARCHAR(30) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (address, chain)
);
```

**Redis (ElastiCache):**
- Sanctions screening cache (5-minute TTL for PASS results)
- Rate limiting counters (per-agent, per-API-key)
- AML velocity counters (sliding window)
- WebSocket session state
- Compliance pipeline result cache (300s TTL matching receipt TTL)

### 9.3 Blockchain Node Infrastructure

**Recommendation: Managed RPC via Alchemy/QuickNode (not self-hosted).**

| Chain | Provider | Purpose | Estimated Cost |
|-------|----------|---------|---------------|
| Base | Alchemy | EAS attestations, x402 facilitator interaction | $499/mo (Growth) |
| Ethereum | Alchemy | ERC-8004 registry reads, high-value attestations | $499/mo (Growth) |
| Solana | QuickNode | x402 Solana settlement verification | $299/mo |

**Rationale:** Self-hosting blockchain nodes is operationally expensive and unnecessary for ProofLink's use case. ProofLink reads from chain (registry lookups, attestation verification) and writes infrequently (attestations, KYA submissions). Managed RPC with fallback providers is the correct architecture.

**Fallback:** If primary provider has an outage, automatically route to secondary (Alchemy -> Infura -> public RPC).

### 9.4 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| API availability | 99.95% | Monthly uptime |
| Compliance check P50 latency | <200ms | End-to-end pipeline |
| Compliance check P99 latency | <800ms | End-to-end pipeline |
| Throughput (sustained) | 1,000 checks/second | Load test |
| Throughput (burst) | 5,000 checks/second | 30-second bursts |
| Audit log write latency | <10ms | PostgreSQL insert |
| On-chain attestation | <30 seconds | Base block confirmation |

---

## 10. Security Architecture

### 10.1 Key Management

```
Key Hierarchy:

Root Key (AWS KMS, HSM-backed)
  |
  +-- Compliance Signing Key (used for receipt signatures)
  |     - Stored in AWS KMS
  |     - Never exported
  |     - Sign operations via KMS API
  |     - Rotation: annual
  |
  +-- EAS Attestation Key (on-chain transaction signing)
  |     - Stored in AWS KMS with Ethereum key support
  |     - Used by ProofLinkComplianceAttester contract
  |     - Rotation: per-quarter with contract upgrade
  |
  +-- ERC-8004 Validator Key (on-chain validation submissions)
  |     - Same KMS-based management as attestation key
  |
  +-- API Signing Key (JWT issuance)
  |     - RSA-2048, rotated monthly
  |     - JWKS endpoint at /.well-known/jwks.json
  |
  +-- DID Signing Key (VC issuance for KYA credentials)
        - Ed25519, stored in KMS
        - Used by ProofLink's DID document verification method
```

### 10.2 Agent Wallet Security Model

ProofLink does NOT custody agent funds. Agents maintain their own wallets. ProofLink's role is verification only.

```
Security Boundaries:

1. Agent Wallet -> NOT managed by ProofLink
   - Agent controls its own keys (MPC, TEE, or ERC-4337 smart wallet)
   - ProofLink never has access to agent private keys
   - ProofLink verifies agent wallet ownership via EIP-712 signed challenge

2. Compliance Signing Key -> ProofLink HSM
   - Used only for signing compliance receipts and attestations
   - Never used for financial transactions
   - Audit log of every signing operation

3. On-Chain Keys -> ProofLink KMS
   - Used only for EAS attestations and ERC-8004 validation submissions
   - Transaction value: always 0 (attestations only, no value transfer)
   - Gas funded from a dedicated hot wallet with spending alerts
```

### 10.3 Data Encryption

```
At Rest:
  - PostgreSQL: AWS RDS encryption (AES-256)
  - Redis: ElastiCache encryption at rest (AES-256)
  - S3 (audit exports): SSE-S3 or SSE-KMS
  - IPFS data: invoice content encrypted with recipient's public key before pinning

In Transit:
  - All external APIs: TLS 1.3 mandatory
  - Internal service mesh: mTLS via Istio
  - WebSocket: WSS only
  - Blockchain RPC: HTTPS

Application-Level:
  - PII fields in compliance data: encrypted with per-tenant key before storage
  - Compliance receipts: signed but NOT encrypted (designed to be verifiable by third parties)
  - Audit log entries: signed with compliance signing key for tamper detection
```

### 10.4 Compliance Data Privacy (GDPR)

```
GDPR Compliance Strategy:

1. Data Minimization:
   - Store credential HASHES, not raw PII
   - KYA credentials reference off-chain VCs; ProofLink stores verification result, not identity data
   - Sanctions screening: store result (clear/flagged), not the screening input details

2. Right to Erasure (Article 17):
   - Compliance receipts are retained for regulatory minimum (7 years in most jurisdictions)
   - User can request erasure of non-regulatory PII
   - On-chain attestations contain only hashes (no PII), so they do not need erasure
   - Conflict resolution: regulatory retention overrides erasure request (Article 17(3)(b))

3. Data Residency:
   - EU entity compliance data stored in eu-west-1
   - Travel Rule data for EU transfers processed in EU region
   - On-chain data is global by nature; only hashes (not PII) go on-chain

4. Data Processing Agreements:
   - Chainalysis: DPA required (they process wallet addresses)
   - Notabene: DPA required (they process Travel Rule identity data)
   - Alchemy: DPA required (they see RPC queries)

5. Privacy by Design:
   - Default: minimum data collection
   - Selective disclosure: agents prove compliance status without revealing identity
   - ZK-compatible: architecture supports future migration to ZK-proof-based compliance
     where agents prove "I am not sanctioned" without revealing who they are
```

---

## 11. Tech Stack Recommendation

### 11.1 Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | TypeScript (Node.js 22 LTS) | Richest x402 SDK ecosystem, EVM library maturity (viem/ethers), MCP SDK support, team velocity |
| **Runtime** | Bun | Faster startup, native TypeScript, better perf than Node for HTTP workloads |
| **API Framework** | Hono | Edge-compatible, middleware-first, x402 middleware available, fast |
| **Validation** | Zod | Runtime type validation, schema generation, JSON-LD compat |
| **ORM** | Drizzle | Type-safe SQL, PostgreSQL-native, migration support |
| **Queue** | BullMQ (Redis) | Async compliance tasks, Travel Rule transmission, ERP sync |
| **Blockchain** | viem + @x402/evm | Type-safe EVM interaction, x402 native integration |
| **Solana** | @solana/web3.js + @x402/svm | Solana program interaction for x402 |

**Alternative considered:** Rust. Better raw performance, but the x402/EVM TypeScript ecosystem is 2-3x larger. Compliance pipeline latency is dominated by external API calls (Chainalysis, Notabene), not compute. TypeScript is the pragmatic choice for shipping speed.

### 11.2 Smart Contracts

| Tool | Purpose |
|------|---------|
| **Solidity** | Contract language (Base and Ethereum are EVM) |
| **Foundry** | Build, test, deploy, script |
| **OpenZeppelin** | Security primitives (Ownable, access control) |
| **EAS SDK** | Attestation service integration |

### 11.3 Frontend

| Technology | Rationale |
|-----------|-----------|
| **Next.js 15 (App Router)** | SSR for compliance dashboard, API routes, edge middleware |
| **React 19** | Component library, ecosystem |
| **Tailwind CSS v4** | Styling |
| **shadcn/ui** | Component primitives |
| **TanStack Query** | Data fetching, caching |
| **wagmi + viem** | Wallet connection for agent registration |
| **Recharts** | Compliance analytics charts |

### 11.4 Infrastructure

| Component | Technology |
|-----------|-----------|
| **Container Orchestration** | AWS EKS (Kubernetes) |
| **CI/CD** | GitHub Actions |
| **Container Registry** | AWS ECR |
| **Database** | AWS Aurora PostgreSQL Serverless v2 |
| **Cache** | AWS ElastiCache (Redis 7) |
| **Object Storage** | AWS S3 (audit exports, backups) |
| **Secrets** | AWS Secrets Manager |
| **Key Management** | AWS KMS (HSM-backed) |
| **Monitoring** | Grafana + Prometheus + Loki |
| **APM** | OpenTelemetry -> Grafana Tempo |
| **CDN** | CloudFront |
| **DNS** | Route 53 |
| **IaC** | Pulumi (TypeScript) |

### 11.5 External Service Dependencies

| Service | Purpose | Tier | Cost Estimate |
|---------|---------|------|--------------|
| Chainalysis Free API | OFAC SDN screening | Free | $0 |
| Chainalysis Address Screening | Full sanctions + AML | Paid | $150K-$500K/yr |
| Notabene | Travel Rule gateway | Paid | $20K-$80K/yr |
| Alchemy | Base + Ethereum RPC | Growth | $12K/yr |
| QuickNode | Solana RPC | Paid | $3.6K/yr |
| Pinata/web3.storage | IPFS pinning | Paid | $1.2K/yr |
| EAS | On-chain attestation | Free (gas only) | ~$500/yr gas |

---

## Appendix A: Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Chainalysis API latency spikes** break <500ms SLA | High | Cache PASS results 5min; fallback to Chainalysis Free API (SDN-only) if paid API degrades; circuit breaker pattern |
| 2 | **ERC-8004 adoption stalls** at 49K agents | Medium | Support alternative identity registries; DID resolution is registry-agnostic; ERC-8004 is preferred, not required |
| 3 | **Protocol fragmentation** (x402/MPP/AP2 all diverge) | High | Protocol adapter pattern means adding new protocols is additive, not breaking; prioritize x402 + MPP for launch |
| 4 | **Regulatory scope expansion** (FATF issues agent-specific guidance conflicting with ProofLink model) | Medium | Architecture is modular; jurisdictional rule engine is configurable; proactive engagement with regulators |
| 5 | **Coinbase x402 facilitator downtime** | Medium | Support self-hosted facilitator (x402-rs) as fallback; thirdweb multi-chain facilitator as secondary |
| 6 | **GDPR enforcement on compliance receipts** | Medium | Receipt hashes (not PII) go on-chain; PII encrypted at rest; EU data stays in EU region |
| 7 | **Smart contract vulnerability** | High | Foundry fuzz testing; professional audit before mainnet; minimal on-chain logic (attestations only, no value custody) |
| 8 | **Key compromise (compliance signing key)** | Critical | HSM-backed KMS; key rotation procedures; revocation of affected attestations; incident response plan |
| 9 | **Stripe/incumbents build competing compliance layer** | High | Ship fast; build network effects (agent compliance history dataset); open standard positioning |
| 10 | **Notabene API changes or discontinuation** | Low | Notabene is the market leader; but architect Travel Rule layer as adapter pattern for multi-provider support |

---

## Appendix B: Implementation Phases

### Phase 1: ProofLink MVP (8 weeks)
**Goal:** Core compliance check API with sanctions screening.

- ProofLink Engine: sanctions screening via Chainalysis Free API
- REST API: `/compliance/check`, `/compliance/screen/address`
- Compliance receipt generation (off-chain, signed)
- PostgreSQL audit log with hash chain
- Basic API key authentication
- Unit + integration tests for compliance pipeline

**Acceptance criteria:** An API call with sender/receiver addresses returns APPROVED/REJECTED with signed compliance receipt in <500ms.

### Phase 2: Agent Identity + KYA (6 weeks)
**Goal:** ERC-8004 integration and KYA credential issuance.

- Agent registration flow (DID creation, ERC-8004 lookup)
- KYA validation pipeline (vLEI verification, delegation scope)
- KYA Verifiable Credential issuance
- ERC-8004 Validation Registry integration (on-chain submission)
- AgentKYAExtension contract deployment on Base testnet

**Acceptance criteria:** An agent registered on ERC-8004 can receive a ProofLink KYA credential and have its compliance score written to the Validation Registry.

### Phase 3: x402 Integration (4 weeks)
**Goal:** ProofLink as compliance-aware x402 facilitator proxy.

- x402 middleware (Express/Hono) with ProofLink compliance hook
- x402 compliance header injection
- MCP server with compliance tools (5 tools)
- x402 self-service paywall for ProofLink's own API

**Acceptance criteria:** An AI agent making an x402 payment through ProofLink's proxy receives a compliance receipt attached to the response.

### Phase 4: Invoice System + On-Chain (6 weeks)
**Goal:** Agent invoice creation, anchoring, and ERP sync.

- Invoice JSON-LD schema implementation
- Invoice CRUD API
- On-chain anchoring via EAS (Base)
- ProofLinkComplianceAttester contract deployment on Base mainnet
- InvoiceAnchor contract deployment
- QuickBooks Online integration (first ERP)

**Acceptance criteria:** An agent creates an invoice, it is anchored on-chain via EAS, and the invoice appears in QuickBooks.

### Phase 5: Travel Rule + Multi-Protocol (6 weeks)
**Goal:** FATF Travel Rule implementation and MPP/AP2 support.

- Notabene integration for Travel Rule data transmission
- IVMS101 message construction
- MPP session compliance hooks (Stripe webhook integration)
- AP2 mandate compliance verification
- Jurisdictional rule engine (GENIUS Act, MiCA thresholds)

**Acceptance criteria:** A stablecoin transfer >$3,000 triggers Travel Rule data transmission via Notabene; MPP session creation triggers agent compliance verification.

### Phase 6: Dashboard + Reporting (4 weeks)
**Goal:** Web dashboard for compliance monitoring and reporting.

- Next.js compliance dashboard
- Real-time WebSocket events
- GraphQL API for analytics queries
- Compliance summary reports (daily/weekly/monthly)
- SAR candidate identification and export

**Acceptance criteria:** Compliance team can monitor live transactions, view risk distributions, and export audit reports.

---

## Appendix C: Open Questions

1. **VASP Registration:** Does ProofLink itself need to register as a VASP/MSB in the US? Recommendation: operate as compliance infrastructure provider (not a VASP) in Phase 1; reassess when handling settlement directly.

2. **Dispute Resolution Authority:** Should ProofLink adjudicate disputes itself, or integrate with decentralized arbitration (Kleros/UMA)? Recommendation: ProofLink as first-party resolver in Phase 1; add Kleros integration as optional escalation path in Phase 3+.

3. **Solana Program Deployment:** Do we need custom Solana programs for compliance attestation, or is EVM-only (Base) sufficient for on-chain components? Recommendation: Base-only for Phase 1-4; Solana programs only if significant Solana-native agent demand materializes.

4. **Agent Behavioral Baseline:** What constitutes "normal" agent transaction behavior for AML monitoring? There is no established baseline. Recommendation: collect data in Phase 1-3 with permissive thresholds; train ML models on real agent behavior before tightening AML scoring.

5. **KYA Credential Pricing:** Should KYA validation be free (to drive adoption) or paid (to generate revenue)? Recommendation: free for basic validation (sanctions + ERC-8004 lookup); paid for full KYA credential issuance with vLEI verification.

6. **ERC-8183 Integration Timing:** ERC-8183 (programmable escrow) has no production implementations yet. When should ProofLink integrate? Recommendation: monitor; integrate when first production deployment appears. Architecture is compatible via the DisputeResolution contract's evaluator pattern.

7. **Multi-Chain EAS Attestations:** Should compliance receipts be attested on Base only, or on every chain where the transaction settles? Recommendation: Base only (single source of truth); receipts reference the settlement chain and txHash in their data.
