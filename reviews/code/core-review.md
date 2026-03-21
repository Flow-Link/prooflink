# Code Review: packages/core/ and packages/shared/

Reviewer: Claude (automated)
Date: 2026-03-21
Scope: All `.ts` source files in `packages/core/src/` and `packages/shared/src/`

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 6     |
| HIGH     | 12    |
| MEDIUM   | 14    |
| LOW      | 9     |

---

## CRITICAL

### C-1: Private key stored and used as plain string — no validation
**File:** `packages/core/src/config.ts:72` and `packages/core/src/receipts/issuer.ts:193`

`signerPrivateKey` is typed `string | undefined` with no format validation in Zod and no sanitization before passing to viem. A caller that accidentally passes an API key string will get a confusing viem error deep in `signReceipt`, not a fail-fast validation error at `loadConfig` time. More critically, the raw private key is retained in the config object for the lifetime of the process — any code that serializes `config` (e.g., a debug `JSON.stringify`) will leak it.

**Fix:**
```ts
// config.ts
signerPrivateKey: z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "signerPrivateKey must be a 0x-prefixed 32-byte hex string")
  .optional(),
```
Do not store the key; store a pre-derived `Account` object or a signing function instead.

---

### C-2: Allowlist bypass skips receiver sanctions check
**File:** `packages/core/src/engine/prooflink.ts:221-225`

When the sender is on the allowlist the function immediately returns `APPROVED` with no sanctions check on the **receiver**. A sanctioned counterparty can receive value from an allowlisted sender with zero compliance gates.

```ts
if (allowlistLower.includes(senderLower)) {
  const decision = this.buildApprovedDecision(request, checks, start);
  await this.postDecision(decision, request, pluginCtx, start);
  return decision;   // receiver is NEVER screened
}
```

**Fix:** The allowlist should bypass the sender sanctions API call (it is already known-trusted) but the receiver must still be screened.

---

### C-3: SSRF via unvalidated webhook URL
**File:** `packages/core/src/webhooks/manager.ts:58-68`

`register()` accepts an arbitrary `url` string and immediately stores it. When `dispatch()` is called, `fetchFn` issues a POST to that URL with the full event payload including compliance data. There is no restriction to HTTPS, no block-list for private IP ranges (localhost, 169.254.x.x, 10.x.x.x, etc.), and no scheme enforcement. An attacker who can call `register()` can exfiltrate compliance data to internal services or receive SSRF-amplified requests.

**Fix:**
```ts
register(url: string, secret: string, events: WebhookEventType[]): WebhookConfig {
  const parsed = new URL(url); // throws on malformed
  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS");
  }
  const hostname = parsed.hostname;
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|0\.0\.0\.0)/.test(hostname)) {
    throw new Error("Webhook URL cannot target private addresses");
  }
  // ...
}
```

---

### C-4: Dangerous `as unknown as KYACredentialSubject` cast skips all type safety
**File:** `packages/core/src/identity/kya-verifier.ts:178`

```ts
const subject = credential.credentialSubject as unknown as KYACredentialSubject;
```

`credentialSubject` is typed `{ id: string; [key: string]: unknown }`. The double cast bypasses TypeScript entirely. If `walletAddress`, `delegationScope`, or `delegationScope.expiresAt` are absent in the real credential JSON the code will throw at runtime or silently produce wrong results.

**Fix:** Parse via the `KYACredentialSubject` Zod schema exported from `@flowlink/shared`:
```ts
import { KYACredentialSubject as KYACredentialSubjectSchema } from "@flowlink/shared";
const subjectParse = KYACredentialSubjectSchema.safeParse(credential.credentialSubject);
if (!subjectParse.success) {
  errors.push(`Invalid credentialSubject: ${subjectParse.error.message}`);
  // handle early exit
}
const subject = subjectParse.data;
```

---

### C-5: Receipt ID uses non-cryptographic hash — collision risk and arithmetic overflow
**File:** `packages/core/src/receipts/issuer.ts:63-71`

