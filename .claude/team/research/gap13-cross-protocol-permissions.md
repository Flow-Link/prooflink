# GAP-13: Cross-Protocol Permission Translation for AI Agent Payments

**Classification:** Architecture Research | Protocol Standards
**Date:** March 2026
**Severity:** Critical (addresses Master Gap A15, A5, B5, D7, D12)
**FlowLink Relevance:** Core infrastructure — the permission translation layer is FlowLink's primary differentiation surface

---

## 1. EXECUTIVE SUMMARY

Six distinct permission and authorization systems are now operational or near-ratified in the AI agent payment space: x402 (Coinbase), AP2 (Google), MPP (Stripe/Tempo), ACP (OpenAI/Stripe), ERC-7715 (Ethereum wallet permissions), and ERC-7710 (smart contract delegation). None of them speak the same permission language. An agent authorized under AP2's Intent Mandate cannot express that authorization in x402's EIP-3009 header. A session opened via MPP carries spending constraints that have no equivalent in ACP's vault tokens. A sub-delegation chain created with ERC-7710 caveats is invisible to AP2's mandate verifier.

The IETF draft-klrc-aiagent-auth-00 (published March 2026) defines the identity composition layer (WIMSE + SPIFFE + OAuth 2.0) but explicitly does not define payment-specific authorization patterns — that gap is unaddressed in any standard as of this writing.

FlowLink is positioned to be the canonical cross-protocol permission translation layer. This document provides the technical specification of each protocol's permission model and a concrete implementation design for a `PermissionTranslator` service that FlowLink can ship.

---

## 2. PROTOCOL-BY-PROTOCOL ANALYSIS

### 2.1 x402 (Coinbase) — Cryptographic Payment Authorization

**Protocol identity:** HTTP-native payment standard, revives HTTP 402. Currently at v1 (EVM-only), v2 launched December 2025 with multi-chain and wallet identity extensions.

#### Permission Format

