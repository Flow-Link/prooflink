/**
 * FlowLink Dashboard API client
 *
 * In production this wraps @flowlink/sdk. For demo purposes,
 * we use mock data that showcases the full UI.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceCheck {
  id: string;
  walletAddress: string;
  chain: string;
  status: "PASS" | "FAIL" | "REVIEW";
  riskScore: number;
  amount: number;
  currency: string;
  counterparty: string;
  agentDid: string;
  createdAt: string;
  checks: {
    ofac: boolean;
    riskScore: boolean;
    velocity: boolean;
    jurisdiction: boolean;
  };
}

export interface Invoice {
  id: string;
  number: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  state: "DRAFT" | "PENDING" | "PAID" | "REJECTED" | "EXPIRED";
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  description: string;
  walletAddress: string;
  chain: string;
  complianceCheckId?: string;
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ScreeningResult {
  address: string;
  chain: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  flags: string[];
  sanctioned: boolean;
  screenedAt: string;
}

export interface Agent {
  did: string;
  name: string;
  provider: string;
  status: "VERIFIED" | "EXPIRED" | "REVOKED" | "PENDING";
  credentialType: string;
  issuedAt: string;
  expiresAt: string;
  checksPerformed: number;
  riskScoreHistory?: { date: string; score: number }[];
  delegationScope?: string[];
  transactionVolume?: number;
  lastActive?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  status: "ACTIVE" | "REVOKED";
}

export interface DashboardStats {
  totalChecks: number;
  passRate: number;
  totalVolume: number;
  activeAgents: number;
  checksChange: number;
  passRateChange: number;
  volumeChange: number;
  agentsChange: number;
}

export interface VolumeDataPoint {
  date: string;
  passed: number;
  failed: number;
  volume: number;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  lastTriggered: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  status: "ACTIVE" | "INVITED";
  joinedAt: string;
}

export interface CompliancePolicy {
  riskScoreThreshold: number;
  maxTransactionAmount: number;
  velocityLimit: number;
  velocityWindow: string;
  failOpen: boolean;
  blockedJurisdictions: string[];
  customWatchlist: string[];
}

export interface NotificationPreferences {
  emailOnFailedCheck: boolean;
  emailOnHighRisk: boolean;
  emailOnNewAgent: boolean;
  webhookOnAllChecks: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

export interface AnalyticsData {
  volumeByPeriod: { date: string; volume: number; count: number }[];
  complianceBreakdown: { status: string; count: number; color: string }[];
  riskDistribution: { range: string; count: number }[];
  topAgents: { did: string; name: string; volume: number; checks: number; passRate: number }[];
  geoDistribution: { country: string; count: number; percentage: number }[];
}

export interface ActivityEvent {
  id: string;
  type: "check_pass" | "check_fail" | "check_review" | "invoice_paid" | "agent_verified" | "agent_revoked" | "key_created" | "webhook_triggered";
  message: string;
  detail: string;
  timestamp: string;
  agentDid?: string;
  checkId?: string;
}

export interface SystemHealth {
  status: "operational" | "degraded" | "down";
  uptime: number;
  latency: number;
  lastChecked: string;
  services: { name: string; status: "operational" | "degraded" | "down" }[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CHAINS = ["Ethereum", "Polygon", "Base", "Arbitrum", "Solana"];
const STATUSES: ComplianceCheck["status"][] = ["PASS", "PASS", "PASS", "PASS", "FAIL", "REVIEW"];

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * Math.abs(daysBack)));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function randomFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return d.toISOString();
}

function randomAddress(): string {
  const hex = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += hex[Math.floor(Math.random() * 16)];
  return addr;
}

const mockChecks: ComplianceCheck[] = Array.from({ length: 50 }, (_, i) => {
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  return {
    id: `chk_${String(i + 1).padStart(4, "0")}`,
    walletAddress: randomAddress(),
    chain: CHAINS[Math.floor(Math.random() * CHAINS.length)],
    status,
    riskScore: status === "PASS" ? Math.random() * 30 : status === "FAIL" ? 70 + Math.random() * 30 : 30 + Math.random() * 40,
    amount: Math.floor(Math.random() * 50000) + 100,
    currency: "USDC",
    counterparty: randomAddress(),
    agentDid: `did:web:agent${Math.floor(Math.random() * 5) + 1}.flowlink.io`,
    createdAt: randomDate(30),
    checks: {
      ofac: status !== "FAIL" || Math.random() > 0.5,
      riskScore: status === "PASS",
      velocity: status !== "REVIEW" || Math.random() > 0.3,
      jurisdiction: true,
    },
  };
}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const mockInvoices: Invoice[] = Array.from({ length: 20 }, (_, i) => {
  const states: Invoice["state"][] = ["DRAFT", "PENDING", "PAID", "PAID", "PAID", "REJECTED", "EXPIRED"];
  const state = states[Math.floor(Math.random() * states.length)];
  return {
    id: `inv_${String(i + 1).padStart(4, "0")}`,
    number: `FL-${2024}-${String(i + 1001).padStart(4, "0")}`,
    from: `did:web:merchant${Math.floor(Math.random() * 3) + 1}.flowlink.io`,
    to: randomAddress(),
    amount: Math.floor(Math.random() * 25000) + 500,
    currency: "USDC",
    state,
    dueDate: randomFutureDate(14),
    createdAt: randomDate(30),
    paidAt: state === "PAID" ? randomDate(10) : undefined,
    description: ["Software license", "Consulting services", "API usage", "Infrastructure", "Token purchase"][Math.floor(Math.random() * 5)],
    walletAddress: randomAddress(),
    chain: CHAINS[Math.floor(Math.random() * CHAINS.length)],
    complianceCheckId: state !== "DRAFT" ? `chk_${String(Math.floor(Math.random() * 50) + 1).padStart(4, "0")}` : undefined,
    lineItems: [
      { description: "Service fee", quantity: 1, unitPrice: Math.floor(Math.random() * 5000) + 100 },
      { description: "Platform fee", quantity: 1, unitPrice: Math.floor(Math.random() * 500) + 50 },
    ],
  };
}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const mockAgents: Agent[] = [
  {
    did: "did:web:agent1.flowlink.io", name: "PayBot Prime", provider: "FlowLink", status: "VERIFIED",
    credentialType: "KYA-v1", issuedAt: "2024-01-15T00:00:00Z", expiresAt: "2025-01-15T00:00:00Z", checksPerformed: 1247,
    delegationScope: ["payment.send", "payment.receive", "compliance.check", "invoice.create"],
    transactionVolume: 2340000, lastActive: randomDate(1),
    riskScoreHistory: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0], score: 10 + Math.random() * 15 })),
  },
  {
    did: "did:web:agent2.flowlink.io", name: "ComplianceGuard", provider: "TrustNet", status: "VERIFIED",
    credentialType: "KYA-v1", issuedAt: "2024-03-01T00:00:00Z", expiresAt: "2025-03-01T00:00:00Z", checksPerformed: 893,
    delegationScope: ["compliance.check", "compliance.report"],
    transactionVolume: 1560000, lastActive: randomDate(2),
    riskScoreHistory: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0], score: 12 + Math.random() * 18 })),
  },
  {
    did: "did:web:agent3.flowlink.io", name: "SwiftSettle", provider: "FlowLink", status: "EXPIRED",
    credentialType: "KYA-v1", issuedAt: "2023-06-01T00:00:00Z", expiresAt: "2024-06-01T00:00:00Z", checksPerformed: 456,
    delegationScope: ["payment.send", "payment.receive"],
    transactionVolume: 890000, lastActive: "2024-05-30T00:00:00Z",
    riskScoreHistory: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0], score: 25 + Math.random() * 20 })),
  },
  {
    did: "did:web:agent4.flowlink.io", name: "AutoPay Agent", provider: "AgentPay", status: "PENDING",
    credentialType: "KYA-v1", issuedAt: "2024-11-01T00:00:00Z", expiresAt: "2025-11-01T00:00:00Z", checksPerformed: 0,
    delegationScope: ["payment.send"],
    transactionVolume: 0, lastActive: undefined,
    riskScoreHistory: [],
  },
  {
    did: "did:web:agent5.flowlink.io", name: "RiskWatch", provider: "FlowLink", status: "REVOKED",
    credentialType: "KYA-v1", issuedAt: "2024-02-01T00:00:00Z", expiresAt: "2025-02-01T00:00:00Z", checksPerformed: 312,
    delegationScope: ["compliance.check", "compliance.report", "risk.monitor"],
    transactionVolume: 450000, lastActive: "2024-10-15T00:00:00Z",
    riskScoreHistory: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0], score: 40 + Math.random() * 30 })),
  },
];

const mockApiKeys: ApiKey[] = [
  { id: "key_001", name: "Production", prefix: "fl_live_a3k9", createdAt: "2024-01-10T00:00:00Z", lastUsed: "2024-12-19T14:30:00Z", status: "ACTIVE" },
  { id: "key_002", name: "Staging", prefix: "fl_test_b7m2", createdAt: "2024-03-15T00:00:00Z", lastUsed: "2024-12-18T09:15:00Z", status: "ACTIVE" },
  { id: "key_003", name: "Old Production", prefix: "fl_live_x1p4", createdAt: "2023-06-01T00:00:00Z", lastUsed: "2024-09-01T00:00:00Z", status: "REVOKED" },
];

const mockWebhooks: Webhook[] = [
  { id: "wh_001", url: "https://api.example.com/webhooks/flowlink", events: ["check.completed", "check.failed"], status: "ACTIVE", createdAt: "2024-06-01T00:00:00Z", lastTriggered: "2024-12-19T10:30:00Z" },
  { id: "wh_002", url: "https://hooks.slack.com/services/T00/B00/xxx", events: ["check.failed", "agent.revoked"], status: "ACTIVE", createdAt: "2024-08-15T00:00:00Z", lastTriggered: "2024-12-18T15:00:00Z" },
];

const mockTeamMembers: TeamMember[] = [
  { id: "usr_001", name: "Akash", email: "akash@flowlink.io", role: "ADMIN", status: "ACTIVE", joinedAt: "2024-01-01T00:00:00Z" },
  { id: "usr_002", name: "Sarah Chen", email: "sarah@flowlink.io", role: "MEMBER", status: "ACTIVE", joinedAt: "2024-03-15T00:00:00Z" },
  { id: "usr_003", name: "Alex Rivera", email: "alex@flowlink.io", role: "VIEWER", status: "ACTIVE", joinedAt: "2024-06-01T00:00:00Z" },
  { id: "usr_004", name: "Jordan Lee", email: "jordan@flowlink.io", role: "MEMBER", status: "INVITED", joinedAt: "2024-12-01T00:00:00Z" },
];

const mockCompliancePolicy: CompliancePolicy = {
  riskScoreThreshold: 70,
  maxTransactionAmount: 100000,
  velocityLimit: 50,
  velocityWindow: "1h",
  failOpen: false,
  blockedJurisdictions: ["KP", "IR", "SY", "CU"],
  customWatchlist: ["0x1234567890abcdef1234567890abcdef12345678"],
};

const mockNotificationPreferences: NotificationPreferences = {
  emailOnFailedCheck: true,
  emailOnHighRisk: true,
  emailOnNewAgent: false,
  webhookOnAllChecks: false,
  dailyDigest: true,
  weeklyReport: true,
};

function generateVolumeData(): VolumeDataPoint[] {
  const data: VolumeDataPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = 20 + Math.floor(Math.random() * 30);
    const failRate = 0.05 + Math.random() * 0.1;
    data.push({
      date: d.toISOString().split("T")[0],
      passed: Math.floor(base * (1 - failRate)),
      failed: Math.floor(base * failRate),
      volume: Math.floor((Math.random() * 200000) + 50000),
    });
  }
  return data;
}

function generateActivityEvents(): ActivityEvent[] {
  const types: ActivityEvent["type"][] = ["check_pass", "check_fail", "check_review", "invoice_paid", "agent_verified", "webhook_triggered"];
  const messages: Record<ActivityEvent["type"], string> = {
    check_pass: "Compliance check passed",
    check_fail: "Compliance check failed",
    check_review: "Manual review required",
    invoice_paid: "Invoice payment received",
    agent_verified: "Agent KYA verified",
    agent_revoked: "Agent credential revoked",
    key_created: "New API key created",
    webhook_triggered: "Webhook delivered",
  };

  return Array.from({ length: 30 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      id: `evt_${String(i + 1).padStart(4, "0")}`,
      type,
      message: messages[type],
      detail: `${type.includes("check") ? `${randomAddress().slice(0, 12)}... on ${CHAINS[Math.floor(Math.random() * CHAINS.length)]}` : type === "invoice_paid" ? `$${(Math.random() * 10000 + 100).toFixed(2)} USDC` : `Agent ${Math.floor(Math.random() * 5) + 1}`}`,
      timestamp: randomDate(7),
      agentDid: `did:web:agent${Math.floor(Math.random() * 5) + 1}.flowlink.io`,
      checkId: type.includes("check") ? `chk_${String(Math.floor(Math.random() * 50) + 1).padStart(4, "0")}` : undefined,
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ─── API Functions ────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getDashboardStats(): Promise<DashboardStats> {
  await delay(300);
  return {
    totalChecks: 12847,
    passRate: 94.2,
    totalVolume: 8420000,
    activeAgents: 3,
    checksChange: 12.5,
    passRateChange: 1.3,
    volumeChange: 23.1,
    agentsChange: 0,
  };
}

export async function getVolumeData(): Promise<VolumeDataPoint[]> {
  await delay(400);
  return generateVolumeData();
}

export async function getComplianceChecks(): Promise<ComplianceCheck[]> {
  await delay(350);
  return mockChecks;
}

export async function getComplianceCheck(id: string): Promise<ComplianceCheck | null> {
  await delay(200);
  return mockChecks.find((c) => c.id === id) ?? null;
}

export async function getInvoices(): Promise<Invoice[]> {
  await delay(300);
  return mockInvoices;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  await delay(200);
  return mockInvoices.find((inv) => inv.id === id) ?? null;
}

export async function screenAddress(address: string, chain: string): Promise<ScreeningResult> {
  await delay(800);
  const riskScore = Math.random() * 100;
  const riskLevel: ScreeningResult["riskLevel"] =
    riskScore < 25 ? "LOW" : riskScore < 50 ? "MEDIUM" : riskScore < 75 ? "HIGH" : "CRITICAL";
  const flags: string[] = [];
  if (riskScore > 40) flags.push("High transaction velocity");
  if (riskScore > 60) flags.push("Interaction with mixer protocols");
  if (riskScore > 80) flags.push("Sanctioned entity association");
  return {
    address,
    chain,
    riskScore: Math.round(riskScore * 10) / 10,
    riskLevel,
    flags,
    sanctioned: riskScore > 85,
    screenedAt: new Date().toISOString(),
  };
}

export async function getAgents(): Promise<Agent[]> {
  await delay(250);
  return mockAgents;
}

export async function getAgent(did: string): Promise<Agent | null> {
  await delay(200);
  return mockAgents.find((a) => a.did === did) ?? null;
}

export async function getApiKeys(): Promise<ApiKey[]> {
  await delay(200);
  return mockApiKeys;
}

export async function getWebhooks(): Promise<Webhook[]> {
  await delay(200);
  return mockWebhooks;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  await delay(200);
  return mockTeamMembers;
}

export async function getCompliancePolicy(): Promise<CompliancePolicy> {
  await delay(150);
  return mockCompliancePolicy;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  await delay(150);
  return mockNotificationPreferences;
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  await delay(400);

  const volumeByPeriod = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().split("T")[0],
      volume: Math.floor(Math.random() * 300000) + 50000,
      count: Math.floor(Math.random() * 60) + 10,
    };
  });

  return {
    volumeByPeriod,
    complianceBreakdown: [
      { status: "Approved", count: 3847, color: "#34d399" },
      { status: "Rejected", count: 312, color: "#f87171" },
      { status: "Escalated", count: 189, color: "#fbbf24" },
    ],
    riskDistribution: [
      { range: "0-10", count: 1240 },
      { range: "11-20", count: 980 },
      { range: "21-30", count: 720 },
      { range: "31-40", count: 450 },
      { range: "41-50", count: 310 },
      { range: "51-60", count: 180 },
      { range: "61-70", count: 120 },
      { range: "71-80", count: 85 },
      { range: "81-90", count: 42 },
      { range: "91-100", count: 21 },
    ],
    topAgents: mockAgents.filter(a => a.checksPerformed > 0).map(a => ({
      did: a.did,
      name: a.name,
      volume: a.transactionVolume ?? 0,
      checks: a.checksPerformed,
      passRate: 85 + Math.random() * 14,
    })).sort((a, b) => b.checks - a.checks),
    geoDistribution: [
      { country: "United States", count: 1450, percentage: 33.4 },
      { country: "Germany", count: 620, percentage: 14.3 },
      { country: "United Kingdom", count: 540, percentage: 12.4 },
      { country: "Singapore", count: 430, percentage: 9.9 },
      { country: "Japan", count: 380, percentage: 8.8 },
      { country: "Switzerland", count: 290, percentage: 6.7 },
      { country: "Others", count: 638, percentage: 14.5 },
    ],
  };
}

export async function getActivityFeed(): Promise<ActivityEvent[]> {
  await delay(300);
  return generateActivityEvents();
}

export async function getSystemHealth(): Promise<SystemHealth> {
  await delay(200);
  return {
    status: "operational",
    uptime: 99.97,
    latency: 42,
    lastChecked: new Date().toISOString(),
    services: [
      { name: "Compliance Engine", status: "operational" },
      { name: "OFAC Screening", status: "operational" },
      { name: "Risk Scoring", status: "operational" },
      { name: "Payment Gateway", status: "operational" },
      { name: "KYA Verification", status: "operational" },
    ],
  };
}
