# EAS Compliance Receipt Schema Architecture

**Version:** 1.0
**Date:** March 20, 2026
**Status:** Architecture Design — Ready for Implementation
**Depends on:** `smart_contracts.md` (ProofLinkRegistry), `technical_design.md` (ProofLink Engine)
**Innovation Map Reference:** Innovation #2 — Cryptographic Compliance Receipts via EAS

---

## 1. Problem Statement

Every FlowLink-processed payment must produce a tamper-evident, machine-verifiable compliance receipt that proves real-time due diligence was exercised. Enterprise auditors, counterparty VASPs, and regulatory bodies must be able to verify this receipt **without trusting FlowLink's database**. The Ethereum Attestation Service (EAS) provides the open, chain-agnostic attestation primitive. This document specifies the exact schema, registration procedure, attestation creation flow, verification protocol, and privacy architecture for ProofLink Compliance Receipts on EAS.

---

## 2. EAS Contract Addresses

All deployments use EAS v1.0.1 (Base predeploy addresses).

| Contract | Base Mainnet | Base Sepolia (Testnet) | Ethereum Mainnet |
|----------|-------------|----------------------|-----------------|
| **EAS** | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000021` | `0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587` |
| **SchemaRegistry** | `0x4200000000000000000000000000000000000020` | `0x4200000000000000000000000000000000000020` | `0xA7b39296258348C78294F95B872b282326A97BDF` |
| **EIP712Proxy** | `0xF095fE4b23958b08D38e52d5d5674bBF0C03cbF6` | — | — |
| **Indexer** | `0x37AC6006646f2e687B7fB379F549Dc7634dF5b84` | — | — |

**Primary deployment: Base Mainnet.** Base is selected because: (1) EAS is predeployed at genesis as a system contract, (2) gas costs are ~100x cheaper than Ethereum L1, (3) Base is the settlement chain for x402/USDC flows in the Coinbase ecosystem, (4) the ProofLinkRegistry contract already targets Base.

---

## 3. EAS Schema Definition

### 3.1 Schema String (Exact Registration Input)

```
bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, address payer, address payee, uint128 amount, address token, bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash
```

This string is passed verbatim to `SchemaRegistry.register()`. EAS schemas use Solidity ABI type notation — each field is a `type name` pair, comma-separated. No parentheses, no `tuple` wrapper.

### 3.2 Field Definitions

| # | Field | Type | Bytes | Purpose | Encoding Notes |
|---|-------|------|-------|---------|----------------|
| 1 | `receiptId` | `bytes32` | 32 | Unique receipt identifier | `keccak256(abi.encodePacked(paymentTxHash, chainId, block.timestamp))` |
| 2 | `paymentTxHash` | `bytes32` | 32 | Transaction hash of the settled payment | Raw tx hash from the settlement chain |
| 3 | `chainId` | `uint64` | 8 | Chain where payment settled | CAIP-2 chain ID (Base=8453, Ethereum=1, Solana=TBD) |
| 4 | `payer` | `address` | 20 | Wallet address that sent funds | EOA or smart contract address |
| 5 | `payee` | `address` | 20 | Wallet address that received funds | EOA or smart contract address |
| 6 | `amount` | `uint128` | 16 | Payment amount in token base units | USDC: 6 decimals. $1,000.00 = `1000000000` |
| 7 | `token` | `address` | 20 | ERC-20 token contract address | USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| 8 | `ipfsContentHash` | `bytes32` | 32 | IPFS CIDv1 of the full compliance report JSON | Stored as the raw 32-byte digest (SHA-256 portion of CIDv1) |
| 9 | `riskScore` | `uint8` | 1 | Composite AML risk score (0=clean, 100=max risk) | Output of ProofLink AML scoring pipeline |
| 10 | `sanctionsFlags` | `uint16` | 2 | Bitmask of sanctions lists screened and cleared | bit0=OFAC SDN, bit1=EU Consolidated, bit2=UN, bit3=HMT, bit4-7=reserved, bits 8-11=match flags (set if matched), bits 12-15=reserved |
| 11 | `travelRuleCompliant` | `bool` | 1 | Whether FATF Travel Rule was satisfied | `true` if: (a) not required, or (b) transmitted and ACK'd |
| 12 | `flowType` | `uint8` | 1 | Transaction flow type | 0=H2H (human-to-human), 1=H2A (human-to-agent), 2=A2H (agent-to-human), 3=A2A (agent-to-agent) |
| 13 | `agentIdHash` | `bytes32` | 32 | Hash of agent identity data (if agent involved) | `keccak256(abi.encodePacked(agentDID, erc8004TokenId))` or `bytes32(0)` for pure H2H |

**Total ABI-encoded size:** 13 fields, ~448 bytes when ABI-encoded (each field padded to 32 bytes per ABI encoding rules).

### 3.3 Sanctions Flags Bitmask Specification

```
Bits 0-3:  Lists screened (1 = screened, 0 = not screened)
  bit 0: OFAC SDN
  bit 1: EU Consolidated Financial Sanctions List
  bit 2: UN Security Council Consolidated List
  bit 3: UK HMT Consolidated List

Bits 4-7:  Reserved for additional lists (SECO, DFAT, MAS)

Bits 8-11: Match indicators (1 = match found, 0 = clear)
  bit 8:  OFAC match
  bit 9:  EU match
  bit 10: UN match
  bit 11: HMT match