x402 does not have a permission system in the conventional sense. Authorization is expressed as a cryptographic payment proof embedded in the `X-PAYMENT` HTTP header. The payload is base64-encoded JSON:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base-mainnet",
  "payload": {
    "signature": "0x<EIP-712-signature>",
    "authorization": {
      "from": "0x<payer-address>",
      "to":   "0x<recipient-address>",
      "value": "1000000",
      "validAfter":  "1740672089",
      "validBefore": "1740672389",
      "nonce": "0x<random-32-bytes>"
    }
  }
}
```

The `authorization` object is an EIP-3009 `TransferWithAuthorization` struct. The `signature` is an EIP-712 signature over this struct using the payer's wallet key.

The server declares payment requirements in a `402` response body:

```json
{
  "scheme": "exact",
  "network": "base-mainnet",
  "maxAmountRequired": "1000000",
  "payTo": "0x<merchant-address>",
  "asset": "0x<USDC-contract-address>",
  "resource": "/api/premium-data",
  "description": "Premium data access"
}
```

#### Scope Definition

x402 has no explicit scope. The only constraint is the payment amount (`value`) and the recipient (`to`). There is no concept of "what resource this payment unlocks" at the cryptographic level — that is entirely application-layer convention. The `resource` field in `PaymentRequirements` is informational only.

#### Expiry Mechanism

Two timestamp fields in the EIP-3009 authorization:
- `validAfter`: Unix timestamp (seconds) — earliest the facilitator may submit the on-chain transfer
- `validBefore`: Unix timestamp (seconds) — hard expiry, typically set ~5 minutes from signing

The facilitator enforces expiry by checking these fields before calling `transferWithAuthorization` on-chain. The Coinbase facilitator defaults to a 300-second window.

#### Revocation Model

x402 has **no native revocation**. The authorization is a one-shot nonce — once the EIP-3009 nonce is consumed on-chain (the facilitator calls `transferWithAuthorization`), it cannot be replayed (the contract tracks used nonces via `mapping(address => mapping(bytes32 => bool))`).

Revocation before execution is only possible by:
1. Calling `cancelAuthorization` on the ERC-3009 token contract (USDC supports this; not all tokens do)
2. Waiting for `validBefore` to expire naturally

**Critical gap:** If the facilitator is compromised or the signed payload leaks between signing and the `validBefore` window, there is no emergency revocation path.

#### Facilitator Model

The facilitator is a trusted intermediary that:
1. Receives the `X-PAYMENT` payload via the server (server relays from client)
2. Calls `verify(paymentPayload, requirements)` — checks signature, balance, nonce freshness, expiry
3. Calls `settle(paymentPayload, requirements)` — submits `transferWithAuthorization` on-chain, pays gas

The facilitator never holds funds. It cannot modify `to` or `value` — the signature covers those fields. Coinbase operates the canonical facilitator; ChaosChain runs a decentralized alternative.

---

### 2.2 AP2 (Google Agent Payments Protocol) — Mandate-Based Delegation

**Protocol identity:** Enterprise-grade authorization framework. Open standard developed with 60+ partners (Adyen, Mastercard, PayPal, Revolut, Coinbase). Schema version 2025.0. Cryptographic core: ECDSA P-256.

#### Permission Format

AP2 uses three signed JSON blobs called "mandates" — Verifiable Digital Credentials (VDCs) that are tamper-evident, non-disputable, and cryptographically signed.

**Intent Mandate** (human-not-present scenario):
```json
{
  "schema_version": "2025.0",
  "mandate_type": "intent",
  "mandate_id": "<uuid>",
  "payer": {
    "identity": "<agent-DID-or-user-DID>",
    "credential_provider": "<issuer-endpoint>"
  },
  "payee": {
    "merchant_id": "<merchant-identifier>"
  },
  "shopping_intent": {
    "categories": ["data_api", "news"],
    "max_amount": { "value": "10.00", "currency": "USD" },
    "allowed_skus": ["*"]
  },
  "chargeable_payment_methods": ["<tokenized-method-ref>"],
  "intent_expiry": "2026-06-01T00:00:00Z",
  "risk_payload": { "device_attestation": "<attestation-blob>" },
  "user_signature": "eyJhbGci...",
  "timestamp": "2026-03-25T10:00:00Z"
}
```

**Cart Mandate** (human-present, specific cart):
```json
{
  "schema_version": "2025.0",
  "mandate_type": "cart",
  "mandate_id": "<uuid>",
  "payer": { "identity": "<DID>", "credential_provider": "<endpoint>" },
  "payee": { "merchant_id": "<id>", "merchant_agent": "<agent-DID>" },
  "transaction_details": {
    "items": [{ "sku": "SKU-123", "quantity": 1, "unit_price": "9.99" }],
    "total": { "value": "9.99", "currency": "USD" }
  },
  "payment_method": { "token": "<tokenized-card-or-stablecoin-ref>" },
  "refund_period": "P30D",
  "merchant_signature": "eyJhbGci...",
  "user_signature": "eyJhbGci...",
  "timestamp": "2026-03-25T10:00:00Z"
}
```

**Payment Mandate** (for the payments network/issuer):
```json
{
  "payment_mandate_contents": {
    "payment_mandate_id": "<uuid>",
    "payment_details_id": "<cart-mandate-id>",
    "payment_details_total": {
      "currency": "USD",
      "value": "9.99",
      "refund_period": "P30D"
    },
    "payment_response": {
      "request_id": "<uuid>",
      "method_name": "basic-card",
      "details": { "token": "<network-token>" }
    },
    "merchant_agent": "<agent-DID>",
    "timestamp": "2026-03-25T10:00:00Z",
    "user_authorization": "eyJhbGciOiJFUzI1NksiLCJraWQiOiJkaWQ6ZXhhbXBsZ..."
  }
}
```

#### Scope Definition

AP2 encodes scope at multiple levels:
- **Intent Mandate scope:** `shopping_intent.categories`, `max_amount`, `allowed_skus`, `intent_expiry`
- **Cart Mandate scope:** Exact items, exact total — narrow, non-fungible
- **Payment Mandate scope:** Specific transaction reference only

The agent cannot exceed the Intent Mandate's `max_amount`. The Cart Mandate binds to a single, specific payment method — no substitution. Merchants sign the Cart Mandate before the user, guaranteeing fulfillment commitment before payment authorization.

#### Expiry Mechanism

- `intent_expiry` field: ISO-8601 timestamp in Intent Mandate
- Cart and Payment Mandates are implicitly single-use (tied to a specific `payment_details_id`)
- No separate TTL fields in Cart/Payment Mandates — expiry derives from the cart session context

#### Revocation Model

AP2 v0.1 has **no explicit on-demand revocation mechanism**. Revocation paths:
1. TTL expiry — Intent Mandate expires at `intent_expiry`
2. Challenge mechanism — "any party (issuer, credential provider, merchant) may challenge the transaction" during the flow
3. Credential provider can refuse to issue a Payment Mandate even if Cart Mandate is valid

The credential provider OAuth2 token endpoint (`tokenUrl` in the Agent Card) is the effective revocation control point — if the CP refuses to issue payment credentials, the mandate chain breaks.

**Critical gap:** An Intent Mandate leaked or stolen between issuance and expiry has no emergency revocation path beyond contacting the credential provider out-of-band.

---

### 2.3 MPP (Stripe/Tempo Machine Payments Protocol) — Session-Based Streaming

**Protocol identity:** Co-authored by Stripe and Tempo. Mainnet launched March 18, 2026. Rail-agnostic: supports USDC on Tempo, fiat via Shared Payment Tokens (SPTs), Bitcoin Lightning. Partners: Anthropic, OpenAI, Shopify, Mastercard, DoorDash, Ramp.

#### Permission Format

The core primitive is the **session** — analogous to OAuth's authorization grant. An agent pre-authorizes a spending ceiling, after which micropayments stream against that session without per-transaction authorization:

```
Authorization: MPP <session-credential>
```

Where `<session-credential>` encodes:
- Session ID (opaque token)
- Spending ceiling (pre-funded amount)
- Payment rails authorized (USDC/Tempo, card/SPT, Lightning)
- Session scope (service endpoint(s))

For SPT (Shared Payment Token) payments, the server side uses:
```typescript
mppx.charge({ amount, currency, decimals, description })(request)
```

For crypto payments via Tempo:
```typescript
tempo.charge({ currency, recipient, testnet })(request)
```

The first request returns HTTP 402 with a challenge; the agent responds with credentials; subsequent requests stream without re-authorization.

#### Scope Definition

Session scope is defined at session creation:
- **Spending limit:** Maximum total the session can consume
- **Service scope:** Which endpoints/services the session credential is valid for
- **Rail scope:** Which payment rails are authorized (USDC, card SPT, etc.)
- **Time scope:** Session expiry

MPP sessions are the closest to OAuth in this space — the spending limit is the `scope`, the session credential is the `access_token`.

#### Expiry Mechanism

Sessions have time-bounded expiry set at creation. The protocol does not publish the exact session token format publicly, but the session model requires pre-funding — when funds are exhausted OR the session timer expires, the session closes. Stripe Radar continuously monitors sessions for fraud signals.

#### Revocation Model

Sessions can be terminated by:
1. Fund exhaustion (spending ceiling reached)
2. Time expiry
3. Merchant revocation via Stripe/Tempo API (session cancellation)
4. Stripe Radar fraud block

Unlike x402 (single nonce) or AP2 (TTL only), MPP sessions are **stateful and actively revocable** — the closest to true OAuth-style token revocation in this space.

---

### 2.4 ACP (OpenAI/Stripe Agentic Commerce Protocol) — Delegated Vault Tokens

**Protocol identity:** Open standard co-maintained by OpenAI and Stripe. Released September 2025, current spec version 2026-01-30. Apache 2.0. Powers ChatGPT Instant Checkout.

#### Permission Format

ACP implements a **Delegated Payment Specification** — OpenAI (or any AI platform) requests a scoped, single-use vault token from a PSP/vault on behalf of the user:

```
POST /agentic_commerce/delegate_payment
Authorization: Bearer <platform-token>
Idempotency-Key: <key>
Request-Id: <id>
Signature: <base64-body-signature>
Timestamp: <RFC3339>
API-Version: 2025-09-29
```

Request body:
```json
{
  "payment_method": {
    "type": "card",
    "card": { "number": "...", "exp_month": 12, "exp_year": 2028, "cvc": "..." }
  },
  "allowance": {
    "reason": "one_time",
    "max_amount": 5000,
    "currency": "usd",
    "merchant_id": "<merchant-id-max-256-chars>",
    "checkout_session_id": "<session-id>"
  },
  "billing_address": { ... },
  "risk_signals": [...],
  "metadata": { "correlation_id": "..." }
}
```

Response (HTTP 201):
```json
{
  "id": "vt_01J8Z3WXYZ9ABC",
  "created": "2026-03-25T10:00:00Z",
  "metadata": { ... }
}
```

The `vt_` prefixed token is a **Shared Payment Token (SPT)** — a delegated vault token constrained by the `allowance` object.

#### Scope Definition

Scope is encoded entirely in the `allowance` object:
- `reason: "one_time"` — single-use only (no reuse, no subscriptions as of v1)
- `max_amount` — ceiling in smallest currency unit (cents for USD)
- `currency` — ISO-4217 lowercase
- `merchant_id` — only this merchant can redeem the token (up to 256 chars)
- `checkout_session_id` — ties token to a specific cart/session

The merchant ID binding is the key security property: a token issued for merchant A cannot be used at merchant B.

#### Expiry Mechanism

`expires_at` field in the token response (RFC 3339 timestamp). Token is single-use and expires at this timestamp regardless of whether it has been used. OpenAI forwards the token to the merchant during the `complete-checkout` API call; the merchant then submits to their PSP.

#### Revocation Model

ACP has **implicit revocation only**:
1. Single-use design — once redeemed, the token is consumed
2. `expires_at` hard cutoff
3. No API for proactive revocation before expiry

There is no `DELETE /agentic_commerce/delegate_payment/{id}` endpoint in the spec. If a transaction must be aborted after token issuance but before redemption, the user or platform must contact the PSP out-of-band.

---

### 2.5 ERC-7715 — Wallet Permission Grants (wallet_grantPermissions)

**Protocol identity:** Ethereum JSON-RPC extension. Status: Draft. Implemented in MetaMask Delegation Toolkit. Integrates with ERC-4337 (account abstraction) and ERC-7679 (UserOp builder).

#### Permission Format

```typescript
// JSON-RPC method
wallet_requestExecutionPermissions(params: PermissionRequest[]): Promise<PermissionResponse[]>

