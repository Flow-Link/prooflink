# ProofLink Operations Guide

## Quick Start (No Database)

The dashboard works without a database — it falls back to mock data when the API is unreachable.

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm build

# 3. Start the dashboard (port 3100)
pnpm --filter=@prooflink/dashboard dev
```

Open http://localhost:3100 to see the dashboard with mock data.

## Full Stack (With Database)

### Option A: Docker Compose (recommended)

```bash
# Start postgres + redis
docker compose up postgres redis -d

# Wait for healthy
docker compose exec postgres pg_isready -U prooflink

# Copy env file
cp .env.example .env

# Run database migrations
pnpm --filter=@prooflink/api db:migrate

# Start API server (port 3001)
pnpm --filter=@prooflink/api dev

# In another terminal — start dashboard (port 3100)
pnpm --filter=@prooflink/dashboard dev
```

### Option B: Local Postgres

```bash
# Create database
createdb prooflink
psql prooflink -c "CREATE USER prooflink WITH PASSWORD 'prooflink_dev';"
psql prooflink -c "GRANT ALL PRIVILEGES ON DATABASE prooflink TO prooflink;"

# Set env
export DATABASE_URL=postgresql://prooflink:prooflink_dev@localhost:5432/prooflink

# Run migrations
pnpm --filter=@prooflink/api db:migrate

# Start both
pnpm --filter=@prooflink/api dev &
pnpm --filter=@prooflink/dashboard dev &
```

### Option C: Full Docker Dev

```bash
docker compose --profile dev up
```

This starts postgres, redis, api, and dashboard all at once.

## What Each Component Does

| Component | Port | Purpose |
|-----------|------|---------|
| **API** (`apps/api`) | 3001 | Hono REST API — compliance checks, invoices, identity, webhooks |
| **Dashboard** (`apps/dashboard`) | 3100 | Next.js 15 admin UI — real-time monitoring, analytics, agents |
| **Frontend** (`frontend/`) | 3000 | Marketing landing page (standalone, no API needed) |
| **MCP Server** (`packages/mcp-server`) | stdio/3001 | AI agent compliance tools via Model Context Protocol |
| **Demo CLI** (`apps/demo`) | CLI | Terminal demo for hackathon showcases |

## Dashboard Pages

| Page | URL | What It Shows |
|------|-----|---------------|
| Dashboard | `/` | Stats cards, compliance volume chart, activity feed, health |
| Compliance | `/compliance` | List of all compliance checks with status |
| Invoices | `/invoices` | Agent-to-agent invoices, state machine |
| Create Invoice | `/invoices/new` | Form to create a new invoice |
| Agents | `/agents` | KYA-verified agents, credentials |
| Analytics | `/analytics` | Volume trends, risk distribution, top agents |
| Screen | `/screen` | Screen a wallet address for sanctions |
| API Keys | `/api-keys` | Manage API keys |
| Settings | `/settings` | Compliance policy, notifications |

## API Endpoints

### Public (no auth)
- `GET /health` — Full health check
- `GET /health/ready` — Readiness probe
- `GET /health/live` — Liveness probe
- `GET /metrics` — Prometheus metrics
- `GET /openapi.json` — OpenAPI spec
- `GET /dashboard/*` — Dashboard data endpoints

### Authenticated (`X-API-Key` or `Authorization: Bearer`)
- `POST /v1/compliance/check` — Run compliance check
- `POST /v1/compliance/screen` — Screen address
- `POST /v1/compliance/batch` — Batch check (up to 50)
- `GET /v1/compliance/history` — Check history
- `GET /v1/compliance/stats` — Compliance stats
- `POST /v1/invoices` — Create invoice
- `GET /v1/invoices` — List invoices
- `GET /v1/invoices/:id` — Get invoice
- `PATCH /v1/invoices/:id/state` — Update state
- `POST /v1/identity/agents` — Register agent
- `POST /v1/identity/kya/issue` — Issue KYA credential
- `POST /v1/identity/verify` — Verify agent
- `GET /v1/identity/agents` — List agents
- `GET /v1/analytics/volume` — Volume analytics
- `GET /v1/analytics/compliance` — Compliance breakdown
- `GET /v1/analytics/risk` — Risk distribution
- `GET /v1/analytics/agents` — Top agents

## Running Tests

```bash
# All tests
pnpm test

# Individual packages
pnpm --filter=@prooflink/shared test     # 417 tests — types, validation, crypto
pnpm --filter=@prooflink/core test       # 414 tests — compliance engine
pnpm --filter=@prooflink/sdk test        # 111 tests — SDK client
pnpm --filter=@prooflink/x402-compliance test  # 67 tests — middleware
pnpm --filter=@prooflink/mcp-server test # 50 tests — MCP tools
pnpm --filter=@prooflink/api test        # 133 tests — API routes

# Smart contracts (requires Foundry)
pnpm --filter=@prooflink/contracts test
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://prooflink:prooflink_dev@localhost:5432/prooflink` | Postgres connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `PORT` | `3001` | API server port |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:3100` | Allowed origins |
| `API_KEY_SECRET` | (auto-generated in dev) | HMAC key for API key hashing |
| `JWT_SECRET` | (optional) | HS256 key for JWT auth |
| `CHAINALYSIS_API_KEY` | (optional) | Real sanctions API |
| `BASE_RPC_URL` | `https://mainnet.base.org` | Base chain RPC |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Dashboard → API URL |

## Seeding Data

To populate the database with test data via the API:

```bash
API_URL=http://localhost:3001/v1

# Create an API key first (or use the test key from migrations)
API_KEY="your-api-key"

# Register an agent
curl -X POST $API_URL/identity/agents \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentDid": "did:web:paybot.prooflink.io",
    "name": "PayBot Prime",
    "agentType": "autonomous",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "controllingEntity": { "name": "ProofLink Inc" },
    "delegationScope": {
      "maxTransactionValue": 10000,
      "dailyLimit": 50000,
      "expiresAt": "2027-01-01T00:00:00Z"
    }
  }'

# Run a compliance check
curl -X POST $API_URL/compliance/check \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" },
    "receiver": { "address": "0x1234567890abcdef1234567890abcdef12345678", "chain": "ethereum" },
    "amount": "1000",
    "asset": "USDC"
  }'

# Create an invoice
curl -X POST $API_URL/invoices \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "seller": { "walletAddress": "0x1234567890abcdef1234567890abcdef12345678", "agentId": "did:web:paybot.prooflink.io" },
    "buyer": { "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
    "lineItems": [{ "description": "API Usage", "quantity": 1000, "unitPrice": 0.01, "total": 10 }],
    "currency": "USDC",
    "totalAmount": 10
  }'
```

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Dashboard   │────▶│   API (Hono) │────▶│  PostgreSQL  │
│  (Next.js)   │     │   :3001      │     │  :5432       │
│  :3100       │     └──────┬───────┘     └──────────────┘
└──────────────┘            │
                            │
┌──────────────┐     ┌──────┴───────┐
│  MCP Server  │────▶│  @prooflink/  │
│  (Claude)    │     │  core        │
└──────────────┘     │  (Compliance │
                     │   Engine)    │
┌──────────────┐     └──────────────┘
│  Smart       │
│  Contracts   │     Solidity on Base
│  (Foundry)   │
└──────────────┘
```