Bits 12-15: Reserved
```

Example: `sanctionsFlags = 0x000F` means all four lists screened, no matches found. `sanctionsFlags = 0x010F` means all four screened, OFAC match detected (this receipt should never be issued — transaction would be blocked).

### 3.4 Flow Type Enum

```
0 = H2H  (Human-to-Human)   — Phase 1 B2B stablecoin payments
1 = H2A  (Human-to-Agent)   — Phase 2 enterprise agent payments
2 = A2H  (Agent-to-Human)   — Phase 2 agent payouts to humans
3 = A2A  (Agent-to-Agent)   — Phase 3 autonomous agent economy
```

---

## 4. On-Chain vs Off-Chain Attestation Strategy

EAS supports both on-chain attestations (stored in the EAS contract) and off-chain attestations (EIP-712 signed, stored anywhere, optionally timestamped on-chain). FlowLink uses **both**, depending on context.

### 4.1 Decision Matrix

| Scenario | Attestation Type | Rationale |
|----------|-----------------|-----------|
| **High-value payments (>$10,000)** | On-chain | Full immutability, direct contract queryability, enterprise audit requirement |
| **Regulatory-sensitive payments** (cross-border, Travel Rule triggered) | On-chain | Regulatory defensibility requires on-chain timestamp proof |
| **A2A payments** (agent-to-agent) | On-chain | Other smart contracts need to query compliance status programmatically |
| **Low-value payments (<$1,000)** | Off-chain + on-chain timestamp | Gas optimization; the signed attestation is stored on IPFS, only a 32-byte timestamp hash goes on-chain |
| **Micropayments via x402 (<$10)** | Off-chain only | Batched; daily summary attestation goes on-chain via `multiAttest` |
| **Batch settlement** (MPP session close) | On-chain (single attestation per session) | One attestation per MPP session, not per micro-transaction |

### 4.2 Cost Comparison (Base Mainnet)

| Operation | Estimated Gas | Cost at 0.01 gwei base fee | Cost at 0.1 gwei |
|-----------|--------------|---------------------------|-------------------|
| Schema registration (one-time) | ~250,000 | ~$0.001 | ~$0.01 |
| Single on-chain attestation | ~120,000 | ~$0.0005 | ~$0.005 |
| Batch attestation (10 receipts) | ~600,000 | ~$0.0025 | ~$0.025 |
| Batch attestation (50 receipts) | ~2,500,000 | ~$0.010 | ~$0.10 |
| Off-chain timestamp only | ~50,000 | ~$0.0002 | ~$0.002 |
| Revocation | ~60,000 | ~$0.00025 | ~$0.0025 |

**Note:** Base L2 fees are dominated by L1 data availability costs, which fluctuate. The estimates above assume post-EIP-4844 blob pricing. Actual costs should be benchmarked during testnet deployment. At current Base mainnet prices (~0.001-0.01 gwei), a single on-chain attestation costs **$0.001-$0.01** — negligible relative to FlowLink's 5-30 bps transaction fee.

### 4.3 Hybrid Architecture

```
Payment processed by ProofLink Engine
        |
        v
  Amount > $10,000?  ──Yes──> On-chain attestation (EAS.attest)
        |                            |
        No                           v
        |                     Receipt stored in PostgreSQL
        v                     + IPFS + on-chain EAS
  Amount > $1,000?  ──Yes──> Off-chain attestation + on-chain timestamp
        |                            |
        No                           v
        |                     Signed attestation → IPFS
        v                     Timestamp hash → EAS.timestamp()
  Micropayment (<$1,000)
        |
        v
  Off-chain attestation → IPFS
  Batched daily → EAS.multiAttest() for the batch summary
```

---

## 5. Schema Registration

### 5.1 Registration Transaction

The schema is registered once per chain. The `ProofLinkRegistry` contract's `registerSchema()` function handles this.

**Resolver contract:** `ProofLinkRegistry` itself acts as the resolver. The resolver validates that only addresses with `ATTESTER_ROLE` can create attestations against this schema, and that the `riskScore` does not exceed 100.

**Revocable:** `true`. Receipts must be revocable if a post-hoc investigation reveals fraud, a compliance check was based on stale sanctions data, or a receipt was issued in error.

### 5.2 Solidity: Schema Registration in ProofLinkRegistry

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS, AttestationRequest, AttestationRequestData, MultiAttestationRequest} from
    "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {ISchemaRegistry, SchemaRecord} from
    "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {SchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/SchemaResolver.sol";
import {Attestation} from
    "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AccessControlUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from
    "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title ProofLinkResolver
/// @notice EAS schema resolver that validates ProofLink attestation data.
contract ProofLinkResolver is SchemaResolver {
    address public immutable proofLinkRegistry;

    error UnauthorizedAttester();
    error InvalidRiskScore();

    constructor(IEAS eas_, address registry_) SchemaResolver(eas_) {
        proofLinkRegistry = registry_;
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 /* value */
    ) internal view override returns (bool) {
        // Only the ProofLinkRegistry contract can create attestations
        if (attestation.attester != proofLinkRegistry) {
            revert UnauthorizedAttester();
        }

        // Decode and validate riskScore (9th field, offset = 8 * 32 = 256 bytes)
        // ABI decoding: each field occupies 32 bytes
        uint8 riskScore;
        assembly {
            // attestation.data is a bytes calldata; riskScore is at index 8
            // Skip first 8 fields (8 * 32 = 256 bytes)
            riskScore := calldataload(add(attestation.data.offset, 256))
        }
        if (riskScore > 100) revert InvalidRiskScore();

        return true;
    }

    function onRevoke(
        Attestation calldata, /* attestation */
        uint256 /* value */
    ) internal pure override returns (bool) {
        return true; // Revocation always allowed
    }
}

/// @title ProofLinkRegistry
/// @notice Anchors compliance receipts as EAS attestations on Base.
contract ProofLinkRegistry is AccessControlUpgradeable, UUPSUpgradeable {

    // ── Roles ──
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    // ── State ──
    IEAS public eas;
    ISchemaRegistry public schemaRegistry;
    bytes32 public schemaUID;
    uint8 public riskThreshold;

    // ── Schema string (stored as constant for reference) ──
    string public constant SCHEMA_STRING =
        "bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, "
        "address payer, address payee, uint128 amount, address token, "
        "bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, "
        "bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash";

    // ── Mappings ──
    mapping(bytes32 => bytes32) public receiptToEAS;  // receiptId => EAS UID
    mapping(bytes32 => bytes32) public txHashToReceipt; // paymentTxHash => receiptId
    mapping(bytes32 => bool) public revoked;

    // ── Events ──
    event ReceiptAnchored(
        bytes32 indexed receiptId,
        bytes32 indexed paymentTxHash,
        address indexed payer,
        uint8 riskScore,
        bytes32 easAttestationUID
    );
    event ReceiptRevoked(bytes32 indexed receiptId, string reason);
    event SchemaRegistered(bytes32 indexed schemaUID);

    // ── Errors ──
    error SchemaAlreadyRegistered();
    error ReceiptAlreadyExists();
    error ReceiptNotFound();
    error BatchTooLarge();

    /// @notice Initialize the registry.
    /// @param eas_ EAS contract (0x4200...0021 on Base)
    /// @param schemaRegistry_ SchemaRegistry contract (0x4200...0020 on Base)
    function initialize(
        IEAS eas_,
        ISchemaRegistry schemaRegistry_,
        address admin
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        eas = eas_;
        schemaRegistry = schemaRegistry_;
        riskThreshold = 50;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ATTESTER_ROLE, admin);
    }

    /// @notice Register the ProofLink schema on EAS. Called once.
    function registerSchema(
        ISchemaResolver resolver
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bytes32) {
        if (schemaUID != bytes32(0)) revert SchemaAlreadyRegistered();

        schemaUID = schemaRegistry.register(
            SCHEMA_STRING,
            resolver,
            true // revocable
        );

        emit SchemaRegistered(schemaUID);
        return schemaUID;
    }

    /// @notice Anchor a single compliance receipt as an EAS attestation.
    /// @param recipient The payee address (EAS attestation recipient).
    /// @param encodedData ABI-encoded receipt data matching SCHEMA_STRING.
    /// @param receiptId Pre-computed receipt ID.
    /// @param paymentTxHash The payment transaction hash.
    /// @param riskScore The AML risk score.
    function anchorReceipt(
        address recipient,
        bytes calldata encodedData,
        bytes32 receiptId,
        bytes32 paymentTxHash,
        uint8 riskScore
    ) external onlyRole(ATTESTER_ROLE) returns (bytes32 easUID) {
        if (receiptToEAS[receiptId] != bytes32(0)) revert ReceiptAlreadyExists();

        easUID = eas.attest(
            AttestationRequest({
                schema: schemaUID,
                data: AttestationRequestData({
                    recipient: recipient,
                    expirationTime: 0, // No expiration
                    revocable: true,
                    refUID: bytes32(0), // No referenced attestation
                    data: encodedData,
                    value: 0
                })
            })
        );

        receiptToEAS[receiptId] = easUID;
        txHashToReceipt[paymentTxHash] = receiptId;

        emit ReceiptAnchored(receiptId, paymentTxHash, recipient, riskScore, easUID);
    }

    /// @notice Anchor up to 50 receipts in a single transaction.
    function anchorReceiptBatch(
        address[] calldata recipients,
        bytes[] calldata encodedDataArray,
        bytes32[] calldata receiptIds,
        bytes32[] calldata paymentTxHashes,
        uint8[] calldata riskScores
    ) external onlyRole(ATTESTER_ROLE) returns (bytes32[] memory easUIDs) {
        uint256 len = recipients.length;
        if (len > 50) revert BatchTooLarge();

        AttestationRequestData[] memory requests = new AttestationRequestData[](len);
        for (uint256 i; i < len; ++i) {
            if (receiptToEAS[receiptIds[i]] != bytes32(0)) revert ReceiptAlreadyExists();
            requests[i] = AttestationRequestData({
                recipient: recipients[i],
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: encodedDataArray[i],
                value: 0
            });
        }

        MultiAttestationRequest[] memory multi = new MultiAttestationRequest[](1);
        multi[0] = MultiAttestationRequest({
            schema: schemaUID,
            data: requests
        });

        easUIDs = eas.multiAttest(multi);

        for (uint256 i; i < len; ++i) {
            receiptToEAS[receiptIds[i]] = easUIDs[i];
            txHashToReceipt[paymentTxHashes[i]] = receiptIds[i];
            emit ReceiptAnchored(
                receiptIds[i], paymentTxHashes[i], recipients[i], riskScores[i], easUIDs[i]
            );
        }
    }

    /// @notice Check if a payment has a valid, non-revoked compliance receipt.
    function isPaymentCompliant(bytes32 paymentTxHash) external view returns (bool) {
        bytes32 rid = txHashToReceipt[paymentTxHash];
        if (rid == bytes32(0)) return false;
        if (revoked[rid]) return false;
        bytes32 easUID = receiptToEAS[rid];
        if (easUID == bytes32(0)) return false;
        return true;
    }

    /// @notice Revoke a receipt. Also revokes the EAS attestation.
    function revokeReceipt(
        bytes32 receiptId,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 easUID = receiptToEAS[receiptId];
        if (easUID == bytes32(0)) revert ReceiptNotFound();

        revoked[receiptId] = true;

        eas.revoke(
            RevocationRequest({
                schema: schemaUID,
                data: RevocationRequestData({uid: easUID, value: 0})
            })
        );

        emit ReceiptRevoked(receiptId, reason);
    }

    // ── Internal ──

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
```