interface PermissionRequest {
  chainId: `0x${string}`;      // Hex-encoded chain ID
  from?: `0x${string}`;        // Optional: specific account to grant from
  to: `0x${string}`;           // Target contract address
  permission: {
    type: string;               // e.g., "erc20-token-allowance", "native-token-allowance"
    isAdjustmentAllowed: boolean;
    data: Record<string, any>; // Permission-type-specific constraints
  };
  rules?: Array<{
    type: string;               // e.g., "expiry"
    data: Record<string, any>;
  }>;
}

interface PermissionResponse extends PermissionRequest {
  context: `0x${string}`;      // Opaque identifier for this permission grant
  dependencies: Array<{
    factory: `0x${string}`;
    factoryData: `0x${string}`;
  }>;
  delegationManager: `0x${string}`;
}
```

Expiry rule:
```json
{
  "type": "expiry",
  "data": { "timestamp": 1772000000 }
}
```

Revocation:
```typescript
wallet_revokeExecutionPermission({ permissionContext: "0x..." })
```

#### Scope Definition

Permission types are extensible (not exhaustively defined in the ERC):
- `"native-token-allowance"` — ETH spending up to a limit
- `"erc20-token-allowance"` — ERC-20 token spending up to a limit
- `"erc721-token-allowance"` — NFT transfer permission
- `"native-token-stream"` — streaming payment permission

Each permission's `data` field contains the constraints specific to that type (e.g., `{ "allowance": "1000000", "token": "0x<USDC>" }` for an ERC-20 allowance).

#### Expiry Mechanism

The `rules` array contains an `"expiry"` rule with a Unix timestamp. The wallet enforces this at the protocol level — after the timestamp, the `permissionContext` becomes invalid and `redeemDelegations` will reject it.

#### Revocation Model

Active revocation via `wallet_revokeExecutionPermission` using the `permissionContext` identifier. This is the strongest revocation model in the group — explicit, on-demand, keyed by an opaque identifier that was returned at grant time. The wallet maintains a state mapping of granted permissions and can disable them immediately.

---

### 2.6 ERC-7710 — Smart Contract Delegation

**Protocol identity:** Ethereum ERC, Draft status. Powers MetaMask Delegation Framework (audited April 2025 by Consensys Diligence). ERC-8004 (Ethereum AI agent registry, mainnet January 2026) builds on this.

#### Permission Format

The `Delegation` struct (from MetaMask's implementation):
```solidity
struct Delegation {
  address delegate;      // Who receives the delegated authority
  address delegator;     // Who is granting the authority
  bytes32 authority;     // Hash of parent delegation, or ROOT_AUTHORITY constant
  Caveat[] caveats;      // Array of enforcement constraints
  uint256 salt;          // Avoids hash collisions for identical delegations
  bytes signature;       // ECDSA signature from delegator account
}