`hashString` implements a 64-bit FNV-like hash over a BigInt. With birthday-paradox probability a collision occurs around 2^32 receipts. More critically, line 68 uses `hash & 0xffffffffffffffffn` which masks to 64 bits in BigInt domain but the result is then converted to a 16-character hex string via `.toString(16)` — if the BigInt accumulator exceeds 2^64 it wraps and the comment "Keep within 64-bit range" is misleading because JavaScript BigInts do not overflow: `0xffffffffffffffffn + 1n` is `0x10000000000000000n`, and `& 0xffffffffffffffffn` does correctly mask. However, the FNV mix `(hash << 5n) - hash + char` can produce negative BigInt results that produce incorrect hex strings.

The comment says "replace with keccak256 from viem" — this must be done before production use.

**Fix:** Use `keccak256` + `toBytes` from viem (already imported in `computeReceiptHash`):
```ts
import { keccak256, toBytes } from "viem";
function hashString(input: string): string {
  return keccak256(toBytes(input)).slice(2, 18); // first 8 bytes
}
```

---

### C-6: `FileStorage.get` and `FileStorage.list` parse untrusted JSON without schema validation
**File:** `packages/core/src/receipts/storage.ts:121`, `157`

```ts
return JSON.parse(content) as ComplianceReceipt;
```

Files on disk may have been tampered with or written by a buggy earlier version. A malformed or malicious JSON file is cast directly to `ComplianceReceipt` with no Zod validation. Any downstream code reading `receipt.overallStatus`, `receipt.riskScore`, etc. trusts these values absolutely — including the receipt signature that gates payment release.

**Fix:**
```ts
import { ComplianceReceipt } from "@flowlink/shared";
const raw = JSON.parse(content);
return ComplianceReceipt.parse(raw);
```

---

## HIGH

### H-1: Sanctions cache stores `matched: false` results with 5-minute TTL — stale clean status
**File:** `packages/core/src/sanctions/screener.ts:356`

Both clean and sanctioned results are cached with `sanctionsCacheTtlMs` (default 5 minutes). If an address is added to OFAC's list between cache population and expiry, the cached `matched: false` response continues to be served. OFAC FAQ 1078 requires checks to reflect the current list at time of transaction.

**Fix:** Only cache `matched: false` results with a short TTL (e.g. 60 seconds). Cache `matched: true` indefinitely (designations are rarely reversed). Add a `SANCTIONS_CACHE_NEGATIVE_TTL_MS` config option.

---

### H-2: `buildCacheKey` lowercases address but Bitcoin addresses are case-sensitive
**File:** `packages/core/src/sanctions/screener.ts:547-549`

```ts
return `sanctions:${chain}:${address.toLowerCase()}`;
```

Bitcoin bech32 addresses are case-sensitive. Lowercasing a Bitcoin address will cause cache misses and may produce wrong API lookups. Additionally the raw (original-case) address is passed to the Chainalysis API while the cache key uses the lowercased form — creating a key/value mismatch for mixed-case EVM checksum addresses if the API returns different results for different casings.

**Fix:** For EVM chains, normalize to lowercase at the `screenAddress` entry point and pass the normalized form throughout. For Bitcoin and Solana, preserve original case.

---

### H-3: `screenBatch` issues up to 200 parallel requests with no rate limiting
**File:** `packages/core/src/sanctions/screener.ts:363-371`

`screenBatch` fires `Promise.all` over the entire input. For a 100-item batch with cold caches this produces 200 parallel requests to Chainalysis. The free API rate limit is ~10 req/s. This will cause HTTP 429s and partial failures swallowed by `Promise.all`.

**Fix:** Add concurrency control (e.g. p-limit or a semaphore) and propagate individual errors with partial-success semantics.

---

### H-4: Travel Rule jurisdiction inferred from VASP DID TLD — trivially spoofable
**File:** `packages/core/src/travel-rule/checker.ts:307`

```ts
const didMatch = /\.([a-z]{2})$/.exec(data.originator.vaspDid);
```

A VASP can register `did:web:vasp.kp` and this code uses `"KP"` (North Korea) as the jurisdiction, potentially resolving a lower threshold. A VASP registering `did:web:vasp.jp` exploits Japan's zero-threshold to require Travel Rule for all amounts, or a VASP with `did:web:vasp.us` exploits the $3,000 threshold. The two-letter TLD has no normative relation to a VASP's regulatory jurisdiction.