### 5.3 TypeScript: Schema Registration via SDK

```typescript
import {
  SchemaRegistry,
  EAS,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

// ── Base Mainnet addresses ──
const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020";
const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";

const PROOFLINK_SCHEMA =
  "bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, " +
  "address payer, address payee, uint128 amount, address token, " +
  "bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, " +
  "bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash";

async function registerProofLinkSchema(
  signer: ethers.Signer,
  resolverAddress: string // ProofLinkResolver contract address
): Promise<string> {
  const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS);
  schemaRegistry.connect(signer);

  const tx = await schemaRegistry.register({
    schema: PROOFLINK_SCHEMA,
    resolverAddress,
    revocable: true,
  });

  const schemaUID = await tx.wait();
  console.log("ProofLink schema registered. UID:", schemaUID);
  return schemaUID;
}
```

---

## 6. Attestation Creation Flow

### 6.1 End-to-End Sequence

```
1. ProofLink Engine completes compliance pipeline (sanctions, AML, Travel Rule)
   Output: ComplianceDecision { status, riskScore, checks[], travelRuleStatus }

2. Compliance Receipt Issuer constructs receipt data:
   a. Compute receiptId = keccak256(paymentTxHash, chainId, timestamp)
   b. Upload full compliance report JSON to IPFS → get CID
   c. Extract ipfsContentHash (32-byte SHA-256 digest from CIDv1)
   d. Determine flowType from transaction metadata
   e. Compute agentIdHash if agent involved

3. Receipt Issuer evaluates on-chain vs off-chain decision (Section 4)

4a. ON-CHAIN PATH:
    - ABI-encode all 13 fields using SchemaEncoder
    - Call ProofLinkRegistry.anchorReceipt() (or anchorReceiptBatch)
    - ProofLinkRegistry calls EAS.attest() internally
    - EAS resolver (ProofLinkResolver) validates data
    - EAS returns attestation UID
    - Store UID in PostgreSQL audit log

4b. OFF-CHAIN PATH:
    - ABI-encode all 13 fields using SchemaEncoder
    - Sign EIP-712 off-chain attestation via EAS SDK
    - Store signed attestation JSON on IPFS alongside compliance report
    - Optionally: call EAS.timestamp() to anchor the attestation hash on-chain

5. Return receipt to caller:
   { receiptId, easUID (if on-chain), ipfsCID, attestationJSON (if off-chain) }
```

### 6.2 TypeScript: Creating On-Chain Attestation

```typescript
import {
  EAS,
  SchemaEncoder,
  NO_EXPIRATION,
  ZERO_BYTES32,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";

// The schema UID obtained during registration
const PROOFLINK_SCHEMA_UID = "0x<your-schema-uid-after-registration>";

interface ComplianceReceiptData {
  receiptId: string;        // bytes32 hex
  paymentTxHash: string;    // bytes32 hex
  chainId: bigint;
  payer: string;            // address
  payee: string;            // address
  amount: bigint;           // uint128 in token base units
  token: string;            // address
  ipfsContentHash: string;  // bytes32 hex (SHA-256 from CIDv1)
  riskScore: number;        // 0-100
  sanctionsFlags: number;   // uint16 bitmask
  travelRuleCompliant: boolean;
  flowType: number;         // 0=H2H, 1=H2A, 2=A2H, 3=A2A
  agentIdHash: string;      // bytes32 hex or ZERO_BYTES32
}

async function createOnChainAttestation(
  signer: ethers.Signer,
  receipt: ComplianceReceiptData
): Promise<string> {
  const eas = new EAS(EAS_ADDRESS);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, " +
    "address payer, address payee, uint128 amount, address token, " +
    "bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, " +
    "bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash"
  );

  const encodedData = schemaEncoder.encodeData([
    { name: "receiptId", value: receipt.receiptId, type: "bytes32" },
    { name: "paymentTxHash", value: receipt.paymentTxHash, type: "bytes32" },
    { name: "chainId", value: receipt.chainId, type: "uint64" },
    { name: "payer", value: receipt.payer, type: "address" },
    { name: "payee", value: receipt.payee, type: "address" },
    { name: "amount", value: receipt.amount, type: "uint128" },
    { name: "token", value: receipt.token, type: "address" },
    { name: "ipfsContentHash", value: receipt.ipfsContentHash, type: "bytes32" },
    { name: "riskScore", value: receipt.riskScore, type: "uint8" },
    { name: "sanctionsFlags", value: receipt.sanctionsFlags, type: "uint16" },
    { name: "travelRuleCompliant", value: receipt.travelRuleCompliant, type: "bool" },
    { name: "flowType", value: receipt.flowType, type: "uint8" },
    { name: "agentIdHash", value: receipt.agentIdHash, type: "bytes32" },
  ]);

  const tx = await eas.attest({
    schema: PROOFLINK_SCHEMA_UID,
    data: {
      recipient: receipt.payee,
      expirationTime: NO_EXPIRATION,
      revocable: true,
      refUID: ZERO_BYTES32,
      data: encodedData,
    },
  });

  const attestationUID = await tx.wait();
  console.log("Attestation created:", attestationUID);
  return attestationUID;
}
```

