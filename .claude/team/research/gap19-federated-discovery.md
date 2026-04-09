# GAP-19: Federated Agent Discovery — Technical Research Brief
**ProofLink Team Research | March 2026**
**Scope:** Eight protocols/standards analyzed; implementation recommendations for ProofLink agent discovery service

---

## 0. Executive Summary

As of March 2026, eight competing systems claim to solve agent discovery — Google A2A Agent Cards, the IETF ANS draft, MIT NANDA, Fetch.ai Agentverse, MCP Server Cards, ERC-8004, ENSIP-25, and a handful of cross-protocol federation attempts. None is interoperable with any other by default. Every system has a different registration format, query mechanism, capability advertisement schema, and trust model. Pricing metadata is absent from all but one (Fetch.ai, loosely). Cross-chain identity portability is absent from all.

This is the exact problem identified as Gap E1 ("No Universal, Interoperable Agent Discovery Layer") and Gap B8 ("Agent Naming System Fragmentation") in the MASTER_GAP_LIST. ProofLink's agent registry — currently a centralized Postgres-backed identity store exposed via `/v1/identity/` — is positioned to become the compliance-aware bridge between all of these systems, but requires specific architecture extensions to do so.

**Key findings:**
- A2A Agent Cards are the de facto standard for capability advertisement but lack pricing, compliance, and cross-protocol fields
- ANS (IETF) is architecturally sound but has no governance body, no pricing fields, and is pre-RFC
- NANDA Registry Quilt is the most ambitious federation design (CRDTs + gossip + cross-signing) but is still academic
- ERC-8004 went live on Ethereum mainnet January 29, 2026; ProofLink already references it via `erc8004Id`/`erc8004Registry` fields — the linkage is incomplete
- ENSIP-25 (March 4, 2026) provides human-readable ENS linkage to ERC-8004 agent IDs; ProofLink can implement this with zero contract changes
- MCP Server Cards (SEP-1649, SEP-1960) are pending merge into MCP spec; ProofLink's MCP server should expose `/.well-known/mcp/server-card.json`
- No existing system carries KYA credential references, delegation scope metadata, or compliance scores — ProofLink's differentiated position

---

## 1. Google A2A Agent Cards

### Registration Format

AgentCard is a JSON document hosted at `https://{domain}/.well-known/agent.json` (note: the exact path as of v0.2.5 is `/agent.json` not `/agent-card.json`). The spec follows RFC 8615.

```json
{
  "name": "PaymentProcessingAgent",
  "description": "Handles B2B invoice payments",
  "url": "https://agent.example.com/a2a",
  "provider": {
    "organization": "Acme Corp",
    "url": "https://acme.com"
  },
  "version": "1.2.0",
  "documentationUrl": "https://agent.example.com/docs",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "extendedAgentCard": true
  },
  "securitySchemes": {
    "BearerAuth": { "type": "http", "scheme": "bearer" },
    "OAuth2": {
      "type": "oauth2",
      "flows": {
        "clientCredentials": {
          "tokenUrl": "https://auth.example.com/token",
          "scopes": { "agent:invoke": "Invoke agent tasks" }
        }
      }
    }
  },
  "security": [{ "BearerAuth": [] }],
  "skills": [
    {
      "id": "process-invoice",
      "name": "Process Invoice",
      "description": "Accepts an invoice and executes payment via x402",
      "tags": ["payment", "invoice", "b2b"],
      "examples": ["Pay invoice #INV-2024-001 for $5,000 USDC"],
      "inputModes": ["text", "application/json"],
      "outputModes": ["application/json"]
    }
  ],
  "extensions": []
}
```

### Discovery Mechanism

1. Client performs `GET https://{server}/.well-known/agent.json`
2. Server returns the card (optionally with `Cache-Control` and `ETag`)
3. For sensitive capability details, `capabilities.extendedAgentCard: true` signals that the client should re-fetch at the same URL with authentication headers to receive the full card
4. Curated registries (centralized) aggregate cards; no federated registry protocol is defined in the spec itself

### Capability Advertisement

Skills array with free-text `description`, `tags`, input/output MIME mode arrays. No JSON Schema for I/O payloads — this is Gap E2 in the master list. Capability matching is semantic/keyword-based, not typed.

### Pricing Metadata

**Absent.** The A2A spec defines no cost, rate, or pricing fields in AgentCard. This is Gap E3.

### Trust Signals

- Supported auth schemes (OAuth2, Bearer, APIKey, MTLS, OpenID Connect) declared but not verified by the spec
- Card signing is proposed (canonicalization + JWS) but not finalized
- No reputation, no on-chain verification, no compliance credentials
- `extendedAgentCard` mechanism allows gated disclosure of sensitive metadata to authenticated callers

### Limitations

1. `.well-known/agent.json` is single-instance per domain — no path to run multiple agents under one domain without subdomain proliferation
2. No pricing, delegation scope, or compliance fields
3. Skills are free-text; no machine-readable capability type system
4. No native federation — discovery across organizations requires external curated registries
5. ACP (IBM) merged into A2A in August 2025; the spec is now governed by Linux Foundation Agentic AI Foundation (AAIF) as of December 2025

### Interoperability Gaps

A2A Agent Cards have no standardized bridge to MCP Server Cards, ERC-8004 registration files, or ANS names. A card describes what an agent does; it does not reference who verified the agent or what it is authorized to spend.