struct Caveat {
  address enforcer;      // Address of the CaveatEnforcer contract
  bytes terms;           // Static terms set at delegation creation
  bytes args;            // Dynamic args provided at redemption time
}
```

`ROOT_AUTHORITY` is a constant (`bytes32(0xfffe...)`) meaning "this is a root grant with no parent delegation."

The singleton `DelegationManager` interface (ERC-7710):
```solidity
function redeemDelegations(
  bytes[] calldata _permissionContexts,  // Encoded delegation chains
  bytes32[] calldata _modes,              // ERC-7579 execution modes
  bytes[] calldata _executionCallData     // What to execute
) external;
```

`_permissionContexts` encodes the full delegation chain as an array — [leaf delegation, ..., root delegation]. The manager validates the chain from leaf to root, checking each signature and enforcing each caveat.

#### Scope Definition

Scope is entirely caveat-defined. Deployed CaveatEnforcer contracts include (from MetaMask's framework):
- `AllowedTargetsEnforcer` — restricts which contract addresses can be called
- `AllowedMethodsEnforcer` — restricts which function selectors can be called
- `ERC20TransferAmountEnforcer` — caps ERC-20 transfer amounts
- `TimestampEnforcer` — enforces time windows
- `NonceEnforcer` — single-use delegations
- `MultiTokenPeriodEnforcer` — periodic spending limits for ETH and ERC-20 tokens (added in April 2025 audit)
- `ValueLteEnforcer` — caps native ETH value per execution

These compose — a delegation can have multiple caveats that all must pass.

#### Expiry Mechanism

Managed by `TimestampEnforcer` caveat:
```solidity
// terms encodes: (uint128 notBefore, uint128 notAfter)
// args: empty (time checked against block.timestamp at redemption)
```

No built-in expiry in the `Delegation` struct itself — all temporal constraints are caveat-delegated.

#### Revocation Model

On-chain revocation via `DelegationManager.disableDelegation(delegation)`:
- Delegator calls `disableDelegation` with the `Delegation` struct
- Manager stores the delegation hash in a `disabledDelegations` mapping
- All subsequent `redeemDelegations` calls for that delegation hash revert

Sub-delegation chains: revoking a parent delegation reverts all children — the authority check traverses the chain and any disabled ancestor invalidates the leaf. This is the strongest revocation model in the on-chain category.

---

### 2.7 IETF draft-klrc-aiagent-auth-00 — Agent Auth Composition Framework

**Published:** March 2, 2026. Authors: Kasselman (Defakto Security), Lombardo (AWS), Rosomakho (Zscaler), Campbell (Ping Identity). Expires September 3, 2026.

#### Model

Composes three existing standards — no new protocols:

1. **WIMSE** (Workload Identity in Multi System Environments): Provides the agent identity layer
   - Each agent gets exactly one WIMSE URI identifier (optionally SPIFFE format: `spiffe://<trust-domain>/<path>`)
   - WIMSE Proof Tokens (WPTs): signed JWTs binding agent authentication to specific message context

2. **SPIFFE**: Operationally mature WIMSE implementation; agent attestation via X.509 SVID or JWT SVID

3. **OAuth 2.0**: Authorization delegation layer on top of WIMSE identity
   - User-to-agent: Authorization Code Grant with interactive approval
   - Agent self-authorization: Client Credentials or JWT Authorization Grant
   - Cross-domain: Identity Assertion JWT Grant preserving `sub` claim

#### Token Binding

- **Transport layer:** mTLS with short-lived workload certificates
- **Application layer:** WPTs (WIMSE Proof Tokens) — signed JWTs with `aud`, `exp`, and hash of WIT credential
- **Transaction-scoped:** "Transaction Tokens" — downscoped credentials bound to a specific transaction, cannot be reused with modified details

#### Payment Gap

The draft explicitly omits payment-specific patterns. It references ACP, AP2, and A2A in normative references but provides no guidance on how WIMSE identity maps to x402 `from` addresses, AP2 mandate `payer.identity`, or ACP `merchant_id`. This is the interoperability gap FlowLink must fill.

---

## 3. COMPARATIVE ANALYSIS

### 3.1 Permission Model Matrix

| Dimension | x402 | AP2 | MPP | ACP | ERC-7715 | ERC-7710 |
|-----------|------|-----|-----|-----|----------|----------|
| **Permission format** | EIP-3009 authorization struct + EIP-712 sig | Signed JSON mandate (ECDSA P-256) | Opaque session credential | Vault token (`vt_` prefix) | JSON-RPC object with `permissionContext` | Solidity `Delegation` struct |
| **Scope granularity** | None (amount + recipient only) | Category + max_amount + SKU list | Spending ceiling + rail + endpoint | Max_amount + merchant_id + session | Per-token-type allowance + custom rules | Composable caveat chain |
| **Expiry mechanism** | `validAfter`/`validBefore` in EIP-3009 (seconds) | `intent_expiry` ISO-8601 timestamp | Session time + fund exhaustion | `expires_at` RFC 3339 | `expiry` rule with Unix timestamp | `TimestampEnforcer` caveat |
| **Revocation model** | None (nonce consumption or `cancelAuthorization`) | TTL expiry + credential provider refusal | Active session cancellation via API | Single-use only + `expires_at` | `wallet_revokeExecutionPermission` (explicit) | `disableDelegation` on-chain (cascades) |
| **Trust root** | ECDSA wallet key | Hardware-backed device key + ECDSA P-256 | Stripe/Tempo custody | PSP/vault + Stripe | Wallet + ERC-4337 account | Smart contract + ECDSA |
| **Multi-agent delegation** | None | None (Intent Mandate is flat) | None native | None | Not specified | Full chain via `authority` field |
| **Revocation cascade** | No | No | Session-level | No | Not specified | Yes (parent revokes children) |
| **On-chain settlement** | Yes (EIP-3009 on-chain) | No (off-chain VDC) | Optional (USDC on Tempo) | No (card rails) | No (off-chain permission record) | Yes (execution via DelegationManager) |
| **Layer in stack** | Settlement | Authorization | Session/Settlement | Checkout/Vault | Wallet permission | Execution permission |

### 3.2 Expiry Precision Comparison

| Protocol | Granularity | Enforcement Point | Configurable? |
|----------|-------------|-------------------|---------------|
| x402 | Seconds (`validBefore` Unix timestamp) | Facilitator (off-chain) + EIP-3009 contract (on-chain) | Yes, per signing |
| AP2 | Seconds (ISO-8601) | Credential provider (off-chain) | Yes, at mandate issuance |
| MPP | Session-level (implementation-defined) | Stripe/Tempo servers | Yes, at session creation |
| ACP | Seconds (RFC 3339 `expires_at`) | PSP vault | Fixed at token issuance |
| ERC-7715 | Seconds (Unix timestamp in rule) | Wallet (off-chain) | Yes, per grant |
| ERC-7710 | Seconds (block.timestamp at redemption) | DelegationManager contract | Yes, per caveat |