### 6.3 TypeScript: Creating Off-Chain Attestation

```typescript
import {
  EAS,
  SchemaEncoder,
  Offchain,
  OffchainConfig,
  OffchainAttestationVersion,
  ZERO_BYTES32,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";

async function createOffChainAttestation(
  signer: ethers.Wallet,
  receipt: ComplianceReceiptData,
  schemaUID: string
): Promise<{ attestation: object; signature: string }> {
  const eas = new EAS(EAS_ADDRESS);
  eas.connect(signer);

  const offchain = await eas.getOffchain();

  const schemaEncoder = new SchemaEncoder(
    "bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, " +
    "address payer, address payee, uint128 amount, address token, " +
    "bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, " +
    "bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash"
  );

  const encodedData = schemaEncoder.encodeData([
    { name: "receiptId", value: receipt.receiptId, type: "bytes32" },
    { name: "paymentTxHash", value: receipt.paymentTxHash, type: "bytes32" },
    { name: "chainId", value: receipt.chainId, type: "uint64" },
    { name: "payer", value: receipt.payer, type: "address" },
    { name: "payee", value: receipt.payee, type: "address" },
    { name: "amount", value: receipt.amount, type: "uint128" },
    { name: "token", value: receipt.token, type: "address" },
    { name: "ipfsContentHash", value: receipt.ipfsContentHash, type: "bytes32" },
    { name: "riskScore", value: receipt.riskScore, type: "uint8" },
    { name: "sanctionsFlags", value: receipt.sanctionsFlags, type: "uint16" },
    { name: "travelRuleCompliant", value: receipt.travelRuleCompliant, type: "bool" },
    { name: "flowType", value: receipt.flowType, type: "uint8" },
    { name: "agentIdHash", value: receipt.agentIdHash, type: "bytes32" },
  ]);

  const offchainAttestation = await offchain.signOffchainAttestation(
    {
      recipient: receipt.payee,
      expirationTime: 0n,
      time: BigInt(Math.floor(Date.now() / 1000)),
      revocable: true,
      schema: schemaUID,
      refUID: ZERO_BYTES32,
      data: encodedData,
    },
    signer
  );

  // Store on IPFS for permanent availability
  // The attestation object contains the full signed data + EIP-712 signature
  return {
    attestation: offchainAttestation,
    signature: offchainAttestation.signature,
  };
}

// Optionally timestamp the off-chain attestation on-chain
async function timestampOffChainAttestation(
  signer: ethers.Signer,
  attestationHash: string
): Promise<void> {
  const eas = new EAS(EAS_ADDRESS);
  eas.connect(signer);
  const tx = await eas.timestamp(attestationHash);
  await tx.wait();
}
```

### 6.4 TypeScript: Batch Attestation (Micropayment Aggregation)

```typescript
async function createBatchAttestations(
  signer: ethers.Signer,
  receipts: ComplianceReceiptData[],
  schemaUID: string
): Promise<string[]> {
  const eas = new EAS(EAS_ADDRESS);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, " +
    "address payer, address payee, uint128 amount, address token, " +
    "bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, " +
    "bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash"
  );

  const attestationRequests = receipts.map((receipt) => ({
    recipient: receipt.payee,
    expirationTime: 0n,
    revocable: true,
    refUID: ZERO_BYTES32,
    data: schemaEncoder.encodeData([
      { name: "receiptId", value: receipt.receiptId, type: "bytes32" },
      { name: "paymentTxHash", value: receipt.paymentTxHash, type: "bytes32" },
      { name: "chainId", value: receipt.chainId, type: "uint64" },
      { name: "payer", value: receipt.payer, type: "address" },
      { name: "payee", value: receipt.payee, type: "address" },
      { name: "amount", value: receipt.amount, type: "uint128" },
      { name: "token", value: receipt.token, type: "address" },
      { name: "ipfsContentHash", value: receipt.ipfsContentHash, type: "bytes32" },
      { name: "riskScore", value: receipt.riskScore, type: "uint8" },
      { name: "sanctionsFlags", value: receipt.sanctionsFlags, type: "uint16" },
      { name: "travelRuleCompliant", value: receipt.travelRuleCompliant, type: "bool" },
      { name: "flowType", value: receipt.flowType, type: "uint8" },
      { name: "agentIdHash", value: receipt.agentIdHash, type: "bytes32" },
    ]),
  }));

  const tx = await eas.multiAttest([
    {
      schema: schemaUID,
      data: attestationRequests,
    },
  ]);

  const uids = await tx.wait();
  return uids;
}
```

---

## 7. Verification Flow

### 7.1 Third-Party Verification (No FlowLink Dependency)

Any party can verify a ProofLink compliance receipt using only the EAS contract and the IPFS content hash. No FlowLink API access required.

```
Verifier receives: { receiptId, easAttestationUID } (e.g., from the payee)
        |
        v
Step 1: Query EAS contract on Base
        eas.getAttestation(easAttestationUID)
        → Returns: attester, recipient, time, revocationTime, data
        |
        v
Step 2: Check attestation validity
        - attester == known ProofLinkRegistry address? (trusted attester)
        - revocationTime == 0? (not revoked)
        - schema matches ProofLink schema UID?
        |
        v
Step 3: Decode attestation data
        ABI-decode the 13 fields from the data bytes
        - Verify receiptId matches
        - Check riskScore < acceptable threshold
        - Check sanctionsFlags: bits 8-11 are all 0 (no matches)
        - Check travelRuleCompliant == true
        |
        v
Step 4 (optional): Fetch full compliance report from IPFS
        ipfs.get(ipfsContentHash) → full JSON report
        - Detailed check results
        - Timestamp proof
        - Jurisdiction rules applied
        - Identity credential hashes (not raw PII)
        |
        v
Step 5: Verification complete
        The verifier now has cryptographic proof that:
        - FlowLink screened this payment at timestamp T
        - Against sanctions lists X, Y, Z
        - With AML risk score R
        - Travel Rule was satisfied
        - The receipt has not been revoked
```

### 7.2 TypeScript: Verification Implementation

