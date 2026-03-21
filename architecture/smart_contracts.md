# FlowLink Smart Contract Architecture

**Version:** 1.0
**Date:** 2026-03-20
**Author:** Smart Contract Architect
**Status:** Design Complete — Ready for Implementation

---

## 1. Problem Statement

FlowLink's on-chain layer must provide five capabilities that no existing protocol covers: (1) immutable compliance receipt anchoring tied to the Ethereum Attestation Service, (2) KYA credential management extending ERC-8004's identity registry, (3) structured invoice anchoring for agent-to-agent commerce, (4) an x402-compatible facilitator that gates settlement behind compliance checks, and (5) dispute resolution that integrates with ERC-8183 escrow hooks. These contracts collectively form the trust substrate that makes x402 and ERC-8183 payments enterprise-grade.

---

## 2. Contract Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FlowLink On-Chain Layer                      │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ ProofLinkRegistry│  │  FlowLinkKYA    │  │   AgentInvoice      │  │
│  │ (EAS Attestation)│  │  (ERC-8004 ext) │  │   (Invoice Anchor)  │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────┬───────────┘  │
│           │                    │                      │              │
│           └──────────┬─────────┴──────────────────────┘              │
│                      │                                               │
│           ┌──────────▼──────────┐  ┌──────────────────────┐         │
│           │ FlowLinkFacilitator │  │   DisputeOracle      │         │
│           │ (x402 compliance)   │──│   (ERC-8183 hooks)   │         │
│           └─────────────────────┘  └──────────────────────┘         │
│                      │                                               │
│                      ▼                                               │
│              On-chain settlement (USDC / EURC on Base / Ethereum)    │
└──────────────────────────────────────────────────────────────────────┘
```

### Contract Inventory

| Contract | Purpose | Proxy Pattern | Primary Chain |
|----------|---------|---------------|---------------|
| `ProofLinkRegistry` | Compliance receipt registry, EAS integration | UUPS | Base, Ethereum |
| `FlowLinkKYA` | KYA credential issuance and verification, extends ERC-8004 | UUPS | Ethereum, Base |
| `AgentInvoice` | On-chain invoice hash anchoring and lifecycle | UUPS | Base |
| `FlowLinkFacilitator` | x402 compliance-gated facilitator | UUPS | Base |
| `DisputeOracle` | Dispute resolution for ERC-8183 jobs | UUPS | Base, Ethereum |

---

## 3. Contract Specifications

### 3.1 ProofLinkRegistry.sol

**Purpose:** Anchors cryptographically signed compliance receipts on-chain via the Ethereum Attestation Service (EAS). Every FlowLink-processed payment generates a ProofLink receipt; this contract makes that receipt tamper-evident and publicly verifiable.

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS, AttestationRequest, AttestationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

/// @title IProofLinkRegistry
/// @notice Anchors FlowLink compliance receipts as EAS attestations.
/// @dev Each receipt maps a payment transaction to its compliance checks.
///      The receipt content is stored on IPFS; only the hash is on-chain.
interface IProofLinkRegistry {

    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────

    /// @notice Minimal on-chain representation of a compliance receipt.
    struct ProofLinkReceipt {
        bytes32 receiptId;          // keccak256(paymentTxHash, chainId, timestamp)
        bytes32 paymentTxHash;      // The settled payment transaction hash
        uint64  chainId;            // Chain where the payment settled
        address payer;              // Wallet that signed the payment
        address payee;              // Wallet that received funds
        uint128 amount;             // Payment amount in token base units
        address token;              // ERC-20 token address (USDC, EURC)
        bytes32 ipfsContentHash;    // IPFS CID of the full compliance report (JSON)
        uint8   riskScore;          // 0-100 AML risk score (0 = clean)
        uint16  sanctionsFlags;     // Bitmask: bit0=OFAC, bit1=EU, bit2=UN, bit3=HMT
        bool    travelRuleCompliant;// Whether FATF Travel Rule was satisfied
        uint40  timestamp;          // Block timestamp of receipt creation
    }

    /// @notice Compressed receipt for batch operations.
    struct ReceiptDigest {
        bytes32 receiptId;
        bytes32 paymentTxHash;
        uint8   riskScore;
        uint16  sanctionsFlags;
        bool    travelRuleCompliant;
    }

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new compliance receipt is anchored.
    event ReceiptAnchored(
        bytes32 indexed receiptId,
        bytes32 indexed paymentTxHash,
        address indexed payer,
        address payee,
        uint128 amount,
        uint8   riskScore,
        bool    travelRuleCompliant,
        bytes32 easAttestationUID
    );

    /// @notice Emitted when a receipt is revoked (e.g., found fraudulent post-hoc).
    event ReceiptRevoked(
        bytes32 indexed receiptId,
        address indexed revokedBy,
        string  reason
    );

    /// @notice Emitted when the EAS schema is registered or updated.
    event SchemaRegistered(bytes32 indexed schemaUID);

    // ──────────────────────────────────────────────
    // Write Functions
    // ──────────────────────────────────────────────

    /// @notice Anchor a single compliance receipt. Creates an EAS attestation.
    /// @dev Only callable by addresses with ATTESTER_ROLE.
    /// @param receipt The full compliance receipt data.
    /// @return receiptId The unique receipt identifier.
    /// @return easUID   The EAS attestation UID.
    function anchorReceipt(ProofLinkReceipt calldata receipt)
        external
        returns (bytes32 receiptId, bytes32 easUID);

    /// @notice Anchor multiple receipts in a single transaction.
    /// @dev Gas-optimized batch operation. Max 50 per call.
    /// @param receipts Array of compliance receipts.
    /// @return receiptIds Array of receipt identifiers.
    function anchorReceiptBatch(ProofLinkReceipt[] calldata receipts)
        external
        returns (bytes32[] memory receiptIds);

    /// @notice Revoke a previously anchored receipt.
    /// @dev Only callable by ADMIN_ROLE. Also revokes the EAS attestation.
    /// @param receiptId The receipt to revoke.
    /// @param reason Human-readable revocation reason.
    function revokeReceipt(bytes32 receiptId, string calldata reason) external;

    // ──────────────────────────────────────────────
    // Read Functions
    // ──────────────────────────────────────────────

    /// @notice Look up a receipt by its ID.
    function getReceipt(bytes32 receiptId)
        external view returns (ProofLinkReceipt memory);

    /// @notice Look up a receipt by the payment transaction hash.
    function getReceiptByTxHash(bytes32 paymentTxHash)
        external view returns (ProofLinkReceipt memory);

    /// @notice Check whether a payment has a valid (non-revoked) compliance receipt.
    /// @param paymentTxHash The settled payment tx hash.
    /// @return isCompliant True if receipt exists, is not revoked, sanctions clear, risk < threshold.
    function isPaymentCompliant(bytes32 paymentTxHash)
        external view returns (bool isCompliant);

    /// @notice Get the EAS attestation UID for a receipt.
    function getEASAttestation(bytes32 receiptId)
        external view returns (bytes32 easUID);

    /// @notice Return the EAS schema UID used by this registry.
    function getSchemaUID() external view returns (bytes32);

    // ──────────────────────────────────────────────
    // Admin
    // ──────────────────────────────────────────────

    /// @notice Register or update the EAS schema for ProofLink receipts.
    /// @dev Only callable by ADMIN_ROLE. Should be called once at initialization.
    function registerSchema() external returns (bytes32 schemaUID);

    /// @notice Set the maximum acceptable risk score for `isPaymentCompliant`.
    /// @param threshold 0-100. Payments with riskScore > threshold are non-compliant.
    function setRiskThreshold(uint8 threshold) external;
}
```

