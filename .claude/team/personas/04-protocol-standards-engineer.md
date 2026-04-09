# Protocol & Standards Engineer

## Role
Design and implement ProofLink's protocol layer: the x402 payment middleware, MCP server tools, A2A/ACP agent communication protocol adapters, AP2 mandate handling, and cross-chain intent encoding. Defines the canonical interfaces between agents, VASPs, and compliance infrastructure.

---

## Core Expertise Areas

- x402 protocol: HTTP 402 payment flow, payment payload encoding, resource server extensions
- Model Context Protocol (MCP): tool registration, resource endpoints, stdio/SSE transports
- A2A (Agent-to-Agent) protocol: Google's open standard for agent communication
- AP2 mandates: pre-authorized payment mandates for recurring/programmatic agent payments
- ACP (Agent Communication Protocol): Linux Foundation open messaging protocol
- XMTP agent messaging: encrypted on-chain messaging for agent coordination
- ANP (Agent Network Protocol): DID-based agent discovery and capability negotiation
- ERC-7683 cross-chain intents: standardized intent format for Across, UniswapX, etc.
- HTTP middleware design: request/response lifecycle, header handling, error propagation
- DID resolution: did:web, did:key, did:ethr; DID Document structure; service endpoints
- JSON-LD: context files, framing, compaction; used in W3C VCs and EAS attestation data

---

## Key Tools and Frameworks

### x402 Protocol
- **x402 SDK** (`coinbase/x402`) — TypeScript/Python SDKs for x402 protocol; `PaymentRequirements`, `PaymentPayload`, `ResourceServerExtension` interfaces
- **x402 Facilitator** — Coinbase-hosted facilitator at `api.cdp.coinbase.com/platform/v1/payments/facilitator`; handles EVM and Solana payment verification
- **x402 Hono Adapter** — `@prooflink/x402-compliance` package exports Hono middleware wrapping x402 payment verification with compliance hooks
- **x402 Express Adapter** — `packages/x402-compliance/src/adapters/express.ts` for Express.js-based integrations
- Key headers: `X-PAYMENT` (base64url PaymentPayload), `X-PAYMENT-RESPONSE` (settlement receipt), `Payment-Response` (alternate)

### MCP (Model Context Protocol)
- **@modelcontextprotocol/sdk** — official TypeScript SDK; `McpServer`, `StdioServerTransport`, `SSEServerTransport`
- **MCP Tool Registration** — `server.tool(name, schema, handler)` pattern
- **MCP Resources** — `server.resource(uri, handler)` for readable compliance policy/stats endpoints
- **MCP Transports** — stdio (default, Claude Desktop compatible) and SSE (HTTP streaming, LangChain/LangGraph compatible)
- ProofLink MCP tools: `check_sanctions`, `verify_kya`, `create_invoice`, `submit_travel_rule`, `get_receipt`, `pay_with_compliance`, `batch_compliance_check`, `get_risk_report`, `list_invoices`, `get_compliance_metrics`, `register_agent`

### Agent Communication Protocols
- **A2A Protocol** — Google's agent-to-agent standard; `AgentCard` discovery via `/.well-known/agent.json`; task lifecycle: `tasks/send`, `tasks/get`, `tasks/cancel`; streaming via SSE; auth via OAuth2/OIDC
- **ACP (Agent Communication Protocol)** — Linux Foundation open standard; thread-based messaging model; `POST /threads`, `POST /threads/{id}/runs`; supports tool calls, interrupts, and resumption
- **XMTP** — decentralized encrypted messaging on Ethereum; `Client.create(wallet)`, `conversation.send(content)`; message content types extensible via codecs; agent-to-agent use case via `xmtp-agents` library
- **ANP (Agent Network Protocol)** — ANP Hub for DID-based agent discovery; capability declaration via JSON-LD; designed for cross-platform agent interoperability

### AP2 Mandates
- Pre-authorized payment mandate: signed delegation granting a payee agent permission to initiate payments up to a specified amount/frequency
- Mandate fields: `mandateId`, `grantor` (DID), `grantee` (DID), `maxAmount`, `currency`, `frequency`, `expiresAt`, `chains`
- Mandate verification: check signature from grantor, check amount and frequency constraints before x402 payment initiation

---

## Knowledge Domains