```typescript
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";
const PROOFLINK_REGISTRY_ADDRESS = "0x<deployed-registry-address>";
const PROOFLINK_SCHEMA_UID = "0x<registered-schema-uid>";

interface VerificationResult {
  valid: boolean;
  reason?: string;
  receipt?: DecodedReceipt;
}

interface DecodedReceipt {
  receiptId: string;
  paymentTxHash: string;
  chainId: bigint;
  payer: string;
  payee: string;
  amount: bigint;
  token: string;
  ipfsContentHash: string;
  riskScore: number;
  sanctionsFlags: number;
  travelRuleCompliant: boolean;
  flowType: number;
  agentIdHash: string;
  attestedAt: bigint; // unix timestamp
  attester: string;
}

async function verifyComplianceReceipt(
  provider: ethers.Provider,
  attestationUID: string,
  options?: {
    maxAcceptableRiskScore?: number;
    requireTravelRule?: boolean;
  }
): Promise<VerificationResult> {
  const eas = new EAS(EAS_ADDRESS);
  eas.connect(provider);

  // Step 1: Fetch attestation from EAS
  const attestation = await eas.getAttestation(attestationUID);

  // Step 2: Validate attestation metadata
  if (attestation.schema !== PROOFLINK_SCHEMA_UID) {
    return { valid: false, reason: "Schema mismatch: not a ProofLink receipt" };
  }

  if (attestation.attester.toLowerCase() !== PROOFLINK_REGISTRY_ADDRESS.toLowerCase()) {
    return { valid: false, reason: "Untrusted attester: not ProofLinkRegistry" };
  }

  if (attestation.revocationTime !== 0n) {
    return { valid: false, reason: `Receipt revoked at ${attestation.revocationTime}` };
  }

  // Step 3: Decode attestation data
  const schemaEncoder = new SchemaEncoder(
    "bytes32 receiptId, bytes32 paymentTxHash, uint64 chainId, " +
    "address payer, address payee, uint128 amount, address token, " +
    "bytes32 ipfsContentHash, uint8 riskScore, uint16 sanctionsFlags, " +
    "bool travelRuleCompliant, uint8 flowType, bytes32 agentIdHash"
  );

  const decoded = schemaEncoder.decodeData(attestation.data);
  const receipt: DecodedReceipt = {
    receiptId: decoded[0].value.value as string,
    paymentTxHash: decoded[1].value.value as string,
    chainId: decoded[2].value.value as bigint,
    payer: decoded[3].value.value as string,
    payee: decoded[4].value.value as string,
    amount: decoded[5].value.value as bigint,
    token: decoded[6].value.value as string,
    ipfsContentHash: decoded[7].value.value as string,
    riskScore: Number(decoded[8].value.value),
    sanctionsFlags: Number(decoded[9].value.value),
    travelRuleCompliant: decoded[10].value.value as boolean,
    flowType: Number(decoded[11].value.value),
    agentIdHash: decoded[12].value.value as string,
    attestedAt: attestation.time,
    attester: attestation.attester,
  };

  // Step 4: Business logic validation
  const maxRisk = options?.maxAcceptableRiskScore ?? 50;
  if (receipt.riskScore > maxRisk) {
    return {
      valid: false,
      reason: `Risk score ${receipt.riskScore} exceeds threshold ${maxRisk}`,
      receipt,
    };
  }

  // Check sanctions match bits (bits 8-11)
  const sanctionsMatched = (receipt.sanctionsFlags >> 8) & 0x0F;
  if (sanctionsMatched !== 0) {
    return {
      valid: false,
      reason: `Sanctions match detected: flags=0x${receipt.sanctionsFlags.toString(16)}`,
      receipt,
    };
  }

  if (options?.requireTravelRule && !receipt.travelRuleCompliant) {
    return {
      valid: false,
      reason: "Travel Rule compliance required but not satisfied",
      receipt,
    };
  }

  return { valid: true, receipt };
}
```

### 7.3 Solidity: On-Chain Verification (for Smart Contracts)

Other smart contracts (e.g., `FlowLinkFacilitator`, escrow contracts, DeFi protocols) can verify compliance on-chain:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS, Attestation} from
    "@ethereum-attestation-service/eas-contracts/IEAS.sol";