**Fix:** Remove TLD-based jurisdiction inference. Require explicit `originator.jurisdiction` / `beneficiary.jurisdiction` fields in `TravelRuleData`, or implement a VASP registry lookup via Notabene's VASP directory.

---

### H-5: `LRUCache.has` promotes entry to MRU via `get` — unintended side effect
**File:** `packages/core/src/cache.ts:68-70`

```ts
has(key: string): boolean {
  return this.get(key) !== undefined;
}
```

`has` re-inserts the entry into the Map (via `get`'s LRU promotion), changing eviction order even when the caller only needs to test for existence. This breaks LRU semantics for probe-only use cases.

**Fix:**
```ts
has(key: string): boolean {
  const entry = this.map.get(key);
  if (!entry) return false;
  return Date.now() <= entry.expiresAt;
}
```

---

### H-6: Webhook HMAC secret stored in plaintext and returned by `list()` / `get()`
**File:** `packages/core/src/webhooks/manager.ts:59-67`, `77-84`

The HMAC secret is stored verbatim and returned in full by both `list()` and `get()`. Any API layer that proxies these responses will expose the secrets.

**Fix:** Return a redacted view from `list()` / `get()` that replaces `secret` with a masked string or omits it. Store only a hash for verification.

---

### H-7: `metrics.latencies` array grows without bound — memory leak
**File:** `packages/core/src/telemetry/metrics.ts:65`

```ts
private latencies: number[] = [];
```

Every `recordDecision` call appends to `latencies`. In a long-running service this grows indefinitely. `getMetrics()` runs a `reduce` over the entire array each call.

**Fix:** Use a rolling window (circular buffer of fixed size, e.g. 10,000 samples) or maintain a running Welford mean/variance instead of storing raw values.

---

### H-8: `checkComplianceBatch` address extraction breaks for addresses containing `:`
**File:** `packages/core/src/engine/prooflink.ts:447`

```ts
address: key.split(":")[0]!,
```

The map key is `${address.toLowerCase()}:${chain}` where chain is a CAIP-2 string like `eip155:1`. Splitting on `:` and taking index `[0]` extracts the address correctly for EVM and Solana addresses (which contain no `:`). However, if the chain string is stored as the value but the key parsing changes (e.g., a future address format containing `:`), this silently truncates. The current chain value stored in the map (`req.chain`) is also the full chain, not the portion after splitting, creating a mismatch if the extraction were ever used for the chain value.

---

### H-9: Concurrent `addProvider` / `removeProvider` during async screening — race condition
**File:** `packages/core/src/sanctions/screener.ts:385-397`

`screenPriority` iterates `this.providers` in a `for...of` loop. If `addProvider` or `removeProvider` is called from another context while `screenPriority` is awaiting a provider result, the iteration is over a mutating array. JavaScript is single-threaded so this cannot cause corruption within a single tick, but an `await` yield point between iterations allows the array to be modified before the next iteration begins.

**Fix:** Snapshot the providers array at the start of each screening call:
```ts
const providers = [...this.providers];
for (const provider of providers) { ... }
```

---

### H-10: `hashJsonDeterministic` only sorts top-level keys — not recursive
**File:** `packages/shared/src/utils/crypto.ts:101-105`

The function's own comment admits that `JSON.stringify` with an array replacer is not applied recursively. Two `ComplianceReceipt` objects that are semantically identical but have differently-ordered keys in nested objects (e.g., `checksPerformed[0]`) produce different hashes. This breaks idempotency for on-chain anchoring.

**Fix:** Implement deep key sorting, or use `json-canonicalize` (RFC 8785). At minimum throw if the input contains any nested object values.

---

### H-11: `parseAmount` does not validate sign or leading whitespace — denial of service and negative amounts
**File:** `packages/shared/src/utils/validation.ts:83`

```ts
return BigInt(whole) * BigInt(10 ** decimals) + BigInt(fractional);
```

`BigInt("  1")` throws `SyntaxError`. `BigInt("-1")` produces a negative amount. Neither is rejected before reaching this line.

**Fix:**
```ts
if (!/^\d+$/.test(whole) || !/^\d*$/.test(fractional)) {
  throw new Error(`Invalid amount format: ${amount}`);
}
```

---

### H-12: `KYAVerifier` cache key does not include credential content — stale results on re-issuance
**File:** `packages/core/src/identity/kya-verifier.ts:150-153`

```ts
const cacheKey = `kya:${subjectId}`;
```

If a new credential is issued for the same `subjectId` (e.g., scope change, revocation + re-issuance), the cached result is returned until TTL expiry (default 15 minutes).

**Fix:**
```ts
import { sha256 } from "@flowlink/shared";
const credentialHash = sha256(JSON.stringify(credential));
const cacheKey = `kya:${subjectId}:${credentialHash}`;
```

---

## MEDIUM

### M-1: `TravelRuleChecker` silently uses `MockNotabeneProvider` when config is absent
**File:** `packages/core/src/travel-rule/checker.ts:228`

```ts
} else {
  this.provider = new MockNotabeneProvider();
}
```

A live production engine with no `notabene` config silently transmits mock Travel Rule data. No warning is emitted. All Travel Rule checks will appear succeeded with `nb-mock-*` reference IDs.

**Fix:** Throw `ConfigurationError` if notabene config is absent and environment is not explicitly test mode, or emit a `console.warn` at minimum.

---

### M-2: `buildDecision` uses `Math.random()` for receipt IDs — not cryptographically secure
**File:** `packages/core/src/engine/prooflink.ts:730`

```ts
const receiptId = `pl-${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 8)}`;
```