### 3.3 Revocation Strength Ranking

1. **ERC-7710** — strongest: on-chain, immediate, cascades through delegation tree
2. **ERC-7715** — strong: explicit JSON-RPC call, wallet maintains revocation state
3. **MPP** — good: active session cancellation via Stripe/Tempo API
4. **x402** — weak: `cancelAuthorization` on ERC-3009 contract (USDC only, not universal), else wait for TTL
5. **AP2** — weak: TTL expiry only, credential provider as informal gate
6. **ACP** — weakest: single-use implicit revocation, no proactive endpoint

---

## 4. TRANSLATION LAYER DESIGN

### 4.1 The Problem

No existing bridge between these six systems. When an agent operating under an AP2 Intent Mandate wants to pay via x402, it must:
1. Extract the max_amount and payment_method from the Intent Mandate
2. Construct an EIP-3009 authorization payload
3. Sign with the agent's wallet key
4. Verify the payment falls within the mandate's constraints
5. None of these steps are automated or standardized

The same translation problem exists for every other protocol pairing — there are C(6,2) = 15 potential pairs, and each direction adds complexity. FlowLink should implement a **canonical internal representation** with adapters for each protocol.

### 4.2 Canonical Permission Object (CPO)

Define a normalized `CanonicalPermission` type that all six protocols translate to/from:

```typescript
interface CanonicalPermission {
  // Identity
  grantorId: string;           // WIMSE URI, DID, or wallet address
  granteeId: string;           // Agent DID, wallet address, or service endpoint

  // Scope
  maxAmountUsd: number;        // Normalized spending ceiling in USD
  allowedAssets?: string[];    // Token symbols: ["USDC", "USDT"], null = any
  allowedMerchants?: string[]; // Merchant IDs or wildcard
  allowedCategories?: string[];// AP2-style category list
  allowedEndpoints?: string[]; // URL patterns for MPP/x402

  // Temporal
  notBefore: number;           // Unix timestamp seconds
  expiresAt: number;           // Unix timestamp seconds

  // Delegation
  parentPermissionId?: string; // Reference to parent grant (for chain validation)
  maxSubdelegationDepth?: number; // 0 = no subdelegation

  // Revocation
  revocationEndpoint?: string; // URL to call for active revocation
  onChainRevocationAddress?: string; // Contract for ERC-7710 revocation

  // Audit
  protocolSource: "x402" | "ap2" | "mpp" | "acp" | "erc7715" | "erc7710";
  rawCredential: unknown;      // Original protocol-native credential, preserved for audit
  createdAt: number;
  permissionId: string;        // FlowLink-internal UUID
}
```

### 4.3 Protocol Adapters

#### x402 → CPO

```typescript
function fromX402(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
  priceOracle: PriceOracle
): CanonicalPermission {
  return {
    grantorId: payload.payload.authorization!.from,
    granteeId: payload.payload.authorization!.to,
    maxAmountUsd: await priceOracle.toUsd(
      payload.payload.authorization!.value,
      requirements.asset,
      requirements.network
    ),
    allowedAssets: [assetSymbol(requirements.asset)],
    allowedMerchants: [requirements.payTo],
    allowedEndpoints: requirements.resource ? [requirements.resource] : undefined,
    notBefore: Number(payload.payload.authorization!.validAfter),
    expiresAt: Number(payload.payload.authorization!.validBefore),
    protocolSource: "x402",
    rawCredential: payload,
    createdAt: Math.floor(Date.now() / 1000),
    permissionId: crypto.randomUUID(),
  };
}
```

**Translation loss:** x402 has no category scope, no subdelegation, no explicit revocation endpoint. The CPO will have those fields as `undefined`. Downstream adapters must decide how to handle the absence.

#### AP2 Intent Mandate → CPO

```typescript
function fromAP2IntentMandate(mandate: AP2IntentMandate): CanonicalPermission {
  return {
    grantorId: mandate.payer.identity,
    granteeId: mandate.payee.merchant_id,
    maxAmountUsd: parseFloat(mandate.shopping_intent.max_amount.value),
    allowedAssets: inferAssetsFromPaymentMethods(mandate.chargeable_payment_methods),
    allowedMerchants: [mandate.payee.merchant_id],
    allowedCategories: mandate.shopping_intent.categories,
    allowedEndpoints: undefined,  // AP2 does not model endpoints
    notBefore: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(new Date(mandate.intent_expiry).getTime() / 1000),
    parentPermissionId: undefined,  // Intent Mandate is root
    maxSubdelegationDepth: 1,       // AP2 allows Cart → Payment chain
    revocationEndpoint: mandate.payer.credential_provider + "/revoke",
    protocolSource: "ap2",
    rawCredential: mandate,
    createdAt: Math.floor(new Date(mandate.timestamp).getTime() / 1000),
    permissionId: mandate.mandate_id,
  };
}
```

#### CPO → x402 PaymentPayload

This direction requires an active wallet signing step — the CPO cannot be mechanically converted to an x402 payload without a signing key:

```typescript
async function toX402(
  cpo: CanonicalPermission,
  signerWallet: WalletSigner,
  requirements: PaymentRequirements,
  priceOracle: PriceOracle
): Promise<PaymentPayload> {
  // Validate CPO allows this payment
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds >= cpo.expiresAt) throw new PermissionExpiredError();
  if (nowSeconds < cpo.notBefore) throw new PermissionNotYetValidError();

  const amountTokenUnits = await priceOracle.fromUsd(
    Math.min(cpo.maxAmountUsd, parseFloat(requirements.maxAmountRequired)),
    requirements.asset,
    requirements.network
  );

  if (cpo.allowedMerchants && !cpo.allowedMerchants.includes(requirements.payTo)) {
    throw new MerchantNotAllowedError();
  }

  const authorization: EIP3009Authorization = {
    from: cpo.grantorId,
    to: requirements.payTo,
    value: amountTokenUnits,
    validAfter: String(nowSeconds),
    validBefore: String(Math.min(cpo.expiresAt, nowSeconds + 300)), // 5min cap
    nonce: generateNonce(),
  };

  const signature = await signerWallet.signEIP3009(authorization, requirements);

  return {
    x402Version: 1,
    scheme: "exact",
    network: requirements.network,
    payload: { signature, authorization },
  };
}
```