/// @title ProofLinkVerifier
/// @notice Library for verifying ProofLink compliance receipts on-chain.
library ProofLinkVerifier {

    error InvalidAttestation();
    error RevokedAttestation();
    error SanctionsMatch();
    error RiskTooHigh();
    error TravelRuleNotCompliant();

    struct VerifiedReceipt {
        bytes32 receiptId;
        bytes32 paymentTxHash;
        uint8 riskScore;
        uint16 sanctionsFlags;
        bool travelRuleCompliant;
        uint8 flowType;
    }

    /// @notice Verify a ProofLink attestation and extract key fields.
    /// @param eas The EAS contract.
    /// @param attestationUID The EAS attestation UID.
    /// @param expectedSchema The ProofLink schema UID.
    /// @param trustedAttester The ProofLinkRegistry contract address.
    /// @param maxRiskScore Maximum acceptable risk score.
    function verify(
        IEAS eas,
        bytes32 attestationUID,
        bytes32 expectedSchema,
        address trustedAttester,
        uint8 maxRiskScore
    ) internal view returns (VerifiedReceipt memory) {
        Attestation memory att = eas.getAttestation(attestationUID);

        if (att.schema != expectedSchema) revert InvalidAttestation();
        if (att.attester != trustedAttester) revert InvalidAttestation();
        if (att.revocationTime != 0) revert RevokedAttestation();

        // Decode specific fields from ABI-encoded data
        // Field offsets (each ABI-encoded field = 32 bytes):
        //  0: receiptId        (offset 0)
        //  1: paymentTxHash    (offset 32)
        //  8: riskScore        (offset 256)
        //  9: sanctionsFlags   (offset 288)
        // 10: travelRuleCompliant (offset 320)
        // 11: flowType         (offset 352)

        bytes memory data = att.data;
        bytes32 receiptId;
        bytes32 paymentTxHash;
        uint8 riskScore;
        uint16 sanctionsFlags;
        bool travelRuleCompliant;
        uint8 flowType;

        assembly {
            let ptr := add(data, 32) // skip bytes length prefix
            receiptId := mload(ptr)
            paymentTxHash := mload(add(ptr, 32))
            riskScore := byte(31, mload(add(ptr, 256)))
            sanctionsFlags := and(mload(add(ptr, 288)), 0xFFFF)
            travelRuleCompliant := and(mload(add(ptr, 320)), 0x01)
            flowType := byte(31, mload(add(ptr, 352)))
        }

        // Validate
        if (riskScore > maxRiskScore) revert RiskTooHigh();
        if ((sanctionsFlags >> 8) & 0x0F != 0) revert SanctionsMatch();

        return VerifiedReceipt({
            receiptId: receiptId,
            paymentTxHash: paymentTxHash,
            riskScore: riskScore,
            sanctionsFlags: sanctionsFlags,
            travelRuleCompliant: travelRuleCompliant,
            flowType: flowType
        });
    }
}
```

---

## 8. Privacy Architecture

### 8.1 What Is Public (On-Chain Attestation Data)

| Field | Visibility | Privacy Consideration |
|-------|------------|----------------------|
| `receiptId` | Public | Pseudonymous — derived from tx hash + chain + timestamp |
| `paymentTxHash` | Public | Already public on the settlement chain |
| `chainId` | Public | No privacy concern |
| `payer` | Public | Wallet address, already public on-chain |
| `payee` | Public | Wallet address, already public on-chain |
| `amount` | Public | Already public on-chain (USDC transfers are visible) |
| `token` | Public | No privacy concern |
| `ipfsContentHash` | Public | Hash only; content is access-gated (see below) |
| `riskScore` | Public | Aggregate score only; no breakdown of contributing factors |
| `sanctionsFlags` | Public | Which lists were checked; NOT the identities checked against |
| `travelRuleCompliant` | Public | Boolean only; no IVMS101 payload on-chain |
| `flowType` | Public | General category, not identifying |
| `agentIdHash` | Public | Hash of agent DID + tokenId; not reversible without knowing both inputs |

### 8.2 What Is Private (IPFS Compliance Report, Encrypted)

The full compliance report stored on IPFS contains detailed information that must be access-controlled:

```json
{
  "version": "1.0",
  "receiptId": "0xabc...",
  "timestamp": "2026-03-20T14:30:00Z",
  "proofLinkEngineVersion": "1.0.0",

  "identityResolution": {
    "senderType": "agent",
    "senderDID": "did:ethr:0x...",
    "senderERC8004": "erc8004:8453:0x...:42",
    "senderPrincipalEntityHash": "0x...",
    "senderKYACredentialHash": "0x...",
    "receiverType": "human",
    "receiverEntityHash": "0x..."
  },

  "sanctionsScreening": {
    "provider": "chainalysis",
    "timestamp": "2026-03-20T14:30:00.123Z",
    "listsChecked": ["OFAC_SDN", "EU_CONSOLIDATED", "UN_CONSOLIDATED", "UK_HMT"],
    "senderResult": "CLEAR",
    "receiverResult": "CLEAR",
    "entityScreenResult": "CLEAR"
  },

  "amlScoring": {
    "provider": "flowlink_behavioral",
    "compositeScore": 12,
    "velocityScore": 5,
    "destinationRiskScore": 8,
    "amountAnomalyScore": 3,
    "threshold": 50
  },

  "travelRule": {
    "applicable": true,
    "jurisdiction": "US",
    "threshold": 3000,
    "transactionAmount": 15000,
    "transmissionProvider": "notabene",
    "transmissionId": "nb_tx_abc123",
    "status": "TRANSMITTED_ACKED",
    "counterpartyVASP": "counterparty.vasp.id"
  },

  "jurisdictionalRules": {
    "applied": ["US_BSA", "EU_MICA"],
    "stablecoinAuthorized": true,
    "issuerCompliant": true
  }
}
```

### 8.3 IPFS Content Access Control

The IPFS content is **encrypted** before pinning. Access is controlled via:

1. **Encryption:** The JSON report is encrypted with AES-256-GCM. The encryption key is derived from `HKDF(FlowLink_master_key, receiptId)`.
2. **Key distribution:** Decryption keys are shared via the FlowLink API with authorized parties: the payer, the payee, and any party the payer/payee explicitly grants access to (auditors, regulators).
3. **Selective disclosure:** For regulatory requests, FlowLink can provide the decryption key for a specific receipt without exposing all receipts.
4. **Future enhancement:** Replace centralized key management with Lit Protocol or Threshold Network for decentralized access control. This eliminates FlowLink as a single point of trust for IPFS content access.

### 8.4 Merkle Tree for Selective Disclosure

For advanced privacy (Phase 3), use the EAS SDK's built-in `PrivateData` Merkle tree:

```typescript
import { MerkleValue, PrivateData } from "@ethereum-attestation-service/eas-sdk";

// Store all receipt fields as Merkle leaves
const values: MerkleValue[] = [
  { type: "bytes32", name: "receiptId", value: receipt.receiptId },
  { type: "bytes32", name: "paymentTxHash", value: receipt.paymentTxHash },
  { type: "uint64", name: "chainId", value: receipt.chainId },
  { type: "address", name: "payer", value: receipt.payer },
  { type: "address", name: "payee", value: receipt.payee },
  { type: "uint128", name: "amount", value: receipt.amount },
  { type: "address", name: "token", value: receipt.token },
  { type: "bytes32", name: "ipfsContentHash", value: receipt.ipfsContentHash },
  { type: "uint8", name: "riskScore", value: receipt.riskScore },
  { type: "uint16", name: "sanctionsFlags", value: receipt.sanctionsFlags },
  { type: "bool", name: "travelRuleCompliant", value: receipt.travelRuleCompliant },
  { type: "uint8", name: "flowType", value: receipt.flowType },
  { type: "bytes32", name: "agentIdHash", value: receipt.agentIdHash },
];

const privateData = new PrivateData(values);
const fullTree = privateData.getFullTree();

// On-chain: only store the Merkle root
// Schema for private attestation: "bytes32 privateData"
// The Merkle root commits to all 13 fields without revealing any

// Selective disclosure: prove sanctions compliance without revealing amount
const proof = privateData.generateMultiProof([8, 9, 10]); // riskScore, sanctionsFlags, travelRule
// Verifier can check these 3 fields are part of the committed Merkle root
const isValid = PrivateData.verifyMultiProof(fullTree.root, proof);
```

This enables a verifier to confirm "sanctions screening passed and risk score is below threshold" without learning the payment amount, payer, or payee.

---

## 9. Gas Cost Analysis

### 9.1 Detailed Estimates (Base Mainnet)

Base L2 gas costs consist of: (1) L2 execution gas, and (2) L1 data availability gas (for calldata posted to Ethereum). Post-EIP-4844 (blobs), the L1 DA cost is minimal.

| Operation | L2 Execution Gas | Estimated L1 DA Gas | Total Gas | Cost at 0.005 gwei | Cost at 0.05 gwei |
|-----------|-----------------|--------------------|-----------|--------------------|-------------------|
| Schema registration (one-time) | ~200,000 | ~50,000 | ~250,000 | $0.0005 | $0.005 |
| Single attestation (via EAS.attest) | ~95,000 | ~25,000 | ~120,000 | $0.0002 | $0.002 |
| Single attestation (via ProofLinkRegistry.anchorReceipt) | ~130,000 | ~30,000 | ~160,000 | $0.0003 | $0.003 |
| Batch 10 attestations (multiAttest) | ~500,000 | ~150,000 | ~650,000 | $0.001 | $0.013 |
| Batch 50 attestations (multiAttest) | ~2,200,000 | ~600,000 | ~2,800,000 | $0.006 | $0.056 |
| Off-chain timestamp only | ~45,000 | ~10,000 | ~55,000 | $0.0001 | $0.001 |
| Revocation | ~50,000 | ~12,000 | ~62,000 | $0.00015 | $0.0015 |

### 9.2 Cost Per Payment at Scale

| Monthly Volume | Strategy | Estimated Monthly Gas Cost |
|---------------|----------|--------------------------|
| 1,000 payments | All on-chain, individual | ~$0.30 |
| 10,000 payments | Hybrid (>$10K on-chain, rest off-chain+timestamp) | ~$1.50 |
| 100,000 payments | Hybrid + batching (batches of 50) | ~$12 |
| 1,000,000 payments | Off-chain + daily batch summaries | ~$50 |

**Conclusion:** Gas costs on Base are negligible relative to FlowLink's transaction fee revenue. Even at 1M payments/month, gas costs are <$100 — a rounding error against $5K-$300K monthly transaction fee revenue at that volume.

---

## 10. Example Attestations

### 10.1 H2H (Human-to-Human) — Phase 1

**Scenario:** A US-based SaaS company pays a German supplier $25,000 USDC for quarterly software licensing via x402 on Base.

```typescript
const h2hReceipt: ComplianceReceiptData = {
  receiptId: "0x7a8b...c3d4",       // keccak256(txHash, 8453, 1710936600)
  paymentTxHash: "0xdef1...4567",    // Base USDC transfer tx
  chainId: 8453n,                     // Base mainnet
  payer: "0xA1b2...C3d4",           // US company treasury wallet
  payee: "0xE5f6...G7h8",           // German supplier wallet
  amount: 25000000000n,              // 25,000 USDC (6 decimals)
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  ipfsContentHash: "0xf4a2...b8c1",  // SHA-256 of encrypted compliance report
  riskScore: 8,                       // Very low risk — known counterparties
  sanctionsFlags: 0x000F,            // All 4 lists screened, no matches
  travelRuleCompliant: true,          // US threshold $3K; $25K > $3K; transmitted
  flowType: 0,                        // H2H
  agentIdHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  // No agent involved
};