#### Storage Layout

```
Slot 0:    address  _easContract           // EAS singleton address
Slot 1:    bytes32  _schemaUID             // EAS schema UID for ProofLink receipts
Slot 2:    uint8    _riskThreshold         // Default: 50
Slot 3-N:  mapping(bytes32 => ProofLinkReceipt)  _receipts          // receiptId => receipt
Slot N+1:  mapping(bytes32 => bytes32)            _txHashToReceipt  // paymentTxHash => receiptId
Slot N+2:  mapping(bytes32 => bytes32)            _receiptToEAS     // receiptId => EAS UID
Slot N+3:  mapping(bytes32 => bool)               _revoked          // receiptId => revoked
```

#### Access Control

| Role | Permissions |
|------|------------|
| `ADMIN_ROLE` | `registerSchema`, `setRiskThreshold`, `revokeReceipt`, upgrade proxy |
| `ATTESTER_ROLE` | `anchorReceipt`, `anchorReceiptBatch` |
| `DEFAULT_ADMIN_ROLE` | Grant/revoke all roles |

#### Gas Optimization

- Receipt storage uses tight struct packing: `riskScore` (uint8) + `sanctionsFlags` (uint16) + `travelRuleCompliant` (bool) + `timestamp` (uint40) fit in a single 32-byte slot.
- Batch anchoring amortizes the base transaction cost (~21k gas) across up to 50 receipts.
- The `_txHashToReceipt` mapping avoids storing duplicate data; it only maps to the receiptId, not a copy of the receipt.
- EAS attestation creation is the dominant gas cost (~80k per attestation). Batch attestation via EAS `multiAttest` should be used when available.

#### EAS Integration Pattern

```
┌────────────────────┐     anchorReceipt()     ┌───────────────────┐
│ FlowLink Backend   │ ─────────────────────▶  │ ProofLinkRegistry │
│ (off-chain engine) │                         │   (on-chain)      │
└────────────────────┘                         └────────┬──────────┘
                                                        │
                                                        │ IEAS.attest()
                                                        ▼
                                               ┌───────────────────┐
                                               │  EAS Contract     │
                                               │  (Ethereum/Base)  │
                                               └───────────────────┘
```

**EAS Schema Definition (human-readable):**
```
bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, address payer, address payee, uint128 amount, address token, bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, bool travelRuleCompliant
```

**EAS Deployment Addresses (known):**
- Ethereum Mainnet: `0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587`
- Base: `0x4200000000000000000000000000000000000021`

---

### 3.2 FlowLinkKYA.sol

**Purpose:** Issues and manages Know Your Agent credentials as on-chain attestations. Extends the ERC-8004 Identity Registry by acting as a registered validator in the ERC-8004 Validation Registry. When FlowLink verifies an agent's KYA status, it writes a validation response that any escrow contract or facilitator can query.

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IFlowLinkKYA
/// @notice Issues and manages KYA (Know Your Agent) credentials.
/// @dev Acts as a validator in the ERC-8004 Validation Registry.
///      Credentials are stored on-chain as compact structs with full
///      details on IPFS (referenced by contentHash).
interface IFlowLinkKYA {

    // ──────────────────────────────────────────────
    // Enums
    // ──────────────────────────────────────────────

    /// @notice KYA verification levels, escalating trust.
    enum KYALevel {
        NONE,           // 0: No verification
        BASIC,          // 1: Agent registered in ERC-8004, basic metadata check
        STANDARD,       // 2: Principal entity verified (KYB/vLEI), spending limits set
        ENHANCED,       // 3: Full compliance: sanctions screened, AML profiled, Travel Rule capable
        INSTITUTIONAL   // 4: SOC2/PCI-DSS audited operator, multi-sig governance, TEE attestation
    }

    /// @notice Status of a KYA credential.
    enum CredentialStatus {
        ACTIVE,
        SUSPENDED,
        REVOKED,
        EXPIRED
    }

    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────

    /// @notice On-chain representation of a KYA credential.
    struct KYACredential {
        uint256 agentId;            // ERC-8004 agent token ID
        address identityRegistry;   // ERC-8004 Identity Registry address
        KYALevel level;             // Verification tier
        CredentialStatus status;    // Current status
        uint40  issuedAt;           // Timestamp of issuance
        uint40  expiresAt;          // Credential expiry (max 1 year)
        bytes32 contentHash;        // IPFS CID of full W3C Verifiable Credential JSON
        bytes32 principalHash;      // keccak256 of principal entity identifier (LEI or DID, no raw PII)
        uint128 maxTxValue;         // Maximum single transaction value (token base units, 0 = unlimited)
        uint128 dailyLimit;         // Maximum daily spend (token base units, 0 = unlimited)
    }

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new KYA credential is issued.
    event CredentialIssued(
        uint256 indexed agentId,
        address indexed identityRegistry,
        KYALevel level,
        uint40  expiresAt,
        bytes32 contentHash
    );

    /// @notice Emitted when a credential's status changes.
    event CredentialStatusChanged(
        uint256 indexed agentId,
        address indexed identityRegistry,
        CredentialStatus oldStatus,
        CredentialStatus newStatus,
        string  reason
    );

    /// @notice Emitted when spending limits are updated.
    event SpendingLimitsUpdated(
        uint256 indexed agentId,
        uint128 maxTxValue,
        uint128 dailyLimit
    );

    /// @notice Emitted when an agent's daily spend is recorded.
    event DailySpendRecorded(
        uint256 indexed agentId,
        uint128 amount,
        uint128 remainingDaily
    );

    // ──────────────────────────────────────────────
    // Write Functions
    // ──────────────────────────────────────────────

    /// @notice Issue a KYA credential to an agent.
    /// @dev Only callable by ISSUER_ROLE. Also writes a validation response
    ///      to the ERC-8004 Validation Registry with score = level * 25.
    /// @param agentId        ERC-8004 agent token ID.
    /// @param identityRegistry ERC-8004 Identity Registry address.
    /// @param level          KYA verification tier.
    /// @param expiresAt      Credential expiry timestamp.
    /// @param contentHash    IPFS CID of full VC JSON.
    /// @param principalHash  Hashed principal entity identifier.
    /// @param maxTxValue     Max single tx value (0 = unlimited).
    /// @param dailyLimit     Max daily spend (0 = unlimited).
    /// @return credentialKey Unique key for this credential.
    function issueCredential(
        uint256 agentId,
        address identityRegistry,
        KYALevel level,
        uint40  expiresAt,
        bytes32 contentHash,
        bytes32 principalHash,
        uint128 maxTxValue,
        uint128 dailyLimit
    ) external returns (bytes32 credentialKey);

    /// @notice Suspend a credential (reversible).
    /// @param agentId          ERC-8004 agent token ID.
    /// @param identityRegistry ERC-8004 Identity Registry address.
    /// @param reason           Suspension reason.
    function suspendCredential(
        uint256 agentId,
        address identityRegistry,
        string calldata reason
    ) external;

    /// @notice Revoke a credential permanently.
    function revokeCredential(
        uint256 agentId,
        address identityRegistry,
        string calldata reason
    ) external;

    /// @notice Reinstate a suspended credential.
    function reinstateCredential(
        uint256 agentId,
        address identityRegistry
    ) external;

