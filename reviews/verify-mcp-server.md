# MCP Server Verification Report

**Package:** `@prooflink/mcp-server` (`packages/mcp-server/`)
**Date:** 2026-03-21
**SDK:** `@modelcontextprotocol/sdk ^1.12.0`

---

## Test Results

```
 RUN  v3.2.4

 ✓ src/__tests__/server.test.ts (50 tests) 1277ms

 Test Files  1 passed (1)
      Tests  50 passed (50)
   Duration  2.71s
```

All 50 tests pass. Tests use `InMemoryTransport` to create a real MCP client-server pair — no mocking of the protocol layer.

---

## Architecture Overview

**server.ts** — Factory function `createProofLinkMCPServer()` creates a `McpServer` instance ("prooflink-compliance" v1.0.0), registers all 11 tools + 3 resources, then returns a handle with `start()`/`close()`. Supports stdio (default) and SSE transports.

**context.ts** — Singleton service layer. Instantiates `SanctionsScreener`, `AMLScorer`, and `KYAVerifier` from `@prooflink/core` using `loadConfig()` from env vars. Shared across all tool handlers.

**errors.ts** — Standardized error formatting via `formatMcpError(code, message, details?)`. Produces `{ content: [{ type: "text", text }], structuredContent: { code, message, details }, isError: true }`. 16 error codes defined.

**index.ts** — Entry point with `#!/usr/bin/env node`. Reads `PROOFLINK_TRANSPORT` and `PROOFLINK_SSE_PORT` from env. Exports all public types.

---

## Tool Inventory (11 tools)

### 1. `check_sanctions`
- **Description:** Screen address or entity name against OFAC SDN, EU Consolidated, UN Consolidated, HMT
- **Inputs:** `address?` (string), `entity_name?` (string), `chain?` (SupportedChain), `include_indirect` (bool, default false)
- **Outputs:** `cleared` (bool), `risk_score` (0-100), `matches[]` (list/entry_id/name/confidence), `lists_checked[]`, `screened_at`, `receipt_id`
- **Validation:** Mutually exclusive address/entity_name; chain required with address; uses real `SanctionsScreener` for addresses, offline OFAC list for entity names
- **Issues:** `include_indirect` parameter is accepted but never used in the handler logic

### 2. `verify_kya`
- **Description:** Verify AI agent identity via ERC-8004 registry
- **Inputs:** `agent_id` (string), `agent_wallet?` (string), `operator_did?` (string), `check_spending_limits` (bool, default true)
- **Outputs:** `verified` (bool), `trust_score` (0-100), `agent_metadata`, `operator_status`, `spending_limits?`, `verification_errors[]`, `latency_ms`, `receipt_id`
- **Validation:** Uses real `KYAVerifier` from core; builds synthetic W3C VerifiableCredential from params
- **Issues:** Trust score is hardcoded binary (87 if verified, 15 if not) rather than computed from verification result. Spending limits are mostly hardcoded defaults regardless of delegation scope.

### 3. `create_compliant_invoice`
- **Description:** Generate compliance-stamped JSON-LD invoice
- **Inputs:** `seller` (PartySchema), `buyer` (PartySchema), `line_items[]` (desc/qty/unit_price/category), `currency` (USDC/USDT/USD/EUR/GBP), `payment_protocol?` (x402/mpp/ap2/acp/direct), `work_proof?`, `due_date?`, `anchor_on_chain` (bool, default true)
- **Outputs:** `invoice_id`, `invoice_url` (sha256 hash), `total_amount`, `currency`, `content_hash`, `compliance_stamp`, `payment_instructions`, `receipt_id`
- **Validation:** Zod schema validates line items (1-500), positive quantities, non-negative prices
- **Issues:** Comment says "run sanctions checks on both parties" but `compliance_stamp.seller_cleared` and `buyer_cleared` are always hardcoded `true` — no actual screening happens. EAS attestation UID is synthetic (hash + zeros).