---

## 2. ANS — Agent Name Service (IETF draft-narajala-ans-00)

**Authors:** K. Huang (DistributedApps.ai), V.S. Narajala (AWS), I. Habler (Intuit), A. Sheriff (Cisco)
**Status:** Experimental; published May 2025, expires November 2025; no follow-up draft as of March 2026
**Implementation:** GoDaddy has built `github.com/godaddy/ans-registry` against the draft

### ANS Name Format

```
Protocol://AgentID.agentCapability.Provider.vVersion[.Extension]
```

Example:
```
a2a://textProcessor.DocumentTranslation.AcmeCorp.v2.1.hipaa
mcp://paymentBot.InvoiceProcessing.ProofLink.v1.0.pci
```

Components SHOULD be registered with a governance authority to prevent collisions — but no governance authority is defined.

### Registration Schema

```json
{
  "protocol": "a2a",
  "agentID": "paymentBot",
  "agentCapability": "InvoiceProcessing",
  "provider": "ProofLink",
  "version": "1.0.0",
  "certificate": {
    "subject": "CN=paymentBot,O=ProofLink,C=US",
    "issuer": "CN=ProofLink Root CA",
    "pem": "-----BEGIN CERTIFICATE-----..."
  },
  "protocolExtensions": {
    "mcpEndpoint": "https://mcp.prooflink.io",
    "toolName": "process_invoice",
    "inputSchema": { "$ref": "https://prooflink.io/schemas/invoice.json" }
  }
}
```

### Query/Resolution Mechanism

1. Client submits `ANSName` with optional version range constraints to a registry
2. Registry runs `VersionNegotiation` algorithm using semver compatibility
3. Returns `EndpointRecord` containing:
   - `resolvedEndpointURI`
   - Digital signature over the record
   - Target agent's X.509 certificate
4. Client runs `VerifyCertChain` (recursive CA chain validation + CRL/OCSP check)
5. Client runs `VerifySignature` using agent's public key
6. TTL-based caching; 300-second default recommended

The resolution mirrors DNS but adds capability-aware matching: the `agentCapability` component in the name filters results semantically.

### Capability Advertisement

Normalized via the Protocol Adapter Layer (PAL):
- Core fields: `protocol`, `agentID`, `agentCapability`, `provider`, `version`
- `protocolExtensions`: container for protocol-specific data (tool schemas for MCP, skill objects for A2A, etc.)
- The PAL translates between A2A skills, MCP tools, and the ANS core schema

### Pricing Metadata

**Absent.** The draft contains no pricing, cost, or rate fields. A significant gap for commercial agent marketplaces.

### Trust Signals

- X.509 PKI certificates; client verifies chain to trusted root CA
- Challenge-response capability validation (agent must prove it can perform claimed capability at registration)
- Zero-knowledge proofs for capability attestation (listed as a mechanism, not required)
- No reputation scoring, no on-chain anchoring

### Limitations

1. **Governance undefined** — no naming authority; namespace collision is unsolved
2. **Pre-RFC status** — no implementation momentum beyond GoDaddy's registry; the draft expired and has no successor as of March 2026
3. **No pricing fields** — cannot express service costs
4. **DoS amplification** — DNSSEC-style signed responses with large crypto fields risk amplification attacks
5. **Privacy** — query patterns reveal agent usage; Private Information Retrieval and anonymized relays are recommended but not specified
6. **No formal security proofs** — explicitly deferred to future work
7. **Semantic interoperability gap** — ANS provides location and trust, not semantic translation between A2A tasks and MCP tool calls

---

## 3. MIT Project NANDA — Registry Quilt Architecture

**Institution:** MIT Media Lab, Prof. Ramesh Raskar
**Status:** Active research project; 2-day summit at MIT July 14, 2025; ArXiv paper `2507.14263`
**Reference implementation:** `projectnanda.org`

### Architecture Overview

NANDA (Network of AI Agents and Decentralized Architecture) targets a global "Internet of AI Agents." It builds on A2A and MCP rather than replacing them, adding four layers:

```
Layer 4: Interoperability (A2A, MCP, NLWeb, HTTPS adapters)
Layer 3: Federation (Registry Quilt — gossip + CRDTs + cross-signing)
Layer 2: Identity (AgentFacts + W3C Verifiable Credentials)
Layer 1: Discovery (NANDA Index — two-step resolution)
```

### Registry Quilt Federation Protocol

The Registry Quilt is described as "a federation layer that stitches many autonomous agent registries into one globally discoverable fabric without creating a single point of control."

**Key mechanisms:**
- **CRDTs** (Conflict-free Replicated Data Types): registry replicas converge even under network partitions; updates are monotonic so no coordinator is needed
- **Gossip protocol**: registries propagate agent record updates to peers; each node maintains a partial view of the global state
- **Cross-signing**: registry A signs agent records from registry B, creating a transitive trust web; a client trusting registry A implicitly gains trust signals about registry B's agents
- **Separation of concerns**: static identifier resolution (the NANDA Index, like a DNS lookup) is separate from dynamic agent metadata (AgentFacts, fetched on demand)

### Agent Record Format

NANDA introduces "AgentFacts" as the metadata document (analogous to an A2A Agent Card but richer):