    /// @notice Update spending limits for a credentialed agent.
    function updateSpendingLimits(
        uint256 agentId,
        address identityRegistry,
        uint128 maxTxValue,
        uint128 dailyLimit
    ) external;

    /// @notice Record a spend against the agent's daily limit.
    /// @dev Called by FlowLinkFacilitator after settling a payment.
    ///      Reverts if daily limit would be exceeded.
    /// @param agentId          ERC-8004 agent token ID.
    /// @param identityRegistry ERC-8004 Identity Registry address.
    /// @param amount           Amount spent (token base units).
    function recordSpend(
        uint256 agentId,
        address identityRegistry,
        uint128 amount
    ) external;

    // ──────────────────────────────────────────────
    // Read Functions
    // ──────────────────────────────────────────────

    /// @notice Get the KYA credential for an agent.
    function getCredential(uint256 agentId, address identityRegistry)
        external view returns (KYACredential memory);

    /// @notice Check if an agent has a valid (active, non-expired) credential at
    ///         the given minimum level.
    /// @return isValid True if credential is ACTIVE, not expired, and level >= minLevel.
    function isAgentVerified(
        uint256 agentId,
        address identityRegistry,
        KYALevel minLevel
    ) external view returns (bool isValid);

    /// @notice Check if a single transaction of `amount` is within the agent's limits.
    /// @return allowed     True if within both per-tx and daily limits.
    /// @return dailyRemaining Remaining daily allowance after this hypothetical spend.
    function checkSpendingLimit(
        uint256 agentId,
        address identityRegistry,
        uint128 amount
    ) external view returns (bool allowed, uint128 dailyRemaining);

    /// @notice Resolve an agent wallet address to its KYA credential.
    /// @dev Looks up the agent wallet in the ERC-8004 Identity Registry,
    ///      finds the agentId, and returns the credential.
    function getCredentialByWallet(address agentWallet)
        external view returns (KYACredential memory, uint256 agentId);

    /// @notice Get the remaining daily spend allowance for an agent.
    function getRemainingDailyLimit(uint256 agentId, address identityRegistry)
        external view returns (uint128);
}
```

#### Storage Layout

```
Slot 0:    address _erc8004IdentityRegistry   // Default ERC-8004 Identity Registry
Slot 1:    address _erc8004ValidationRegistry  // Default ERC-8004 Validation Registry
Slot 2-N:  mapping(bytes32 => KYACredential)   _credentials  // credentialKey => credential
                                               // credentialKey = keccak256(agentId, identityRegistry)
Slot N+1:  mapping(bytes32 => uint128)         _dailySpent   // keccak256(agentId, identityRegistry, dayNumber) => spent
Slot N+2:  mapping(address => bytes32)         _walletToCredentialKey // agentWallet => credentialKey
```

#### Access Control

| Role | Permissions |
|------|------------|
| `ADMIN_ROLE` | Upgrade proxy, set default registries |
| `ISSUER_ROLE` | `issueCredential`, `suspendCredential`, `revokeCredential`, `reinstateCredential`, `updateSpendingLimits` |
| `FACILITATOR_ROLE` | `recordSpend` (only FlowLinkFacilitator should hold this) |

#### ERC-8004 Integration Pattern

When `issueCredential` is called, the contract also writes to the ERC-8004 Validation Registry:

```
issueCredential(agentId, ..., level=ENHANCED, ...)
    │
    ├── Store credential in _credentials mapping
    ├── Update _walletToCredentialKey via ERC-8004 getAgentWallet()
    │
    └── Call ValidationRegistry.validationResponse(
            requestHash = keccak256(agentId, "flowlink-kya"),
            response    = level * 25,     // BASIC=25, STANDARD=50, ENHANCED=75, INSTITUTIONAL=100
            responseURI = "ipfs://{contentHash}",
            responseHash = contentHash,
            tag         = "kya"
        )
```

This means any contract querying the ERC-8004 Validation Registry with the `"kya"` tag and FlowLink's validator address will see whether an agent has passed FlowLink KYA verification.

---

### 3.3 AgentInvoice.sol

**Purpose:** Anchors structured agent invoices on-chain with lifecycle management. Invoices reference the FlowLink Agent Invoice Standard (JSON-LD schema from product strategy). The contract stores only hashes and critical fields; full invoice data lives on IPFS.

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentInvoice
/// @notice On-chain anchoring and lifecycle management for agent invoices.
/// @dev Invoices are content-addressed (IPFS). On-chain storage is minimal:
///      hashes, amounts, parties, and state transitions.
interface IAgentInvoice {

    // ──────────────────────────────────────────────
    // Enums
    // ──────────────────────────────────────────────

    /// @notice Invoice lifecycle states.
    enum InvoiceStatus {
        DRAFT,      // 0: Created but not finalized
        ISSUED,     // 1: Finalized and sent to recipient
        PAID,       // 2: Payment confirmed on-chain
        DISPUTED,   // 3: Under dispute resolution
        CANCELLED,  // 4: Cancelled by issuer before payment
        REFUNDED    // 5: Refunded after dispute
    }

    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────

    /// @notice On-chain invoice anchor.
    struct Invoice {
        bytes32 invoiceId;          // keccak256(issuerAgentId, recipientAgentId, nonce)
        uint256 issuerAgentId;      // ERC-8004 agent ID of the service provider
        uint256 recipientAgentId;   // ERC-8004 agent ID of the payer
        address issuerWallet;       // Payment destination
        address recipientWallet;    // Expected payer wallet
        address token;              // ERC-20 token for payment
        uint128 totalAmount;        // Invoice total in token base units
        bytes32 contentHash;        // IPFS CID of full JSON-LD invoice
        bytes32 paymentTxHash;      // Filled when paid (x402 or direct tx hash)
        bytes32 proofLinkReceiptId; // Filled when compliance receipt is anchored
        InvoiceStatus status;
        uint40  issuedAt;
        uint40  dueAt;              // Payment deadline
        uint40  paidAt;             // Actual payment timestamp
    }

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        uint256 indexed issuerAgentId,
        uint256 indexed recipientAgentId,
        uint128 totalAmount,
        address token,
        uint40  dueAt
    );

    event InvoiceIssued(bytes32 indexed invoiceId);

    event InvoicePaid(
        bytes32 indexed invoiceId,
        bytes32 indexed paymentTxHash,
        bytes32 proofLinkReceiptId,
        uint40  paidAt
    );

    event InvoiceDisputed(
        bytes32 indexed invoiceId,
        address indexed disputedBy,
        bytes32 disputeId
    );

    event InvoiceCancelled(bytes32 indexed invoiceId);
    event InvoiceRefunded(bytes32 indexed invoiceId, bytes32 refundTxHash);

    // ──────────────────────────────────────────────
    // Write Functions
    // ──────────────────────────────────────────────

    /// @notice Create a new invoice in DRAFT status.
    /// @dev Caller must be the agent owner or operator of issuerAgentId in ERC-8004.
    /// @param issuerAgentId     ERC-8004 agent ID of the invoicing agent.
    /// @param recipientAgentId  ERC-8004 agent ID of the recipient.
    /// @param issuerWallet      Payment destination address.
    /// @param recipientWallet   Expected payer address.
    /// @param token             ERC-20 payment token.
    /// @param totalAmount       Invoice total.
    /// @param contentHash       IPFS CID of the full invoice JSON-LD.
    /// @param dueAt             Payment deadline timestamp.
    /// @return invoiceId        The generated invoice identifier.
    function createInvoice(
        uint256 issuerAgentId,
        uint256 recipientAgentId,
        address issuerWallet,
        address recipientWallet,
        address token,
        uint128 totalAmount,
        bytes32 contentHash,
        uint40  dueAt
    ) external returns (bytes32 invoiceId);

    /// @notice Transition invoice from DRAFT to ISSUED.
    /// @dev Callable by issuer agent owner/operator only.
    function issueInvoice(bytes32 invoiceId) external;

    /// @notice Mark invoice as paid with payment proof.
    /// @dev Callable by FACILITATOR_ROLE (FlowLinkFacilitator) or issuer.
    /// @param invoiceId         The invoice to mark paid.
    /// @param paymentTxHash     On-chain transaction hash of the settlement.
    /// @param proofLinkReceiptId ProofLink compliance receipt ID (may be bytes32(0) if not yet anchored).
    function markPaid(
        bytes32 invoiceId,
        bytes32 paymentTxHash,
        bytes32 proofLinkReceiptId
    ) external;

    /// @notice Initiate a dispute on a PAID or ISSUED invoice.
    /// @dev Creates a dispute in the DisputeOracle contract.
    /// @param invoiceId The invoice under dispute.
    /// @param reason    Dispute reason (hashed and stored).
    /// @return disputeId The dispute identifier from DisputeOracle.
    function disputeInvoice(bytes32 invoiceId, string calldata reason)
        external returns (bytes32 disputeId);

    /// @notice Cancel an unpaid invoice.
    /// @dev Only callable by issuer, only from DRAFT or ISSUED status.
    function cancelInvoice(bytes32 invoiceId) external;

    /// @notice Mark invoice as refunded after dispute resolution.
    /// @dev Only callable by DISPUTE_RESOLVER_ROLE.
    function markRefunded(bytes32 invoiceId, bytes32 refundTxHash) external;

    // ──────────────────────────────────────────────
    // Read Functions
    // ──────────────────────────────────────────────

    /// @notice Get full invoice data.
    function getInvoice(bytes32 invoiceId)
        external view returns (Invoice memory);

    /// @notice Get all invoice IDs issued by an agent.
    function getInvoicesByIssuer(uint256 issuerAgentId)
        external view returns (bytes32[] memory);

    /// @notice Get all invoice IDs received by an agent.
    function getInvoicesByRecipient(uint256 recipientAgentId)
        external view returns (bytes32[] memory);

    /// @notice Check if an invoice is overdue (ISSUED and past dueAt).
    function isOverdue(bytes32 invoiceId) external view returns (bool);
}
```

