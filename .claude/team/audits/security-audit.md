# Security Audit Report — March 25, 2026

## CRITICAL (6)
1. **CRIT-1**: No tenant isolation (IDOR) — all financial resources fetchable by any tenant
2. **CRIT-2**: List endpoints expose all tenants' data
3. **CRIT-3**: Evaluator signature never cryptographically verified
4. **CRIT-4**: Stream budget double-spend via race condition
5. **CRIT-5**: autoResolveExpired skips state machine (OPEN→RESOLVED)
6. **CRIT-6**: autoArbitrate mutates without state guard

## IMPORTANT (9)
1. JWT scopes self-asserted, no DB validation
2. Request signing opt-in, trivially bypassed
3. Unbounded evidence injection + submittedBy forgery
4. Unsigned permission translations look authoritative
5. Selective disclosure nonce leaked to verifier
6. Attacker-controlled saga params
7. Any tenant can dispute any escrow
8. No payer/payee role enforcement
9. resolvedBy is caller-supplied

See full details in task output.
