# ProofLink Agent Team

## Overview
10 expert AI agent personas designed to build ProofLink — the trust/compliance layer for the agent economy. Each persona has deep domain expertise, specific tools, and owns specific gaps from the MASTER_GAP_LIST.md.

## Team Structure

```
.claude/team/
├── README.md              ← You are here
├── MASTER_GAP_LIST.md     ← 25 prioritized gaps from 6.5MB research
├── personas/
│   ├── 01-compliance-architect.md
│   ├── 02-smart-contract-engineer.md
│   ├── 03-cryptography-zk-engineer.md
│   ├── 04-protocol-standards-engineer.md
│   ├── 05-security-researcher.md
│   ├── 06-fullstack-typescript-engineer.md
│   ├── 07-blockchain-multichain-engineer.md
│   ├── 08-devops-observability-engineer.md
│   ├── 09-product-economics-strategist.md
│   └── 10-legal-regulatory-advisor.md
└── research/              ← Raw research outputs (6.5MB+)
```

## How to Use

Every prompt in this repository should spawn 8 parallel agents, each embodying a relevant persona. The CLAUDE.md file contains instructions for automatic persona-based agent dispatch.

## Research Corpus
25 research agents produced 6.5MB+ of findings across:
- Payment protocols (x402, AP2, MCP, A2A, ACP, MPP)
- Blockchain ecosystems (Ethereum, Solana, cross-chain, L2s)
- Security (MEV, prompt injection, key management, oracle manipulation)
- Compliance (KYC/AML, sanctions, Travel Rule, regulatory landscape)
- Economics (pricing, billing, tokenomics, dispute resolution)
- Identity (DIDs, ERC-8004, KYA, reputation systems)
- Developer experience (SDKs, testing, simulation, observability)

## Implementation Phases
1. **Foundation** (Weeks 1-4): Fix auth HMAC, audit log, spend enforcement, risk scoring, oracle guard
2. **Core Compliance** (Weeks 5-12): Real-time screening, dynamic sanctions, KYA standard, cross-protocol compliance
3. **Trust Infrastructure** (Weeks 13-20): Escrow, disputes, ZK attestations, selective disclosure
4. **Scale & Interop** (Weeks 21-30): Distributed tracing, cross-chain policy, agent discovery, saga orchestrator