#### CPO → ACP Vault Token Request

```typescript
async function toACPVaultToken(
  cpo: CanonicalPermission,
  merchantId: string,
  checkoutSessionId: string,
  pspClient: PSPClient
): Promise<ACPVaultToken> {
  const amountCents = Math.round(cpo.maxAmountUsd * 100);

  return pspClient.delegatePayment({
    payment_method: extractPaymentMethod(cpo),
    allowance: {
      reason: "one_time",
      max_amount: amountCents,
      currency: "usd",
      merchant_id: merchantId,
      checkout_session_id: checkoutSessionId,
    },
    metadata: {
      canonical_permission_id: cpo.permissionId,
      source_protocol: cpo.protocolSource,
    },
  });
}
```

### 4.4 Delegation Chain Validation

A critical gap across all protocols: when an agent presents a permission derived from a parent grant, FlowLink must validate the delegation chain is unbroken and within scope.

```typescript
interface DelegationChain {
  permissions: CanonicalPermission[];  // [leaf, ..., root], root last
}

function validateChain(chain: DelegationChain): ValidationResult {
  if (chain.permissions.length === 0) return { valid: false, reason: "empty_chain" };

  const nowSeconds = Math.floor(Date.now() / 1000);

  for (let i = 0; i < chain.permissions.length; i++) {
    const perm = chain.permissions[i];

    // Check expiry at every level
    if (nowSeconds >= perm.expiresAt) {
      return { valid: false, reason: `expired_at_depth_${i}`, permissionId: perm.permissionId };
    }

    // Check subdelegation depth
    if (i > 0) {
      const parent = chain.permissions[i - 1];
      if (parent.maxSubdelegationDepth !== undefined && i > parent.maxSubdelegationDepth) {
        return { valid: false, reason: "exceeded_subdelegation_depth" };
      }

      // Child amount must not exceed parent
      if (perm.maxAmountUsd > parent.maxAmountUsd) {
        return { valid: false, reason: "child_exceeds_parent_amount" };
      }

      // Child categories must be subset of parent
      if (parent.allowedCategories && perm.allowedCategories) {
        const exceeds = perm.allowedCategories.some(c => !parent.allowedCategories!.includes(c));
        if (exceeds) return { valid: false, reason: "child_exceeds_parent_categories" };
      }
    }
  }

  return { valid: true };
}
```

### 4.5 ERC-7710 → CPO

The ERC-7710 Delegation struct maps richly to CPO, with caveat extraction:

```typescript
function fromERC7710Delegation(
  delegation: Delegation,
  caveats: DecodedCaveat[],
  chainId: number
): CanonicalPermission {
  const expiryEnforcer = caveats.find(c => c.type === "TimestampEnforcer");
  const amountEnforcer = caveats.find(c => c.type === "ERC20TransferAmountEnforcer" || c.type === "MultiTokenPeriodEnforcer");
  const targetEnforcer = caveats.find(c => c.type === "AllowedTargetsEnforcer");

  return {
    grantorId: delegation.delegator,
    granteeId: delegation.delegate,
    maxAmountUsd: amountEnforcer ? await priceOracle.toUsd(
      amountEnforcer.maxAmount,
      amountEnforcer.token,
      `eip155:${chainId}`
    ) : Infinity,
    allowedMerchants: targetEnforcer?.allowedAddresses,
    notBefore: expiryEnforcer?.notBefore ?? 0,
    expiresAt: expiryEnforcer?.notAfter ?? Number.MAX_SAFE_INTEGER,
    parentPermissionId: delegation.authority !== ROOT_AUTHORITY
      ? delegation.authority
      : undefined,
    maxSubdelegationDepth: undefined,  // Not encoded in ERC-7710 natively
    onChainRevocationAddress: delegationManagerAddress,
    protocolSource: "erc7710",
    rawCredential: delegation,
    createdAt: Math.floor(Date.now() / 1000),
    permissionId: delegation.authority !== ROOT_AUTHORITY
      ? keccak256(encodeDelegation(delegation))
      : crypto.randomUUID(),
  };
}
```

### 4.6 WIMSE/OAuth → CPO (IETF draft-klrc-aiagent-auth-00)

For agents authenticated via WIMSE + OAuth (the IETF framework), FlowLink should extract payment-relevant scope from the JWT claims:

```typescript
function fromWIMSEOAuthToken(jwt: ParsedJWT): Partial<CanonicalPermission> {
  // Standard OAuth claims
  const expiresAt = jwt.exp;
  const notBefore = jwt.nbf ?? Math.floor(Date.now() / 1000);
  const grantorId = jwt.sub;                    // WIMSE URI or SPIFFE ID
  const granteeId = jwt.aud as string;          // Resource server

  // Custom payment scope claims (FlowLink extension)
  const paymentScope = jwt["flowlink:payment"];

  return {
    grantorId,
    granteeId,
    maxAmountUsd: paymentScope?.max_amount_usd,
    allowedAssets: paymentScope?.allowed_assets,
    allowedMerchants: paymentScope?.allowed_merchants,
    notBefore,
    expiresAt,
    protocolSource: "erc7715",  // Closest approximation; use custom value in practice
    rawCredential: jwt,
    createdAt: jwt.iat ?? Math.floor(Date.now() / 1000),
    permissionId: jwt.jti ?? crypto.randomUUID(),
  };
}
```

This requires FlowLink to define a `flowlink:payment` JWT claim namespace and register it with authorization servers in the WIMSE ecosystem.

---

## 5. IMPLEMENTATION RECOMMENDATIONS

### 5.1 Build the PermissionTranslator as a Core FlowLink Service