### 4. `register_agent`
- **Description:** Register AI agent identity in ProofLink registry (ERC-8004 compatible)
- **Inputs:** `name` (1-128 chars), `type` (AgentType enum), `wallet_address`, `operator` (name/did?/lei?), `delegation_scope` (max_tx/daily/chains/currencies/expires), `x402_support` (bool), `metadata?`
- **Outputs:** `agent_id`, `did` (did:prooflink:...), registration details, operator screening, delegation scope with defaults
- **Validation:** Zod schema + manual wallet_address check; smart defaults (daily = 5x per-tx, chains = ["base"], currencies = ["USDC"], expires = 1yr)
- **Issues:** Manual `wallet_address` check on line 91 is redundant — `z.string()` already requires it. Operator screening is hardcoded (sanctions always cleared). No persistence — registrations are fire-and-forget.

### 5. `pay_with_compliance`
- **Description:** End-to-end compliant stablecoin payment with orchestrated compliance
- **Inputs:** `recipient` (wallet/agent_id?/legal_name?), `amount` (value/currency), `chain` (base/ethereum/solana/polygon), `payment_protocol` (x402/direct), `memo?`, `invoice_id?`, `require_kya` (bool), `dry_run` (bool)
- **Outputs:** `status` (COMPLETED/DRY_RUN_PASSED/BLOCKED/DRY_RUN_BLOCKED), `simulated` (bool), `tx_hash`, `compliance_summary`, `receipt_id`, `eas_attestation_uid`, `invoice_id`
- **Validation:** Real sanctions screening + real KYA verification. Payment execution and Travel Rule are simulated (clearly documented). Blocks on sanctions match, KYA failure (if require_kya), or missing agent_id (if require_kya).
- **Issues:** This is the best-implemented tool. The `simulated: true` flag is honest. No sender identity — only screens recipient.

### 6. `get_compliance_receipt`
- **Description:** Retrieve cryptographically-signed compliance proof
- **Inputs:** `tx_hash?` (string), `receipt_id?` (string), `include_raw_evidence` (bool)
- **Outputs:** `receipt_id`, `prooflink_version`, `transaction?`, `checks_performed[]`, `overall_status`, `eas_attestation_uid`, `receipt_signature`, `ipfs_cid`, `raw_evidence?`
- **Validation:** Requires at least one of tx_hash/receipt_id
- **Issues:** Entirely stubbed — returns hardcoded "COMPLIANT" status with canned check results regardless of input. No actual receipt store lookup. `eas_attestation_uid`, `receipt_signature`, and `ipfs_cid` are always null.

### 7. `submit_travel_rule`
- **Description:** Transmit FATF Travel Rule originator/beneficiary data
- **Inputs:** `transaction` (tx_hash?/amount_usd/asset/chain/direction), `originator` (wallet/name/address/account/national_id/agent_id/vasp_did), `beneficiary` (wallet/name/agent_id/vasp_did), `pre_transaction` (bool)
- **Outputs:** `submitted` (bool), `simulated` (bool), `travel_rule_id`, `counterparty_vasp_acknowledged`, `threshold_exceeded`, `jurisdictions_covered[]`, `receipt_id`
- **Validation:** Real threshold check ($1,000 USD). Jurisdiction determination based on VASP DIDs. Clearly marked as simulated.
- **Issues:** `pre_transaction` flag is accepted but never used in the logic.

### 8. `get_risk_report`
- **Description:** Comprehensive risk report for a blockchain address
- **Inputs:** `address`, `chain` (SupportedChain), `depth` (basic/standard/enhanced), `time_range_days` (1-365, default 90)
- **Outputs:** `report_id`, `address`, `chain`, `depth`, `sanctions`, `risk_score` (overall/factors/threshold/exceeds), `transaction_patterns?`, `counterparty_exposure?`, `behavioral_flags?`, `recommendation` (ALLOW/BLOCK), `eas_attestation_uid`
- **Validation:** Real sanctions screening + real AML risk scoring via core engines. Depth controls which sections are included (basic < standard < enhanced).
- **Issues:** Transaction patterns, counterparty exposure, and behavioral flags are hardcoded sample data (commented as such). `time_range_days` is accepted but not used in any actual query.