```json
{
  "@context": ["https://nanda.mit.edu/v1"],
  "agentId": "did:nanda:abc123",
  "name": "PaymentBot",
  "capabilities": ["invoice-processing", "x402-payment"],
  "protocols": ["a2a", "mcp"],
  "endpoints": {
    "a2a": "https://agent.example.com/a2a",
    "mcp": "https://agent.example.com/mcp"
  },
  "agentFacts": {
    "verifiedBy": ["did:nanda:registry:mit", "did:nanda:registry:acme"],
    "attestations": [
      {
        "type": "W3CVerifiableCredential",
        "credentialType": "CapabilityAttestation",
        "issuer": "did:nanda:validator:01"
      }
    ]
  },
  "privateFactsURL": "https://agent.example.com/private-facts",
  "ttl": 3600
}
```

**Schema weight:** 1–3 KB JSON-LD (similar to MCP registry entries)
**Privacy option:** `privateFactsURL` for gated disclosure of sensitive metadata

### Query API

Two-step resolution (per NANDA Index paper):
1. Lookup in NANDA Index by DID or name → returns list of registry endpoints that hold records for this agent
2. Fetch AgentFacts from the authoritative registry → verify cross-signatures

### Pricing Metadata

**Not defined** in the current architecture. Price discovery is not part of the NANDA Index design.

### Trust Signals

- W3C Verifiable Credentials for capability attestation
- Cross-signing between registries (transitive trust)
- AgentFacts contains `verifiedBy` array (registries that have cross-signed this agent)
- TTL-scoped records; stale facts reduce trust weight
- No on-chain anchoring in the base design

### Limitations

1. **Academic maturity** — no production deployment; NANDA is a research project
2. **CRDT convergence latency** — gossip + CRDTs can take minutes to propagate updates globally; real-time trust decisions cannot wait
3. **No pricing** — economic layer entirely absent
4. **Cross-signing trust bootstrapping** — requires an initial web-of-trust seeding; the cold-start problem is unsolved
5. **Governance** — federated registries need interoperability agreements; no governance framework proposed
6. **No compliance/KYA layer** — NANDA is identity and discovery, not compliance

---

## 4. Fetch.ai Agentverse

**Live system:** `agentverse.ai`
**Protocol:** uAgents framework + Almanac contract (on-chain) + DeltaV (AI Engine interface)

### Registration Format

Agents register via the Agentverse SaaS platform. Registration has two components:

**On-chain (Almanac contract):** A decentralized agent registry on Fetch.ai's blockchain. Agents register their address and protocol manifests. Active agents show a green "Active" tag; registration must be renewed to maintain active status.

**Off-chain (Agentverse profile):**
- Agent address (unique identifier)
- Name, description, tags (finance, mobility, travel, LLM, etc.)
- README / guide documentation
- Protocol manifests (capability specification documents)
- Verification status (`is:verified`)

### Discovery Query Mechanism

The Agentverse Marketplace uses GitHub-style filter syntax:
```
is:hosted is:verified has:guide tag:finance tag:payment
is:local tag:compliance has:interactions
```

Filter categories:
- `is:` — type (hosted/local/mailbox/custom/proxy), developer (fetch-ai/community), status
- `has:` — location, README, guide, interactions
- `tag:` — domain tags

DeltaV uses the AI Engine (ASI:One LLM) to translate natural language task descriptions into agent queries — effectively semantic search over the Almanac.

### Capability Advertisement

Capabilities are defined via protocol manifests — structured documents linked to an agent's registration. The manifest format includes the agent's communication protocols and supported message types. There is no standardized machine-readable capability schema equivalent to A2A skills or MCP tools; the AI Engine handles capability matching through LLM inference.

### Pricing Metadata

**Loosely present but unstructured.** Agents can describe their pricing in natural language within README/guide documents. No structured pricing schema exists. The Almanac contract stores no pricing data. This is a gap even within Fetch.ai's own ecosystem.

### Trust Signals

- `is:verified` — platform-level verification by Fetch.ai
- Rating scores based on interaction count and feedback
- Developer affiliation (Fetch.ai-built vs community)
- Stake in FET token (for validator nodes, not agents directly)
- No KYA, no compliance credentials, no sanctions screening

### Limitations

1. **Ecosystem lock-in** — Almanac contract is on Fetch.ai chain; no interoperability with Ethereum ERC-8004, A2A cards, or ANS
2. **AI Engine dependency** — capability matching relies on LLM inference, creating non-deterministic discovery
3. **No structured pricing** — natural language pricing in READMEs is not machine-readable
4. **No compliance layer** — zero sanctions screening or KYA equivalent
5. **Centralized SaaS component** — Agentverse platform is a centralized portal despite Almanac being on-chain
6. **FET token requirement** — participating as a validator requires FET stake, creating economic friction

---

## 5. MCP Server Cards (SEP-1649 / SEP-1960)

**Status:** Two active proposals pending merge into MCP spec core; broad community support as of February 2026; Replicate deployed server auto-discovery on February 10, 2026
**Path:** `/.well-known/mcp/server-card.json` (SEP-1649) and `/.well-known/mcp` manifest (SEP-1960)

### Server Card Schema