Location: `packages/core/src/permissions/`

Priority files to create:
```
packages/core/src/permissions/
  canonical.ts          # CanonicalPermission type + Zod schema
  validator.ts          # Chain validation + expiry checks
  adapters/
    x402.ts             # fromX402, toX402
    ap2.ts              # fromAP2IntentMandate, fromAP2CartMandate, toAP2
    mpp.ts              # fromMPPSession, toMPPSession
    acp.ts              # fromACPVaultToken, toACPVaultToken
    erc7715.ts          # fromERC7715Permission, toERC7715Request
    erc7710.ts          # fromERC7710Delegation, toERC7710RedeemParams
    wimse.ts            # fromWIMSEToken, toPaymentScope
  revocation/
    manager.ts          # Unified revocation interface
    x402-revoke.ts      # cancelAuthorization on ERC-3009
    mpp-revoke.ts       # Session cancellation API
    erc7710-revoke.ts   # disableDelegation call
```

### 5.2 Introduce a `flowlink:payment` JWT Claim Namespace

Register with the IANA JWT Claims Registry:
```json
{
  "flowlink:payment": {
    "max_amount_usd": 10.00,
    "allowed_assets": ["USDC", "USDT"],
    "allowed_merchants": ["merchant-id-1"],
    "allowed_categories": ["data_api", "news"],
    "protocol_preference": ["x402", "mpp", "acp"]
  }
}
```

This allows FlowLink to inject payment-scoped constraints into WIMSE/OAuth tokens without breaking the IETF framework. Agents authenticated via SPIFFE can carry payment permissions in their JWT SVIDs.

### 5.3 Canonical Permission as Compliance Input

The existing `ComplianceRequest` type at `packages/shared/src/types/protocol.ts` line 103 should be extended to accept `CanonicalPermission` as its `protocolMetadata`:

```typescript
// In packages/shared/src/types/protocol.ts
export const ComplianceRequest = z.object({
  // ... existing fields ...
  protocolMetadata: z.record(z.string(), z.unknown()).optional(),
  canonicalPermission: z.unknown().optional(), // CanonicalPermission
});
```

The `PermissionTranslator` becomes the first step in the ProofLink compliance pipeline — before sanctions screening, the permission must be normalized and validated.

### 5.4 Subdelegation Enforcement Must Be Pre-Transaction

Master Gap D12 ("No Spend Policy Enforcement Pre-Transaction") maps directly here. The `validateChain` function in §4.4 must run as a `BeforeVerifyHook` in the x402 middleware:

```typescript
// In x402-compliance middleware BeforeVerify
const permChain = await permissionTranslator.extractChain(ctx.paymentPayload);
if (permChain) {
  const result = validateChain(permChain);
  if (!result.valid) {
    return { abort: true, reason: "delegation_chain_invalid", message: result.reason };
  }
}
```

### 5.5 Build a Revocation Aggregator

Since each protocol has a different revocation model, FlowLink needs a unified revocation interface:

```typescript
interface RevocationManager {
  // Revoke a permission by ID across all protocols
  revoke(permissionId: string, reason: string): Promise<RevocationResult>;

  // Check if a permission is still valid
  isValid(permissionId: string): Promise<boolean>;

  // Subscribe to revocation events (webhook)
  onRevoked(handler: (permissionId: string) => void): void;
}
```

The implementation checks:
1. Local FlowLink revocation list (fastest)
2. MPP session status via Stripe API
3. ERC-7710 delegation status on-chain
4. ERC-7715 permission status via wallet RPC
5. AP2 credential provider status
6. x402: TTL check + ERC-3009 nonce state

### 5.6 Translation Loss Logging

Every adapter must log fields that cannot be translated — this creates an audit trail of what scope information was lost or assumed:

```typescript
interface TranslationResult {
  canonical: CanonicalPermission;
  lossReport: Array<{
    field: string;
    originalValue: unknown;
    action: "dropped" | "defaulted" | "approximated";
    reason: string;
  }>;
}
```

---

## 6. GAPS AND RISKS

### 6.1 Identified Gaps Not Solved by Any Protocol

| Gap | Description | Severity |
|-----|-------------|----------|
| **Subdelegation scope validation** | No protocol enforces that a child permission cannot exceed its parent's scope. ERC-7710 is closest but requires caveat composition. AP2 has no subdelegation at all. | Critical |
| **Cross-protocol atomic revocation** | Revoking a permission in one protocol does not revoke derived permissions in other protocols. An AP2 Intent Mandate revocation does not cancel an in-flight x402 payment signed against it. | Critical |
| **Real-time spending aggregation** | None of the six protocols tracks cumulative spend against a limit across multiple transactions. A $10 AP2 Intent Mandate can result in ten $9.99 x402 payments if limits are not enforced externally. | Critical |
| **Agent identity ↔ payment identity bridge** | Master Gap B5: x402's `from` field is an Ethereum address. AP2's `payer.identity` is a DID. WIMSE uses SPIFFE URIs. There is no standard binding between these identity namespaces. | Critical |
| **Emergency freeze across all active permissions** | If an agent is compromised, there is no "kill switch" that revokes all outstanding permissions across all six protocols simultaneously. | High |
| **Permission inheritance in multi-agent hierarchies** | When Agent A delegates to Agent B which spawns Agent C, there is no standard for B's permissions to be automatically bounded by A's permissions. Each protocol handles delegation independently. | High |

### 6.2 Risks in FlowLink's Translation Layer

1. **Translation introduces liability**: By translating between protocols, FlowLink may be considered to have "authorized" a payment even if the original permission was insufficient. Legal review required for each translation path.

2. **Approximation of maxAmountUsd**: USD normalization via price oracle introduces error for volatile assets. A permission for 10 ETH may be approximated as $35,000 USD at signing but worth $40,000 at settlement if ETH moves. FlowLink must use conservative (ceiling) pricing for limits and floor pricing for settlement.

3. **Facilitator trust in x402**: The Coinbase facilitator is the canonical verify/settle endpoint, but FlowLink's CPO translation runs before facilitator call. If the facilitator rejects the payment (balance insufficient, nonce used), FlowLink has already "approved" it at the CPO layer. The settle hook must handle facilitator rejection as a post-approval failure.

