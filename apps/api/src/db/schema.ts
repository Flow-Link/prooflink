import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  ownerId: varchar("owner_id", { length: 256 }).notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(60),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
  index("api_keys_owner_id_idx").on(table.ownerId),
]);

// ---------------------------------------------------------------------------
// Agents (KYA records)
// ---------------------------------------------------------------------------

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentDid: varchar("agent_did", { length: 256 }).notNull().unique(),
  erc8004Id: integer("erc8004_id"),
  erc8004Registry: varchar("erc8004_registry", { length: 128 }),
  name: varchar("name", { length: 256 }),
  agentType: varchar("agent_type", { length: 32 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 128 }).notNull(),
  controllingEntityName: varchar("controlling_entity_name", { length: 256 }).notNull(),
  controllingEntityLei: varchar("controlling_entity_lei", { length: 20 }),
  kyaCredentialHash: varchar("kya_credential_hash", { length: 128 }),
  complianceScore: smallint("compliance_score").notNull().default(0),
  delegationScope: jsonb("delegation_scope").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").notNull().default(true),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("agents_agent_did_idx").on(table.agentDid),
  index("agents_wallet_address_idx").on(table.walletAddress),
]);

// ---------------------------------------------------------------------------
// Compliance Checks (pipeline runs)
// ---------------------------------------------------------------------------

export const complianceChecks = pgTable("compliance_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderAddress: varchar("sender_address", { length: 128 }).notNull(),
  receiverAddress: varchar("receiver_address", { length: 128 }).notNull(),
  senderAgentDid: varchar("sender_agent_did", { length: 256 }),
  receiverAgentDid: varchar("receiver_agent_did", { length: 256 }),
  amount: numeric("amount", { precision: 38, scale: 18 }).notNull(),
  asset: varchar("asset", { length: 10 }).notNull(),
  chain: varchar("chain", { length: 64 }).notNull(),
  protocol: varchar("protocol", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // APPROVED, REJECTED, ESCALATED
  riskScore: smallint("risk_score").notNull(),
  checks: jsonb("checks").$type<Record<string, unknown>[]>().notNull(),
  totalDurationMs: integer("total_duration_ms"),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  traceId: varchar("trace_id", { length: 64 }),
  parentTraceId: varchar("parent_trace_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("compliance_checks_api_key_created_idx").on(table.apiKeyId, table.createdAt),
  index("compliance_checks_sender_address_idx").on(table.senderAddress),
  index("compliance_checks_receiver_address_idx").on(table.receiverAddress),
  index("compliance_checks_trace_id_idx").on(table.traceId),
]);

// ---------------------------------------------------------------------------
// Compliance Receipts
// ---------------------------------------------------------------------------

export const complianceReceipts = pgTable("compliance_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkId: uuid("check_id")
    .notNull()
    .references(() => complianceChecks.id),
  receiptHash: varchar("receipt_hash", { length: 128 }).notNull().unique(),
  overallStatus: varchar("overall_status", { length: 20 }).notNull(),
  riskScore: smallint("risk_score").notNull(),
  travelRuleStatus: varchar("travel_rule_status", { length: 20 }),
  easAttestationUid: varchar("eas_attestation_uid", { length: 128 }),
  ipfsCid: varchar("ipfs_cid", { length: 128 }),
  signature: text("signature").notNull(),
  checksPerformed: jsonb("checks_performed").$type<Record<string, unknown>[]>().notNull(),
  ttl: integer("ttl").notNull().default(300),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceHash: varchar("invoice_hash", { length: 128 }).unique(),
  ipfsCid: varchar("ipfs_cid", { length: 128 }),
  issuerAgentDid: varchar("issuer_agent_did", { length: 256 }).notNull(),
  recipientAgentDid: varchar("recipient_agent_did", { length: 256 }).notNull(),
  sellerWalletAddress: varchar("seller_wallet_address", { length: 128 }).notNull(),
  buyerWalletAddress: varchar("buyer_wallet_address", { length: 128 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 38, scale: 18 }).notNull(),
  state: varchar("state", { length: 20 }).notNull().default("DRAFT"),
  lineItems: jsonb("line_items").$type<Record<string, unknown>[]>().notNull(),
  paymentProtocol: varchar("payment_protocol", { length: 20 }),
  complianceReceiptId: uuid("compliance_receipt_id").references(() => complianceReceipts.id),
  onChainTxHash: varchar("on_chain_tx_hash", { length: 128 }),
  easAttestationUid: varchar("eas_attestation_uid", { length: 128 }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  traceId: varchar("trace_id", { length: 64 }),
  invoiceData: jsonb("invoice_data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("invoices_state_idx").on(table.state),
  index("invoices_seller_wallet_address_idx").on(table.sellerWalletAddress),
  index("invoices_buyer_wallet_address_idx").on(table.buyerWalletAddress),
  index("invoices_trace_id_idx").on(table.traceId),
]);

// ---------------------------------------------------------------------------
// Regulatory Reports (SAR / CTR / TRAVEL_RULE)
// ---------------------------------------------------------------------------

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).notNull(), // "SAR" | "CTR" | "TRAVEL_RULE"
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"), // DRAFT, SUBMITTED, FILED, REJECTED
  priority: varchar("priority", { length: 10 }).notNull().default("NORMAL"), // LOW, NORMAL, HIGH, CRITICAL
  complianceCheckId: uuid("compliance_check_id").references(() => complianceChecks.id),
  agentDid: varchar("agent_did", { length: 256 }),
  triggerReason: text("trigger_reason").notNull(),
  reportData: jsonb("report_data").$type<Record<string, unknown>>().notNull(),
  filedAt: timestamp("filed_at", { withTimezone: true }),
  filingReference: varchar("filing_reference", { length: 128 }),
  reviewedBy: varchar("reviewed_by", { length: 256 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("reports_type_idx").on(table.type),
  index("reports_status_idx").on(table.status),
  index("reports_compliance_check_id_idx").on(table.complianceCheckId),
]);

// ---------------------------------------------------------------------------
// Audit Log (append-only with hash chain)
// ---------------------------------------------------------------------------

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  logHash: varchar("log_hash", { length: 128 }).notNull(),
  previousLogHash: varchar("previous_log_hash", { length: 128 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  receiptId: uuid("receipt_id").references(() => complianceReceipts.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  agentDid: varchar("agent_did", { length: 256 }),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Type exports for select/insert
// ---------------------------------------------------------------------------

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type NewComplianceCheck = typeof complianceChecks.$inferInsert;

export type ComplianceReceiptRow = typeof complianceReceipts.$inferSelect;
export type NewComplianceReceipt = typeof complianceReceipts.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