```json
{
  "$schema": "https://modelcontextprotocol.io/schemas/server-card/v1",
  "version": "1.0",
  "protocolVersion": "2025-11-05",
  "serverInfo": {
    "name": "prooflink-mcp",
    "title": "ProofLink MCP Server",
    "version": "1.0.0"
  },
  "description": "Compliance-aware agent payments and KYA verification",
  "iconUrl": "https://prooflink.io/icon.png",
  "documentationUrl": "https://docs.prooflink.io/mcp",
  "transport": {
    "type": "http",
    "endpoint": "https://mcp.prooflink.io/mcp"
  },
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": false, "listChanged": true },
    "prompts": {},
    "logging": {}
  },
  "authentication": {
    "required": true,
    "schemes": ["bearer", "oauth2"]
  },
  "instructions": "Use register_agent before verify_kya. All payments require a valid KYA credential.",
  "tools": [
    {
      "name": "register_agent",
      "description": "Register an AI agent with KYA compliance verification"
    },
    {
      "name": "verify_kya",
      "description": "Verify KYA credential for an agent DID"
    },
    {
      "name": "pay_with_compliance",
      "description": "Execute x402 payment with compliance screening"
    }
  ]
}
```

**HTTP requirements:**
- Must be served over HTTPS (HTTP allowed for localhost/dev)
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *` (CORS)
- `Cache-Control: public, max-age=3600` recommended

### Discovery Mechanism

Pre-connection discovery: clients perform `GET /.well-known/mcp/server-card.json` before initiating the MCP initialization handshake. This eliminates the need to run a full initialization to determine if a server supports required capabilities.

**Rejected alternatives:**
- DNS-based discovery: too restrictive for path/port-based servers
- Header-based discovery: requires a full HTTP request to the main endpoint first

### Capability Advertisement

`tools`, `resources`, `prompts` arrays can be static (listing known tools) or marked as "dynamic" (server supports listing but content varies). Static tool listings in the card give pre-connection visibility into available tools.

### Pricing Metadata

**Absent from the current proposals.** The schema has no cost, rate, or pricing fields. This is a gap in the spec.

### Trust Signals

- Authentication scheme declaration (`bearer`, `oauth2`, `mtls`)
- No reputation, no on-chain anchoring, no compliance credentials
- Server card itself is unauthenticated — any server can claim any capabilities

### Interoperability

MCP Server Cards are entirely MCP-specific. No bridge to A2A Agent Cards, ANS names, or ERC-8004 identities.

---

## 6. ERC-8004 — Trustless Agents (Ethereum)

**Status:** Live on Ethereum mainnet as of January 29, 2026; expanding to Base
**GitHub:** `github.com/erc-8004/erc-8004-contracts`
**Spec:** `https://eips.ethereum.org/EIPS/eip-8004`

### Three Registry Architecture

#### Identity Registry (ERC-721 based)

```solidity
interface IAgentIdentityRegistry {
    function register(string calldata agentURI, bytes[] calldata metadata)
        external returns (uint256 agentId);
    function setAgentURI(uint256 agentId, string calldata newURI) external;
    function setAgentWallet(uint256 agentId, address newWallet,
        uint256 deadline, bytes calldata signature) external;
    function getMetadata(uint256 agentId, bytes32 key)
        external view returns (bytes memory);
    event Registered(uint256 indexed agentId, address indexed owner, string agentURI);
    event URIUpdated(uint256 indexed agentId, string newURI);
}
```

Agent identifier format: `{namespace}:{chainId}:{identityRegistry}` + `agentId` (the NFT token ID)

#### Reputation Registry

```solidity
interface IAgentReputationRegistry {
    function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals,
        bytes32 tag1, bytes32 tag2, string calldata endpoint,
        string calldata feedbackURI, bytes32 feedbackHash) external;
    function getSummary(uint256 agentId, address[] calldata clientAddresses,
        bytes32 tag1, bytes32 tag2)
        external view returns (ReputationSummary memory);
}
```

Feedback value is `int128` with `uint8` decimals (0–18), supporting arbitrary precision scores.

#### Validation Registry

```solidity
interface IAgentValidationRegistry {
    function validationRequest(address validatorAddress, uint256 agentId,
        string calldata requestURI, bytes32 requestHash) external;
    function validationResponse(bytes32 requestHash, uint8 response,
        string calldata responseURI, bytes32 responseHash, bytes32 tag) external;
    // response is 0-100 score
}
```