4. **ACP single-use token races**: If FlowLink generates an ACP vault token as part of CPO translation and the outer transaction fails, the token is burned and cannot be reused. FlowLink must not generate ACP tokens speculatively.

5. **ERC-7710 chain validation requires on-chain state**: `disabledDelegations` mapping requires an RPC call per delegation in the chain. At scale (deep chains), this adds significant latency. Cache with short TTL (sub-second) and use a dedicated RPC node.

---

## 7. RELATED STANDARDS AND FUTURE WORK

- **ERC-8004** (Ethereum agent registry, mainnet January 2026): Provides the `AgentID` → address mapping that FlowLink's CPO `granteeId` field should resolve. Integrate ERC-8004 lookups into the adapter layer.
- **OWASP Agent Observability Standard**: Requires per-permission audit events. FlowLink's `lossReport` satisfies the "authorization decision" event requirement.
- **AuthZEN / OpenID Authorization API 1.0**: The CPO structure maps cleanly to AuthZEN's Subject-Action-Resource-Context tuple. FlowLink can expose a policy decision point that accepts CPO and returns authorization decisions.
- **draft-goswami-agentic-jwt-00**: A competing IETF draft for "Secure Intent Protocol" using JWT-compatible agentic workflow tokens. Monitor for convergence with draft-klrc-aiagent-auth-00.
- **Google A2A x402 extension** (`github.com/google-agentic-commerce/a2a-x402`): Reference implementation of AP2 + x402 composition. FlowLink's `fromAP2` + `toX402` adapters should validate against this reference.

---

## 8. SOURCES

- [x402 Official Site](https://www.x402.org/) — protocol overview and whitepaper
- [x402 Coinbase Docs: How It Works](https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works)
- [x402 X-PAYMENT Header (Avalanche Docs)](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/03-technical-architecture/03-x-payment-header)
- [ERC-3009: The Protocol Powering x402 (PayIn Blog)](https://blog.payin.com/posts/erc-3009-x402/)
- [Announcing AP2 (Google Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)
- [AP2 Specification](https://ap2-protocol.org/specification/)
- [AP2 and x402 Integration](https://ap2-protocol.org/topics/ap2-and-x402/)
- [Secure Use of AP2 (Cloud Security Alliance)](https://cloudsecurityalliance.org/blog/2025/10/06/secure-use-of-the-agent-payments-protocol-ap2-a-framework-for-trustworthy-ai-driven-transactions)
- [Stripe Introducing MPP](https://stripe.com/blog/machine-payments-protocol)
- [MPP Stripe Documentation](https://docs.stripe.com/payments/machine/mpp)
- [MPP Overview](https://mpp.dev/overview)
- [Stripe + Tempo Mainnet (The Block)](https://www.theblock.co/post/394131/tempo-mainnet-goes-live-with-machine-payments-protocol-for-agents)
- [ACP GitHub Repository](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)
- [ACP Delegated Payment Spec (OpenAI Developers)](https://developers.openai.com/commerce/specs/payment)
- [Stripe ACP Integration Guide](https://docs.stripe.com/agentic-commerce/protocol)
- [Stripe + OpenAI ACP Announcement](https://stripe.com/newsroom/news/stripe-openai-instant-checkout)
- [ERC-7715: Grant Permissions from Wallets (EIPs)](https://eips.ethereum.org/EIPS/eip-7715)
- [ERC-7715 (EIP.tools)](https://eip.tools/eip/7715)
- [ERC-7715 MetaMask Docs](https://docs.metamask.io/delegation-toolkit/0.12.0/experimental/erc-7715-request-permissions/)
- [ERC-7710: Smart Contract Delegation (EIPs)](https://eips.ethereum.org/EIPS/eip-7710)
- [ERC-7710 (EIP.tools)](https://eip.tools/eip/7710)
- [MetaMask Delegation Framework Concepts](https://docs.metamask.io/smart-accounts-kit/concepts/delegation/)
- [MetaMask Delegation Toolkit (npm)](https://www.npmjs.com/package/@metamask/delegation-toolkit)
- [Consensys Diligence Audit April 2025](https://diligence.security/audits/2025/04/metamask-delegation-framework-april-2025/)
- [IETF draft-klrc-aiagent-auth-00](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/)
- [IETF draft-klrc-aiagent-auth-00 Full Text](https://www.ietf.org/archive/id/draft-klrc-aiagent-auth-00.html)
- [Deep Dive: draft-klrc-aiagent-auth-00 (DEV Community)](https://dev.to/kanywst/ai-agent-authentication-authorization-deep-dive-reading-draft-klrc-aiagent-auth-00-5d1)
- [AI Agent Auth Gets Auth Right, Authorization Is Still Your Problem](https://www.rockcybermusings.com/p/i-agent-authentication-authorization-gap)
- [Agentic Payments Protocols Compared (Crossmint)](https://www.crossmint.com/learn/agentic-payments-protocols-compared)
- [x402 vs Stripe MPP (WorkOS)](https://workos.com/blog/x402-vs-stripe-mpp-how-to-choose-payment-infrastructure-for-ai-agents-and-mcp-tools-in-2026)
- [x402 vs ACP vs UCP (DEV Community)](https://dev.to/ai-agent-economy/x402-vs-acp-vs-ucp-which-agent-payment-protocol-should-you-actually-use-in-2026-2ecp)
- [ERC-8004: Trustless Agents (EIPs)](https://eips.ethereum.org/EIPS/eip-8004)
- [MCP, A2A, AP2, ACP, x402 & ERC-8004 (PayRam)](https://www.payram.com/blog/mcp-a2a-ap2-acp-x402-erc-8004)
- [SPIFFE Meets OAuth2 (Riptides)](https://riptides.io/blog-post/spiffe-meets-oauth2-current-landscape-for-secure-workload-identity-in-the-agentic-ai-era)
- [Google A2A x402 Extension](https://github.com/google-agentic-commerce/a2a-x402)
