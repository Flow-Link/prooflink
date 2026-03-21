# x402 Protocol: Exhaustive GitHub & Ecosystem Research

**Date:** 2026-03-20
**Researcher:** Claude (Sonnet 4.6)
**Purpose:** Comprehensive survey of x402 implementations, SDKs, tools, and ecosystem for FLOW-LINK integration research.

---

## Table of Contents

1. [Protocol Overview](#1-protocol-overview)
2. [Official Coinbase Repository](#2-official-coinbase-repository)
3. [Protocol Specification Deep Dive](#3-protocol-specification-deep-dive)
4. [Language SDKs & Packages](#4-language-sdks--packages)
5. [Server Framework Middleware](#5-server-framework-middleware)
6. [Client Libraries](#6-client-libraries)
7. [Facilitator Implementations](#7-facilitator-implementations)
8. [AI Agent & MCP Integrations](#8-ai-agent--mcp-integrations)
9. [Chain-Specific Implementations](#9-chain-specific-implementations)
10. [Alternative / Related Protocols](#10-alternative--related-protocols)
11. [Infrastructure Providers](#11-infrastructure-providers)
12. [Example Applications & Demos](#12-example-applications--demos)
13. [Hackathon Projects](#13-hackathon-projects)
14. [Package Registry Summary](#14-package-registry-summary)
15. [Blockchain Standards Used](#15-blockchain-standards-used)
16. [Ecosystem Stats & Traction](#16-ecosystem-stats--traction)
17. [Key Risks & Observations](#17-key-risks--observations)

---

## 1. Protocol Overview

x402 is an open payment standard that revives the dormant HTTP `402 Payment Required` status code for on-chain micropayments. Developed initially by Coinbase and formalized into an independent foundation (co-founded with Cloudflare, Sept 2025), it enables resource servers to require payment with minimal code while clients — human or AI agent — pay autonomously using stablecoins.

**Core Flow (12 steps):**
1. Client requests resource
2. Server returns `402 Payment Required` with `PAYMENT-REQUIRED` header (JSON body listing accepted payment options)
3. Client selects a `(scheme, network)` pair, creates cryptographic payment payload
4. Client resends request with `X-PAYMENT` header containing signed payload
5. Server verifies locally or POSTs to facilitator `/verify`
6. Facilitator validates signature, balance, nonce, timing
7. Server rejects (returns 402 again) or proceeds
8. Server settles via facilitator `/settle` endpoint (or self-settles on EVM)
9. Facilitator submits `transferWithAuthorization` (EIP-3009) to blockchain
10. Facilitator awaits confirmation
11. Facilitator returns execution response
12. Server returns `200 OK` with resource + `X-PAYMENT-RESPONSE` header

**Key concepts:**
- **Scheme**: payment mechanism (currently: `exact` — fixed amount; `upto` — consumption-based)
- **Network**: the blockchain for settlement (eip155:8453 = Base, solana:5eykt... = Solana mainnet, etc.)
- **Facilitator**: trusted third party (or self-hosted) that verifies and settles
- **No new HTTP round-trips**: payment fits within normal request/response cycle

**License:** Apache 2.0
**Governance:** x402 Foundation (Coinbase + Cloudflare, Sept 2025)
**Website:** https://www.x402.org
**Spec repo:** https://github.com/coinbase/x402/tree/main/specs
**Whitepaper:** https://www.x402.org/x402-whitepaper.pdf

---

## 2. Official Coinbase Repository

**https://github.com/coinbase/x402**

| Metric | Value |
|--------|-------|
| Stars | ~5,700 |
| Contributors | 248 |
| Used by | 585+ projects |
| Languages | TypeScript 43%, Python 34%, Go 22%, Solidity 0.5%, Java 0.3% |
| License | Apache 2.0 |

**Directory structure:**
```
coinbase/x402/
├── contracts/evm/         # Solidity contracts (Permit2 proxy: 0x402085c248EeA27D92E8b30b2C58ed07f9E20001)
├── docs/                  # GitBook source
├── e2e/                   # End-to-end tests
├── examples/              # Per-language examples (go, java, python, typescript)
├── go/                    # Go SDK
├── java/                  # Java SDK
├── python/                # Python SDK
├── specs/                 # Protocol specifications
│   └── schemes/exact/
│       └── scheme_exact_evm.md   # EVM payment scheme spec
├── static/                # Static assets
└── typescript/            # TypeScript monorepo
```

**Active development:** 199 issues, 159 PRs as of March 2026. ROADMAP.md says "update coming soon."

---

## 3. Protocol Specification Deep Dive

### EVM Exact Scheme (`scheme_exact_evm`)

Three asset transfer methods supported:

#### 3a. EIP-3009 (preferred — gasless)
- Payer signs off-chain `transferWithAuthorization` message (EIP-712 typed data)
- Payload includes: `signature` (65 bytes), `authorization` object with `{from, to, value, validAfter, validBefore, nonce}`
- Facilitator calls `token.transferWithAuthorization(...)` on-chain
- Works natively with USDC on Base, Polygon, Avalanche

#### 3b. Permit2 (universal fallback)
- Works with any ERC-20 token
- Client approves Permit2 contract once (or uses EIP-2612 signature permit for gasless setup)
- Payment uses canonical proxy deployed via CREATE2: **`0x402085c248EeA27D92E8b30b2C58ed07f9E20001`** (same address on all EVM chains)
- Payload: `signature` + `permit2Authorization: {permitted, from, spender, nonce, deadline, witness: {to, validAfter}}`
- Error 412 returned if Permit2 allowance not set (one-time setup signal)

#### 3c. ERC-7710 (smart account delegation)
- For smart contract wallets (account abstraction)
- Payer provides `permissionContext` (delegation proof) + `delegationManager` address
- Facilitator calls `redeemDelegations()` to execute transfer on behalf of delegator
- Race condition risk: client can invalidate delegation between simulation and settlement

### Payment Headers
- **Request:** `X-PAYMENT: <base64-encoded JSON payload>`
- **Response (402):** `PAYMENT-REQUIRED: <JSON with accepted options>`
- **Response (200):** `X-PAYMENT-RESPONSE: <settlement confirmation>`

### Supported Networks (official)
- `eip155:8453` — Base Mainnet
- `eip155:84532` — Base Sepolia (testnet)
- `eip155:137` — Polygon Mainnet
- `eip155:43114` — Avalanche C-Chain
- `solana:5eykt4UsFv8P8NJdTREpY1wzqMH` — Solana Mainnet
- `solana:EtWTRABZaYq6i` — Solana Devnet

### Supported Tokens
- USDC (primary — EIP-3009 native on Base, Polygon, Avalanche)
- USDT (via Permit2)
- Any ERC-20 (via Permit2)
- SOL and SPL tokens (Solana)

---

## 4. Language SDKs & Packages

### TypeScript / JavaScript (npm)

All official packages live at https://github.com/coinbase/x402/tree/main/typescript

| Package | npm | Role |
|---------|-----|------|
| `x402` | https://www.npmjs.com/package/x402 | Core types, schemas, utilities |
| `@x402/core` | https://www.npmjs.com/package/@x402/core | Core protocol logic |
| `@x402/evm` | https://www.npmjs.com/package/@x402/evm | EVM payment signing & verification |
| `@x402/svm` | — | Solana payment signing |
| `@x402/fetch` | https://www.npmjs.com/package/@x402/fetch | Fetch API wrapper (auto-handles 402) |
| `@x402/axios` | https://www.npmjs.com/package/x402-axios | Axios interceptor |
| `@x402/express` | https://www.npmjs.com/package/x402-express | Express.js paywall middleware |
| `@x402/hono` | — | Hono framework middleware |
| `@x402/next` | https://www.npmjs.com/package/x402-next | Next.js App Router middleware |
| `@x402/paywall` | — | Browser paywall UI component |
| `@x402/extensions` | — | Protocol extensions |
| `@coinbase/x402` | https://www.npmjs.com/package/@coinbase/x402 | Coinbase hosted facilitator client |
| `x402-solana` | https://www.npmjs.com/package/x402-solana | Solana protocol v2 implementation |
| `x402-analytics` | https://www.npmjs.com/package/x402-analytics | Analytics/monitoring wrapper |
| `@hyperpay/x402` | https://www.npmjs.com/package/@hyperpay/x402 | HyperPay facilitator package |

### Python (PyPI)

**https://pypi.org/project/x402/** — Official Coinbase Python SDK

| Detail | Value |
|--------|-------|
| Version | 2.4.0 (Mar 16, 2026) |
| Python | >=3.10 |
| Status | Alpha |
| License | MIT |

Install with extras:
```bash
pip install x402[all]           # everything
pip install x402[fastapi,evm]   # FastAPI + EVM
pip install x402[flask,svm]     # Flask + Solana
pip install x402[httpx]         # httpx client
pip install x402[requests]      # requests client
```

Key classes:
- `x402Client` / `x402ClientSync` — HTTP client that auto-pays 402s
- `x402ResourceServer` / `x402ResourceServerSync` — server-side middleware
- `x402Facilitator` / `x402FacilitatorSync` — facilitator implementation
- `HTTPFacilitatorClient` — client to talk to remote facilitator
- `ResourceConfig` — route-level payment config

Community Python packages:
- `tvm-x402` — TVM chain support
- `x402-python-client` — alternative client
- `django-x402` — Django integration

### Go

**`github.com/coinbase/x402/go`** — Official Go SDK (part of main repo)

```bash
go get github.com/coinbase/x402/go
```

Community: `mark3labs/mcp-go-x402` — archived Nov 2025, merged into main x402-go lib.

### Rust (crates.io)

| Crate | Description |
|-------|-------------|
| `x402` | Core minimal implementation |
| `x402-rs` | Full toolkit (verify, settle, monitor) |
| `x402-chain-eip155` | EVM/EIP-155 adapter (v1 + v2) |
| `x402-chain-solana` | Solana adapter |
| `x402-facilitator` | Facilitator binary |
| `x402-axum` | Axum web framework middleware |
| `x402-reqwest` | Reqwest client wrapper |
| `nginx-x402` | Pure Rust Nginx module for x402 |
| `r402-evm` | r402 project EVM crate |
| `x402-sdk-solana-rust` | Solana Rust SDK |
| `tempo-x402-node` | Tempo node implementation |

Docs: https://docs.rs/x402-rs/latest/x402_rs/

### Ruby

- **`x402-rails`** — https://github.com/quiknode-labs/x402-rails — Rails 7.0+ gem, `x402_paywall(amount: 0.001)` one-liner, Base/Avalanche, v1+v2
- **`x402-payments`** — https://github.com/quiknode-labs/x402-payments — Lower-level Ruby gem for generating signed payment HTTP headers

### .NET / C#

**https://github.com/michielpost/x402-dotnet** (10 stars)

Packages:
- `x402` — Core server (attribute + middleware)
- `x402.Coinbase` — Coinbase facilitator integration
- `x402.Client.EVM` — Client with embedded EVM wallet
- `x402.FacilitatorWeb` — Self-hosted facilitator for EVM + Solana

Uses `[PaymentRequired]` attribute on controller actions.

### Java

Mentioned in Coinbase repo (`java/` directory). Community: **Mogami** (Java-exclusive facilitator, mentioned in awesome-x402).

---

## 5. Server Framework Middleware

| Framework | Language | Package/Repo | Notes |
|-----------|----------|-------------|-------|
| Express.js | TypeScript | `@x402/express` (npm) | Official |
| Next.js | TypeScript | `@x402/next` (npm) | App Router middleware |
| Hono | TypeScript | `@x402/hono` (npm) | Edge-compatible |
| FastAPI | Python | `x402[fastapi]` (PyPI) | Official |
| Flask | Python | `x402[flask]` (PyPI) | Official |
| Axum | Rust | `x402-axum` (crates.io) | Via x402-rs |
| Rails | Ruby | `x402-rails` gem | QuickNode Labs |
| ASP.NET | C# | `x402` NuGet | x402-dotnet |
| Cloudflare Workers | TypeScript | CF template | Open source template |
| Django | Python | `django-x402` (PyPI) | Community |

**Cloudflare Workers template** — proxy with payment-gated routes, HMAC-SHA256 JWT cookies (1hr validity), three proxy modes: DNS, External Origin, Service Binding. Updated Jan 9, 2026. Docs: https://developers.cloudflare.com/agents/x402/

---

## 6. Client Libraries

| Library | Language | Behavior |
|---------|----------|----------|
| `@x402/fetch` | TypeScript | Wraps native `fetch`, detects 402, auto-signs + retries |
| `@x402/axios` | TypeScript | Axios interceptor, same pattern |
| `x402[httpx]` | Python | httpx async/sync wrapper |
| `x402[requests]` | Python | requests Session subclass |
| `x402-reqwest` | Rust | Reqwest middleware layer |
| `x402.Client.EVM` | C# | HttpClient with embedded EVM wallet |
| `qntx/x402-openai-python` (259★) | Python | Drop-in OpenAI client with transparent x402 support |
| `qntx/x402-openai-typescript` (151★) | TypeScript | Drop-in OpenAI TS client with x402 support |

---

## 7. Facilitator Implementations

Facilitators handle payment verification (`POST /verify`) and settlement (`POST /settle`). They are the only party that touches the blockchain for gas.

### Hosted Facilitators

| Facilitator | Operator | Networks | Settlement Speed | Notes |
|-------------|----------|----------|-----------------|-------|
| CDP Facilitator | Coinbase | Base, Base Sepolia | ~2s | Official, primary |
| Cloudflare x402 | Cloudflare | Base, Ethereum | Deferred | Edge infrastructure |
| BNB Pieverse | BNB Chain | BNB Chain | ~2s | BNB-specific |
| AsterPay | AsterPay | Multiple + SEPA | ~2s | European, EUR off-ramp |
| Primev FastRPC | Primev | Ethereum mainnet | <200ms | Fee-free via mev-commit preconfs |
| PayAI | PayAI | Multi-chain | — | https://docs.payai.network/x402 |
| thirdweb | thirdweb | 170+ EVM chains | — | Most chains |
| Corbits | Corbits | Faremeter-based | — | — |
| 1Shot API | 1Shot | — | — | n8n workflows |
| Meridian | Meridian | — | — | — |

### Self-Hosted Facilitators

**x402-rs** — https://github.com/x402-rs/x402-rs (243★, Apache-2.0)

Production-grade Rust implementation with Docker images. Crate breakdown:
- `x402-types` — shared protocol types + facilitator traits
- `x402-facilitator-local` — verification + settlement logic
- `x402-axum` — server middleware
- `x402-reqwest` — client middleware
- `x402-chain-eip155` — EVM support (v1 + v2)
- `x402-chain-solana` — Solana
- `x402-chain-aptos` — Aptos (git dep only)

Latest release: Permit2 Support & Usage-Based Payments (Feb 15, 2026).

**second-state/x402-facilitator** — https://github.com/second-state/x402-facilitator (226★, Apache-2.0)

Fork of x402-rs by Second State. Emphasizes self-hosting. Supports: Base, Avalanche, Polygon, Sei, Solana. OpenTelemetry observability, Docker-first, JSON config. REST API on port 8080.

**x402-dotnet FacilitatorWeb** — .NET facilitator for EVM + Solana.

**Faremeter** — https://github.com/faremeter/faremeter (61★)

TypeScript facilitator + middleware + examples. Plugin architecture for wallet/blockchain neutrality. EIP-3009 gasless USDC on Base Sepolia. v0.18.0 released Mar 20, 2026.

**qntx/facilitator** — https://github.com/qntx/facilitator (147★, Rust)

Production-ready facilitator server from qntx organization.

---

## 8. AI Agent & MCP Integrations

The x402 protocol is heavily positioned for AI agent commerce — agents can pay for APIs autonomously without human intervention.

### MCP (Model Context Protocol) Integrations

| Repo | Stars | Description |
|------|-------|-------------|
| https://github.com/microchipgnu/MCPay | 85 | Open-source MCP x402 infrastructure, registry + proxy |
| https://github.com/ethanniser/x402-mcp | — | Vercel's MCP integration package |
| https://github.com/MetaMask/mcp-x402 | 2 | MCP server that creates x402 headers from private key |
| https://github.com/mark3labs/mcp-go-x402 | 6 | ARCHIVED — merged into x402-go |
| https://github.com/paracetamol951/P-Link-MCP | — | x402-fetch + 402 server + MCP for P-Link.io |

**MCPay architecture:**
- Registry at mcpay.tech/servers — searchable catalog of priced MCP tools
- Monetizer Proxy — wraps existing MCP servers to enforce payment gates without code changes
- Networks: Base, Avalanche, IoTeX, Sei (EVM), Solana (SVM)
- Monorepo: `packages/js-sdk/`, `apps/` (registry, dashboard), `examples/`

**SEP-2007** — Proposed MCP spec extension for payment support, with x402 v2 as first supported protocol. GitHub issue: https://github.com/modelcontextprotocol/modelcontextprotocol/issues/2008

### Agent SDKs

| Repo | Stars | Description |
|------|-------|-------------|
| https://github.com/daydreamsai/daydreams | 606 | Agent commerce tools |
| https://github.com/daydreamsai/lucid-agents | 178 | Commerce SDK, 60-second bootstrap |
| https://github.com/AgentlyHQ/aixyz | 71 | Next.js-like AI agent framework with A2A + MCP + x402 + ERC-8004 |
| https://github.com/AgentlyHQ/use-agently | 60 | Agent routing + settlement layer |
| https://github.com/chu2bard/pinion-os | 357 | Pinion protocol client SDK + Claude plugin, x402 on Base |

### A2A (Agent-to-Agent) Integrations

**google-agentic-commerce/a2a-x402** — https://github.com/google-agentic-commerce/a2a-x402 (475★, Python, Apache-2.0)

Extends Google's A2A protocol with x402 payments. Three-message flow:
1. Merchant → `payment-required` message
2. Client → `payment-submitted` message (signed + submitted payment)
3. Merchant → `payment-completed` message

Code: `x402_a2a/` (core library), `examples/`.

**dabit3/a2a-x402-typescript** — https://github.com/dabit3/a2a-x402-typescript (102★)

Complete TypeScript port of the Python A2A x402 extension.

### LLM Gateway Examples

| Repo | Stars | Description |
|------|-------|-------------|
| https://github.com/HyperbolicLabs/hyperbolic-x402 | 7 | x402-gated access to Hyperbolic inference API |
| https://github.com/mitgajera/x402-ai | — | Solana multi-LLM gateway (GPT, Claude) pay-per-request |
| https://github.com/qntx/x402-openai-python | 259 | Drop-in OpenAI Python client with x402 |
| https://github.com/qntx/x402-openai-typescript | 151 | Drop-in OpenAI TS client with x402 |

---

## 9. Chain-Specific Implementations

### Solana

| Repo | Stars | Description |
|------|-------|-------------|
| https://github.com/payainetwork/x402-solana | — | Reusable framework-agnostic x402 on Solana |
| https://github.com/rapid402/rapid402-sdk | — | x402 facilitator on Solana, TypeScript SDK |
| https://github.com/8bitsats/x402-Solana | — | Solana ecosystem integration |
| https://github.com/Woody4618/solana-paywal-x402 | — | Simple example: API keys, images, music paywall |
| https://github.com/PlaiPin/solana-esp32-x402 | — | x402 on ESP32-S3 IoT devices (Solana) |
| https://github.com/N-45div/x402-ai-Solana | — | AI + Solana x402 |
| https://github.com/Now-Or-Neverr/solana-x402-payment | — | Basic Solana x402 payment |
| https://github.com/micro402/Micro402-Protocol-x402-Payment | 1 | Per-second billing via HTTP 402 on Solana |
| https://github.com/NemoClaw/nemoclaw | — | On-chain agentic mgmt for Solana + x402 |
| `x402-sdk-solana-rust` crate | — | Rust SDK for x402 on Solana |

**npm:** `x402-solana` package implements x402 v2 for Solana.

**Solana official guide:** https://solana.com/developers/guides/getstarted/intro-to-x402

### EVM (Ethereum / Base / Polygon / Avalanche)

The canonical EVM implementation uses EIP-3009 + EIP-712. Key contract:
- **x402ExactPermit2Proxy**: `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` (CREATE2, same on all EVM chains)

Libraries: `@x402/evm`, `x402-chain-eip155` crate, `alloy` (Rust), `viem`/`ethers.js` (TypeScript)

### Aptos

Supported via `x402-chain-aptos` in x402-rs (git dependency, not yet published to crates.io).

### Bitcoin (via Arkade)

h402 project supports Arkade transactions (Bitcoin mainnet). See section 10.

### Multi-Chain SDKs

| SDK | Chains |
|-----|--------|
| thirdweb x402 | 170+ EVM chains |
| x402-rs | EVM, Solana, Aptos |
| second-state/x402-facilitator | Base, Avalanche, Polygon, Sei, Solana |
| nova402 | Base, Solana, Polygon, BSC, Peaq, Sei |
| MCPay | Base, Avalanche, IoTeX, Sei, Solana |
| h402 | EVM, Solana, Arkade (Bitcoin) |

---

## 10. Alternative / Related Protocols

### h402 (HTTP 402)
**https://github.com/bit-gpt/h402** (32★, TypeScript 93%)

Built on top of x402's open schemes. Adds support for:
- EVM, Solana, **Arkade (Bitcoin mainnet)**
- Broadcasted transactions (USDT, native currencies) — not just permit-based
- Solana transactions with memo
- `exact` scheme with fixed amounts

Pnpm monorepo: `@bit-gpt/h402` core, Next.js example, facilitator implementation.

### stripe402
**https://github.com/stripe402/stripe402** (0★, TypeScript)

x402-inspired but uses **credit cards via Stripe** instead of blockchain. Key differences:
- No crypto wallet needed — just a credit card
- Stateful (server maintains credit balances) vs. x402's stateless on-chain model
- Credits system ($5+ minimums) vs. sub-cent micropayments
- Identity from HMAC of card fingerprint (deterministic)
- Backends: Redis (atomic Lua scripts) or PostgreSQL
- Packages: `@stripe402/core`, `@stripe402/server`, `@stripe402/express`, `@stripe402/client-axios`, `@stripe402/client-fetch`

### L402 (Lightning Labs)
**https://github.com/lightninglabs/L402** (80★)

Bitcoin Lightning Network implementation of HTTP 402. Key differences from x402:
- Uses **Lightning Network** (not EVM/Solana)
- **Macaroon-based tokens** — cryptographic credentials, delegatable
- Stateless: token + preimage proves payment without database
- No crypto wallet for stablecoins — requires Lightning node
- Supports gRPC and HTTP

### l402-protocol/l402
**https://github.com/l402-protocol/l402** (207★, TypeScript)

Independent L402 implementation with:
- Lightning Network, on-chain crypto, and **Stripe** payment support
- Three payment types: one-time, subscription, top-up
- JSON payment request format

### PipeGate
**https://github.com/Dhruv-2003/pipegate** (34★, Rust 49% / TypeScript 23% / Solidity 11%)

"Web3 Stripe for APIs" — combines x402 with:
- Payment channels (gasless, off-chain state)
- Superfluid streams (continuous subscription flow)
- One-time on-chain payments

x402 integration since v0.6.0 with `X-Payment` unified headers.

### masterzdran/payment-required
**https://github.com/masterzdran/payment-required** — Generic HTTP 402 library for any HTTP API, not x402-specific.

---

## 11. Infrastructure Providers

### Facilitator Platforms (hosted)
- **Coinbase CDP** — https://docs.cdp.coinbase.com/x402 — official, primary, Base
- **Cloudflare** — https://blog.cloudflare.com/x402/ — edge, foundation co-founder
- **thirdweb** — https://portal.thirdweb.com/payments/x402/facilitator — 170+ chains
- **PayAI** — https://docs.payai.network/x402/quickstart — multi-chain
- **QuickNode** — x402 drawdown credit model across 130+ chains
- **Alchemy** — x402 for RPC/web3 API access

### Analytics & Monitoring
- **x402scan** — https://x402scan.com / https://github.com/Merit-Systems/x402scan (306★) — ecosystem explorer
- **x402station** — https://x402station.com — real-time insights
- **x402-analytics npm** — analytics wrapper

### Curated Lists (awesome-x402)
- **https://github.com/Merit-Systems/awesome-x402** — Official ecosystem curated list
- **https://github.com/xpaysh/awesome-x402** (153★) — Comprehensive community list
- **https://github.com/a6b8/awesome-x402-servers** — Server implementations list

---

## 12. Example Applications & Demos

### Official Examples (coinbase/x402)
https://github.com/coinbase/x402/tree/main/examples

Covers: Go HTTP client, Python httpx/requests, TypeScript fetch/axios, Node.js servers

### Notable Community Examples

| Repo | Stars | Use Case |
|------|-------|----------|
| https://github.com/dabit3/x402-starter-kit | 180 | Complete starter: EVM + Solana, Express + OpenAI |
| https://github.com/PinataCloud/402-server | 2 | IPFS pinning pay-per-use (Cloudflare Workers) |
| https://github.com/PinataCloud/jetson-x402 | — | AI hardware monetization (Jetson) |
| https://github.com/smartcontractkit/x402-cre-price-alerts | 12 | Crypto price alerts: x402 + Chainlink CRE + Gemini AI |
| https://github.com/HyperbolicLabs/hyperbolic-x402 | 7 | LLM inference pay-per-request |
| https://github.com/Woody4618/solana-paywal-x402 | — | API keys / image / music paywall on Solana |
| https://github.com/PlaiPin/solana-esp32-x402 | — | IoT device payments (ESP32-S3) |
| https://github.com/RemsLabs/x402-analytics-examples | — | Buyer + seller implementations |

### Production APIs Using x402
- **Alfred's Digital Bazaar** — ~100 x402-paywalled endpoints built by an AI agent
- **Weather API** — Global weather ($0.001 USDC/call)
- **Gotobi Calendar API** — Japanese FX dates ($0.001 USDC/call)
- **DeFi Intelligence API** — 26 endpoints, token/address/NFT security
- **Visual API** — Screenshot + PDF ($0.01 USDC/call)
- **Obol** — AI code generation ($5 USDC/call)
- **ShieldAPI MCP** — Security analysis, 9 tools
- **gpu-bridge/mcp-server** (https://github.com/gpu-bridge/mcp-server) — 30 AI services as MCP tools, x402 native

---

## 13. Hackathon Projects

### ETHGlobal Buenos Aires 2025 (Nov)

- **Paybot** — x402 for physical device access control (Coinbase CDP track)
- **Hubble Trading Arena** — On-chain trading agents using x402 + ERC-8004
- **Payload Exchange** — Intermediary accepting any payment via x402 agents
- **zkx402** — x402 + zero-knowledge proofs, tiered pricing

### ETHGlobal NYC 2025 (Aug)

- **x402-flash** — Solves x402 latency via escrow contract (servers respond immediately)

### x402 Hackathon (Ethereum Foundation, concluded Jan 19, 2026)

- **x402-sf (Superfluid)** — Continuous subscription payments via x402 infrastructure
- **Cheddr Payment Channels x402** — Micropayment streaming via payment channels
- **x402r (BackTrackCo)** — Refund handling for undelivered x402-paid data services

---

## 14. Package Registry Summary

### npm (JavaScript/TypeScript)
Key packages: `x402`, `@x402/core`, `@x402/evm`, `@x402/svm`, `@x402/fetch`, `@x402/axios`, `@x402/express`, `@x402/hono`, `@x402/next`, `@x402/paywall`, `@coinbase/x402`, `x402-solana`, `x402-analytics`, `@hyperpay/x402`

Search: https://www.npmjs.com/search?q=x402

### PyPI (Python)
Key packages: `x402` (official, v2.4.0), `tvm-x402`, `x402-python-client`, `django-x402`

Search: https://pypi.org/search/?q=x402

### crates.io (Rust)
Key crates: `x402`, `x402-rs`, `x402-chain-eip155`, `x402-chain-solana`, `x402-facilitator`, `x402-axum`, `x402-reqwest`, `nginx-x402`, `r402-evm`, `x402-sdk-solana-rust`, `tempo-x402-node`

Search: https://crates.io/search?q=x402

### RubyGems
- `x402-rails`, `x402-payments` (QuickNode Labs)

### NuGet (.NET)
- `x402`, `x402.Coinbase`, `x402.Client.EVM` (michielpost)

---

## 15. Blockchain Standards Used

| Standard | EIP/ERC | Role in x402 |
|----------|---------|-------------|
| EIP-712 | EIP-712 | Typed structured data signing — domain separator, typed messages |
| ERC-3009 | ERC-3009 | `transferWithAuthorization` — gasless token transfers via signature |
| EIP-2612 | EIP-2612 | `permit()` — approval via signature for ERC-20 tokens |
| Permit2 | Uniswap | Universal approval proxy for any ERC-20 |
| ERC-7710 | ERC-7710 | Smart account delegation — enables AA wallet payments |
| ERC-4337 | ERC-4337 | Account abstraction / UserOperations (pending x402 support, issue #639) |
| ERC-8004 | ERC-8004 | Agent registry + service discovery (used alongside x402) |
| CAIP-2 | CAIP | Chain ID namespacing (`eip155:8453`, `solana:5eykt...`) |

**Key Solidity contract:**
- `x402ExactPermit2Proxy` at `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` (deterministic CREATE2, all EVM chains)

---

## 16. Ecosystem Stats & Traction

| Metric | Value | Source |
|--------|-------|--------|
| Coinbase/x402 stars | ~5,700 | GitHub |
| GitHub repos tagged x402 | 232+ | GitHub topics |
| Contributors (main repo) | 248 | GitHub |
| Projects using coinbase/x402 | 585+ | GitHub |
| Cumulative transactions (AIsa) | 10.5M+ | awesome-x402 |
| Weekly transactions (ecosystem) | 500K+ | awesome-x402 |
| Average settlement time | ~2s (Base) | Coinbase docs |
| YoY growth | 10,000%+ | awesome-x402 |
| Python SDK version | 2.4.0 (Mar 2026) | PyPI |
| Supported EVM chains (thirdweb) | 170+ | thirdweb |
| x402 Foundation co-founders | Coinbase + Cloudflare | Sept 2025 |
| Production partners | Alchemy, AWS, Messari, Nansen, Stripe, Vercel | x402.org/ecosystem |

---

## 17. Key Risks & Observations

### Architectural Risks

1. **Facilitator centralization**: Most implementations default to Coinbase's CDP facilitator. If it goes down, payments break. Self-hosted alternatives exist (x402-rs, second-state) but require ops overhead.

2. **Race conditions (ERC-7710)**: Between verification simulation and on-chain settlement, a delegator can invalidate their delegation. No standard mitigation beyond private mempools.

3. **Permit2 one-time approval friction**: Permit2 method requires a one-time `approve(Permit2)` transaction from users before first payment. This breaks the "zero-friction" promise for new users.

4. **Protocol versioning**: v1 and v2 exist simultaneously. v2 introduces header-based payment flows. Some SDKs default to v2 (x402-rails), others support both. Clients and servers must negotiate versions.

5. **ERC-4337 not yet supported**: Smart contract wallets (account abstraction) require special handling. Open feature request (issue #639) but not yet shipped. Significant gap for embedded wallet use cases.

### Ecosystem Risks

6. **Alpha status**: Official Python SDK (v2.4.0) is explicitly marked Alpha. Go and TypeScript are more mature.

7. **ROADMAP.md empty**: The official roadmap says "update coming soon." No public timeline for planned features.

8. **Token support gap**: EIP-3009 (gasless) only works with tokens that natively implement it (primarily USDC). USDT and other tokens require Permit2 (adds friction). Native ETH not supported.

9. **Solana SPL token support**: Less mature than EVM. Fewer production examples and SDKs.

10. **Settlement finality latency**: Even at ~2s on Base, there's a window where a server optimistically serves content before on-chain confirmation. Rollback risk exists.

### Competitive Landscape

11. **L402 (Lightning)**: Mature alternative for Bitcoin/Lightning users. Macaroon delegation is more powerful for credential attenuation than x402's current model.

12. **stripe402**: Lower adoption barrier (credit cards) but stateful and higher minimums — not viable for sub-cent micropayments.

13. **h402**: Adds Bitcoin (Arkade) support that x402 lacks. Could fragment the ecosystem.

14. **Fragmentation risk**: 232+ repos with varying spec compliance. No formal conformance test suite observed.

### Opportunities Relevant to FLOW-LINK

- x402 is the dominant standard for HTTP-native crypto micropayments, especially for AI agent commerce
- The Python SDK (FastAPI support) and TypeScript middleware ecosystem are production-ready enough for integration
- Self-hosted facilitator (x402-rs or second-state fork) is viable for avoiding Coinbase dependency
- MCP integration is actively being standardized (SEP-2007) — relevant if FLOW-LINK serves MCP tools
- thirdweb facilitator covers 170+ EVM chains — useful for multi-chain support without running own facilitator
- Permit2 proxy at `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` can be reused on any EVM chain

---

## All Repositories Index

| Repo | Stars | Category | Language |
|------|-------|----------|----------|
| https://github.com/coinbase/x402 | 5,700 | Core / Official | TS/Python/Go |
| https://github.com/x402-rs/x402-rs | 243 | Rust SDK + Facilitator | Rust |
| https://github.com/second-state/x402-facilitator | 226 | Self-hosted Facilitator | Rust |
| https://github.com/google-agentic-commerce/a2a-x402 | 475 | A2A Agent Protocol | Python |
| https://github.com/xpaysh/awesome-x402 | 153 | Curated List | — |
| https://github.com/Merit-Systems/awesome-x402 | — | Curated List | — |
| https://github.com/Merit-Systems/x402scan | 306 | Explorer/Analytics | TypeScript |
| https://github.com/a6b8/awesome-x402-servers | — | Curated Servers | — |
| https://github.com/daydreamsai/daydreams | 606 | Agent Commerce SDK | TypeScript |
| https://github.com/BlockRunAI/ClawRouter | 5,600 | AI LLM Router + x402 | TypeScript |
| https://github.com/NoFxAiOS/nofx | 11,000 | AI Trading + x402 | Go |
| https://github.com/chu2bard/pinion-os | 357 | Agent SDK + Claude plugin | TypeScript |
| https://github.com/qntx/x402-openai-python | 259 | OpenAI client w/ x402 | Python |
| https://github.com/qntx/machi | 199 | Web4 AI Agent Framework | Rust |
| https://github.com/daydreamsai/lucid-agents | 178 | Commerce SDK | TypeScript |
| https://github.com/dabit3/x402-starter-kit | 180 | Starter Kit | TypeScript |
| https://github.com/qntx/x402-openai-typescript | 151 | OpenAI TS client w/ x402 | TypeScript |
| https://github.com/qntx/facilitator | 147 | Rust Facilitator | Rust |
| https://github.com/qntx/r402 | 143 | x402 Rust SDK | Rust |
| https://github.com/smartcontractkit/x402-cre-price-alerts | 12 | Chainlink + x402 demo | TypeScript |
| https://github.com/dabit3/a2a-x402-typescript | 102 | A2A TypeScript port | TypeScript |
| https://github.com/microchipgnu/MCPay | 85 | MCP + x402 infra | TypeScript |
| https://github.com/AgentlyHQ/aixyz | 71 | AI Agent Framework | TypeScript |
| https://github.com/alsk1992/CloddsBot | 69 | AI Trading Agent | TypeScript |
| https://github.com/AgentlyHQ/use-agently | 60 | Agent routing/settlement | TypeScript |
| https://github.com/faremeter/faremeter | 61 | TS Facilitator + Middleware | TypeScript |
| https://github.com/darkresearch/mallory | 52 | React Native crypto boilerplate | TypeScript |
| https://github.com/bitrouter/x402-kit | 52 | Modular x402 SDK | Rust |
| https://github.com/Dhruv-2003/pipegate | 34 | Payment channels + x402 | Rust/TS/Solidity |
| https://github.com/quiknode-labs/x402-rails | 35 | Rails gem | Ruby |
| https://github.com/bit-gpt/h402 | 32 | h402 protocol (BTC+EVM+SOL) | TypeScript |
| https://github.com/michielpost/x402-dotnet | 10 | .NET implementation | C# |
| https://github.com/HyperbolicLabs/hyperbolic-x402 | 7 | LLM inference x402 | TypeScript |
| https://github.com/mark3labs/mcp-go-x402 | 6 (archived) | MCP Go x402 (archived) | Go |
| https://github.com/MetaMask/mcp-x402 | 2 | MetaMask MCP server | TypeScript |
| https://github.com/PinataCloud/402-server | 2 | IPFS pinning x402 | TypeScript |
| https://github.com/micro402/Micro402-Protocol-x402-Payment | 1 | Solana per-second billing | TypeScript |
| https://github.com/nova402/novax402 | 1 | Multi-chain x402 utilities | TypeScript |
| https://github.com/l402-protocol/l402 | 207 | L402 (Lightning+Stripe) | TypeScript |
| https://github.com/lightninglabs/L402 | 80 | L402 (Lightning only) | Go |
| https://github.com/stripe402/stripe402 | 0 | stripe402 (credit cards) | TypeScript |
| https://github.com/payainetwork/x402-solana | — | Solana x402 framework-agnostic | TypeScript |
| https://github.com/rapid402/rapid402-sdk | — | Solana facilitator SDK | TypeScript |
| https://github.com/PlaiPin/solana-esp32-x402 | — | IoT (ESP32) + Solana x402 | C++ |
| https://github.com/gpu-bridge/mcp-server | — | 30 AI services MCP + x402 | TypeScript |
| https://github.com/quiknode-labs/x402-payments | — | Ruby payment header gem | Ruby |
| https://github.com/8bitsats/x402-Solana | — | Solana ecosystem integration | TypeScript |
| https://github.com/PinataCloud/jetson-x402 | — | Jetson AI hardware x402 | TypeScript |
| https://github.com/mitgajera/x402-ai | — | Multi-LLM Solana gateway | TypeScript |
| https://github.com/N-45div/x402-ai-Solana | — | AI + Solana x402 | TypeScript |
| https://github.com/thirdweb-dev/js (x402 subpath) | — | thirdweb SDK x402 support | TypeScript |
| https://github.com/ethanniser/x402-mcp | — | Vercel MCP integration | TypeScript |

---

*Research completed: 2026-03-20. Coverage: npm, PyPI, crates.io, GitHub topics, Google A2A ecosystem, hackathon submissions, infrastructure providers. All star counts approximate at time of research.*