### Registration File Format (`agentURI` target)

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "ProofLink PaymentBot",
  "description": "Compliance-verified agent for autonomous invoice payments",
  "image": "https://prooflink.io/agents/paymentbot/icon.png",
  "services": [
    { "name": "a2a", "endpoint": "https://agent.prooflink.io/a2a" },
    { "name": "mcp", "endpoint": "https://mcp.prooflink.io/mcp" },
    { "name": "web", "endpoint": "https://prooflink.io/agents/paymentbot" }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": 42,
      "agentRegistry": "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    }
  ],
  "supportedTrust": ["reputation", "crypto-economic", "tee-attestation"]
}
```

### Discovery Mechanism

- Identity Registry is a singleton NFT contract per chain; all agents are browsable as NFTs
- `agentURI` lookup by token ID → fetches the registration file from IPFS/HTTPS
- Third-party indexers (The Graph, etc.) can build queryable indexes over all registered agents
- No native semantic/capability search in the base spec

### Pricing Metadata

`x402Support: boolean` — the only payment-related field. No rate, cost, or pricing structure. Off-chain feedback files support a `proofOfPayment` field (transaction hash) for post-hoc proof.

### Trust Signals

Three pluggable trust models declared in `supportedTrust`:
1. **reputation**: on-chain client feedback via Reputation Registry
2. **crypto-economic**: stake-secured validator re-execution with slashing
3. **tee-attestation**: Trusted Execution Environment oracles (AWS Nitro, Intel SGX)

Validators score requests 0–100; scores are aggregatable on-chain.

### Limitations

1. **EVM-only** — no equivalent on Solana, Cosmos, or other L1s (Gap B3)
2. **No semantic discovery** — browsable by token ID but no capability-based query without external indexer
3. **No pricing fields** — `x402Support` is a boolean, not a rate
4. **No KYA/compliance fields** — registration file has no delegation scope, controlling entity, or compliance credential
5. **agentURI mutability** — the URI can be updated by the owner; no content-addressed anchoring (IPFS with pinning partially mitigates)
6. **Reputation collusion risk** — on-chain feedback is gameable without Sybil resistance (Gap B7)

---

## 7. ENSIP-25 — Verifiable AI Agent Identity with ENS

**Published:** March 4, 2026
**Specification:** `ens.domains/blog/post/ensip-25`

### Mechanism

ENSIP-25 introduces a standardized ENS text record that links an ENS name to an on-chain agent registry entry. The bidirectional verification pattern:

1. Agent owner adds ENS name to their ERC-8004 registration file
2. ENS name owner sets text record: `agent-registration[<registry>][<agentId>] = "1"`
3. Applications verify both sides to confirm association

### Text Record Format

```
key:   agent-registration[<erc7930-address>][<agentId>]
value: 1   (any non-empty string)
```

Where `<erc7930-address>` is the ERC-7930 interoperable address format (encodes namespace + chain ID + contract address):

```
# ERC-8004 IdentityRegistry at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 on Ethereum mainnet
# agentId = 42

