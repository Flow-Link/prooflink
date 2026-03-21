# Docker & Infrastructure Verification

**Date:** 2026-03-21
**Scope:** Dockerfile, docker-compose.yml, .dockerignore, database schema, migration path, environment config

---

## 1. Dockerfile Analysis

**File:** `/Dockerfile`
**Structure:** 4-stage multi-stage build -- well-designed.

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | node:22-alpine | Install all dependencies (dev + prod) |
| `builder` | node:22-alpine | Copy source + build with turbo |
| `prod-deps` | node:22-alpine | Install production-only dependencies |
| `production` | node:22-alpine | Final slim image |

### Strengths
- Multi-stage build correctly separates install/build/production concerns
- Uses `dumb-init` as PID 1 (proper signal handling)
- Non-root user `flowlink:1001` -- good security practice
- `HEALTHCHECK` directive baked into image (wget to `/health`)
- `--frozen-lockfile` ensures reproducible installs
- Only copies `dist/` and `package.json` into production stage (no source)
- Copies individual workspace `node_modules` correctly for pnpm hoisting

### Issues

| Severity | Issue | Details |
|----------|-------|---------|
| **Medium** | Dashboard not containerized for production | Dockerfile only builds `@flowlink/api`. Dashboard (Next.js) has no production Dockerfile or stage. Only available via `dev` profile in compose. |
| **Medium** | No `drizzle.config.ts` exists | Migration runner references `./drizzle` folder but no config file or migration SQL files exist yet. `drizzle-kit generate` has never been run. |
| **Low** | pnpm version hardcoded in 3 stages | `pnpm@9.15.0` is repeated in stages 1, 2, 3. Could use a build ARG for DRY. |
| **Low** | No `.dockerignore` for `pnpm-lock.yaml` changes | Not an issue per se, but any lockfile change invalidates the entire dep cache. Could use `--mount=type=cache` for pnpm store. |
| **Info** | `--ignore-scripts` used | Correct for security, but if any dependency requires postinstall scripts (native modules), builds will fail silently. Currently fine since all deps are pure JS/TS. |

### Suggested Improvements
```dockerfile
# Use ARG for pnpm version
ARG PNPM_VERSION=9.15.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Add build cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
```

---

## 2. docker-compose.yml Analysis

**File:** `/docker-compose.yml`

### Services Defined

| Service | Image/Build | Port | Profile | Health Check |
|---------|-------------|------|---------|-------------|
| `postgres` | postgres:16-alpine | 5432 | default | `pg_isready -U flowlink` |
| `redis` | redis:7-alpine | 6379 | default | `redis-cli ping` |
| `api` | Built from Dockerfile (target: production) | 3001 | default | wget `/health` |
| `api-dev` | Built from Dockerfile (target: builder) | 3001 | `dev` | **None** |
| `dashboard` | Built from Dockerfile (target: builder) | 3100 | `dev` | **None** |

### Strengths
- All 3 infrastructure services (postgres, redis, api) have health checks
- `depends_on` with `condition: service_healthy` -- proper startup ordering
- Named volumes for data persistence (`postgres_data`, `redis_data`)
- Custom bridge network `flowlink` for service isolation
- Dev profile uses volume mounts for hot-reload (`./packages/*/src` mapped in)
- Redis has sensible `maxmemory` (256mb) and eviction policy (`allkeys-lru`)
- Ports are configurable via env vars with sane defaults
- `.env` file marked `required: false` -- won't crash if missing

### Issues

| Severity | Issue | Details |
|----------|-------|---------|
| **High** | No database migration step | Neither `api` nor `api-dev` runs `db:migrate` before starting. First startup against fresh Postgres will fail -- no tables exist. Needs an init command or entrypoint script. |
| **Medium** | `api-dev` and `dashboard` use `builder` stage | The builder stage doesn't have `tsx` installed globally. It relies on workspace devDependencies. This works but means the dev containers carry all build artifacts. |
| **Medium** | Dashboard depends on `api-dev` not `api` | Dashboard service only works in dev profile. No production dashboard service exists. |
| **Medium** | `api` and `api-dev` share the same port variable | If both are started (different profiles, but still), port collision on 3001. Compose profiles prevent this in practice, but it's fragile. |
| **Low** | No Redis password | Redis is exposed on host without authentication. Fine for local dev, not for any shared environment. |
| **Low** | No `restart` policy on dev services | `api-dev` and `dashboard` lack `restart: unless-stopped`. Minor since they're dev-only. |
| **Info** | No separate `docker-compose.dev.yml` | Dev config is inlined via profiles. This is a valid approach (simpler than override files), but means `docker compose up` starts production API against dev database. |