`Math.random()` is not CSPRNG. Also diverges from `generateReceiptId` in `receipts/issuer.ts`.

**Fix:** Use `randomUUID()` from `node:crypto`.

---

### M-3: EU jurisdiction list in `checkJurisdictionalRules` is incomplete — diverges from `constants.ts`
**File:** `packages/core/src/engine/prooflink.ts:663-666`

The hardcoded `euJurisdictions` array contains 20 countries. It is missing Bulgaria (BG), Czech Republic (CZ), Denmark (DK), Hungary (HU), Poland (PL), Romania (RO), Sweden (SE) — all EU member states subject to MiCA. USDT transactions from these countries will not be blocked.

**Fix:**
```ts
import { SUPPORTED_JURISDICTIONS } from "@flowlink/shared";
const euJurisdictions = SUPPORTED_JURISDICTIONS.EU_EEA;
```

---

### M-4: Travel Rule EU threshold diverges between `config.ts` defaults and `constants.ts`
**File:** `packages/core/src/config.ts:43` vs `packages/shared/src/constants.ts:127`

`config.ts` default has `EU: 0`; `TRAVEL_RULE_THRESHOLDS.EU` in constants is `1000`. Any code calling `getTravelRuleThreshold("EU")` from the shared utility gets 1000 instead of 0. EU law requires zero threshold for CASP-to-CASP, so the config default is correct but the constants value is wrong.

**Fix:** Set `TRAVEL_RULE_THRESHOLDS.EU = 0` in `constants.ts`.

---

### M-5: `WebhookManager.verifySignature` accepts silently-truncated invalid hex strings
**File:** `packages/core/src/webhooks/manager.ts:100-101`

`Buffer.from(signature, "hex")` silently ignores non-hex characters. A signature with invalid hex that decodes to 32 bytes will pass the length check and be compared against the correct HMAC.

**Fix:**
```ts
if (!/^[0-9a-f]{64}$/.test(signature)) return false;
```

---

### M-6: `InMemoryStorage.list` copies the entire store on every call — O(n) allocation
**File:** `packages/core/src/receipts/storage.ts:58`

```ts
let results = Array.from(this.store.values());
```

For a store with 100,000 receipts and a `limit: 20` query, 99,980 objects are allocated and discarded.

**Fix:** Apply filter during iteration and stop after `offset + limit` results are accumulated.

---

### M-7: `AMLScorer` constructor spreads default rules but custom rules array is aliased
**File:** `packages/core/src/aml/scorer.ts:256`

```ts
this.rules = rules ?? [...DEFAULT_SCORING_RULES];
```

When `rules` is provided, it is stored by reference. Two `AMLScorer` instances sharing the same rules array will see each other's `addRule` / `removeRule` mutations.

**Fix:** Always copy: `this.rules = [...(rules ?? DEFAULT_SCORING_RULES)]`.

---

### M-8: `ChainalysisProvider.screen` constructs URL without encoding address — URL injection
**File:** `packages/core/src/sanctions/screener.ts:88`