key: agent-registration[0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432][42]
value: 1
```

### Verification Logic

```typescript
async function verifyEnsAgentLink(
  ensName: string,
  registryAddress: string,
  agentId: number
): Promise<boolean> {
  // 1. Resolve ENS name, get text record
  const recordKey = `agent-registration[${erc7930Encode(registryAddress)}][${agentId}]`;
  const textRecord = await ensResolver.getText(ensName, recordKey);
  if (!textRecord) return false;

  // 2. Fetch ERC-8004 registration file
  const agentURI = await identityRegistry.tokenURI(agentId);
  const registrationFile = await fetch(agentURI).then(r => r.json());

  // 3. Check that registration file references this ENS name
  const ensEntry = registrationFile.ensNames?.includes(ensName);
  if (!ensEntry) return false;

  return true;  // bidirectional attestation confirmed
}
```

### Trust Value

Provides human-readable, persistent identity for agents: `paymentbot.acme.eth` maps to a specific ERC-8004 agent ID. Useful for agent-to-agent introductions without requiring the caller to know the raw token ID or registry address.

### Limitations

1. **Manual configuration** — ENS name owner must set the text record; no automation or smart contract enforcement
2. **Client-side verification only** — no on-chain enforcement of the bidirectional requirement
3. **ENS resolver dependency** — requires ENS resolver capability (most modern resolvers support this)
4. **Solves only the linkage problem** — does not carry capability, pricing, or compliance metadata
5. **ENS is Ethereum-specific** — no equivalent for Solana (.sol names) or other ecosystems

---

## 8. Cross-Protocol Federation Attempts

### Linux Foundation Agentic AI Foundation (AAIF)

Launched December 2025; permanent home for A2A and MCP. Over 100 enterprise members by February 2026. IBM's ACP merged into A2A in August 2025. The AAIF is the emerging governance body for the A2A/MCP universe but has no federated registry design yet.

### NANDA + A2A + MCP Interoperability Layer

NANDA's architecture includes adapters for A2A, MCP, NLWeb, and HTTPS. The interoperability layer translates NANDA AgentFacts into protocol-specific formats. This is the most complete cross-protocol design in existence but remains academic (no production deployment).

### Solo.io Agent Naming Service + Agent Gateway

Solo.io proposes a three-component enterprise architecture:
- **Agent Registry:** Maintains approved Agent Cards with approval workflows (skill attestation, prompt injection scanning)
- **ANS (Agent Naming Service):** Semantic search across agent capabilities, not just keyword matching
- **Agent Gateway:** Name resolution + authentication + authorization + policy enforcement + load balancing

This is the most operationally complete design but is proprietary and enterprise-targeted.

### TraceRank (ArXiv 2510.27554)

Sybil-resistant service discovery using x402 payment flows as reputation signals:
```
score(agent, query) = cos(query_embedding, agent_capability_embedding) × TraceRank(agent_wallet)
```

TraceRank propagates reputation through the payment graph; bot wallets contribute zero propagated reputation regardless of count. This directly addresses Gap B7 (Sybil resistance) and Gap B6 (on-chain reputation) — directly relevant to ProofLink's payment-linked reputation.

### Protocol Interoperability Status (March 2026)

| From | To | Bridge Status |
|------|----|---------------|
| A2A | MCP | No bridge; NANDA adapters (research only) |
| A2A | ERC-8004 | Manual: registration file can list A2A endpoint |
| ANS | A2A | Protocol Adapter Layer in draft spec; no production impl |
| ANS | MCP | Protocol Adapter Layer in draft spec; no production impl |
| ERC-8004 | ENSIP-25 | Live linkage (March 2026) |
| ERC-8004 | A2A | Manual: registration file lists A2A endpoint |
| Agentverse | A2A | None |
| NANDA | All | Adapter design only (academic) |

No system achieves two-way, automated, protocol-native federation with another system.

---

## 9. Comparative Analysis

### Feature Matrix

| Feature | A2A Card | ANS | NANDA | Agentverse | MCP Card | ERC-8004 | ENSIP-25 |
|---------|----------|-----|-------|------------|----------|----------|---------|
| Registration format | JSON at `.well-known` | JSON + X.509 | JSON-LD AgentFacts | SaaS + Almanac contract | JSON at `.well-known/mcp` | NFT + JSON file at URI | ENS text record |
| Query mechanism | HTTP GET | DNS-style resolution | Two-step: Index + Fetch | Keyword + AI Engine | HTTP GET | NFT browse + URI fetch | ENS resolver |
| Capability advertisement | Skills (free text) | ANS capability field + PAL | AgentFacts capabilities array | Protocol manifests | Tools/resources/prompts | `services` array | None |
| Pricing metadata | None | None | None | Natural language only | None | `x402Support` boolean | None |
| Trust signals | Auth schemes (declared) | X.509 PKI + challenge | W3C VCs + cross-signing | Platform verification | Auth schemes | 3 pluggable models | Bidirectional ENS-registry link |
| On-chain anchoring | None | None | Optional | Almanac (Fetch.ai chain) | None | ERC-721 NFT | Via ERC-8004 |
| KYA/compliance fields | None | None | None | None | None | None | None |
| Delegation scope | None | None | None | None | None | None | None |
| Federation | None (centralized registries) | Governance undefined | CRDTs + gossip + cross-signing | Almanac (single chain) | None | Via The Graph indexers | None |
| Governance | AAIF (Linux Foundation) | Undefined | Academic project | Fetch.ai Ltd | AAIF | ERC working group | ENS DAO |
| Production status | Yes | Draft only | Research | Yes | Pending spec merge | Mainnet Jan 2026 | March 2026 |

### Universally Missing Fields

Every system surveyed is missing all of the following:
1. **KYA/KYB credential reference** — no field to reference a W3C VC proving compliance
2. **Delegation scope** — no field expressing what the agent is authorized to spend/do
3. **Controlling entity** — no standardized field for operator identity (name, LEI, DID)
4. **Compliance score or sanctions status** — no trust signal anchored to financial compliance
5. **Structured pricing** — no machine-readable rate (cost per call, per token, per transaction)
6. **Allowed protocols/chains** — no declaration of which payment rails the agent accepts
7. **Expiry of authorization** — no field for when an agent's authorization expires

These are exactly the fields in ProofLink's current `KYACredentialSubjectSchema` and the `delegationScope` in `RegisterAgentRequest`.

---

## 10. ProofLink Implementation Recommendations

### 10.1 Expose ProofLink Agent Card at `.well-known/agent.json`

**Priority: High | Effort: Low**

Every agent registered in ProofLink's database should be discoverable via A2A Agent Card format. Add a route to the API:

```
GET https://api.prooflink.io/.well-known/agent.json?agent_did=did:prooflink:agent_001
```

Or per-agent subdomains:
```
GET https://agent-001.agents.prooflink.io/.well-known/agent.json
```

The card should include ProofLink-specific extension fields beyond the A2A spec minimum:

```json
{
  "name": "PaymentBot-v2",
  "description": "Acme Corp autonomous payment agent",
  "url": "https://agent.prooflink.io/a2a",
  "provider": { "organization": "Acme Corp", "url": "https://acme.com" },
  "version": "1.0.0",
  "capabilities": { "streaming": false, "pushNotifications": true },
  "securitySchemes": {
    "BearerAuth": { "type": "http", "scheme": "bearer" }
  },
  "skills": [
    {
      "id": "pay-invoice",
      "name": "Pay Invoice",
      "tags": ["payment", "invoice", "usdc"],
      "inputModes": ["application/json"],
      "outputModes": ["application/json"]
    }
  ],
  "x-prooflink": {
    "agentDid": "did:prooflink:agent_001",
    "erc8004AgentId": "42",
    "erc8004Registry": "eip155:8453:0x8004A169...",
    "kyaCredentialIssuer": "did:prooflink:issuer",
    "kyaVerificationEndpoint": "https://api.prooflink.io/v1/identity/verify",
    "complianceScore": 87,
    "x402Support": true,
    "allowedChains": ["base", "ethereum"],
    "allowedCurrencies": ["USDC"],
    "delegationScopePublic": {
      "maxTransactionUsd": 10000,
      "dailyLimitUsd": 50000,
      "expiresAt": "2027-01-01T00:00:00Z"
    },
    "controllingEntityLei": "XKZZ2JZF41MRHTR1V493"
  }
}
```

The `x-prooflink` namespace extends A2A without breaking compliant parsers (they ignore unknown fields). This directly surfaces what no other discovery system provides: KYA verification endpoint, compliance score, and delegation bounds.

### 10.2 Expose MCP Server Card at `.well-known/mcp/server-card.json`

**Priority: High | Effort: Low**

The ProofLink MCP server (`packages/mcp-server/`) needs a discoverable server card per SEP-1649. This is near-final in the MCP spec and Replicate already deployed it in production.

Add to the MCP server's HTTP host:

```
GET https://mcp.prooflink.io/.well-known/mcp/server-card.json
```

Static JSON served from the MCP server's HTTP layer. Update `packages/mcp-server/src/index.ts` to serve this endpoint alongside the `/mcp` endpoint.

The card should list all tools statically: `register_agent`, `verify_kya`, `pay_with_compliance`, `screen_address`, `get_policy`.

### 10.3 Anchor Agents in ERC-8004 and Emit ENSIP-25 Records

**Priority: Medium | Effort: Medium**

ProofLink's database already tracks `erc8004Id` and `erc8004Registry` per agent (both in `apps/api/src/routes/identity.ts` and `packages/mcp-server/src/tools/register-agent.ts`). The production path missing is:

1. When an agent is registered, call `IAgentIdentityRegistry.register()` on Base (chainId 8453)
2. Store returned token ID as `erc8004Id`
3. Publish registration file to IPFS/Arweave with the agent card content
4. Optionally guide operators to set ENSIP-25 text record: `agent-registration[<registry>][<agentId>] = "1"` on their ENS name

The registration file should include the ProofLink KYA credential hash:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "PaymentBot-v2",
  "services": [
    { "name": "a2a", "endpoint": "https://agent.prooflink.io/a2a" },
    { "name": "mcp", "endpoint": "https://mcp.prooflink.io/mcp" }
  ],
  "x402Support": true,
  "active": true,
  "x-prooflink-kyaCredentialHash": "0xabc123...",
  "x-prooflink-kyaIssuer": "did:prooflink:issuer",
  "x-prooflink-complianceScore": 87,
  "supportedTrust": ["reputation", "tee-attestation"]
}
```

