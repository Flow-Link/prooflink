<p align="center">
  <img src="https://via.placeholder.com/200x200?text=FlowLink" alt="FlowLink Logo" width="200" />
</p>

<h1 align="center">FlowLink</h1>

<p align="center">
  <strong>Compliance-as-infrastructure for AI agent payments</strong>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/npm-%40flowlink%2Fsdk-blue?logo=npm" alt="npm" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Solidity-0.8.25-363636?logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build" />
  <img src="https://img.shields.io/badge/Base-Sepolia-0052FF?logo=coinbase" alt="Base Sepolia" />
</p>

<p align="center">
  The neutral middleware that makes every stablecoin payment legal, auditable, and enterprise-safe.<br/>
  Sanctions screening. FATF Travel Rule. Know Your Agent. On-chain compliance receipts.<br/>
  One API call. Every protocol.
</p>

---

## Why FlowLink

Six agent payment protocols launched in 12 months. **Zero have native compliance.**

- **Regulation is here.** The GENIUS Act (July 2025) and MiCA (mid-2026) make stablecoin compliance a legal requirement. 99 jurisdictions enforce the FATF Travel Rule. The fine wave is imminent.
- **Agent payments have no identity layer.** x402, MPP, AP2, ACP, Visa TAP, Mastercard Agent Pay -- none define how originator information travels with autonomous agent transactions.
- **No compliance MCP server exists.** Payment MCP servers are proliferating (PayPal, Worldpay, Marqeta). Compliance MCP servers: zero. Agents can `get_weather()` but cannot `check_sanctions()`.
- **Acquirers are buying now.** Mastercard acquired BVNK for $1.8B. Stripe acquired Bridge for $1.1B. Both compliance-native stablecoin infrastructure. The playbook is proven.

---

## What FlowLink Does

```
                    ┌─────────────────────────────────┐
                    │         AI Agent / App           │
                    │  (Claude, LangChain, Custom)     │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │      FlowLink SDK / MCP         │
                    │   @flowlink/sdk  |  MCP Server   │
                    └──────────────┬──────────────────┘
                                   │
         ┌─────────────────────────▼─────────────────────────┐
         │              FlowLink Compliance Engine            │
         │                                                    │
         │  ┌────────────┐ ┌──────────┐ ┌──────────────────┐ │
         │  │ Sanctions   │ │ AML      │ │ Travel Rule      │ │
         │  │ Screening   │ │ Scoring  │ │ (FATF/Notabene)  │ │
         │  └────────────┘ └──────────┘ └──────────────────┘ │
         │  ┌────────────┐ ┌──────────┐ ┌──────────────────┐ │
         │  │ KYA        │ │ Juris-   │ │ ProofLink        │ │
         │  │ (Agent ID) │ │ diction  │ │ Receipts (EAS)   │ │
         │  └────────────┘ └──────────┘ └──────────────────┘ │
         └─────────────────────────┬─────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        ┌──────────┐        ┌──────────┐        ┌──────────┐
        │   x402   │        │   MPP    │        │   AP2    │
        │ (Coinbase)│        │ (Stripe) │        │ (Visa)   │
        └──────────┘        └──────────┘        └──────────┘
```

**Key features:**

- **ProofLink Receipts** -- Cryptographically signed, on-chain compliance attestations via EAS. The document a CFO hands to an auditor.
- **Know Your Agent (KYA)** -- W3C Verifiable Credential standard for AI agent identity. Who built it, who controls it, what it can spend.
- **Agent Invoice Standard** -- Machine-readable invoice format for autonomous agent commerce. JSON-LD schema with on-chain anchoring.
- **Cross-Protocol Compliance** -- One engine spanning x402, MPP, AP2, ACP, and direct transfers. More fragmentation = more value.
- **MCP Compliance Server** -- Six tools that make compliance an ambient capability for any AI agent.
- **Real-Time Dashboard** -- Monitor compliance checks, risk distribution, and travel rule status.

---

## Quick Start

```bash
npm install @flowlink/sdk
```

```ts
import { FlowLinkClient } from "@flowlink/sdk";

const flowlink = new FlowLinkClient({ apiKey: process.env.FLOWLINK_API_KEY! });

const decision = await flowlink.checkCompliance({
  sender: { address: "0xAlice", chain: "base" },
  receiver: { address: "0xBob", chain: "base" },
  amount: "5000",
  asset: "USDC",
});

console.log(decision.status);    // "APPROVED"
console.log(decision.riskScore); // 12
console.log(decision.receiptId); // "a1b2c3d4-..."  <- on-chain proof
```