```ts
const url = `${this.baseUrl}/address/${address}`;
```

`address` is not URL-encoded. Path traversal or unexpected characters in the address string will construct a malformed URL.

**Fix:**
```ts
const url = `${this.baseUrl}/address/${encodeURIComponent(address)}`;
```

---

### M-9: Throwing plugin in `executeBeforeCheck` silences all subsequent plugins
**File:** `packages/core/src/plugins/index.ts:117-123`

If plugin N throws, the `for...of` loop exits and plugins N+1 onward never execute. The engine catches the error and continues with an empty-plugin outcome for the remaining hooks.

**Fix:** Collect errors per-plugin, execute all hooks regardless:
```ts
const errors: Error[] = [];
for (const plugin of this.plugins) {
  if (plugin.beforeCheck) {
    try { await plugin.beforeCheck(ctx); }
    catch (e) { errors.push(e instanceof Error ? e : new Error(String(e))); }
  }
}
if (errors.length) throw new AggregateError(errors, "Plugin beforeCheck failures");
```

---

### M-10: `FileStorage.receiptPath` uses string concatenation instead of `path.join`
**File:** `packages/core/src/receipts/storage.ts:195-198`

```ts
return `${this.directory}/${safe}.json`;
```

Fails on Windows. `path` is already imported in `list()`.

**Fix:**
```ts
import { join } from "node:path";
return join(this.directory, `${safe}.json`);
```

---

### M-11: `TravelRuleChecker.buildIVMS101Message` sends USD amount, not asset-native amount
**File:** `packages/core/src/travel-rule/checker.ts:367`

```ts
transactionAmount: data.amountUsd.toString(),
```

IVMS101 `transactionAmount` must be the asset-native amount (e.g., USDC base units), not a USD equivalent. Sending a USD value violates the IVMS101 standard and will cause counterparty VASP parsing failures.

**Fix:** Add `amountNative: string` to `TravelRuleData` and use it here. Keep `amountUsd` for threshold comparison only.

---

### M-12: `CheckPerformed.provider = "blocklist"` is not in the `SanctionsCheckResult` provider enum
**File:** `packages/core/src/engine/prooflink.ts:235`

The `SanctionsCheckResult` Zod schema enumerates valid provider values; `"blocklist"` is not one of them. Any code that parses this via `parseSanctionsCheckResult` will fail validation.

**Fix:** Add `"blocklist"` to the provider enum in `compliance.ts`, or use a dedicated `checkType` for blocklist rejections that doesn't reuse the sanctions provider field.

---

### M-13: `domainSeparatorHashOffChain` admits collision when field values contain the `\x00` delimiter
**File:** `packages/shared/src/utils/crypto.ts:49`

```ts
const encoded = `${name}\x00${version}\x00${chainId}\x00${verifyingContract}`;
```

If any field contains `\x00`, the delimiter does not uniquely separate fields. The function is labeled "off-chain only" but this is not enforced at call sites.

**Fix:** Add input validation to reject fields containing `\x00`, or switch to length-prefixed encoding.

---

### M-14: `LRUCache.size` counts expired entries — misleading capacity reporting
**File:** `packages/core/src/cache.ts:89-91`

`size` returns `this.map.size` which includes entries that have expired but not yet been pruned. Callers using `size` to reason about cache occupancy will over-report actual live entries.

**Fix:** Document the lazy-expiry semantics explicitly, or add a `liveSize()` method.

---

## LOW

### L-1: Jurisdiction codes not normalized to uppercase in `checkJurisdictionalRules`
**File:** `packages/core/src/engine/prooflink.ts:639`

`restrictedJurisdictions` defaults to uppercase values. `includes()` is case-sensitive. A caller passing `senderJurisdiction: "ir"` bypasses the restriction check.

**Fix:** Normalize to uppercase: `request.senderJurisdiction.toUpperCase()`.

---

### L-2: `generateIPFSCid` produces structurally invalid CIDs
**File:** `packages/core/src/receipts/issuer.ts:84`

```ts
return `bafybeig${hash}${hash.split("").reverse().join("")}`;
```

Real CIDv1 base32 strings are 59 characters. This generates 39 characters. Any IPFS gateway query will fail.

