# ProofLink — Performance & Scalability Research Report

**Date**: 2026-03-21
**Analyst**: Research Agent (claude-sonnet-4-6)
**Scope**: Full codebase audit of `/home/akash/PROJECTS/prooflink`

---

## 1. Caching

### Strategy

The system uses **exclusively in-memory LRU caching**. There is no Redis-backed caching anywhere in the compliance or API layer, despite Redis being provisioned in `docker-compose.yml` (image: redis:7-alpine, maxmemory 256mb). The Redis container is running but completely unused by application code.

**Implementation**: `packages/core/src/cache.ts`

A custom `LRUCache<V>` class wraps a plain `Map`, exploiting JS insertion-order iteration for LRU eviction. The implementation is correct:

- O(1) amortised `get`/`set` via delete-then-re-insert
- Per-entry TTL override supported on `set(key, value, ttlMs?)`
- Background cleanup via `setInterval` + `.unref()` so it doesn't block process exit
- No locking — single-threaded Node.js event loop makes this safe

### Sanctions Cache

`SanctionsScreener` (`packages/core/src/sanctions/screener.ts`, line 316-319) creates an `LRUCache<SanctionsCheckResult>` with:

- `maxEntries`: sourced from config default **10,000** (`packages/core/src/config.ts`, line 79)
- `ttlMs`: `sanctionsCacheTtlMs` config default **5 minutes** (300,000 ms) (config.ts line 82)
- Cache key format: `sanctions:{chain}:{address.toLowerCase()}` (screener.ts line 567)

The KYA verifier has a separate cache with **15-minute TTL** (kyaCacheTtlMs, config.ts line 85).

