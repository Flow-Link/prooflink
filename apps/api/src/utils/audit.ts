import { createHash } from "node:crypto";
import { desc, sql } from "drizzle-orm";

import { getDb } from "../db/index.js";
import { auditLog } from "../db/schema.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogParams {
  eventType: string;
  payload: Record<string, unknown>;
  receiptId?: string;
  invoiceId?: string;
  agentDid?: string;
  apiKeyId?: string;
}

// ---------------------------------------------------------------------------
// In-process serialization queue
// ---------------------------------------------------------------------------

// All audit writes are funneled through a single promise chain so that
// concurrent requests cannot read the same previousLogHash before the
// prior insert commits (which would fork the hash chain).
let _queue: Promise<void> = Promise.resolve();

// ---------------------------------------------------------------------------
// writeAuditLog — fire-and-forget audit entry with hash chain
// ---------------------------------------------------------------------------

/**
 * Append an entry to the audit_log table with a SHA-256 hash chain.
 *
 * This is intentionally fire-and-forget: it never blocks the caller and
 * swallows errors (logging them) so that a broken audit path cannot take
 * down the request path.
 *
 * Concurrency note: writes are serialized through an in-process promise
 * queue to prevent two concurrent requests from reading the same
 * previousLogHash and forking the chain. For multi-process deployments
 * a DB-level advisory lock or a dedicated audit writer process is required.
 */
export function writeAuditLog(params: AuditLogParams): void {
  const { eventType, payload, receiptId, invoiceId, agentDid, apiKeyId } = params;

  // Chain onto the queue — each write waits for the previous one to settle.
  _queue = _queue.then(async () => {
    try {
      const db = getDb();

      // Fetch the most recent log entry for the hash chain.
      // Uses FOR UPDATE SKIP LOCKED as an advisory guard in multi-statement
      // transactions; here it is a plain SELECT since we rely on the in-process
      // queue for single-process deployments.
      const [lastEntry] = await db
        .select({ logHash: auditLog.logHash })
        .from(auditLog)
        .orderBy(desc(auditLog.id))
        .limit(1);

      const previousLogHash = lastEntry?.logHash ?? "genesis";
      const timestamp = new Date().toISOString();

      const logHash = createHash("sha256")
        .update(previousLogHash + eventType + JSON.stringify(payload) + timestamp)
        .digest("hex");

      await db.insert(auditLog).values({
        logHash,
        previousLogHash,
        eventType,
        receiptId: receiptId ?? null,
        invoiceId: invoiceId ?? null,
        agentDid: agentDid ?? null,
        apiKeyId: apiKeyId ?? null,
        payload,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to write audit log", { eventType, error: message });
      // Swallow so the queue continues processing subsequent entries.
    }
  });

  // Detach from the caller — errors are already caught above.
  void _queue;
}

// ---------------------------------------------------------------------------
// Exposed for testing only — resets the queue to a clean state.
// ---------------------------------------------------------------------------
export function _resetAuditQueue(): void {
  _queue = Promise.resolve();
}