That single call runs sanctions screening on both parties, AML risk scoring, Travel Rule transmission, and jurisdictional checks. The receipt is your audit trail.

---

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@flowlink/core`](packages/core) | ProofLink compliance decision engine | ![core](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/sdk`](packages/sdk) | TypeScript client SDK | ![sdk](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/x402-compliance`](packages/x402-compliance) | x402 protocol compliance middleware | ![x402](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/mcp-server`](packages/mcp-server) | MCP compliance server for AI agents | ![mcp](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/contracts`](packages/contracts) | Solidity smart contracts (Foundry) | ![contracts](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/shared`](packages/shared) | Shared types, schemas, constants | ![shared](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/request-finance`](packages/integrations/request-finance) | Request Network integration | ![request](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/api`](apps/api) | Hono REST API server | ![api](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/dashboard`](apps/dashboard) | Next.js 15 admin dashboard | ![dashboard](https://img.shields.io/badge/-ready-brightgreen) |
| [`@flowlink/demo`](apps/demo) | Interactive hackathon demo | ![demo](https://img.shields.io/badge/-ready-brightgreen) |

---

## x402 Integration

Drop compliance into any x402 payment server in 3 lines:

```ts
import { createFlowLinkCompliance } from "@flowlink/x402-compliance";

const compliance = createFlowLinkCompliance({
  chainalysisApiKey: process.env.CHAINALYSIS_API_KEY!,
  policy: {
    sanctionsLists: ["OFAC_SDN", "EU", "UN"],
    maxRiskScore: 70,
    travelRuleThresholdUsd: 3000,
  },
});

compliance.register(server); // Hooks into onBeforeVerify, onBeforeSettle, onAfterSettle
// Every x402 payment now has compliance enforced automatically
```

Three hook points fire automatically:
1. **Before verify** -- sanctions screening + AML scoring on the payer
2. **Before settle** -- travel rule transmission for transfers above threshold
3. **After settle** -- ProofLink receipt generation + EAS attestation

[Full x402 guide](docs/x402-integration.md)

---

## MCP Integration

Give any AI agent compliance superpowers. Six tools, one server.

**Claude Desktop** -- add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flowlink-compliance": {
      "command": "npx",
      "args": ["@flowlink/mcp-server"],
      "env": {
        "FLOWLINK_API_KEY": "fl_live_your_api_key"
      }
    }
  }
}
```

**Available MCP tools:**

| Tool | Description |
|------|-------------|
| `check_sanctions` | Screen addresses/entities against OFAC, EU, UN, HMT sanctions lists |
| `verify_kya` | Verify AI agent identity, authorization, and compliance standing |
| `create_compliant_invoice` | Generate compliance-stamped invoices for agent services |
| `submit_travel_rule` | Transmit FATF Travel Rule originator/beneficiary data |
| `pay_with_compliance` | End-to-end compliant stablecoin payment with all checks |
| `get_compliance_receipt` | Retrieve cryptographically signed compliance proof for audit |

**Example conversation:**

> **User:** Pay 5,000 USDC to 0xBob on Base for the data analysis job.
>
> **Claude:** I'll check compliance first.
> *[calls `check_sanctions`]* -- Clear, risk score 2/100.
> *[calls `pay_with_compliance`]* -- Payment completed. Tx: `0xa1b2c3...`, Receipt: `rcpt_abc123`.

[Full MCP guide](docs/mcp-integration.md)

---

## Smart Contracts

Solidity 0.8.25, built with Foundry, deployed on **Base Sepolia** (upgradeable via ERC-1967 proxy).

| Contract | Purpose | Key Feature |
|----------|---------|-------------|
| `ProofLinkRegistry.sol` | On-chain compliance receipt registry | EAS attestations with custom schema |
| `FlowLinkKYA.sol` | Know Your Agent identity attestations | ERC-8004 compatible agent registry |
| `AgentInvoice.sol` | Autonomous agent invoice management | Content hash anchoring + state machine |
| `FlowLinkFacilitator.sol` | x402 compliant payment facilitator | Pre-settlement compliance gate |

**Deploy to Base Sepolia:**

```bash
cd packages/contracts
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
```

Dependencies: OpenZeppelin Contracts, OpenZeppelin Upgradeable, EAS (Base native at `0x4200...0021`).

---

## Dashboard

<p align="center">
  <em>[Dashboard screenshot placeholder -- run <code>pnpm --filter=@flowlink/dashboard dev</code> at localhost:3100]</em>
</p>

**Next.js 15 admin dashboard** with real-time compliance monitoring:

- **Live compliance feed** -- every check as it happens, with risk scores and status
- **Risk distribution** -- visualize low/medium/high/critical risk across all transactions
- **Volume analytics** -- transaction volume by chain (Base, Ethereum, Polygon) and token (USDC, USDT)
- **Travel Rule tracker** -- transmission status, counterparty VASP acknowledgments
- **Agent KYA management** -- register agents, view trust scores, manage delegation scopes
- **Invoice lifecycle** -- create, issue, track, and settle invoices with compliance stamps
- **Compliance receipts** -- browse and export ProofLink receipts for auditors

Stack: React 19, Radix UI, TanStack Query, Recharts, Tailwind CSS.

---

## Architecture

### ProofLink Decision Pipeline

Every transaction flows through a six-stage compliance pipeline. The entire pipeline completes in under 200ms.

```
  Payment Request
        │
        ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Sanctions   │───▶│     AML       │───▶│  Travel Rule  │
│   Screening   │    │   Scoring     │    │ Transmission  │
│ (OFAC/EU/UN)  │    │  (0-100)      │    │ (FATF/GENIUS) │
└───────────────┘    └───────────────┘    └───────────────┘
                                                  │
                                                  ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  KYA Check    │◀──│ Jurisdiction  │◀──│   Decision    │
│ (Agent ID)    │    │   Rules       │    │   Engine      │
│ (ERC-8004)    │    │ (MiCA/GENIUS) │    │ (APPROVE/     │
└───────────────┘    └───────────────┘    │  ESCALATE/    │
                                          │  REJECT)      │
                                          └───────┬───────┘
                                                  │
                                                  ▼
                                          ┌───────────────┐
                                          │  ProofLink    │
                                          │  Receipt      │
                                          │ (EAS on-chain)│
                                          └───────────────┘
```

**Decision thresholds:**

| Risk Score | Decision | Action |
|------------|----------|--------|
| 0-49 | `APPROVED` | Payment proceeds |
| 50-79 | `ESCALATED` | Manual review required |
| 80-100 | `REJECTED` | Payment blocked |

### Know Your Agent (KYA)

A W3C Verifiable Credential profile for AI agent identity:

```json
{
  "type": ["VerifiableCredential", "KYACredential"],
  "credentialSubject": {
    "id": "did:flowlink:agent:data-processor",
    "agentType": "autonomous",
    "controllingEntity": {
      "name": "DataCo Inc",
      "lei": "549300EXAMPLE00000",
      "kybVerified": true
    },
    "delegationScope": {
      "maxTransactionValue": 10000,
      "dailyLimit": 50000,
      "allowedChains": ["eip155:8453"],
      "expiresAt": "2027-01-01T00:00:00Z"
    }
  }
}
```

KYA answers four questions regulators ask about agent payments:
1. **Who built it?** -- Controlling entity with KYB verification
2. **Who authorized it?** -- Delegation scope with spending limits
3. **What can it do?** -- Allowed chains, currencies, counterparties
4. **When does authority expire?** -- Time-bounded credentials

### Compliance Receipt Flow

```
Transaction ──▶ FlowLink Engine ──▶ ProofLink Receipt ──▶ EAS Attestation
                     │                     │                     │
                     │              receipt_hash          attestation_uid
                     │              signature             on-chain proof
                     │                     │                     │
                     └─────────────────────┴─────────────────────┘
                                           │
                                    Auditor retrieves
                                    via receipt ID or
                                    tx hash
```

---

## API

Base URL: `https://api.flowlink.io/v1`

### Run a compliance check

```bash
curl -X POST https://api.flowlink.io/v1/compliance/check \
  -H "Authorization: Bearer fl_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "address": "0xAlice", "chain": "base" },
    "receiver": { "address": "0xBob", "chain": "base" },
    "amount": "5000",
    "asset": "USDC"
  }'
```

### Screen an address

```bash
curl -X POST https://api.flowlink.io/v1/compliance/screen \
  -H "Authorization: Bearer fl_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68",
    "chain": "base"
  }'
```

### Verify an agent

```bash
curl -X POST https://api.flowlink.io/v1/identity/verify \
  -H "Authorization: Bearer fl_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "did:flowlink:agent:data-processor",
    "chain": "eip155:8453"
  }'
```

[Full API reference](docs/api-reference.md) -- every endpoint, field, and error code.

---

## Key Innovations

### ProofLink: On-Chain Compliance Receipts

Every compliance decision generates a cryptographically signed receipt, optionally attested on-chain via the Ethereum Attestation Service (EAS). ProofLink receipts are the document a CFO hands to an auditor -- structured, tamper-proof, and legally meaningful.

### KYA: Know Your Agent Standard

The first identity standard designed for autonomous AI agents. A W3C Verifiable Credential profile that binds an agent to its controlling entity, defines spending limits, and enables Travel Rule compliance for agent-to-agent payments. Compatible with ERC-8004 agent registries.

### Agent Invoice Standard (AIS-1)

A JSON-LD invoice schema purpose-built for autonomous agent commerce. Bridges the gap between "transaction hash" and "CFO-approved invoice" with service categories, work proof URIs, and on-chain content anchoring.

### Multi-Protocol Compliance

One compliance engine spanning every major agent payment protocol:

| Protocol | Creator | FlowLink Integration |
|----------|---------|---------------------|
| **x402** | Coinbase | Middleware hooks (onBeforeVerify, onBeforeSettle, onAfterSettle) |
| **MPP** | Stripe | Session compliance via API |
| **AP2** | Visa | Pre-authorization compliance gate |
| **ACP** | Crossmint | Transaction-level screening |
| **Direct** | -- | Standard ERC-20 transfer compliance |

---

## Roadmap

| Quarter | Milestone |
|---------|-----------|
| **Q1 2026** | Core engine, x402 middleware, MCP server, SDK, smart contracts, dashboard |
| **Q2 2026** | Production deployment, first design partners, hackathon wins (ETHGlobal / Coinbase Agents in Action) |
| **Q3 2026** | KYA standard submission to W3C CCG, MPP + AP2 integrations, agent-to-human compliance flows |
| **Q4 2026** | Agent-to-agent compliance, behavioral AML models, dispute resolution, Request Finance bridge live |

---

## Self-Hosting

```bash
# Prerequisites: Node.js >= 22, pnpm 9.15+, Docker

# Clone and install
git clone https://github.com/AkashMaher/flow-link.git
cd flow-link
corepack enable && pnpm install

# Start infrastructure
cp .env.example .env  # Configure DATABASE_URL, REDIS_URL, RPC URLs
docker compose up -d postgres redis

# Run database migrations and start
pnpm --filter=@flowlink/api db:migrate
pnpm dev  # Starts API (3001) + Dashboard (3100) in parallel
```

**Run the hackathon demo:**

```bash
pnpm --filter=@flowlink/demo dev        # Full interactive demo
pnpm --filter=@flowlink/demo demo:sanctions  # Sanctions screening scenario
pnpm --filter=@flowlink/demo demo:payment    # Compliant payment flow
```

---

## Contributing

1. **Branch naming:** `feature/`, `fix/`, `refactor/`, `docs/`
2. **Commits:** Conventional commits -- `feat(core): add travel rule validation`
3. **Type safety:** Strict TypeScript everywhere, no `any` without justification
4. **Testing:** `pnpm test` must pass. Smart contracts: `forge test -vvv`
5. **Linting:** `pnpm lint` (Biome). Contracts: `forge fmt --check`

See the [Developer Guide](docs/DEVELOPER_README.md) for full monorepo setup, package details, and deployment instructions.

---

## License

MIT

---

## Team

| | Name | Role |
|---|------|------|
| | **Akash Maher** | Co-founder & Engineering -- IIT Patna, CERN GSoC, vLLM contributor |
| | *[Co-founder]* | *[TBD]* |

---

<p align="center">
  <strong>FlowLink</strong> -- the trust layer for the agent economy.
  <br/>
  <a href="docs/quickstart.md">Quick Start</a> &middot;
  <a href="docs/api-reference.md">API Reference</a> &middot;
  <a href="docs/sdk-reference.md">SDK Reference</a> &middot;
  <a href="docs/mcp-integration.md">MCP Integration</a> &middot;
  <a href="docs/x402-integration.md">x402 Integration</a> &middot;
  <a href="docs/kya-guide.md">KYA Guide</a> &middot;
  <a href="docs/compliance-concepts.md">Compliance Concepts</a> &middot;
  <a href="docs/architecture.md">Architecture</a> &middot;
  <a href="EXECUTIVE_SUMMARY.md">Executive Summary</a>
</p>
