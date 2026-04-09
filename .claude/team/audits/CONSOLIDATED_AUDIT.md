# ProofLink Deep Audit — Consolidated Report
> 6 expert agents audited 40+ files. March 25, 2026.

---

## CRITICAL Issues: 24 Total

### Security (6)
1. **No tenant isolation (IDOR)** — any API key accesses any escrow/dispute/stream/saga
2. **List endpoints expose all tenants' data** — GET returns ALL records
3. **Evaluator signature never cryptographically verified** — string match only
4. **Stream budget double-spend** — read-compute-write race condition
5. **autoResolveExpired skips state machine** — OPEN→RESOLVED directly
6. **autoArbitrate mutates without state guard** — no WHERE state check

### Compliance (6)
7. **Screening fails open** — `failOpen: true` approves during provider outage
8. **AML_MONITORING always "PASSED"** — hardcoded before scorer runs
9. **Travel Rule never transmitted** — "TRANSMITTED" stored but nothing sent
10. **KYA never verified** — DB existence check, not credential verification
11. **Daily spend limit fails open** — catch{} returns allowed:true
12. **KYA credential signature never verified** — verifyCredentialSignature unused

### Architecture (6)
13. **Rate limiter is in-memory** — useless with >1 pod
14. **Audit hash chain forks** in multi-process
15. **Auth does DB query per request** — no caching
16. **WebSocket broadcast is process-local** — events lost in multi-pod
17. **DB pool hardcoded at 20** — no env override
18. **No graceful shutdown** — audit entries lost

### Protocol (6)
19. **x402 compliance hook not wired to real SDK** — custom interface, not Coinbase SDK
20. **MCP pay_with_compliance fabricates KYA credential** — always passes
21. **IVMS101 message non-compliant** — flat name, USD amount, hardcoded VASP
22. **MCP tools use $1K threshold** — contradicts FATF $3K standard
23. **ERC-8004 lookup always Ethereum mainnet** — wrong chain for Base/Arbitrum
24. **AP2 Travel Rule threshold raised to $5K** — no regulatory basis

### Data Model (4)
25. **travelRuleStatus "REQUIRED_PENDING" not in shared enum** — parse failures
26. **overallStatus uses APPROVED/REJECTED** — shared type expects COMPLIANT/BLOCKED
27. **Double-mount /v1 and /api/v1** — same router, double rate limit ticks
28. **Duplicate unique constraints** — keyHash and agentDid have both .unique() and uniqueIndex

---

## IMPORTANT Issues: 35 Total

### Security (9)
- JWT scopes self-asserted (no DB validation)
- Request signing opt-in (trivially bypassed)
- Unbounded evidence injection + submittedBy forgery
- Unsigned permission translations look authoritative
- Selective disclosure nonce leaked (brute-forceable)
- Saga params target victim escrows
- Any tenant can dispute any escrow
- No payer/payee role enforcement
- resolvedBy caller-supplied

### Compliance (11)
- Duplicate CTR/SAR generation (no unique constraint)
- SAR risk factors never extracted (structuring/mixer/darknet dead)
- Inconsistent default jurisdiction (US $3K vs DEFAULT $0)
- JURISDICTIONAL_RULES always "PASSED"
- Delegation scope: raw tokens vs USD comparison
- Hardcoded ETH=$3500 BTC=$87000 (stale, no oracle)
- DID regex matches any 2-char suffix (not just did:web:)
- Batch endpoint missing beneficiary originator
- No auth on /v1/compliance/check (free screening oracle)
- Batch still says "TRANSMITTED" (single-check says "REQUIRED_PENDING")
- VC 2.0 context URL not accepted

### Architecture (4)
- Screening fallback uses console.warn not logger
- Health check doubles DB load
- JWT has no revocation path
- Missing env vars cause silent degradation

### Protocol (9)
- x402 V2 CAIP-2 not implemented (hardcoded EVM only)
- A2A Agent Card missing protocolVersion field
- Reverse x402 translation: USD values not token units, zero nonce
- Reverse ERC-7710: hardcoded null contractAddress
- Saga steps are stubs (no real service calls, no DI)
- Policy syncPolicyToChain marks "synced" without syncing
- Cross-chain velocity window field unused
- payloadKey collision risk for multi-sig signatures
- W3C VC 2.0 context not accepted

### Data Model (9)
- WS event types split between events.ts and ws.ts
- JSONB delegationScope unbounded (stores entire imported cards)
- Missing composite index (status, createdAt)
- Amount column stores native tokens, aggregated as USD
- No audit_log indexes for investigations
- Dual KYA schema divergence (shared vs API)
- No audit log on identity/credential mutations
- Missing FKs on agentDid references
- Audit hash chain unsafe multi-process

### Test Coverage (10)
- escrow.ts: zero tests (P0 — handles funds)
- saga.ts: all .todo() stubs (P0 — compensation untested)
- arbitration.ts: zero tests (P0 — refund amounts)
- disputes.ts: zero tests (P0 — state machine bypass)
- billing.ts: zero tests (P1 — fee calculation)
- policy-sync.ts: all .todo() stubs (P1 — spend limits)
- Float precision in streaming-payments (NaN propagation)
- Valid request signature path never tested
- Audit queue not reset between tests
- Vacuous mock assertions in several tests

---

## Priority Fix Sprints

### Sprint 1: Security Foundation (MUST before any external access)
- Add tenant isolation to ALL fetch helpers + list queries
- Add party authorization on escrow/dispute mutations
- Fix stream budget with atomic SQL
- Fix state machine bypasses (autoResolve + autoArbitrate)

### Sprint 2: Compliance Correctness (MUST before regulatory claims)
- Set failOpen=false for production
- Move AML check result AFTER scorer runs
- Wire TravelRuleChecker.checkTravelRule() into route
- Wire KYAVerifier.verifyCredential() into route
- Fix IVMS101 message structure (structured name, native amount)
- Fix MCP KYA bypass (no synthetic credentials)
- Align Travel Rule thresholds ($3K everywhere)
- Fix delegation scope to use amountUsd not raw tokens

### Sprint 3: Infrastructure (MUST before multi-pod deploy)
- Redis rate limiter
- Advisory lock for audit hash chain
- API key LRU cache
- Redis pub/sub for WebSocket
- Graceful shutdown
- Env var validation at startup

### Sprint 4: Quality + Standards
- Write tests for escrow, disputes, arbitration, billing
- Replace .todo() stubs with real tests
- Fix data model inconsistencies (enum alignment, FKs, indexes)
- Accept W3C VC 2.0
- Fix A2A Agent Card spec compliance
- Implement saga DI for real service calls

---

*Total findings: 24 Critical + 35 Important = 59 issues across 6 domains.*
*Auditors: Compliance Architect, Security Researcher, TypeScript Engineer, Test Engineer, DevOps Engineer, Protocol Engineer.*