### 10.4 Implement ANS-Compatible Naming

**Priority: Medium | Effort: Medium**

ProofLink agents should be addressable via ANS names even before the draft achieves RFC status. The naming convention:

```
prooflink://paymentBot-v2.InvoiceProcessing.AcmeCorp.v1.0.kyaVerified
```

Register as: `protocol=prooflink` (or `a2a`/`mcp`), resolve to ProofLink's identity API endpoint. Publish the ANS registration file to GoDaddy's open `ans-registry` implementation.

This is low-cost now, high-value when/if ANS gains traction.

### 10.5 Build a ProofLink Discovery Index API

**Priority: Critical | Effort: High**

Neither A2A, ANS, MCP Cards, ERC-8004, nor Agentverse provides a query API that filters on:
- Compliance score threshold
- KYA credential validity
- Delegation scope (e.g., "find agents authorized for >$10K transactions")
- Allowed chains/tokens
- Controlling entity LEI
- Agent type (autonomous/semi-autonomous/human-supervised)

ProofLink's existing `GET /v1/identity/agents` endpoint already supports `agentType` and `isActive` filters. Extend it to become a full discovery index:

```
GET /v1/discovery/agents
  ?capability=invoice-processing
  &minComplianceScore=80
  &kyaValid=true
  &allowedChain=base
  &allowedCurrency=USDC
  &maxTransactionUsd[gte]=5000
  &agentType=semi-autonomous
  &controllingEntityLei=XKZZ2JZF41MRHTR1V493
```

This endpoint can be wrapped in an A2A Agent Card skill (ProofLink itself becomes a discoverable "agent registry agent"), an MCP tool, and an ANS-compatible endpoint. This is the moat: the only agent discovery service that filters on compliance and delegation scope.

### 10.6 Implement TraceRank-Style Reputation from Payment Flows

**Priority: Medium | Effort: High**

ProofLink processes x402 payments. These payment flows are reputation signals. Following the TraceRank design (ArXiv 2510.27554):

1. Seed reputation from KYA credential validity and initial compliance score (already stored as `complianceScore`)
2. When agent A pays agent B for a service: propagate a fraction of A's reputation to B, weighted by:
   - Transaction value (larger payments = stronger signal)
   - Time decay (recent payments weight more)
   - A's own reputation at time of payment
3. Update `complianceScore` (or add a separate `reputationScore` field) based on incoming payment graph
4. Surface via the discovery index: `?minReputationScore=60`

This directly addresses Gaps B6 and B7 using data ProofLink already generates.

### 10.7 Publish ProofLink-Specific Capability Schema Extension

**Priority: Low | Effort: Low**

Define a JSON Schema for ProofLink-specific agent capabilities at:
```
https://prooflink.io/schemas/capability/v1/invoice-processing.json
https://prooflink.io/schemas/capability/v1/sanctions-screening.json
https://prooflink.io/schemas/capability/v1/kya-verification.json
```

Reference these in A2A Agent Card skills and ANS `protocolExtensions`. This is what Gap E2 is missing in the broader ecosystem — ProofLink can lead by example.

### 10.8 Federate with NANDA Registry Quilt

**Priority: Low | Effort: High**

When NANDA moves toward production, ProofLink should be the first compliant registry to cross-sign with it. Steps:
1. Implement NANDA's gossip protocol to publish ProofLink agent records as AgentFacts
2. Add `verifiedBy: ["did:nanda:registry:prooflink"]` to all ProofLink agents' AgentFacts
3. Request cross-signing from NANDA's anchor registries