### 9. `get_compliance_metrics`
- **Description:** System health and compliance pipeline metrics
- **Inputs:** `time_range` (1h/6h/24h/7d/30d, default 24h), `include_latency_percentiles` (bool)
- **Outputs:** `time_range`, `generated_at`, `sanctions_screening`, `kya_verification`, `travel_rule`, `payments`, `system` (uptime/requests/error_rate/active_agents)
- **Issues:** All metrics are hardcoded sample data. No actual metrics store integration. `time_range` is accepted but returns the same data regardless.

### 10. `batch_compliance_check`
- **Description:** Screen multiple addresses in a single call
- **Inputs:** `addresses[]` (address/chain/label?, min 1, max 100), `include_indirect` (bool)
- **Outputs:** `batch_id`, `total`, `cleared`, `blocked`, `lists_checked[]`, `screened_at`, `results[]` (per-address: address/chain/label/cleared/risk_score/matches[])
- **Validation:** Real sanctions screening via `Promise.all` for parallel execution. Zod enforces 1-100 range.
- **Issues:** `include_indirect` is accepted but never used (same as check_sanctions). No rate limiting on the batch.

### 11. `list_invoices`
- **Description:** List invoices with filtering and pagination
- **Inputs:** `status?` (InvoiceState enum), `seller_wallet?`, `buyer_wallet?`, `currency?` (InvoiceCurrency enum), `date_from?`, `date_to?`, `min_amount?`, `max_amount?`, `limit` (1-100, default 20), `offset` (default 0)
- **Outputs:** `invoices[]`, `total`, `limit`, `offset`, `has_more`, `filters_applied`
- **Issues:** Returns hardcoded sample invoices (up to 3). Filters are echoed back in `filters_applied` but not actually applied to any data store. `has_more` is always false.

---

## Resource Inventory (3 resources)

### 1. `prooflink://compliance/policy`
- **Name:** compliance-policy
- **MIME:** application/json
- **Content:** Sanctions lists, risk thresholds (from `@prooflink/shared` constants), Travel Rule thresholds, VASP messaging providers, fail_open flag, allowlist/blocklist, EDD jurisdictions
- **Issues:** `fail_open` is hardcoded `false` here but `context.ts` defaults it to `true` from env var — inconsistency

### 2. `prooflink://compliance/stats`
- **Name:** compliance-stats
- **MIME:** application/json
- **Content:** 24h screening volumes, pass rates, Travel Rule submissions, payment stats, system health
- **Issues:** All hardcoded sample data (identical to get_compliance_metrics). `uptime_seconds` does use real `process.uptime()`.

### 3. `prooflink://agents/registered`
- **Name:** registered-agents
- **MIME:** application/json
- **Content:** List of registered agents with IDs, operator info, delegation scopes, reputation scores
- **Issues:** Returns 2 hardcoded sample agents. No connection to register_agent tool — registrations don't appear here.

---

## SSE Transport (`transports/sse.ts`)

**Implementation:** Raw `node:http` server with SSE and JSON-RPC message endpoints.

**Endpoints:**
- `GET /sse` — Opens SSE stream, creates `SSEServerTransport`, connects to MCP server
- `POST /message` — Routes JSON-RPC messages to the SSE transport
- `GET /health` — Returns `{ status, connections, uptime }`

**Production readiness assessment:**
- CORS support with env-based origin control (`CORS_ORIGIN`, production defaults to empty string)
- Heartbeat keep-alive (30s default, configurable)
- Proper connection cleanup on client disconnect (clears heartbeat timer, removes from map)
- Graceful shutdown (clears all timers, closes HTTP server)

**Issues:**
- **Multi-client routing is broken:** `POST /message` always routes to `connections.values().next().value` (first connection). With multiple SSE clients, messages go to the wrong session. The SDK's `SSEServerTransport.handlePostMessage` expects sessionId-based routing but the code ignores the query parameter.
- **No authentication:** No API key or token validation on any endpoint. Any client can connect.
- **No TLS:** Raw HTTP only. Would need reverse proxy (nginx/caddy) for production.
- **No request body size limit:** POST /message accepts unbounded payloads.
- **Empty CORS origin in production:** Setting `Access-Control-Allow-Origin: ""` will block all cross-origin requests, which may or may not be intentional.