There is **no cache for AML scoring** — it is recalculated on every call. This is intentional (it's a deterministic, fast in-memory computation).

### Cache Invalidation

Manual invalidation is available (`SanctionsScreener.invalidateCache(address, chain)` and `clearCache()`), and TTL-based passive expiry works correctly. There is no event-driven or webhook-triggered invalidation.

**No distributed cache invalidation exists.** With multiple API instances, each process has its own independent `LRUCache`. Cache pre-warming done in `checkComplianceBatch` (prooflink.ts, line 519-537) only benefits the local process.

### Issue: Redis Is Provisioned But Unused

Both `apps/api/src/middleware/rate-limit.ts` (line 7) and `apps/api/src/routes/ws.ts` (line 44) contain explicit TODO comments noting that Redis should be used in production. The `REDIS_URL` environment variable is passed to the API container but never consumed in any source file.

---

## 2. Database Performance

### Schema Design and Indexing

**File**: `apps/api/src/db/schema.ts`

| Table | Indexed Columns |
|-------|----------------|
| `api_keys` | `key_hash` (unique), `owner_id` |
| `agents` | `agent_did` (unique), `wallet_address` |
| `compliance_checks` | `(api_key_id, created_at)` composite, `sender_address`, `receiver_address` |
| `compliance_receipts` | `receipt_hash` (unique) |
| `invoices` | `state`, `seller_wallet_address`, `buyer_wallet_address` |
| `audit_log` | none beyond serial PK |

**Missing indexes**:

1. `compliance_checks.status` — the `/v1/compliance/history` endpoint filters by `status` (compliance.ts line 383-384) but there is no index on this column, only on `(api_key_id, created_at)`. A combined query on `status` + `api_key_id` + `created_at` will do an index scan on the composite key then filter status in memory.

2. `compliance_receipts.check_id` — used as a foreign key but has no explicit index. Postgres adds implicit indexes only for primary keys, not FK columns.

3. `audit_log` — no indexes at all. The append-only log will become a full-table-scan target as it grows.

### N+1 Query Risk

The API-layer batch route (`/v1/compliance/batch`, compliance.ts line 260-353) uses a sequential `for` loop with two awaited `db.insert()` calls per iteration — one for `compliance_checks` and one for `compliance_receipts`. For a 50-item batch this is **100 sequential round-trips** to the database. No bulk insert is used.

The core-layer `checkComplianceBatch` (prooflink.ts line 496-580) is well-designed with concurrency control, but the API route does not call it — it reimplements batch logic naively.

### Connection Pooling

**File**: `apps/api/src/db/index.ts`

Uses `pg.Pool` (node-postgres) with `max: 20` connections, initialised lazily as a singleton. This is adequate for a single-instance deployment. There is no `idleTimeoutMillis` or `connectionTimeoutMillis` configured, which means idle connections are held indefinitely and connection acquisition can block without timeout in pool exhaustion.

### Migration Strategy

**File**: `apps/api/src/db/migrate.ts`

Uses `drizzle-orm/node-postgres/migrator` pointing at a `./drizzle` folder. The migration runner exits with `process.exitCode = 1` on failure (not `throw`), which means the calling process does not receive a non-zero exit code from `runMigrations()` directly — the intent is the exitCode side-effect. This is correct. No rollback support exists (Drizzle push-only migrations).

---

## 3. API Performance

### Compliance Check Pipeline

**File**: `packages/core/src/engine/prooflink.ts`, `checkCompliance()` method

The pipeline is well-structured for latency:

1. Blocklist check — synchronous, O(n) linear scan on config arrays (line 251-254). This is an `Array.includes()` call, not a Set lookup. If allowlist/blocklist grow large this degrades.
2. KYA verification — awaited sequentially
3. **Sanctions screening — parallel** (`Promise.all` on sender + receiver, line 331-334)
4. AML scoring — synchronous, rule-based, no I/O (<1ms)
5. Travel rule — awaited sequentially
6. Jurisdictional rules — synchronous

Stated latency targets in comments: sanctions <100ms, AML <50ms, total pipeline <500ms.

### API Route vs Core Engine Divergence

The REST API route (`/v1/compliance/check`, compliance.ts line 63-197) does **not** use `ProofLinkEngine`. It performs:
- An in-memory `OFAC_SDN_ETH_ADDRESSES.has()` lookup (Set — O(1), correct)
- Hardcoded stub values for AML (durationMs: 20, result: "PASSED")
- No real AML scoring, no KYA verification, no Travel Rule check

This means the REST API is not exercising the full compliance pipeline from `core/`. The rich `ProofLinkEngine` in core is used only by the MCP server tools. This is a significant architectural gap — the REST API is a stub implementation.

### Batch Processing

Two batch implementations exist:

**MCP server batch** (`packages/mcp-server/src/tools/batch-check.ts`): Uses `Promise.all` across all addresses simultaneously — no concurrency cap. At 100 addresses this fires 100 concurrent HTTP requests to Chainalysis. This could exhaust the Chainalysis rate limit or overwhelm the external provider.

**Core engine batch** (`packages/core/src/engine/prooflink.ts`, line 496-580): Proper design — pre-warms cache for unique addresses, then processes with `BATCH_CONCURRENCY_LIMIT = 20` concurrent workers.

**API route batch** (`/v1/compliance/batch`, compliance.ts line 246-365): Sequential loop, no parallelism, no concurrency control. Each item takes two sequential DB writes. This is the worst of the three implementations.

### Response Pagination

The `/v1/compliance/history` endpoint (compliance.ts line 369-426) implements cursor-less offset pagination with `page`/`limit` parameters (max 100 per page). Two queries are fired in parallel: the data query and a `COUNT(*)`. This is correct but will degrade with large tables since `COUNT(*)` with a `WHERE` clause requires a full index scan.

The analytics routes (`apps/api/src/routes/analytics.ts`) return unbounded aggregate results with no pagination — this is fine since they return pre-aggregated data.

---

## 4. Event System

### Implementation

**File**: `packages/core/src/events/emitter.ts`

`TypedEventEmitter` wraps Node.js's built-in `EventEmitter`. The max listeners limit is raised to 50 (line 88) to suppress the default 10-listener leak warning.

Events are **synchronous** — Node.js `EventEmitter.emit()` calls all listeners inline before returning. There is no async event dispatch, no queue, and no backpressure mechanism.

### Memory Leak Risk

**Low risk in current usage**: The engine creates one `TypedEventEmitter` per `ProofLinkEngine` instance (prooflink.ts line 125). If the engine is created as a singleton (which the MCP server context does via `packages/mcp-server/src/context.ts`), there is only one emitter. The `connectToEvents` method on `ComplianceMetrics` (metrics.ts line 128-140) adds listeners that are never removed — if multiple `ComplianceMetrics` instances are connected to the same emitter this leaks listeners, but in practice only one instance is connected per engine.

**Risk**: If callers use `on()` without corresponding `off()` in dynamic code paths (e.g. per-request listeners), listeners will accumulate. No request-scoped listener usage was found in the audit.

The `compliance:approved` listener registered in `connectToEvents` (metrics.ts line 129-131) is a no-op — the handler body is empty, meaning `compliance:approved` events are consumed but don't update any metric. This is a silent bug: approved decisions are emitted but not counted by the event-driven metrics path (though `recordDecision` is called directly in `postDecision`, so the count is tracked via the direct call path, not the event path).

### Backpressure

None. All event delivery is synchronous. If a listener throws, it propagates to the emitter and crashes the calling stack unless caught. The `emitError` wrapper in `ProofLinkEngine` (line 677-681) catches plugin errors but does not wrap sanctions or general event listeners.

---

## 5. Scalability Analysis

### Can the System Handle 1000+ checks/minute?

**Theoretical ceiling**: At 1000 checks/minute (~17/second), the primary bottleneck is external provider latency. The Chainalysis free API has no documented rate limit but is rate-limited implicitly. Each check hits Chainalysis twice (sender + receiver in parallel). At 17 checks/second this is 34 concurrent external requests. With the 5-second timeout (screener.ts line 96), up to 170 requests could be in-flight simultaneously.

The in-process LRU cache with 10,000 entries and 5-minute TTL significantly reduces this burden for repeated address lookups (common in practice — the same addresses transact repeatedly).

**Node.js single-threaded**: The event loop handles I/O concurrency fine, but any CPU-intensive synchronous work blocks all concurrent requests. AML scoring is synchronous but deterministic and fast (no blocking). SHA-256 hashing for receipt IDs uses Node.js native bindings — not blocking.

**Database bottleneck**: Each compliance check performs two sequential INSERTs (compliance_check + compliance_receipt). At 17 checks/second this is 34 sequential DB writes. With pool size 20 and typical write latency of 2-5ms, this saturates at roughly 4000-10000 writes/minute (67-167/sec), so DB writes are not the bottleneck at 1000 checks/minute.

### Horizontal Scaling

**Stateful in-memory components that break under horizontal scaling**:

1. `LRUCache` in `SanctionsScreener` — per-process, no sharing. Cache pre-warming in batch mode has no effect on other instances.
2. Rate limit store (`apps/api/src/middleware/rate-limit.ts`, `Map<string, RateLimitEntry>`) — per-process. With two instances, each API key gets 2x its rate limit.
3. WebSocket client registry (`apps/api/src/routes/ws.ts`, `Map<string, WsClient>`) — per-process. Events broadcast from one instance don't reach clients connected to another instance.
4. `ComplianceMetrics` counters — per-process, no aggregation.
5. `WebhookManager` state — per-process.

**Conclusion**: The system is **not horizontally scalable** in its current state. Running two instances splits rate limit enforcement and loses WebSocket fan-out consistency.

### Queue-Based Processing

No message queue (BullMQ, SQS, etc.) is used anywhere. The webhook retry system (`packages/core/src/webhooks/manager.ts`) implements in-process exponential backoff retries via `sleep()` — this blocks the worker waiting for retries and accumulates delivery records in memory indefinitely (`this.deliveries.push(...records)` with no cap, line 134).

### Rate Limiting Under Load

Rate limiting is sliding-window in-memory (api/src/middleware/rate-limit.ts). Default: 60 requests/minute per API key. The per-key `timestamps` array grows up to `limit` entries then gets pruned on each request. At high concurrency, multiple requests may read the same `timestamps.length` before any write, allowing brief bursts above the limit (classic TOCTOU — no lock in single-threaded JS, but async await in the middleware means other requests can interleave between the read at line 68 and the write at line 91). Under normal Node.js event loop semantics this is unlikely to be a real issue since the rate-limit check is synchronous within a single tick, but worth noting.

The x402-compliance package has its own `RateLimiter` (`packages/x402-compliance/src/rate-limiter.ts`) — a separate implementation also using in-memory sliding windows, not shared with the API rate limiter.

---

## 6. Resource Usage

### Memory Footprint — Sanctions Lists

The offline OFAC SDN list (`packages/core/src/sanctions/lists.ts`) contains:
- 29 Ethereum addresses (Tornado Cash, Lazarus Group, Garantex, Blender.io)
- 3 Bitcoin addresses
- Total: two `ReadonlySet<string>` objects — negligible memory (~2KB)

This is explicitly documented as "NOT a complete list" — production screening goes through Chainalysis. The full OFAC SDN list has ~13,000 entries; if it were loaded in-memory as a Set it would be approximately 5MB — trivial.

The `LRUCache` at 10,000 entries with typical `SanctionsCheckResult` objects (~500 bytes each) would use approximately **5MB** at capacity.

### CPU-Intensive Operations

1. **SHA-256 hashing**: Used in receipt ID generation (`issuer.ts`, `generateReceiptId`), receipt hash (`prooflink.ts` line 823), audit log hash chain, and HMAC signing for webhooks/API keys. All use Node.js native crypto bindings — fast, non-blocking.
2. **EIP-712 signing via viem**: Dynamic `import()` inside `signReceipt()` (issuer.ts line 192-194) — first invocation incurs module load cost. viem's signing is CPU-bound but fast (<5ms).
3. **AML scoring**: Pure arithmetic on 10 rules — benchmarks show <1ms per call.
4. **JSON serialization**: `checksPerformed` JSONB columns store full check arrays per compliance check. These are serialized/deserialized on every read.

### Network I/O Patterns

- Chainalysis API: 2 concurrent requests per compliance check (sender + receiver via `Promise.all`)
- Notabene Travel Rule API: 1 sequential request per check (above travel rule threshold)
- IPFS: Not actually used — `generateContentHash` returns a local SHA-256 URI, no network call
- EAS attestation: Not invoked in current code paths (schema exists, integration client exists, but not wired to compliance pipeline)
- All external HTTP calls have AbortController timeouts (5 seconds for Chainalysis/TRM, 10 seconds for webhooks)

---

## 7. Monitoring and Telemetry

### Prometheus Metrics

**File**: `packages/core/src/telemetry/prometheus.ts`

A zero-dependency Prometheus text format exporter is implemented. Pre-registered metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `compliance_checks_total` | counter | Total compliance checks |
| `sanctions_matches_total` | counter | Sanctions matches detected |
| `check_duration_seconds` | histogram | Compliance check duration (buckets: 5ms to 10s) |
| `risk_score_distribution` | histogram | AML risk scores (buckets: 0.1 to 1.0) |
| `active_connections` | gauge | Active connections |
| `cache_size` | gauge | Cache entries |

**Critical gap**: The `PrometheusExporter` is instantiated but there is no `GET /metrics` HTTP endpoint exposed in the API (`apps/api/src/app.ts`). The exporter exists as a library class but is never mounted. Prometheus cannot scrape the service.

### In-Memory ComplianceMetrics

**File**: `packages/core/src/telemetry/metrics.ts`

Tracks: decision counts by status, latency array (for p95/p99), cache hit rate, API error rate, sanctions matches.

**Critical unbounded memory issue**: The `latencies: number[]` array (metrics.ts line 92) grows without bound — every compliance decision appends a latency value and it is never trimmed or windowed. At 1000 checks/minute, after 1 hour this array has 60,000 floats (~480KB). After 24 hours: ~11MB. The `getMetrics()` call sorts a copy of this entire array on every invocation (`[...this.latencies].sort(...)`, line 207), which becomes O(n log n) at scale. This will cause measurable GC pressure and CPU spikes at sustained load.

### SLI/SLO-Relevant Metrics

The following SLI-relevant metrics are tracked:
- Latency percentiles (avg, p95, p99) — via ComplianceMetrics
- Decision counts by status (approved/rejected/escalated) — via ComplianceMetrics
- Cache hit rate — tracked but not exposed to Prometheus
- API error rate — tracked but not exposed to Prometheus
- Sanctions matches — tracked in both systems

**Not tracked**:
- Per-route HTTP latency (Hono's `timing()` middleware is wired, but no metric endpoint reads it)
- Queue depth / backlog (no queue)
- External provider latency (Chainalysis, Notabene) as separate metrics
- Database connection pool utilization
- WebSocket connection count (a `getWsClientCount()` helper exists in ws.ts but is not exposed)

### Distributed Tracing

No distributed tracing (OpenTelemetry, Jaeger, Zipkin) is implemented. Request IDs are propagated via the `X-Request-ID` header (`requestIdMiddleware` in logger.ts) which enables log correlation, but there is no span/trace propagation to external services or across service boundaries.

---

## 8. Summary of Critical Issues

| Severity | Issue | Location |
|----------|-------|----------|
| HIGH | Redis provisioned but unused — rate limiting and WebSocket fan-out not horizontally scalable | rate-limit.ts:7, ws.ts:44 |
| HIGH | In-memory `latencies[]` array grows unbounded — O(n log n) sort on every metrics snapshot | telemetry/metrics.ts:92,207 |
| HIGH | Batch API route uses sequential DB writes (2N round-trips for N items) | routes/compliance.ts:260-353 |
| HIGH | No `GET /metrics` endpoint — Prometheus exporter is instantiated but never mounted | app.ts (missing), prometheus.ts |
| HIGH | REST API compliance route does not call ProofLinkEngine — it is a stub with hardcoded values | routes/compliance.ts:63-197 |
| MEDIUM | LRU cache is per-process — multi-instance deployments have no shared cache | cache.ts, screener.ts |
| MEDIUM | Rate limiter is per-process — each replica applies limit independently (effective 2x the limit with 2 replicas) | middleware/rate-limit.ts |
| MEDIUM | WebSocket client registry is per-process — broadcast events don't fan out across instances | routes/ws.ts:47 |
| MEDIUM | `complianceChecks.status` column has no index despite frequent filter usage | db/schema.ts |
| MEDIUM | `complianceReceipts.check_id` FK has no explicit index | db/schema.ts |
| MEDIUM | `audit_log` table has no indexes | db/schema.ts |
| MEDIUM | `db.Pool` created without `idleTimeoutMillis` or `connectionTimeoutMillis` | db/index.ts |
| MEDIUM | Allowlist/blocklist checked via `Array.includes()` (O(n)) — should be a `Set` | engine/prooflink.ts:251-254 |
| LOW | MCP batch tool fires `Promise.all` on all 100 addresses with no concurrency cap | tools/batch-check.ts:73 |
| LOW | `WebhookManager.deliveries` array grows unbounded (no eviction policy) | webhooks/manager.ts:134 |
| LOW | Empty `compliance:approved` listener registered in `connectToEvents` (no-op) | telemetry/metrics.ts:129-131 |
| LOW | No distributed tracing | entire codebase |