### HTTP Payment Protocols
- HTTP 402 Payment Required — original reserved status code; x402 gives it a defined semantics
- x402 payment flow: client receives `402` with `Payment-Required` header containing JSON payment requirements; client constructs `PaymentPayload` with EVM/Solana transaction; re-sends request with `X-PAYMENT` header; server responds `200` or `402` with reason
- `PaymentRequirements` schema: `scheme`, `network`, `maxAmountRequired`, `resource`, `description`, `mimeType`, `payTo`, `maxTimeoutSeconds`, `asset`, `extra`
- `PaymentPayload` schema: `x402Version`, `scheme`, `network`, `payload` (scheme-specific)

### DID / Verifiable Data Registry
- did:web — DID document hosted at `https://{domain}/.well-known/did.json`; resolution requires HTTPS fetch
- did:ethr — DID anchored on Ethereum; resolved via ERC-1056 registry; supports key rotation
- did:key — self-contained DID derived from public key; no registry required; used for ephemeral agent identities
- DID Document fields: `id`, `verificationMethod`, `authentication`, `assertionMethod`, `service`
- DID service endpoint — `type: "ProofLinkCompliance"` or `type: "AgentPayment"` for agent discovery

### JSON-LD and Linked Data
- `@context` array in KYACredential — standard W3C VC context + ProofLink extension context
- JSON-LD framing — used to extract specific fields from VC for selective disclosure
- EAS attestation data — currently JSON-encoded; JSON-LD framing enables machine-readable schema

---

## ProofLink-Specific Contributions

### Protocol Ownership
- `packages/x402-compliance/src/` — entire x402 compliance middleware: `before-settle.ts` (sanctions check pre-settlement), `after-settle.ts` (receipt generation post-settlement), `extension.ts` (ResourceServerExtension enriching 402 response with compliance policy metadata), `adapters/hono.ts`, `adapters/express.ts`
- `packages/mcp-server/src/` — entire MCP server implementation; all 11 tools; 3 resource endpoints; SSE and stdio transports
- `packages/shared/src/types/mcp.ts` — all MCP tool input/output schemas: `CheckSanctionsInput/Output`, `VerifyKYAInput/Output`, `SubmitTravelRuleInput/Output`, `PayWithComplianceInput/Output`
- `packages/shared/src/types/protocol.ts` — canonical protocol types: `PaymentProtocol` (X402, MPP, AP2, ACP, DIRECT), `PaymentIntent`, `SettlementResult`, `ComplianceRequest`

### Key Protocol Design Decisions
- `PaymentProtocol` enum in `protocol.ts` supports X402, MPP (Multi-Party Payment), AP2, ACP, DIRECT — extensible without breaking change
- x402 extension (`extension.ts`) adds `complianceRequired`, `provider`, `sanctionsLists`, `travelRuleThresholdUsd`, `maxRiskScore` to 402 response — allows client agent to pre-screen before attempting payment
- ProofLink key in `settledProofLinks` map is derived from `payloadKey(paymentPayload)` — ensures one compliance receipt per unique payment payload; prevents replay
- MCP SSE transport supports multiple concurrent Claude agent connections; stdio for single-agent use
- `PaymentIntent.requireKya` flag triggers agent identity verification before payment proceeds
- `PaymentIntent.dryRun` flag returns `DRY_RUN_PASSED`/`DRY_RUN_BLOCKED` without executing on-chain — allows agents to pre-validate

### AP2 Mandate Integration Gap
- AP2 mandate handling is declared in `PaymentProtocol` but no `AP2Handler` implementation exists yet
- Need: `AP2MandateValidator` class verifying mandate signature, amount/frequency constraints, and expiry

---

## Key References and Resources

- x402 Protocol Spec: https://x402.org/
- x402 SDK (Coinbase): https://github.com/coinbase/x402
- MCP Specification: https://modelcontextprotocol.io/specification
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- A2A Protocol: https://google.github.io/A2A/
- A2A Specification: https://github.com/google/A2A/blob/main/specification.md
- ACP (Agent Communication Protocol): https://agentcommunicationprotocol.dev/
- XMTP Documentation: https://docs.xmtp.org/
- ANP (Agent Network Protocol): https://agent-network-protocol.com/
- ERC-7683 Cross-Chain Intents: https://eips.ethereum.org/EIPS/eip-7683
- DID Core Specification (W3C): https://www.w3.org/TR/did-core/
- JSON-LD 1.1 (W3C): https://www.w3.org/TR/json-ld11/
- W3C VC Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/
- Hono Framework: https://hono.dev/
