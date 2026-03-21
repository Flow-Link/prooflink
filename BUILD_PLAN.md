# FlowLink Build Plan — Full Implementation

## Monorepo Structure
```
flowlink/
├── packages/
│   ├── core/                 # ProofLink Engine — compliance decision pipeline
│   ├── x402-compliance/      # x402 middleware — npm package
│   ├── mcp-server/           # MCP compliance server
│   ├── sdk/                  # FlowLink SDK for integrators
│   ├── contracts/            # Solidity smart contracts (Foundry)
│   └── shared/               # Shared types, utils, constants
├── apps/
│   ├── api/                  # REST API server (Hono)
│   ├── dashboard/            # Web dashboard (Next.js)
│   └── demo/                 # Demo app for hackathons
├── tests/
│   ├── unit/                 # Unit tests per package
│   ├── integration/          # Cross-package integration tests
│   └── e2e/                  # End-to-end tests
├── docs/                     # API documentation
├── turbo.json
├── package.json
└── biome.json
```

## Build Teams

### Team 1: Core Infrastructure (packages/shared + packages/core)
- Shared types, constants, error handling
- ProofLink Engine — sanctions screening, AML scoring, compliance decisions
- Database schema (PostgreSQL + Drizzle ORM)

### Team 2: Smart Contracts (packages/contracts)
- ProofLinkRegistry.sol (EAS attestation)
- FlowLinkKYA.sol (agent identity)
- AgentInvoice.sol (invoice anchoring)
- FlowLinkFacilitator.sol (x402 compliance gate)
- Foundry tests

### Team 3: x402 Middleware (packages/x402-compliance)
- x402 compliance hooks (onBeforeVerify, onBeforeSettle, onAfterSettle)
- ProofLink receipt generation
- npm package ready to publish

### Team 4: MCP Server (packages/mcp-server)
- 6 MCP tools: check_sanctions, verify_kya, create_compliant_invoice, submit_travel_rule, get_compliance_receipt, pay_with_compliance
- stdio + SSE transport

### Team 5: API Server (apps/api)
- REST endpoints for ProofLink Engine
- WebSocket for real-time compliance events
- Auth (API keys + JWT)
- Rate limiting

### Team 6: Dashboard (apps/dashboard)
- Next.js web app
- Payment monitoring
- Compliance receipts viewer
- Invoice management
- Agent KYA management

### Team 7: SDK (packages/sdk)
- TypeScript client library
- High-level API wrapping REST endpoints

### Team 8: Demo App (apps/demo)
- Hackathon demo — AI agent paying via x402 with compliance
- 3-minute demo script implementation

### Team 9: Testing & Review
- Unit tests for every package
- Integration tests
- E2e tests
- Code review on all PRs

### Team 10: Documentation
- API docs
- Integration guides
- README files
</content>
</invoke>