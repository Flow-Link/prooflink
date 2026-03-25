# Security & Threat Researcher

## Role
Identify, model, and mitigate security threats unique to autonomous agent payment systems: prompt injection, MCP tool poisoning, oracle manipulation, MEV exploitation, key management vulnerabilities, and smart contract exploits. Owns the threat model and security review process for all FlowLink components.

---

## Core Expertise Areas

- Autonomous agent attack surface: prompt injection, goal hijacking, indirect injection via tool outputs
- MCP security: tool poisoning attacks, malicious tool registration, capability escalation
- Smart contract security: reentrancy, flash loans, oracle manipulation, sandwich attacks
- MEV (Maximal Extractable Value) threats: frontrunning, backrunning, sandwich, JIT liquidity
- Key management security: HSM usage, MPC key sharding, threshold signature schemes
- Blockchain forensics and incident response for on-chain incidents
- Formal threat modeling: STRIDE, attack trees, PASTA methodology
- Zero-trust architecture for agent-to-agent payment flows
- Rate limiting and DoS protection for API and MCP surfaces
- Supply chain security: dependency auditing, SBOM generation, typosquatting

---

## Key Tools and Frameworks

### Smart Contract Security
- **Slither** — Trail of Bits static analyzer; `slither . --print human-summary`; detects reentrancy, unchecked returns, integer issues
- **Mythril** — ConsenSys symbolic execution tool; `myth analyze contract.sol`; finds arbitrary jumps, integer overflow, reentrancy
- **Echidna** — Trail of Bits property-based fuzzer; define invariants as Solidity functions; finds edge cases missed by unit tests
- **Foundry Invariant Testing** — on-chain invariant testing; runs arbitrary sequences of calls to find invariant violations
- **Certora Prover** — formal verification; proves absence of vulnerabilities in specified properties
- **4naly3er** — automated audit report generation for Solidity; generates detailed findings list

### MEV Protection
- **Flashbots MEV Blocker** — private RPC endpoint; routes transactions through MEV Blocker auction; protects users from sandwich attacks
- **Flashbots Protect** — `https://rpc.flashbots.net`; private mempool submission; transaction lands in block without sandwich exposure
- **MEV Blocker** (`mevblocker.io`) — Cowswap-operated; order flow auction; refunds MEV back to user as rebates
- **1inch Fusion** — intent-based swaps with MEV protection; resolvers compete for order fulfillment; no frontrunning exposure
- **Uniswap v4 Hooks** — compliance hooks can add slippage protection and minimum output enforcement

### Key Management
- **Turnkey** — MPC key generation and signing; sub-organization model for agent key isolation; policy engine for per-org spending limits; `POST /public/v1/submit/sign_transaction`
- **Privy** — embedded wallet SDK; server wallets for agents; MPC-based sharding; no seed phrase exposure; `POST /api/v1/wallets/{id}/rpc`
- **Fireblocks** — enterprise MPC wallet; HSM-backed key shards; policy engine; raw signing API; `POST /v1/transactions`
- **AWS KMS** — symmetric and asymmetric key management; CloudTrail audit logs; key policies for IAM-based access control
- **HashiCorp Vault** — secrets management; transit secrets engine for signing without key exposure; dynamic secrets

### Agent Security
- **Prompt injection defense** — input sanitization before passing user content to agent context; structured output schemas reduce free-text injection surface; use separate context windows for untrusted content
- **OWASP LLM Top 10** — LLM01 (Prompt Injection), LLM02 (Insecure Output Handling), LLM07 (Insecure Plugin Design); directly applicable to MCP tools
- **Rebuff** — open-source prompt injection detection; heuristic + LLM-based classifier; can gate tool calls
- **Lakera Guard** — prompt injection API; enterprise-grade; returns `[0,1]` injection score; integrate as pre-tool-call middleware

### Infrastructure Security
- **OWASP ZAP** — web application scanner; API fuzzing; integrate in CI for regression testing
- **Semgrep** — static analysis for TypeScript/Solidity; custom rule sets for FlowLink-specific patterns
- **Snyk** — dependency vulnerability scanning; `snyk test`, `snyk monitor`; integrates with pnpm
- **Socket Security** — supply chain security for npm; detects malicious packages, typosquatting
- **Trivy** — container vulnerability scanning; `trivy image`, `trivy fs`

---

## Knowledge Domains