// Attestation type: ON-CHAIN (amount > $10,000)
// Attester: ProofLinkRegistry on Base
// Recipient (EAS): payee address (German supplier)
```

### 10.2 H2A (Human-to-Agent) — Phase 2

**Scenario:** A company's procurement agent (ERC-8004 registered) pays $3,500 USDC to an API provider's service agent for 1M inference calls via x402.

```typescript
const h2aReceipt: ComplianceReceiptData = {
  receiptId: "0x9c1d...e2f3",
  paymentTxHash: "0xabc9...8765",
  chainId: 8453n,
  payer: "0xB2c3...D4e5",           // Company treasury (human-controlled)
  payee: "0xF6g7...H8i9",           // API provider agent wallet
  amount: 3500000000n,               // 3,500 USDC
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ipfsContentHash: "0xe5b3...a9d2",
  riskScore: 15,                      // Low risk; agent is KYA-verified
  sanctionsFlags: 0x000F,            // All lists screened, clear
  travelRuleCompliant: true,          // US threshold $3K; $3.5K triggered
  flowType: 1,                        // H2A
  agentIdHash: "0x4d5e...6f7a",      // keccak256(agentDID, erc8004TokenId) of payee agent
};

// Attestation type: ON-CHAIN (regulatory-sensitive, first H2A payment with this agent)
// IPFS report additionally contains:
//   - Agent KYA credential verification result
//   - Agent ERC-8004 registry lookup result
//   - Principal entity (API provider company) KYB verification
//   - Agent delegation scope: maxTransactionValue, allowedCounterparties
```

### 10.3 A2A (Agent-to-Agent) — Phase 3

**Scenario:** A data analysis agent (Agent A) hires a data cleaning agent (Agent B) for $45 USDC to process a dataset. Payment via x402, settled on Base.

```typescript
const a2aReceipt: ComplianceReceiptData = {
  receiptId: "0x1a2b...3c4d",
  paymentTxHash: "0x5678...9abc",
  chainId: 8453n,
  payer: "0xC3d4...E5f6",           // Agent A's wallet
  payee: "0xG7h8...I9j0",           // Agent B's wallet
  amount: 45000000n,                 // 45 USDC
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ipfsContentHash: "0xd6c4...b8e3",
  riskScore: 22,                     // Moderate; A2A has higher baseline risk
  sanctionsFlags: 0x000F,
  travelRuleCompliant: true,         // US: $45 < $3K threshold, so not required = compliant
  flowType: 3,                       // A2A
  agentIdHash: "0x8e9f...0a1b",     // keccak256(agentA_DID, agentA_erc8004TokenId)
  // Note: agentIdHash covers the payer agent; payee agent is identifiable via payee address
};

// Attestation type: ON-CHAIN (A2A always on-chain for composability)
// Other contracts (ERC-8183 escrow, FlowLinkFacilitator) can query this
// attestation to verify compliance before releasing escrowed funds.
//
// IPFS report additionally contains:
//   - Both agents' KYA credentials
//   - Both agents' principal entity hashes
//   - Agent A delegation scope verification
//   - Agent B service capability verification
//   - Cross-agent velocity check (how many A2A txs in last hour)
```

---

## 11. Integration with ProofLink Engine

### 11.1 Architecture Positioning

```
ProofLink Engine (compliance pipeline)
        |
        | ComplianceDecision
        v
ComplianceReceiptIssuer (new service)
        |
        |-- Constructs receipt data
        |-- Uploads encrypted JSON to IPFS (Pinata / web3.storage)
        |-- Evaluates on-chain vs off-chain decision
        |-- Calls ProofLinkRegistry.anchorReceipt() [on-chain]
        |   OR signs off-chain attestation [off-chain]
        |-- Stores receipt metadata in PostgreSQL
        |-- Returns receipt to caller
        |
        v
API Gateway returns receipt with payment response
```

### 11.2 Service Interface

```typescript
interface ComplianceReceiptIssuer {
  /**
   * Issue a compliance receipt for a completed payment.
   * Called by ProofLink Engine after a PASS decision.
   */
  issueReceipt(params: {
    decision: ComplianceDecision;
    paymentTxHash: string;
    chainId: number;
    payer: string;
    payee: string;
    amount: bigint;
    token: string;
    flowType: FlowType;
    agentDID?: string;       // if agent involved
    erc8004TokenId?: bigint; // if agent involved
  }): Promise<ComplianceReceipt>;

  /**
   * Issue receipts for a batch of micropayments (e.g., x402 session close).
   */
  issueReceiptBatch(params: BatchReceiptParams[]): Promise<ComplianceReceipt[]>;

  /**
   * Revoke a previously issued receipt.
   */
  revokeReceipt(receiptId: string, reason: string): Promise<void>;

  /**
   * Verify a receipt (delegates to on-chain or off-chain verification).
   */
  verifyReceipt(
    attestationUID: string,
    options?: VerificationOptions
  ): Promise<VerificationResult>;
}

interface ComplianceReceipt {
  receiptId: string;
  easAttestationUID?: string;  // present for on-chain attestations
  offchainAttestation?: object; // present for off-chain attestations
  ipfsCID: string;
  attestationType: "on-chain" | "off-chain" | "off-chain-timestamped";
  timestamp: string;           // ISO-8601
}

enum FlowType {
  H2H = 0,
  H2A = 1,
  A2H = 2,
  A2A = 3,
}
```

### 11.3 Backend Integration (Express/Fastify Route Handler)

```typescript
import { ethers } from "ethers";
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";