---

## Issues Summary

### Critical
1. **SSE multi-client routing broken** — POST /message routes to first connection regardless of session, will cause cross-session message delivery with >1 client
2. **create_compliant_invoice skips actual sanctions screening** — Claims both parties cleared but never calls sanctionsScreener

### High
3. **No authentication on SSE transport** — No API key validation
4. **get_compliance_receipt is fully stubbed** — Returns canned "COMPLIANT" for any input, no receipt persistence
5. **Resources disconnected from tools** — registered-agents resource returns hardcoded data, not actual registrations

### Medium
6. **`include_indirect` parameter unused** in check_sanctions and batch_compliance_check
7. **`pre_transaction` parameter unused** in submit_travel_rule
8. **`time_range_days` parameter unused** in get_risk_report
9. **verify_kya trust score is binary** (87/15) instead of computed
10. **Compliance policy resource shows `fail_open: false`** but context.ts defaults to `true`
11. **Metrics and stats are hardcoded** — no real metrics collection

### Low
12. **Redundant wallet_address check** in register_agent (Zod already validates)
13. **No rate limiting** on batch_compliance_check
14. **No request body size limit** on SSE transport

---

## Missing Tools AI Agents Would Need

1. **`update_agent`** — Modify delegation scope, spending limits, or metadata after registration
2. **`deactivate_agent`** — Suspend or deactivate an agent
3. **`get_agent`** — Look up a single agent by ID (currently only list via resource)
4. **`cancel_invoice`** / **`update_invoice_status`** — Transition invoice state (ISSUED -> CANCELLED/DISPUTED)
5. **`get_invoice`** — Retrieve a single invoice by ID
6. **`verify_receipt`** — Cryptographically verify a ProofLink receipt's authenticity
7. **`check_spending_limit`** — Pre-flight check whether a payment would exceed agent's delegation scope
8. **`get_transaction_history`** — Query past transactions for an agent/address
9. **`set_allowlist` / `set_blocklist`** — Manage address allow/block lists
10. **`webhook_subscribe`** — Register webhooks for compliance events (sanctions match, payment blocked, etc.)

---

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/claude/claude_desktop_config.json` (Linux):

### Option 1: stdio transport (recommended for local dev)

```json
{
  "mcpServers": {
    "prooflink-compliance": {
      "command": "node",
      "args": ["/home/akash/PROJECTS/prooflink/packages/mcp-server/dist/index.js"],
      "env": {
        "PROOFLINK_FAIL_OPEN": "true"
      }
    }
  }
}
```

Build first: `cd /home/akash/PROJECTS/prooflink && pnpm build --filter=@prooflink/mcp-server`

### Option 2: npx (after publishing)

```json
{
  "mcpServers": {
    "prooflink-compliance": {
      "command": "npx",
      "args": ["@prooflink/mcp-server"],
      "env": {
        "PROOFLINK_API_KEY": "fl_live_xxx",
        "PROOFLINK_FAIL_OPEN": "true"
      }
    }
  }
}
```

### Option 3: SSE transport (for remote/shared access)

Start the server:
```bash
PROOFLINK_TRANSPORT=sse PROOFLINK_SSE_PORT=3001 node packages/mcp-server/dist/index.js
```

Then configure Claude Desktop to connect via SSE at `http://localhost:3001/sse`.

---

## Verdict

The MCP server is **well-structured and functional for demo/prototype purposes**. The protocol implementation is correct — tool registration via `server.tool()` with Zod schemas, resource registration via `server.resource()`, proper content/structuredContent response format, and isError flagging all follow the MCP spec. The test suite is thorough (50 tests covering all tools with edge cases).

The main gap is that 4 of 11 tools return simulated/hardcoded data (get_receipt, get_metrics, list_invoices, and partially get_risk_report), while 3 tools use real `@prooflink/core` engines for sanctions screening and KYA verification (check_sanctions, batch_compliance_check, pay_with_compliance, get_risk_report, verify_kya). The SSE transport needs the multi-client routing fix and authentication before any production deployment.
