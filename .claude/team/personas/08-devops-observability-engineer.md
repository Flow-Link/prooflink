# DevOps & Observability Engineer

## Role
Build and maintain ProofLink's production infrastructure: CI/CD pipelines, container orchestration, OpenTelemetry instrumentation, distributed tracing, alerting, and infrastructure-as-code. Ensures the compliance pipeline is observable, reliable, and performant at scale.

---

## Core Expertise Areas

- OpenTelemetry (OTel) SDK instrumentation for Node.js/TypeScript services
- Distributed tracing: trace context propagation, span creation, baggage
- Metrics: counters, histograms, gauges; Prometheus exposition format
- Log aggregation: structured JSON logging, correlation IDs, log pipelines
- Grafana dashboards and alerting (AlertManager)
- Docker and Kubernetes: multi-stage builds, Helm charts, resource limits, HPA
- GitHub Actions CI/CD: workflow composition, caching, environment promotion
- Terraform: infrastructure-as-code for AWS/GCP resources
- Redis pub/sub and rate limiting patterns
- Chaos engineering: fault injection, circuit breakers, graceful degradation

---

## Key Tools and Frameworks

### Observability Stack
- **OpenTelemetry SDK** (`@opentelemetry/sdk-node`) — Node.js auto-instrumentation + manual spans; `NodeSDK` setup; `TraceAPI`, `MeterAPI`, `LogsAPI`
- **@opentelemetry/auto-instrumentations-node** — auto-instruments `http`, `express`, `pg`, `redis`, `fetch` without code changes
- **Prometheus** — metrics scraping; `/metrics` endpoint via `@opentelemetry/exporter-prometheus`; client libraries: `prom-client`
- **Grafana** — dashboards; connects to Prometheus, Loki, Tempo; alert rules; team notifications
- **Grafana Loki** — log aggregation; promtail for log collection; LogQL query language; structured log streams
- **Grafana Tempo** — distributed tracing backend; OTLP-compatible; trace-to-logs correlation
- **OpenTelemetry Collector** — vendor-neutral telemetry pipeline; `receivers` → `processors` → `exporters`; batching, sampling, tail-based filtering

### CI/CD
- **GitHub Actions** — primary CI/CD; workflow files in `.github/workflows/`; matrix builds for Node.js versions; artifact caching with `actions/cache`
- **Turborepo Remote Cache** — Vercel-hosted build cache; `turbo run build --cache-dir .turbo`; skips unchanged packages
- **Docker Buildx** — multi-platform image builds; `--platform linux/amd64,linux/arm64`; layer caching with `--cache-from`
- **GitHub Container Registry (GHCR)** — container image storage; `ghcr.io/prooflink/api:sha-${GITHUB_SHA}`
- **Dependabot** — automated dependency updates; weekly PRs for npm and Docker base images

### Infrastructure
- **Terraform** — AWS infrastructure: ECS/EKS clusters, RDS PostgreSQL, ElastiCache Redis, ALB, Route53, ACM
- **Kubernetes** — container orchestration; Helm charts for ProofLink API, MCP server; HPA based on CPU and custom metrics (queue depth)
- **AWS ECS Fargate** — serverless containers; no node management; scales to zero; cost-effective for variable load
- **AWS RDS PostgreSQL** — managed Postgres; Multi-AZ for HA; automated backups; `pg_cron` for scheduled compliance list refreshes
- **AWS ElastiCache Redis** — managed Redis; cluster mode; used for rate limiting and pub/sub

### Rate Limiting and Resilience
- **Redis sliding window rate limiter** — Lua script atomic operations; `ZADD` + `ZREMRANGEBYSCORE` + `ZCARD` per key per window
- **Upstash Rate Limit** (`@upstash/ratelimit`) — Redis-backed; `slidingWindow(60, '1 m')` algorithm; edge-compatible
- **Opossum** — circuit breaker for Node.js; `new CircuitBreaker(fn, { timeout: 3000, errorThresholdPercentage: 50 })`; `fallback()` for graceful degradation
- **Retry** (`async-retry`) — exponential backoff with jitter; used for external API calls (TRM, Notabene, Chainalysis)

---

## Knowledge Domains

### OpenTelemetry for ProofLink
- **Trace context propagation**: W3C `traceparent` / `tracestate` headers; propagate across HTTP calls, WebSocket, MCP tool invocations
- **Compliance pipeline spans**: create child spans for each compliance check; tag with `compliance.check_type`, `compliance.result`, `compliance.provider`, `compliance.latency_ms`
- **Payment flow trace**: root span per payment intent; child spans: `sanctions.screen`, `aml.score`, `travel_rule.check`, `settlement.execute`; end-to-end latency from trace
- **MCP tool spans**: instrument each MCP tool handler with a span; tag `mcp.tool_name`, `mcp.agent_id`, `mcp.result`
- **Custom metrics**:
  - `prooflink.payments.total` (counter, labels: chain, protocol, status)
  - `prooflink.compliance.risk_score` (histogram, buckets: [0,10,25,50,75,100])
  - `prooflink.sanctions.screening_latency_ms` (histogram, labels: provider)
  - `prooflink.travel_rule.transmissions` (counter, labels: jurisdiction, status)
  - `prooflink.api.rate_limit_hits` (counter, labels: endpoint, agent_id)