#### Storage Layout

```
Slot 0:    address _erc8004IdentityRegistry
Slot 1:    address _disputeOracle
Slot 2:    address _proofLinkRegistry
Slot 3-N:  mapping(bytes32 => Invoice)          _invoices
Slot N+1:  mapping(uint256 => bytes32[])        _issuerInvoices    // agentId => invoiceIds
Slot N+2:  mapping(uint256 => bytes32[])        _recipientInvoices // agentId => invoiceIds
Slot N+3:  mapping(uint256 => uint256)          _nonces            // issuerAgentId => nonce (for invoiceId generation)
```

#### Access Control

| Role | Permissions |
|------|------------|
| `ADMIN_ROLE` | Upgrade proxy, set contract references |
| `FACILITATOR_ROLE` | `markPaid` |
| `DISPUTE_RESOLVER_ROLE` | `markRefunded` |
| Agent owner/operator | `createInvoice`, `issueInvoice`, `cancelInvoice`, `disputeInvoice` (verified via ERC-8004 ownerOf / isApprovedForAll) |

#### Gas Optimization

- Invoice arrays (`_issuerInvoices`, `_recipientInvoices`) use push-only patterns. Deletion is not supported to maintain audit trail integrity.
- The `Invoice` struct packs `status` (uint8) + `issuedAt` (uint40) + `dueAt` (uint40) + `paidAt` (uint40) into a single slot.
- `invoiceId` is deterministic: `keccak256(abi.encodePacked(issuerAgentId, recipientAgentId, nonce))`. No storage needed for the mapping key itself.

---

### 3.4 FlowLinkFacilitator.sol

**Purpose:** An x402-compatible facilitator that gates payment settlement behind FlowLink compliance checks. Resource servers point their `facilitatorUrl` at a FlowLink endpoint; this contract handles the on-chain settlement after the off-chain compliance engine approves.

The facilitator extends the standard x402 facilitator pattern by adding: KYA verification, sanctions check attestation, spending limit enforcement, and ProofLink receipt generation.

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IFlowLinkFacilitator
/// @notice x402-compatible facilitator with built-in compliance gating.
/// @dev The off-chain FlowLink API handles /verify and /settle HTTP endpoints.
///      This contract is the on-chain settlement component that the off-chain
///      service calls after compliance checks pass.
///
///      Flow:
///      1. Resource server POSTs to FlowLink /verify endpoint
///      2. FlowLink off-chain engine runs compliance checks
///      3. If approved, resource server POSTs to FlowLink /settle endpoint
///      4. FlowLink off-chain engine calls this contract's settle() function
///      5. Contract executes transferWithAuthorization (EIP-3009) or Permit2
///      6. Contract records the settlement and triggers ProofLink receipt anchoring
interface IFlowLinkFacilitator {

    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────

    /// @notice Parameters for an EIP-3009 settlement (USDC/EURC).
    struct EIP3009Settlement {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
        bytes   signature;         // EIP-712 typed data signature
    }

    /// @notice Parameters for a Permit2 settlement (any ERC-20).
    struct Permit2Settlement {
        address token;
        address from;
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
        bytes   permitSignature;   // Permit2 signature
        bytes   transferSignature; // Transfer signature
    }

    /// @notice Compliance attestation attached to every settlement.
    struct ComplianceAttestation {
        bytes32 proofLinkReceiptId; // Pre-computed receipt ID
        uint8   riskScore;          // 0-100 from off-chain engine
        uint16  sanctionsFlags;     // Bitmask
        bool    travelRuleCompliant;
        bool    kyaVerified;        // Agent has valid KYA credential
        uint256 agentId;            // ERC-8004 agent ID (0 if human/unknown)
    }

    /// @notice Record of a completed settlement.
    struct SettlementRecord {
        bytes32 settlementId;       // keccak256(txHash, nonce)
        address from;
        address to;
        address token;
        uint256 amount;
        uint256 settledAt;
        bytes32 proofLinkReceiptId;
        bool    reverted;           // True if settlement was later disputed/reverted
    }

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event PaymentSettled(
        bytes32 indexed settlementId,
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        bytes32 proofLinkReceiptId
    );

    event SettlementReverted(
        bytes32 indexed settlementId,
        string  reason
    );

    event ComplianceCheckFailed(
        address indexed from,
        address indexed to,
        uint256 amount,
        string  reason
    );

    // ──────────────────────────────────────────────
    // Settlement Functions
    // ──────────────────────────────────────────────

    /// @notice Settle a payment via EIP-3009 (transferWithAuthorization).
    /// @dev Only callable by SETTLER_ROLE. The off-chain engine must have
    ///      already verified the compliance attestation.
    /// @param params     EIP-3009 settlement parameters (from client's signed authorization).
    /// @param compliance Compliance attestation from the off-chain engine.
    /// @return settlementId Unique identifier for this settlement.
    function settleEIP3009(
        EIP3009Settlement calldata params,
        ComplianceAttestation calldata compliance
    ) external returns (bytes32 settlementId);