// Called after ProofLink Engine returns APPROVED
async function handlePaymentApproved(
  decision: ComplianceDecision,
  paymentContext: PaymentContext
): Promise<ComplianceReceipt> {
  const receiptIssuer = container.resolve(ComplianceReceiptIssuer);

  const receipt = await receiptIssuer.issueReceipt({
    decision,
    paymentTxHash: paymentContext.txHash,
    chainId: paymentContext.chainId,
    payer: paymentContext.payer,
    payee: paymentContext.payee,
    amount: paymentContext.amount,
    token: paymentContext.token,
    flowType: paymentContext.flowType,
    agentDID: paymentContext.agentDID,
    erc8004TokenId: paymentContext.erc8004TokenId,
  });

  // Store in audit log
  await db.complianceReceipts.insert({
    receipt_id: receipt.receiptId,
    eas_uid: receipt.easAttestationUID,
    ipfs_cid: receipt.ipfsCID,
    attestation_type: receipt.attestationType,
    payment_tx_hash: paymentContext.txHash,
    chain_id: paymentContext.chainId,
    payer: paymentContext.payer,
    payee: paymentContext.payee,
    amount: paymentContext.amount.toString(),
    risk_score: decision.riskScore,
    flow_type: paymentContext.flowType,
    created_at: new Date(),
  });

  return receipt;
}
```

### 11.4 PostgreSQL Schema for Receipt Audit Log

```sql
CREATE TABLE compliance_receipts (
    receipt_id         BYTEA PRIMARY KEY,           -- bytes32
    eas_uid            BYTEA,                       -- bytes32, nullable for off-chain
    ipfs_cid           TEXT NOT NULL,                -- IPFS CIDv1 string
    attestation_type   TEXT NOT NULL CHECK (attestation_type IN ('on-chain', 'off-chain', 'off-chain-timestamped')),
    payment_tx_hash    BYTEA NOT NULL,
    chain_id           BIGINT NOT NULL,
    payer              BYTEA NOT NULL,               -- 20 bytes
    payee              BYTEA NOT NULL,               -- 20 bytes
    amount             NUMERIC(78, 0) NOT NULL,      -- uint256 range
    token              BYTEA NOT NULL,               -- 20 bytes
    risk_score         SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    sanctions_flags    SMALLINT NOT NULL,
    travel_rule_compliant BOOLEAN NOT NULL,
    flow_type          SMALLINT NOT NULL CHECK (flow_type BETWEEN 0 AND 3),
    agent_id_hash      BYTEA,                        -- nullable for H2H
    revoked            BOOLEAN NOT NULL DEFAULT FALSE,
    revocation_reason  TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ
);

CREATE INDEX idx_receipts_payment_tx ON compliance_receipts(payment_tx_hash);
CREATE INDEX idx_receipts_payer ON compliance_receipts(payer);
CREATE INDEX idx_receipts_payee ON compliance_receipts(payee);
CREATE INDEX idx_receipts_created ON compliance_receipts(created_at);
CREATE INDEX idx_receipts_flow_type ON compliance_receipts(flow_type);
```

---

## 12. Deployment Sequence

### Phase 1: Testnet (Week 1-2)

1. Deploy `ProofLinkResolver` on Base Sepolia
2. Deploy `ProofLinkRegistry` (UUPS proxy) on Base Sepolia
3. Call `registerSchema()` to register the ProofLink schema on EAS (Base Sepolia)
4. Record the schema UID
5. Create 10 test attestations (mix of H2H, H2A, A2A)
6. Verify all attestations via the TypeScript verification flow
7. Test revocation flow
8. Test batch attestation (10 and 50 receipts)
9. Measure actual gas costs on Base Sepolia

**Acceptance criteria:** All 13 fields correctly encoded/decoded, verification passes, revocation works, batch attestation succeeds.

### Phase 2: IPFS + Privacy (Week 3-4)

1. Implement encrypted IPFS upload (Pinata SDK + AES-256-GCM)
2. Implement key derivation (`HKDF(master_key, receiptId)`)
3. Implement key distribution API (`GET /receipts/:id/key` with auth)
4. Test full flow: compliance decision -> IPFS upload -> on-chain attestation -> off-chain verification with IPFS content fetch

**Acceptance criteria:** Full compliance report retrievable and decryptable by authorized parties only.

### Phase 3: Mainnet + Backend Integration (Week 5-6)

1. Deploy `ProofLinkResolver` and `ProofLinkRegistry` on Base Mainnet
2. Register schema on Base Mainnet EAS
3. Integrate `ComplianceReceiptIssuer` into ProofLink Engine pipeline
4. Implement hybrid on-chain/off-chain decision logic
5. Implement batch aggregation worker (for micropayment daily summaries)
6. Load test: 1,000 attestations in 1 hour

**Acceptance criteria:** End-to-end flow works on mainnet, gas costs match estimates, latency within 100ms budget for receipt issuance.

### Phase 4: Selective Disclosure (Week 7-8, Phase 3 feature)

1. Implement Merkle tree-based private attestations
2. Build selective disclosure API (`POST /receipts/:id/disclose` with field selection)
3. Implement proof generation and verification
4. Document third-party verification flow with selective disclosure

**Acceptance criteria:** Verifier can confirm sanctions compliance without learning payment amount.

---

## 13. Open Questions

1. **Schema versioning.** EAS schemas are immutable once registered. If we need to add fields (e.g., new sanctions lists, new flow types), we must register a new schema. **Recommendation:** Add a `uint8 schemaVersion` field (14th field) to enable the resolver to handle versioned data. **Deferred decision:** Is version-in-schema sufficient, or do we need a schema migration strategy with linked attestations?

2. **Multi-chain attestations.** If a payment settles on Ethereum L1 but compliance receipt is anchored on Base, do we need cross-chain verification? **Recommendation:** Attestations always live on Base (cheapest, EAS predeployed). Verifiers on other chains use a cross-chain read via LayerZero or Hyperlane. Build this when demand materializes.

3. **Resolver upgrade path.** The `ProofLinkResolver` is immutable (not upgradeable, since EAS resolvers are set at schema registration). If resolver logic needs to change, a new schema must be registered. **Recommendation:** Keep resolver logic minimal (only attester allowlist + riskScore validation). Complex validation belongs in the `ProofLinkRegistry` contract, which is UUPS-upgradeable.

4. **IPFS pinning guarantees.** If Pinata goes down or drops pins, the compliance report becomes unavailable. **Recommendation:** Pin on both Pinata and web3.storage (Filecoin-backed). Add a self-hosted IPFS node as fallback. The on-chain attestation remains valid regardless of IPFS availability — the IPFS content is supplementary detail, not the proof itself.

5. **Regulatory acceptance.** Will regulators accept an EAS attestation as proof of compliance? **Recommendation:** The enterprise-facing product surfaces a PDF compliance certificate (human-readable). The EAS attestation is the underlying cryptographic proof. Frame it as: "The receipt is digitally signed and verifiable on a public blockchain" — do not lead with "EAS" in enterprise sales conversations. Regulators care about the properties (tamper-evident, timestamped, independently verifiable), not the protocol name.

---

*Architecture designed March 20, 2026. Implementation target: 6-8 weeks to mainnet.*
