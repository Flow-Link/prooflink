# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-03-21

Initial release of FlowLink — compliance-as-infrastructure for stablecoin and AI agent payments.

### Added

- **@flowlink/shared** — Shared types, constants, and utilities across all packages
- **@flowlink/core** — ProofLink compliance decision engine (sanctions screening, KYC, AML)
- **@flowlink/sdk** — TypeScript client SDK for the FlowLink compliance API
- **@flowlink/x402-compliance** — Compliance middleware for x402 payment protocol (sanctions, AML, Travel Rule, ProofLink receipts, rate limiting, multi-chain)
- **@flowlink/mcp-server** — MCP compliance server for AI agent integration (sanctions screening, KYA, travel rule, compliant payments)
- **@flowlink/contracts** — Solidity smart contracts for compliance receipts, KYA, invoices, and x402 facilitator (Foundry)
- **@flowlink/integrations** — Optional external service integrations for compliance infrastructure
- **apps/api** — HTTP API server
- **apps/dashboard** — Web dashboard (Next.js)
- **apps/demo** — Demo application
- Monorepo setup with pnpm workspaces and Turborepo
- Biome for linting and formatting
- Docker Compose for local development (Postgres, Redis)