    /// @notice Settle a payment via Permit2 (any ERC-20).
    /// @param params     Permit2 settlement parameters.
    /// @param compliance Compliance attestation from the off-chain engine.
    /// @return settlementId Unique identifier for this settlement.
    function settlePermit2(
        Permit2Settlement calldata params,
        ComplianceAttestation calldata compliance
    ) external returns (bytes32 settlementId);

    /// @notice Batch settle multiple EIP-3009 payments.
    /// @dev Gas-optimized for high-frequency agent payment flows.
    ///      Max 20 per batch to stay within block gas limits.
    function batchSettleEIP3009(
        EIP3009Settlement[] calldata params,
        ComplianceAttestation[] calldata compliance
    ) external returns (bytes32[] memory settlementIds);

    // ──────────────────────────────────────────────
    // Replay Prevention
    // ──────────────────────────────────────────────

    /// @notice Check if a nonce has been used (prevents double-settlement).
    function isNonceUsed(bytes32 nonce) external view returns (bool);

    // ──────────────────────────────────────────────
    // Read Functions
    // ──────────────────────────────────────────────

    /// @notice Get a settlement record.
    function getSettlement(bytes32 settlementId)
        external view returns (SettlementRecord memory);

    /// @notice Get the ProofLink Registry address.
    function proofLinkRegistry() external view returns (address);

    /// @notice Get the KYA contract address.
    function kyaContract() external view returns (address);

    /// @notice Get the Permit2 proxy address.
    function permit2Proxy() external view returns (address);

    // ──────────────────────────────────────────────
    // Admin
    // ──────────────────────────────────────────────

    /// @notice Pause all settlements (emergency kill switch).
    function pause() external;

    /// @notice Resume settlements.
    function unpause() external;

    /// @notice Update contract references (ProofLinkRegistry, KYA, Permit2Proxy).
    function setContractAddresses(
        address proofLinkRegistry_,
        address kyaContract_,
        address permit2Proxy_
    ) external;
}
```

#### Settlement Flow (Internal Logic)

```
settleEIP3009(params, compliance)
    │
    ├── 1. Check: msg.sender has SETTLER_ROLE
    ├── 2. Check: contract is not paused
    ├── 3. Check: nonce not already used → revert if duplicate
    ├── 4. Check: compliance.sanctionsFlags == 0 → revert if sanctions hit
    ├── 5. Check: compliance.riskScore <= riskThreshold → revert if too risky
    │
    ├── 6. If compliance.agentId > 0 (agent payment):
    │   ├── Verify KYA: kyaContract.isAgentVerified(agentId, registry, STANDARD)
    │   ├── Check spending limit: kyaContract.checkSpendingLimit(agentId, registry, amount)
    │   └── Record spend: kyaContract.recordSpend(agentId, registry, amount)
    │
    ├── 7. Execute: IERC20(token).transferWithAuthorization(
    │       from, to, value, validAfter, validBefore, nonce, signature
    │   )
    │
    ├── 8. Mark nonce as used
    ├── 9. Store SettlementRecord
    ├── 10. Call proofLinkRegistry.anchorReceipt(...) with compliance data
    │
    └── 11. Emit PaymentSettled event
```

#### Access Control

| Role | Permissions |
|------|------------|
| `ADMIN_ROLE` | Upgrade proxy, `setContractAddresses`, `pause`, `unpause` |
| `SETTLER_ROLE` | `settleEIP3009`, `settlePermit2`, `batchSettleEIP3009` |
| `PAUSER_ROLE` | `pause` (separate from admin for emergency use) |

#### Gas Optimization

- Nonce tracking uses a `mapping(bytes32 => bool)` rather than a set, which is the cheapest on-chain deduplication.
- The contract does not store the full `ComplianceAttestation` on-chain. It stores only the `proofLinkReceiptId` in the `SettlementRecord`. Full compliance data is in the ProofLinkRegistry.
- Batch settlement avoids redundant storage reads by caching the `riskThreshold` in memory.
- `transferWithAuthorization` is a single external call (~65k gas). The FlowLink overhead adds ~40k gas per settlement for nonce check, record storage, and ProofLink anchoring.

#### Reentrancy Protection

- All state mutations (nonce marking, record storage) happen **before** the external `transferWithAuthorization` call (checks-effects-interactions pattern).
- The contract uses OpenZeppelin's `ReentrancyGuardUpgradeable` as a defense-in-depth measure, even though the CEI pattern should be sufficient.
- The `pause` mechanism provides a circuit breaker if an exploit is detected.

---

### 3.5 DisputeOracle.sol

**Purpose:** Provides on-chain dispute resolution for FlowLink-processed payments and ERC-8183 jobs. Disputes are filed, evidence is submitted, and resolution is either automated (threshold-based) or delegated to an external arbitrator (Kleros, UMA, or a multisig).

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDisputeOracle
/// @notice Dispute resolution for FlowLink payments and ERC-8183 jobs.
/// @dev Operates as an ERC-8183 hook contract: when attached to a Job,
///      it intercepts the evaluator role and applies FlowLink's evidence-based
///      resolution process.
interface IDisputeOracle {

    // ──────────────────────────────────────────────
    // Enums
    // ──────────────────────────────────────────────

    /// @notice Dispute lifecycle states.
    enum DisputeStatus {
        OPEN,           // 0: Filed, awaiting evidence
        EVIDENCE,       // 1: Evidence submission period active
        ARBITRATION,    // 2: Escalated to external arbitrator
        RESOLVED_PAYER, // 3: Resolved in favor of payer (refund)
        RESOLVED_PAYEE, // 4: Resolved in favor of payee (no refund)
        EXPIRED         // 5: No resolution within deadline
    }

    /// @notice Type of dispute.
    enum DisputeType {
        PAYMENT,        // 0: Dispute on a direct x402 payment
        INVOICE,        // 1: Dispute on an AgentInvoice
        JOB             // 2: Dispute on an ERC-8183 Job
    }

    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────

    /// @notice On-chain dispute record.
    struct Dispute {
        bytes32 disputeId;
        DisputeType disputeType;
        DisputeStatus status;
        address claimant;           // Party that filed the dispute
        address respondent;         // Counter-party
        bytes32 subjectId;          // invoiceId, settlementId, or ERC-8183 jobId
        bytes32 evidenceHash;       // IPFS CID of evidence bundle
        bytes32 responseHash;       // IPFS CID of respondent's evidence
        uint128 disputedAmount;     // Amount in dispute (token base units)
        address token;              // Payment token
        uint40  filedAt;
        uint40  evidenceDeadline;   // Deadline for evidence submission
        uint40  resolvedAt;
        address arbitrator;         // External arbitrator address (if escalated)
        bytes32 proofLinkReceiptId; // FlowLink compliance receipt for the disputed tx
    }

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event DisputeFiled(
        bytes32 indexed disputeId,
        DisputeType indexed disputeType,
        address indexed claimant,
        address respondent,
        bytes32 subjectId,
        uint128 disputedAmount
    );

    event EvidenceSubmitted(
        bytes32 indexed disputeId,
        address indexed submitter,
        bytes32 evidenceHash
    );

    event DisputeEscalated(
        bytes32 indexed disputeId,
        address indexed arbitrator
    );

    event DisputeResolved(
        bytes32 indexed disputeId,
        DisputeStatus indexed resolution,
        address indexed resolvedBy
    );

    // ──────────────────────────────────────────────
    // Write Functions
    // ──────────────────────────────────────────────

    /// @notice File a new dispute.
    /// @dev Either party to the transaction can file.
    ///      Deposits a dispute bond (configurable, default 1% of disputed amount, min 1 USDC).
    /// @param disputeType   Type of dispute.
    /// @param subjectId     ID of the invoice, settlement, or job being disputed.
    /// @param evidenceHash  IPFS CID of the claimant's evidence.
    /// @param respondent    The counter-party's address.
    /// @return disputeId    Unique dispute identifier.
    function fileDispute(
        DisputeType disputeType,
        bytes32 subjectId,
        bytes32 evidenceHash,
        address respondent
    ) external returns (bytes32 disputeId);

    /// @notice Submit evidence (respondent response or supplementary claimant evidence).
    /// @dev Only callable by claimant or respondent, before evidenceDeadline.
    /// @param disputeId     The dispute to submit evidence for.
    /// @param evidenceHash  IPFS CID of the evidence bundle.
    function submitEvidence(bytes32 disputeId, bytes32 evidenceHash) external;

    /// @notice Escalate a dispute to an external arbitrator.
    /// @dev Only callable by ADMIN_ROLE or automatically after evidence deadline
    ///      if no auto-resolution is possible.
    /// @param disputeId   The dispute to escalate.
    /// @param arbitrator  Address of the external arbitration contract (Kleros, UMA).
    function escalateToArbitrator(bytes32 disputeId, address arbitrator) external;

    /// @notice Resolve a dispute. Triggers refund or payment release.
    /// @dev Callable by RESOLVER_ROLE or the designated arbitrator.
    /// @param disputeId   The dispute to resolve.
    /// @param inFavorOfClaimant True = refund claimant; False = payment stands.
    function resolveDispute(bytes32 disputeId, bool inFavorOfClaimant) external;

    /// @notice Claim expiry on a dispute that passed all deadlines without resolution.
    /// @dev Anyone can call. Returns bond to claimant. Does not refund the payment.
    function claimExpiry(bytes32 disputeId) external;

    // ──────────────────────────────────────────────
    // ERC-8183 Hook Interface
    // ──────────────────────────────────────────────

    /// @notice Called by ERC-8183 Job contract before state transition.
    /// @dev Implements the ERC-8183 Hook interface. Checks if there's an
    ///      active dispute on the job. If so, blocks the transition.
    /// @param jobId       The ERC-8183 Job ID.
    /// @param fromStatus  Current job status.
    /// @param toStatus    Target job status.
    /// @return allowed    True if the transition should proceed.
    function beforeTransition(
        bytes32 jobId,
        uint8   fromStatus,
        uint8   toStatus
    ) external view returns (bool allowed);

    /// @notice Called by ERC-8183 Job contract after state transition.
    /// @dev Can trigger automatic dispute resolution for completed/rejected jobs.
    function afterTransition(
        bytes32 jobId,
        uint8   fromStatus,
        uint8   toStatus
    ) external;

    // ──────────────────────────────────────────────
    // Read Functions
    // ──────────────────────────────────────────────

    /// @notice Get dispute details.
    function getDispute(bytes32 disputeId)
        external view returns (Dispute memory);

    /// @notice Check if a subject (invoice, settlement, job) has an active dispute.
    function hasActiveDispute(bytes32 subjectId)
        external view returns (bool);

    /// @notice Get the dispute bond amount for a given disputed amount.
    function getDisputeBond(uint128 disputedAmount)
        external view returns (uint128 bondAmount);

    /// @notice Get the evidence deadline duration (configurable).
    function evidencePeriod() external view returns (uint40);

    // ──────────────────────────────────────────────
    // Admin
    // ──────────────────────────────────────────────

    /// @notice Set the evidence submission period.
    function setEvidencePeriod(uint40 period) external;

    /// @notice Set the dispute bond percentage (basis points).
    function setDisputeBondBps(uint16 bps) external;

    /// @notice Set the minimum dispute bond amount.
    function setMinDisputeBond(uint128 minBond) external;

    /// @notice Whitelist an external arbitrator contract.
    function whitelistArbitrator(address arbitrator, bool allowed) external;
}
```