### Environment Variable Mapping

| Variable | docker-compose.yml | .env.example | Match? |
|----------|-------------------|-------------|--------|
| `DATABASE_URL` | Constructed inline (postgres://flowlink:...@postgres:5432/flowlink) | `postgresql://flowlink:flowlink_dev@localhost:5432/flowlink` | Consistent (host differs by design) |
| `REDIS_URL` | `redis://redis:6379` | `redis://localhost:6379` | Consistent |
| `NODE_ENV` | `production` / `development` | Not in .env.example | OK -- set in compose |
| `PORT` | `3001` | Not in .env.example | OK -- set in compose |
| `CHAINALYSIS_API_KEY` | Not in compose | In .env.example | Passed via `env_file: .env` |
| `FLOWLINK_API_KEY` | Not in compose | In .env.example | Passed via `env_file: .env` |
| `BASE_RPC_URL` | Not in compose | In .env.example | Passed via `env_file: .env` |
| `ETHEREUM_RPC_URL` | Not in compose | In .env.example | Passed via `env_file: .env` |
| `EAS_CONTRACT_ADDRESS` | Not in compose | In .env.example | Passed via `env_file: .env` |
| `PROOFLINK_REGISTRY_ADDRESS` | Not in compose | In .env.example | Passed via `env_file: .env` |
| `POSTGRES_PASSWORD` | Default `flowlink_dev` | Not explicit | OK -- used in DATABASE_URL construction |

**Verdict:** Environment variables are consistent. The `env_file` with `required: false` correctly passes optional keys without requiring them.

---

## 3. .dockerignore Analysis

**File:** `/.dockerignore`

### Excluded
- `node_modules`, `dist`, `.next`, `.turbo`, `.cache` (build artifacts)
- `.git`, `.github` (VCS)
- `.env`, `.env.*` (secrets) -- correctly keeps `.env.example`
- `*.md` (docs) -- correctly keeps `README.md`
- `docs/`, `research/`, `reviews/`, `strategy/`, `architecture/`, `coordination/`
- `packages/contracts/lib|cache|out` (Foundry artifacts)
- Test files (`*.test.ts`, `*.spec.ts`, `__tests__/`)
- Editor/OS artifacts (`.DS_Store`, `*.swp`)

### Issues

| Severity | Issue |
|----------|-------|
| **Low** | `tests/` directory (e2e tests) not excluded. Copies into build context unnecessarily. |
| **Low** | `apps/dashboard/` is copied into context even though the Dockerfile never uses it. Could add it to .dockerignore for the API-only Dockerfile to reduce context size. |

Overall: Well-configured. Secrets are protected, build artifacts excluded.

---

## 4. Database Setup

### Schema (`apps/api/src/db/schema.ts`)

6 tables defined via Drizzle ORM:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `api_keys` | API key management | `keyHash`, `ownerId`, `scopes`, `rateLimitPerMinute`, `expiresAt` |
| `agents` | KYA (Know Your Agent) records | `agentDid`, `walletAddress`, `complianceScore`, `controllingEntityLei` |
| `compliance_checks` | Compliance pipeline run results | `senderAddress`, `receiverAddress`, `riskScore`, `status` |
| `compliance_receipts` | Cryptographic compliance proofs | `receiptHash`, `easAttestationUid`, `signature`, `ttl` |
| `invoices` | Payment invoices | `issuerAgentDid`, `totalAmount`, `state`, `onChainTxHash` |
| `audit_log` | Append-only hash-chained log | `logHash`, `previousLogHash`, `eventType`, `payload` |

**Schema quality:** Good. Proper use of UUIDs, indexes, foreign keys, timestamps with timezone, and appropriate column types (numeric for amounts, jsonb for flexible data). The audit log hash chain is a solid design for tamper evidence.

### Migration Path

**Status: INCOMPLETE**

- `apps/api/src/db/migrate.ts` exists and calls `drizzle-orm/node-postgres/migrator`
- It looks for SQL migrations in `./drizzle/` (relative to CWD at runtime)
- **No `drizzle.config.ts` file exists anywhere in the repo**
- **No `drizzle/` migration directory exists**
- **No `db:generate` script defined** (only `db:migrate`)

To make migrations work, you need:
1. Create `apps/api/drizzle.config.ts`
2. Run `pnpm drizzle-kit generate` to create SQL migration files
3. Add `"db:generate": "drizzle-kit generate"` script to `apps/api/package.json`
4. Either run `db:migrate` as an init container or add it to the API entrypoint

### Database Connection (`apps/api/src/db/index.ts`)

- Uses `pg.Pool` with connection pooling (max 20 connections)
- Supports both `DATABASE_URL` and individual `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` env vars
- Singleton pattern for pool and drizzle instance
- Clean `closeDb()` for graceful shutdown

---

## 5. Port Summary

| Service | Port | Configurable Via |
|---------|------|-----------------|
| API (production) | 3001 | `API_PORT` env var |
| API (dev) | 3001 | `API_PORT` env var |
| Dashboard (dev) | 3100 | `DASHBOARD_PORT` env var |
| PostgreSQL | 5432 | `POSTGRES_PORT` env var |
| Redis | 6379 | `REDIS_PORT` env var |

---

## 6. Complete Local Setup Guide

### Prerequisites
- Node.js >= 22.0.0
- pnpm 9.15.0 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker & Docker Compose v2

### Option A: Docker Compose (Production-like)

```bash
# 1. Clone and enter
git clone <repo-url> && cd FLOW-LINK

# 2. Create env file (optional -- defaults work)
cp .env.example .env

# 3. Start infrastructure + API
docker compose up -d

# Verify
docker compose ps          # all 3 services healthy
curl http://localhost:3001/health
```

**BLOCKER:** This will fail on first run because database migrations have not been generated yet. See "Critical Fix Required" below.

### Option B: Docker infra + local dev

```bash
# 1. Clone and enter
git clone <repo-url> && cd FLOW-LINK

# 2. Create env file
cp .env.example .env

# 3. Start only Postgres + Redis
docker compose up -d postgres redis

# 4. Install dependencies
pnpm install

# 5. Build shared packages
pnpm build

# 6. Run migrations (BLOCKED -- see below)
pnpm --filter=@flowlink/api db:migrate

# 7. Start API in dev mode
pnpm --filter=@flowlink/api dev

# 8. (Optional) Start dashboard
pnpm --filter=@flowlink/dashboard dev
```

### Option C: Docker Compose dev profile

```bash
# Start everything in dev mode with hot-reload
docker compose --profile dev up -d postgres redis api-dev dashboard
```

---

## 7. Critical Fix Required: Migration Setup

Before any of the setup paths work against a fresh database, you must:

```bash
# 1. Create drizzle config
cat > apps/api/drizzle.config.ts << 'EOF'
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://flowlink:flowlink_dev@localhost:5432/flowlink",
  },
});
EOF

# 2. Add generate script to apps/api/package.json
# "db:generate": "drizzle-kit generate",
# "db:push": "drizzle-kit push"

# 3. Generate migrations from schema
cd apps/api && pnpm drizzle-kit generate

# 4. Run migrations
pnpm db:migrate
```

Alternatively, for dev convenience, use `drizzle-kit push` to sync schema directly without migration files.

---

## 8. Summary

| Area | Status | Notes |
|------|--------|-------|
| Dockerfile | **Good** | Proper multi-stage, security, health check |
| docker-compose.yml | **Good** | Health checks, depends_on, volumes, profiles |
| .dockerignore | **Good** | Comprehensive exclusions |
| Env vars | **Good** | Consistent between compose and .env.example |
| Database schema | **Good** | 6 well-designed tables with proper types/indexes |
| Migration path | **BROKEN** | No drizzle config, no generated migrations, no init step in compose |
| Dashboard production | **Missing** | No production Dockerfile stage for Next.js app |
| Redis auth | **Missing** | No password set (acceptable for local dev only) |

### Priority Fixes
1. **P0:** Create `drizzle.config.ts`, generate migrations, add migration init step to compose
2. **P1:** Add dashboard production Dockerfile stage (or separate Dockerfile)
3. **P2:** Add Redis password support for non-local deployments
4. **P2:** Exclude `tests/` and `apps/dashboard/` from .dockerignore (for API builds)