**Fix:** Leave `ipfsCid` as `undefined` until real IPFS upload is implemented, or prefix with `mock_cid:` to prevent confusion.

---

### L-3: `ReceiptIssuer.issueReceipt` computes IPFS CID before signature is set
**File:** `packages/core/src/receipts/issuer.ts:152-156`

The CID is computed from `receipt` with `signature: ""`. The real signature is set afterward. The stored CID does not address the final signed receipt — independently computing a CID from the receipt object will produce a different value.

**Fix:** Compute the IPFS CID after `await this.signReceipt(receipt)` is complete.

---

### L-4: `ValidationError` accesses `fieldErrors[0]` without bounds safety
**File:** `packages/shared/src/errors.ts:259`

```ts
`Validation failed: ${fieldErrors[0].field} — ${fieldErrors[0].message}`
```

The ternary checks `fieldErrors.length === 1` but TypeScript does not guarantee non-null array access without `noUncheckedIndexedAccess`.

**Fix:** Use optional chaining: `fieldErrors[0]?.field ?? "unknown"`.

---

### L-5: `WebhookManager.deliveries` array grows without bound
**File:** `packages/core/src/webhooks/manager.ts:40`, `134`

Every `dispatch` appends to `this.deliveries`. Long-running processes with frequent webhook events will accumulate unbounded history.

**Fix:** Cap delivery history at a configurable size (e.g. last 1,000 records) using a circular buffer or shift-on-overflow.

---

### L-6: `SanctionsScreener.addProvider` / `removeProvider` are public API but undocumented as concurrent-unsafe
**File:** `packages/core/src/sanctions/screener.ts:385-397`

See H-9 for the concurrent-modification risk. These methods should be documented as unsafe to call while screening is in progress, or removed from the public API.

---

### L-7: `OFAC_SDN_BTC_ADDRESSES` contains only P2PKH format — misses P2SH/bech32 equivalents
**File:** `packages/core/src/sanctions/lists.ts:53-56`

OFAC may list the same wallet in multiple Bitcoin address formats. The offline checker does string equality only; bech32 equivalents of the same wallet won't match.

---

### L-8: Dual `WebhookConfig` / `WebhookEventType` schemas — silent divergence
**File:** `packages/core/src/webhooks/types.ts` vs `packages/shared/src/types/webhook.ts`

Core defines `WebhookConfig` with `active: boolean` and its own `WebhookEventType` string union. Shared defines `WebhookConfig` with `enabled: boolean` and a different Zod `WebhookEventType` enum. Objects from one schema will fail validation by the other. Any API layer that mixes these will silently produce wrong behavior.

**Fix:** Consolidate to one canonical `WebhookConfig` / `WebhookEventType` in `@flowlink/shared` and import it in core.

---

### L-9: Missing test coverage for critical paths
**Files:** Multiple

- `KYAVerifier.verifyCredential` — no test for the ERC-8004 registration code path (`packages/core/src/identity/kya-verifier.ts:183-196`).
- `AMLScorer` — no tests for `time_of_day_anomaly` rule or `cross_chain_correlation` rule.
- `FileStorage` — no tests at all; the `receiptPath` sanitization that prevents path traversal is completely untested.
- `TravelRuleChecker.resolveJurisdiction` — no test for the most-restrictive-jurisdiction selection logic with multi-candidate VASPs.

---

## Architecture / Naming Issues

**Dual `ComplianceRequest` types** — `packages/shared/src/types/protocol.ts` and `packages/core/src/engine/prooflink.ts` both export `ComplianceRequest` with incompatible shapes (`amount: string` in shared vs `amountUsd: number` in core). Any file importing both packages has an ambiguous name.

**Dual `KYAVerificationResult` types** — `packages/core/src/identity/kya-verifier.ts` defines its own `KYAVerificationResult` interface. `packages/shared/src/types/identity.ts` defines a Zod schema with the same name but different fields (`trustScore`, `agentMetadata` in shared vs `erc8004Registered`, `credentialExpired` in core). These are structurally incompatible.

**`SanctionsCheckResult.provider` cast fragility** — `packages/core/src/sanctions/screener.ts:433` casts custom provider names with `as SanctionsCheckResult["provider"]`. If a custom provider uses a name not in the enum the cast succeeds at compile time but Zod validation fails at runtime.