#### Storage Layout

```
Slot 0:    address _invoiceContract         // AgentInvoice contract
Slot 1:    address _facilitatorContract     // FlowLinkFacilitator contract
Slot 2:    address _proofLinkRegistry       // ProofLinkRegistry contract
Slot 3:    address _bondToken               // Token used for dispute bonds (USDC)
Slot 4:    uint40  _evidencePeriod          // Default: 72 hours (259200 seconds)
Slot 5:    uint16  _disputeBondBps          // Default: 100 (1%)
Slot 6:    uint128 _minDisputeBond          // Default: 1_000_000 (1 USDC)
Slot 7-N:  mapping(bytes32 => Dispute)      _disputes
Slot N+1:  mapping(bytes32 => bytes32)      _subjectToDispute   // subjectId => disputeId
Slot N+2:  mapping(address => bool)         _whitelistedArbitrators
```

#### Access Control

| Role | Permissions |
|------|------------|
| `ADMIN_ROLE` | Upgrade proxy, all config setters, `whitelistArbitrator` |
| `RESOLVER_ROLE` | `resolveDispute` |
| `ESCALATOR_ROLE` | `escalateToArbitrator` |
| Claimant/Respondent | `fileDispute`, `submitEvidence` (verified via on-chain party check) |
| Whitelisted arbitrator | `resolveDispute` (for disputes escalated to them) |

---

## 4. Integration Patterns

### 4.1 FlowLinkFacilitator as x402 Compliance Facilitator

The standard x402 facilitator exposes two HTTP endpoints: `POST /verify` and `POST /settle`. FlowLink wraps these with compliance:

```
Standard x402 flow:
  Client → Server → Facilitator /verify → Facilitator /settle → Blockchain

FlowLink x402 flow:
  Client → Server → FlowLink /verify                    → FlowLink /settle
                         │                                       │
                         ├── OFAC/EU/UN/HMT screening            ├── FlowLinkFacilitator.settleEIP3009()
                         ├── AML risk scoring                    ├── KYA spending limit check
                         ├── KYA credential lookup               ├── ProofLinkRegistry.anchorReceipt()
                         ├── Travel Rule pre-flight              └── AgentInvoice.markPaid() (if invoice exists)
                         └── Return verify result
```

**Key contract interaction:** The off-chain FlowLink API service holds the `SETTLER_ROLE` on the `FlowLinkFacilitator` contract. After off-chain compliance checks pass, it calls `settleEIP3009()` or `settlePermit2()` which executes the on-chain token transfer and anchors the receipt.

**Gas sponsorship:** The FlowLink backend service pays gas for all settlements (same as CDP facilitator model). The buyer never submits on-chain transactions directly.

### 4.2 FlowLinkKYA Integration with ERC-8004 Registries

```
┌──────────────────┐         ┌──────────────────────┐
│ FlowLink Off-chain│         │  ERC-8004 Identity   │
│ KYA Engine        │────────▶│  Registry (0x8004...)│
│ (Jumio, Onfido,   │ lookup  │                      │
│  vLEI, World ID)  │         └──────────┬───────────┘
└────────┬─────────┘                     │
         │                               │ getAgentWallet()
         │ issueCredential()             │
         ▼                               │
┌──────────────────┐         ┌───────────▼───────────┐
│  FlowLinkKYA     │────────▶│  ERC-8004 Validation  │
│  Contract         │ write   │  Registry             │
│                   │ response│  (tag: "kya")         │
└──────────────────┘         └───────────────────────┘
                                        │
                                        │ getValidationStatus()
                                        ▼
                              ┌───────────────────────┐
                              │ Any escrow / facilitator│
                              │ can query KYA status   │
                              └───────────────────────┘
```