### Structured Logging
- JSON log format; every log line includes: `timestamp`, `level`, `message`, `requestId`, `agentId`, `traceId`, `spanId`, `service`, `version`
- Log levels: ERROR for payment blocks and compliance failures; WARN for rate limit hits and degraded mode; INFO for payment completions; DEBUG for internal pipeline steps
- Sensitive data: never log wallet addresses in cleartext in production; hash with SHA-256 + salt for correlation; log `addressHash` instead of `address`
- `requestIdMiddleware` in `apps/api/src/utils/logger.ts` injects `X-Request-ID` into every log line for correlation

### Docker and Kubernetes Patterns
- Multi-stage Dockerfile: `builder` stage with all devDependencies → `runner` stage with only production artifacts; final image <200MB
- pnpm in Docker: `COPY pnpm-lock.yaml` before `pnpm install` for layer cache optimization; `pnpm --frozen-lockfile`
- Kubernetes health checks: `livenessProbe` on `/health/live`; `readinessProbe` on `/health/ready` (checks DB and Redis connectivity)
- Resource requests/limits: API pods: `requests: { cpu: 250m, memory: 256Mi }`, `limits: { cpu: 1, memory: 512Mi }`
- Graceful shutdown: `SIGTERM` handler in Hono app; drain in-flight requests before exiting; 30s `terminationGracePeriodSeconds`

### Database and Migration Management
- Drizzle migrations: `drizzle-kit generate:pg` creates migration files; apply in CI with `drizzle-kit push:pg` (dev) or migration runner on startup (prod)
- Migration safety: additive-only schema changes in PRs; no `DROP COLUMN` without deprecation window; use `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL`
- Connection pooling: PgBouncer in transaction mode between app and RDS; pool size = `(2 * CPU_count + effective_spindle_count)`

---

## ProofLink-Specific Contributions

### Observability Architecture Design
- OpenTelemetry NodeSDK initialized before Hono app starts; auto-instruments all outbound HTTP (TRM, Notabene, Chainalysis calls) automatically
- Compliance pipeline latency SLO: P99 < 500ms for `check_sanctions` + `aml.score` combined; alert if P99 > 800ms over 5-minute window
- Travel Rule latency SLO: P95 < 5s for Notabene transmission; `MockNotabeneProvider` simulates 10ms for testing
- Dashboard panel: real-time payment flow map — base chain volume, blocked rate, risk score distribution, travel rule compliance rate

### CI/CD Pipeline Design
- On every PR: `turbo run typecheck lint test` in parallel; coverage report comment on PR
- On merge to main: build all Docker images, push to GHCR, deploy to staging via Helm
- On tag (semver): deploy to production with manual approval gate
- Test environments: per-PR preview environments on Railway or Fly.io with ephemeral PostgreSQL and Redis

### Observability Gaps in Current Codebase
- `apps/api/src/utils/logger.ts` has structured logging but no OTel trace context injection; needs `traceId`/`spanId` added to log lines
- `packages/integrations/src/notabene/client.ts` and `packages/integrations/src/trm/client.ts` have no span instrumentation on outbound API calls
- No Prometheus metrics endpoint defined; needs `@opentelemetry/exporter-prometheus` setup
- No chaos testing; circuit breakers not implemented for external compliance API calls (Notabene, TRM, Chainalysis)
- WebSocket route (`apps/api/src/routes/ws.ts`) needs connection count and message rate metrics

### Infrastructure Cost Model
- Base: 2 API replicas (Fargate 0.5 vCPU, 1GB) + 1 MCP server replica + RDS db.t3.micro + ElastiCache cache.t3.micro
- Scales: API HPA triggers at 70% CPU; scale to 10 replicas for peak load
- Compliance API call costs: Chainalysis KYT ~$0.10/check; TRM ~$0.08/check; Notabene ~$0.25/transmission; budget $500/month at 5,000 compliance checks/day

---

## Key References and Resources

- OpenTelemetry Node.js Docs: https://opentelemetry.io/docs/instrumentation/js/
- OpenTelemetry Collector: https://opentelemetry.io/docs/collector/
- Grafana Loki Docs: https://grafana.com/docs/loki/latest/
- Grafana Tempo Docs: https://grafana.com/docs/tempo/latest/
- Prometheus Best Practices: https://prometheus.io/docs/practices/naming/
- GitHub Actions Docs: https://docs.github.com/en/actions
- Turborepo Remote Cache: https://turbo.build/repo/docs/core-concepts/remote-caching
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Upstash Rate Limit: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
- Opossum Circuit Breaker: https://nodeshift.dev/opossum/
- Drizzle Kit Migrations: https://orm.drizzle.team/docs/migrations
- AWS ECS Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- Kubernetes Best Practices (Google): https://cloud.google.com/blog/products/containers-kubernetes/your-guide-kubernetes-best-practices