This makes ProofLink's agents globally discoverable through NANDA while maintaining ProofLink as the authoritative compliance and KYA source.

---

## 11. Architecture Diagram

```
External Discovery Protocols          ProofLink Registry Core
┌─────────────────────┐              ┌──────────────────────────────┐
│ A2A Ecosystem       │◄─── card ────│ /.well-known/agent.json      │
│ (AAIF)              │              │   (per-agent, x-prooflink ext) │
└─────────────────────┘              └──────────────────────────────┘
                                                   │
┌─────────────────────┐              ┌──────────────────────────────┐
│ MCP Clients         │◄─── card ────│ /.well-known/mcp/server-card │
│ (Claude, etc.)      │              │   (static tool listing)       │
└─────────────────────┘              └──────────────────────────────┘
                                                   │
┌─────────────────────┐              ┌──────────────────────────────┐
│ ANS Registry        │◄─ register ──│ ANS name publication         │
│ (GoDaddy impl.)     │              │   prooflink://agent.cap.org.v1 │
└─────────────────────┘              └──────────────────────────────┘
                                                   │
┌─────────────────────┐              ┌──────────────────────────────┐
│ ERC-8004            │◄─ register ──│ On-chain NFT mint on Base    │
│ (Ethereum mainnet,  │              │   + IPFS registration file    │
│  Base)              │              │   + x-prooflink-kyaHash        │
└─────────────────────┘              └──────────────────────────────┘
                                                   │
┌─────────────────────┐              ┌──────────────────────────────┐
│ ENSIP-25            │◄─ link ──────│ ENS text record guidance     │
│ (ENS DAO)           │              │   agent-registration[...][id] │
└─────────────────────┘              └──────────────────────────────┘
                                                   │
                              ┌────────────────────▼─────────────────┐
                              │      ProofLink Discovery Index API     │
                              │   GET /v1/discovery/agents            │
                              │     ?capability=invoice-processing    │
                              │     &kyaValid=true                    │
                              │     &minComplianceScore=80            │
                              │     &allowedChain=base               │
                              │     (the moat: compliance-aware query)│
                              └────────────────────┬─────────────────┘
                                                   │
                              ┌────────────────────▼─────────────────┐
                              │         Postgres Agent Registry       │
                              │   agents table: agentDid, erc8004Id,  │
                              │   kyaCredentialHash, complianceScore, │
                              │   delegationScope, controllingEntity  │
                              └──────────────────────────────────────┘
```

---

## 12. Gap Closure Mapping

| Master Gap List ID | Gap Name | This Brief's Recommendation |
|-------------------|----------|-----------------------------|
| E1 | No Universal Agent Discovery Layer | §10.1 A2A card + §10.5 Discovery Index + §10.4 ANS + §10.3 ERC-8004 |
| E2 | Agent Card Capability Schema Has No Typed I/O | §10.7 Publish ProofLink capability schemas |
| E3 | No Standard Mechanism for Agents to Advertise Pricing | §10.1 `x-prooflink` extension: pricing fields |
| B3 | ERC-8004 Is EVM-Specific | §10.3 Base deployment; NANDA federation handles multichain |
| B6 | No On-Chain Trust/Reputation Scoring | §10.6 TraceRank from payment flows |
| B7 | Trust Graph Sybil Resistance Absent | §10.6 TraceRank: bot payments carry zero reputation |
| B8 | Agent Naming System Fragmentation | §10.4 ANS names; §10.3 ENS/ENSIP-25; §10.1 A2A cards |
| B9 | KYA Standard Undefined | ProofLink KYA schema is the reference; surface in all cards |
| E10 | Vendor Lock-In / No Neutral Clearinghouse | §10.5 Discovery Index as protocol-agnostic clearinghouse |

---

## 13. References

- A2A Protocol Specification: https://a2a-protocol.org/latest/specification/
- A2A Agent Discovery: https://a2a-protocol.org/latest/topics/agent-discovery/
- IETF ANS Draft: https://datatracker.ietf.org/doc/html/draft-narajala-ans-00
- GoDaddy ANS Registry: https://github.com/godaddy/ans-registry
- MIT NANDA Overview: https://www.media.mit.edu/projects/mit-nanda/overview/
- NANDA ArXiv Paper: https://arxiv.org/pdf/2507.14263
- Project NANDA Site: https://projectnanda.org/
- Fetch.ai Agentverse: https://docs.agentverse.ai/documentation/getting-started/agentverse-marketplace
- MCP SEP-1649: https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1649
- MCP Registry Preview: https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/
- ERC-8004 Spec: https://eips.ethereum.org/EIPS/eip-8004
- ERC-8004 Contracts: https://github.com/erc-8004/erc-8004-contracts
- ENSIP-25: https://ens.domains/blog/post/ensip-25
- Agent Registry Survey: https://arxiv.org/html/2508.03095v1
- TraceRank Sybil Resistance: https://arxiv.org/html/2510.27554v1
- Solo.io Discovery Gap Analysis: https://www.solo.io/blog/agent-discovery-naming-and-resolution---the-missing-pieces-to-a2a
- Agent Interoperability Survey: https://arxiv.org/abs/2505.02279
- NANDA Enterprise Architecture: https://arxiv.org/html/2508.03101
- Google A2A Announcement: https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/