**Contract-level integration:**
1. `FlowLinkKYA.issueCredential()` calls `ERC8004ValidationRegistry.validationResponse()` with FlowLink as the validator address.
2. The validation response score maps to KYA level: BASIC=25, STANDARD=50, ENHANCED=75, INSTITUTIONAL=100.
3. Any ERC-8183 escrow contract or third-party facilitator can call `ERC8004ValidationRegistry.getValidationStatus(requestHash)` and filter by FlowLink's validator address and the `"kya"` tag.

**Wallet-to-credential resolution:**
- `FlowLinkKYA` maintains a reverse mapping: `agentWallet => credentialKey`.
- When the facilitator receives a payment from an unknown wallet, it calls `getCredentialByWallet(wallet)` to determine if the payer is a KYA-credentialed agent.
- This mapping is updated whenever `issueCredential` is called by reading `ERC8004IdentityRegistry.getAgentWallet(agentId)`.

### 4.3 ProofLinkRegistry and EAS

**EAS Schema Registration:**
The `ProofLinkRegistry.registerSchema()` function registers a custom schema with the EAS SchemaRegistry:

```solidity
// Pseudocode for schema registration
bytes32 schema = abi.encodePacked(
    "bytes32 receiptId",
    "bytes32 paymentTxHash",
    "uint64 chainId",
    "address payer",
    "address payee",
    "uint128 amount",
    "address token",
    "bytes32 ipfsContentHash",
    "uint8 riskScore",
    "uint16 sanctionsFlags",
    "bool travelRuleCompliant"
);
schemaUID = schemaRegistry.register(schema, ISchemaResolver(address(this)), true);
```

**Attestation creation:**
Each `anchorReceipt()` call creates an EAS attestation via `IEAS.attest()`:
- Schema: FlowLink ProofLink schema (registered once)
- Recipient: the `payer` address (allows payers to query their compliance history)
- Revocable: true (for post-hoc fraud discovery)
- Data: ABI-encoded receipt fields

**Verification by third parties:**
Any party can verify a ProofLink receipt by:
1. Looking up the `easAttestationUID` via `getEASAttestation(receiptId)`
2. Calling `IEAS.getAttestation(uid)` on the EAS contract
3. Verifying the attester is the ProofLinkRegistry contract address
4. Decoding the attestation data to read compliance fields

### 4.4 Cross-Chain Deployment Strategy

| Network | Contracts Deployed | Rationale |
|---------|-------------------|-----------|
| **Base** (primary) | All 5 contracts | x402 primary chain, lowest gas, highest agent tx volume |
| **Ethereum mainnet** | ProofLinkRegistry, FlowLinkKYA, DisputeOracle | ERC-8004 canonical registry lives here; EAS canonical deployment; highest security for dispute resolution |
| **Solana** | None on-chain initially | x402 Solana settlements handled off-chain by FlowLink API; receipts anchored on Base via cross-chain message |

**Cross-chain receipt anchoring pattern:**
When a payment settles on a chain where ProofLinkRegistry is not deployed (e.g., Solana), the off-chain FlowLink engine:
1. Processes the compliance checks off-chain (same engine)
2. Anchors the receipt on Base via `ProofLinkRegistry.anchorReceipt()` with the Solana tx hash in `paymentTxHash` and Solana's chain ID
3. The receipt is chain-agnostic: it references the settlement chain but lives on Base

**Future: Circle CCTP for cross-chain settlement:**
When USDC settles cross-chain via Circle's CCTP, the FlowLinkFacilitator on Base can verify CCTP attestations before anchoring the receipt. This is a Phase 2 capability.

**Deterministic deployment:**
All FlowLink contracts should be deployed via CREATE2 with a salt derived from the contract name and version. This ensures identical addresses across all EVM chains:
```
salt = keccak256(abi.encodePacked("FlowLink", contractName, version))
```

---

## 5. Security Considerations

### 5.1 Upgrade Pattern: UUPS Proxy

All five contracts use OpenZeppelin's UUPS (Universal Upgradeable Proxy Standard) pattern:
- `UUPSUpgradeable` from `@openzeppelin/contracts-upgradeable`
- `_authorizeUpgrade()` restricted to `ADMIN_ROLE`
- Storage gaps (`uint256[50] private __gap`) in every contract to allow future storage additions
- Implementation contracts use `_disableInitializers()` in constructor to prevent initialization of the implementation directly

**Upgrade governance (recommended):**
- Phase 1: 2-of-3 multisig holds `ADMIN_ROLE`
- Phase 2: Timelock controller (48h delay) + 3-of-5 multisig
- Phase 3: On-chain governance (if token is introduced)

### 5.2 Access Control

All contracts use OpenZeppelin's `AccessControlUpgradeable`:
- Role-based permissions (no `onlyOwner` pattern)
- `DEFAULT_ADMIN_ROLE` can grant/revoke all other roles
- Role admin for `SETTLER_ROLE` and `ATTESTER_ROLE` is `ADMIN_ROLE` (not `DEFAULT_ADMIN_ROLE`) to limit blast radius

**Critical role separation:**
```
DEFAULT_ADMIN_ROLE (cold multisig)
    └── ADMIN_ROLE (warm multisig or timelock)
            ├── ATTESTER_ROLE (FlowLink backend service)
            ├── SETTLER_ROLE (FlowLink backend service)
            ├── ISSUER_ROLE (FlowLink KYA service)
            ├── FACILITATOR_ROLE (FlowLinkFacilitator contract address)
            ├── RESOLVER_ROLE (FlowLink dispute service + whitelisted arbitrators)
            └── PAUSER_ROLE (FlowLink ops team, separate from admin)
```

### 5.3 Reentrancy Protection

- `FlowLinkFacilitator`: Uses checks-effects-interactions (CEI) pattern AND `ReentrancyGuardUpgradeable` on all settlement functions. The external call to `transferWithAuthorization` is the last operation in the function.
- `DisputeOracle`: Uses `ReentrancyGuardUpgradeable` on `resolveDispute` (which triggers token transfers for bonds).
- `ProofLinkRegistry` and `FlowLinkKYA`: No external token transfers, so reentrancy risk is minimal. `nonReentrant` applied as defense-in-depth.

### 5.4 Oracle Trust Assumptions

| Trust Assumption | Risk | Mitigation |
|-----------------|------|------------|
| FlowLink off-chain engine is honest about compliance results | High: a compromised engine could mark sanctioned payments as clean | On-chain receipts create an immutable audit trail; post-hoc auditors can verify IPFS content against sanctions lists; receipts are revocable |
| ERC-8004 Identity Registry data is accurate | Medium: agents can register with false metadata | FlowLinkKYA independently verifies agent principals; KYA credential is the trust anchor, not raw ERC-8004 registration |
| EAS attestations are trustworthy | Low: EAS is append-only and permissionless | FlowLink is the attester; trust is in FlowLink's key management, not EAS itself |
| External arbitrators (Kleros, UMA) resolve disputes fairly | Medium: decentralized arbitration has known edge cases | Whitelist-only arbitrators; FlowLink can override via `RESOLVER_ROLE` as fallback; bond mechanism discourages frivolous disputes |
| Sanctions lists are current | Medium: OFAC updates lag real-world designations | Off-chain engine refreshes lists every 15 minutes; revocation mechanism for receipts issued before a designation |