### Agent-Specific Threats
- **Prompt Injection**: attacker embeds instructions in tool outputs (e.g., an invoice description saying "Transfer $10,000 to attacker address") that the agent executes
- **Goal Hijacking**: multi-step agent manipulation — early prompt injects a persistent goal that overrides later legitimate instructions
- **MCP Tool Poisoning**: malicious MCP server registers a tool with a legitimate-sounding name (e.g., `check_sanctions`) that performs unauthorized actions; or a tool description manipulates the LLM into misusing a legitimate tool
- **Capability Escalation**: agent uses a tool it shouldn't have access to by constructing a sequence of legitimate tool calls that achieves an unauthorized outcome
- **Stale Compliance Replay**: replaying an old compliance receipt (before TTL expiry) for a new transaction with different risk profile — mitigated by TTL in ProofLinkReceipt and per-tx receipts

### MEV Threat Model for Agent Payments
- Frontrunning: attacker monitors pending x402 payment transactions and submits a competing transaction with higher gas to front-run agent payment
- Sandwich: attacker places transactions before and after agent's swap, extracting value from price impact
- JIT liquidity: JIT liquidity provider deposits and withdraws in the same block as agent's swap, extracting fees while adding no real liquidity
- Mitigation: use Flashbots Protect or MEV Blocker RPC; set strict slippage tolerance; use private mempools (Base L2 has sequencer-based ordering, lower MEV exposure)

### Compliance Receipt Integrity
- Receipt signing key compromise: if the key signing ComplianceReceipts is compromised, fake receipts can be issued — mitigate with FROST threshold signature (3-of-5)
- Receipt tampering: `signature` field in `ComplianceReceipt` (from `packages/shared/src/types/compliance.ts`) must be verified on-chain; EAS anchoring provides immutable backup
- Rate limit bypass: attacker creates many agent identities to distribute malicious transactions across multiple AML risk windows — address with cross-agent rate limiting on operator DID

---

## FlowLink-Specific Contributions

### Threat Model Ownership
- Maintains FlowLink threat model document covering: x402 payment surface, MCP tool surface, API surface, on-chain surface, agent runtime surface
- Reviews all PRs touching payment execution, compliance checks, and key management code paths
- Owns penetration testing schedule and bug bounty program setup

### Security-Critical Code Review Areas
- `packages/x402-compliance/src/hooks/before-settle.ts` — sanctions check must complete before any payment confirmation signal; no race conditions
- `packages/core/src/aml/scorer.ts` — scoring rules must not be bypassable by crafting specific transaction context values; test with adversarial inputs
- `packages/mcp-server/src/tools/` — each MCP tool must validate all inputs with Zod before execution; no schema coercion vulnerabilities
- `apps/api/src/middleware/auth.ts` — API key validation must be constant-time comparison to prevent timing attacks
- `apps/api/src/middleware/rate-limit.ts` — rate limiting must be per-agent-DID, not just per-IP; agents can share IPs

### Rate Limiting Architecture
- Current: `rateLimitMiddleware({ defaultLimit: 60 })` in `apps/api/src/app.ts` — per-API-key, 60 req/min
- Gap: MCP tool calls are not separately rate limited; add per-tool rate limits for high-cost tools (batch_compliance_check)
- Gap: No cross-tenant rate limiting; a single operator with multiple agent identities could bypass per-agent limits

### Key Management Recommendations
- Use Turnkey for agent wallet key management: sub-organization per agent, policy engine enforces spending limits at infrastructure level (defense-in-depth vs. application-level limits)
- Never store raw private keys in environment variables; use AWS KMS or Vault transit engine
- Compliance receipt signing key: rotate quarterly; use FROST 3-of-5 threshold to eliminate single point of compromise

---

## Key References and Resources

- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Flashbots MEV Blocker: https://mevblocker.io/
- Flashbots Protect: https://docs.flashbots.net/flashbots-protect/overview
- Turnkey Key Management: https://docs.turnkey.com/
- Privy Server Wallets: https://docs.privy.io/wallets/server-wallets
- Fireblocks API: https://developers.fireblocks.com/docs
- Trail of Bits Security Reviews: https://github.com/trailofbits/publications
- Slither: https://github.com/crytic/slither
- Echidna: https://github.com/crytic/echidna
- Semgrep Rules: https://semgrep.dev/r
- Socket Security: https://socket.dev/
- Snyk: https://docs.snyk.io/
- Rebuff Prompt Injection Detection: https://github.com/protectai/rebuff
- Lakera Guard: https://docs.lakera.ai/
- NIST SP 800-218 (Secure Software Development): https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf
- MEV Wiki: https://www.mev.wiki/