### 5.5 Additional Security Measures

- **Nonce replay prevention:** `FlowLinkFacilitator` marks nonces as used in a mapping before executing the transfer. EIP-3009's `validBefore` timestamp provides a secondary expiry.
- **Spending limit time boundaries:** `FlowLinkKYA._dailySpent` mapping is keyed by `keccak256(agentId, identityRegistry, block.timestamp / 86400)`. Each UTC day resets automatically without requiring a transaction.
- **Bond escrow in DisputeOracle:** Dispute bonds are held by the contract itself (USDC transferred via `transferFrom`). Bonds are returned to the winning party or split if no resolution.
- **Emergency pause:** `FlowLinkFacilitator` has `Pausable` from OpenZeppelin. When paused, all settlement functions revert. `PAUSER_ROLE` is separate from `ADMIN_ROLE` so ops can pause without full admin access.

---

## 6. Risks and Mitigations

| # | Risk | Severity | Mitigation | Fallback |
|---|------|----------|------------|----------|
| 1 | **FlowLink backend key compromise** — attacker with `SETTLER_ROLE` can settle payments with false compliance attestations | Critical | HSM-backed keys for backend service; IP allowlisting on RPC; rate limiting on settlement calls; all receipts auditable post-hoc | Pause contract; revoke compromised key; re-attest affected receipts |
| 2 | **EAS contract upgrade or migration** — EAS changes attestation format or deploys new version | Medium | Pin EAS contract address in storage (upgradeable); abstract EAS calls behind an internal interface | Fall back to direct on-chain storage without EAS (receipts still stored in `_receipts` mapping) |
| 3 | **Gas price spikes on Ethereum mainnet** make receipt anchoring prohibitively expensive | Medium | Primary deployment on Base (L2, ~$0.001 gas); Ethereum mainnet used only for KYA and disputes | Batch receipts; defer non-critical anchoring to off-peak hours |
| 4 | **ERC-8004 registry contract is not upgradeable** and develops a bug or limitation | Low | FlowLinkKYA reads ERC-8004 via interface; can switch to a new registry address via admin function | Maintain internal wallet-to-agent mapping as fallback |
| 5 | **Permit2Proxy vulnerability** — Uniswap's Permit2 contract has a bug | Medium | Primary settlement via EIP-3009 (USDC native, battle-tested); Permit2 is fallback only | Disable Permit2 settlement path via admin toggle |

---

## 7. Implementation Phases

### Phase 1: ProofLinkRegistry + FlowLinkFacilitator (H2H MVP)

**Goal:** Enable compliant x402 payment settlement with on-chain compliance receipts.

**Deliverables:**
- `ProofLinkRegistry.sol` deployed on Base with EAS integration
- `FlowLinkFacilitator.sol` deployed on Base with EIP-3009 settlement (USDC only)
- Off-chain FlowLink API exposes `/verify` and `/settle` endpoints compatible with x402 SDK
- Compliance receipt anchoring on every settlement

**Acceptance criteria:**
- x402 SDK `facilitatorUrl` can point at FlowLink endpoint
- Settlement completes in <3 seconds (including compliance check)
- ProofLink receipt verifiable via EAS explorer (easscan.org)
- Gas cost per settlement <$0.01 on Base

**Parallelizable:** EAS schema registration and contract deployment can happen in parallel.

---

### Phase 2: FlowLinkKYA + AgentInvoice (H2A)

**Goal:** Enable agent identity verification and structured invoicing.

**Deliverables:**
- `FlowLinkKYA.sol` deployed on Ethereum mainnet and Base
- `AgentInvoice.sol` deployed on Base
- FlowLinkKYA registered as validator in ERC-8004 Validation Registry
- Integration between FlowLinkFacilitator and FlowLinkKYA (spending limits)
- Invoice creation and payment linking

**Acceptance criteria:**
- Agent with ERC-8004 registration can obtain KYA credential via FlowLink API
- KYA validation visible in ERC-8004 Validation Registry with `"kya"` tag
- Agent spending limits enforced on-chain by facilitator
- Invoice can be created, issued, paid, and verified on-chain
- ProofLink receipt linked to invoice

**Parallelizable:** FlowLinkKYA (Ethereum + Base) and AgentInvoice (Base) deployments are independent.

---

### Phase 3: DisputeOracle + ERC-8183 Integration (A2A)

**Goal:** Dispute resolution and integration with ERC-8183 escrow jobs.

**Deliverables:**
- `DisputeOracle.sol` deployed on Base and Ethereum
- ERC-8183 hook integration (DisputeOracle as hook contract on Jobs)
- At least one whitelisted external arbitrator (Kleros or UMA)
- Dispute bond mechanism with USDC

**Acceptance criteria:**
- Dispute can be filed against an invoice or settlement
- Evidence submission and deadline enforcement works
- Escalation to external arbitrator triggers correctly
- Resolution triggers refund or payment confirmation
- ERC-8183 job state transitions blocked when dispute is active

**Parallelizable:** Kleros/UMA integration research and DisputeOracle development can proceed in parallel.

---

### Phase 4: Cross-Chain + Permit2 + Batch Optimization

**Goal:** Multi-chain settlement and gas optimization.

**Deliverables:**
- Permit2 settlement path in FlowLinkFacilitator
- Cross-chain receipt anchoring (Solana payments, receipts on Base)
- Batch settlement optimization (20 payments per tx)
- CREATE2 deterministic deployment on all target chains
- CCTP integration for cross-chain USDC settlement

**Acceptance criteria:**
- Permit2 settlement works for non-USDC ERC-20 tokens
- Solana x402 payments get ProofLink receipts on Base
- Batch settlement gas cost <50% of individual settlements combined

---

## 8. Open Questions

1. **EAS vs. custom attestation:** EAS adds gas cost (~80k per attestation) but provides ecosystem compatibility (EAS explorer, third-party verification tools). Should we offer a "lightweight" mode that skips EAS and only stores in the `_receipts` mapping? Recommendation: Yes, make EAS optional via a config flag. Default to EAS-enabled.

2. **Dispute bond token:** Should dispute bonds be in the same token as the disputed payment, or always in USDC? Recommendation: Always USDC for simplicity. Cross-token bonds add swap complexity.

3. **KYA credential portability:** Should FlowLinkKYA credentials be transferable if the ERC-8004 agent NFT is transferred to a new owner? Recommendation: No. Credential should be auto-suspended on agent transfer. New owner must re-verify.

4. **On-chain vs. off-chain compliance logic:** The current design puts compliance decisions off-chain and only anchors results on-chain. Should any compliance logic (e.g., sanctions address matching) move on-chain? Recommendation: No. Sanctions lists are too large and change too frequently for on-chain storage. On-chain is for anchoring, not computing.

5. **FlowLinkFacilitator as upgradeable proxy risk:** If the proxy is compromised, all settlements route through a malicious implementation. Should we add a time-locked upgrade delay? Recommendation: Yes. Phase 2+ should use a 48-hour timelock on upgrades.

6. **Solana program equivalents:** Should FlowLink deploy Solana programs (Anchor/native) for receipt anchoring on Solana directly, or always bridge to Base? Recommendation: Defer. Base anchoring is sufficient for MVP. Solana programs are Phase 4+ if Solana agent volume justifies the engineering cost.
