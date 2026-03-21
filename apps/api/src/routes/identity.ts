import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb } from "../db/index.js";
import { agents } from "../db/schema.js";
import { validate } from "../middleware/validate.js";

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const VerifyAgentRequest = z.object({
  agentId: z.string().min(1),
  registryAddress: z.string().optional(),
  chain: z.string().default("eip155:8453"),
});
type VerifyAgentRequest = z.infer<typeof VerifyAgentRequest>;

const IssueKYARequest = z.object({
  agentDid: z.string().min(1).regex(/^did:[a-z]+:/, "agentDid must be a valid DID (did:method:...)"),
  agentType: z.enum(["autonomous", "semi-autonomous", "human-supervised"]),
  controllingEntity: z.object({
    name: z.string().min(1),
    lei: z.string().optional(),
    did: z.string().optional(),
    kybVerified: z.boolean(),
  }),
  walletAddress: z.string().min(1),
  delegationScope: z.object({
    maxTransactionValue: z.number().nonnegative(),
    dailyLimit: z.number().nonnegative().optional(),
    allowedCounterparties: z.array(z.string()).optional(),
    blockedJurisdictions: z.array(z.string()).optional(),
    allowedChains: z.array(z.string()).optional(),
    allowedCurrencies: z.array(z.string()).optional(),
    expiresAt: z.string().datetime(),
  }),
  erc8004RegistryAddress: z.string().optional(),
  erc8004TokenId: z.string().optional(),
});
type IssueKYARequest = z.infer<typeof IssueKYARequest>;

const AgentIdParams = z.object({
  agentId: z.string().min(1, "agentId is required"),
});

const AgentUuidParams = z.object({
  id: z.string().uuid("Invalid agent ID format."),
});

const RegisterAgentRequest = z.object({
  agentDid: z.string().min(1).regex(/^did:[a-z]+:/, "agentDid must be a valid DID (did:method:...)"),
  name: z.string().min(1),
  agentType: z.enum(["autonomous", "semi-autonomous", "human-supervised"]),
  walletAddress: z.string().min(1),
  controllingEntity: z.object({
    name: z.string().min(1),
    lei: z.string().optional(),
  }),
  delegationScope: z.object({
    maxTransactionValue: z.number().nonnegative(),
    dailyLimit: z.number().nonnegative().optional(),
    allowedCounterparties: z.array(z.string()).optional(),
    blockedJurisdictions: z.array(z.string()).optional(),
    allowedChains: z.array(z.string()).optional(),
    allowedCurrencies: z.array(z.string()).optional(),
    expiresAt: z.string().datetime(),
  }),
});
type RegisterAgentRequest = z.infer<typeof RegisterAgentRequest>;

const UpdateDelegationRequest = z.object({
  maxTransactionValue: z.number().nonnegative().optional(),
  dailyLimit: z.number().nonnegative().optional(),
  allowedCounterparties: z.array(z.string()).optional(),
  blockedJurisdictions: z.array(z.string()).optional(),
  allowedChains: z.array(z.string()).optional(),
  allowedCurrencies: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});
type UpdateDelegationRequest = z.infer<typeof UpdateDelegationRequest>;

const ListAgentsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agentType: z.enum(["autonomous", "semi-autonomous", "human-supervised"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

// ---------------------------------------------------------------------------
// Route group
// ---------------------------------------------------------------------------

const identity = new Hono();

// POST /v1/identity/verify -- Verify agent KYA
identity.post("/verify", validate({ body: VerifyAgentRequest }), async (c) => {
  const parsed = c.get("validatedBody") as VerifyAgentRequest;

  const db = getDb();

  // Look up agent by agentDid (using agentId as DID identifier)
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.agentDid, parsed.agentId))
    .limit(1);

  if (!agent) {
    return c.json(
      {
        success: true,
        data: {
          verified: false,
          trustScore: 0,
          agentMetadata: null,
          message: `Agent ${parsed.agentId} not found in registry.`,
        },
      },
      200,
    );
  }

  const isValid = agent.isActive && (!agent.expiresAt || agent.expiresAt > new Date());

  return c.json(
    {
      success: true,
      data: {
        verified: isValid,
        trustScore: isValid ? agent.complianceScore : 0,
        agentMetadata: {
          name: agent.name,
          type: agent.agentType,
          operator: agent.controllingEntityName,
          registeredAt: agent.createdAt.toISOString(),
          walletAddress: agent.walletAddress,
        },
        operatorStatus: {
          sanctionsCleared: isValid,
          kycVerified: true,
        },
        delegationScope: agent.delegationScope,
      },
    },
    200,
  );
});

// GET /v1/identity/agents -- List all agents (paginated)
// NOTE: Must be registered BEFORE /:agentId to avoid being shadowed by the wildcard.
identity.get("/agents", validate({ query: ListAgentsQuery }), async (c) => {
  const query = c.get("validatedQuery") as z.infer<typeof ListAgentsQuery>;
  const { page, limit, agentType, isActive } = query;
  const offset = (page - 1) * limit;

  const db = getDb();

  const conditions = [];
  if (agentType) {
    conditions.push(eq(agents.agentType, agentType));
  }
  if (isActive !== undefined) {
    conditions.push(eq(agents.isActive, isActive === "true"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(agents)
      .where(whereClause)
      .orderBy(desc(agents.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json(
    {
      success: true,
      data: {
        items: items.map((agent) => ({
          id: agent.id,
          agentDid: agent.agentDid,
          name: agent.name,
          agentType: agent.agentType,
          walletAddress: agent.walletAddress,
          controllingEntity: {
            name: agent.controllingEntityName,
            lei: agent.controllingEntityLei,
          },
          complianceScore: agent.complianceScore,
          isActive: agent.isActive,
          delegationScope: agent.delegationScope,
          createdAt: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    },
    200,
  );
});

// GET /v1/identity/:agentId -- Get agent identity info
// NOTE: Must be registered AFTER all static GET routes (e.g., /agents) to avoid shadowing them.
identity.get("/:agentId", validate({ params: AgentIdParams }), async (c) => {
  const { agentId } = c.get("validatedParams") as z.infer<typeof AgentIdParams>;
  const db = getDb();

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.agentDid, agentId))
    .limit(1);

  if (!agent) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Agent not found." } },
      404,
    );
  }

  return c.json(
    {
      success: true,
      data: {
        id: agent.id,
        agentDid: agent.agentDid,
        name: agent.name,
        agentType: agent.agentType,
        walletAddress: agent.walletAddress,
        controllingEntity: {
          name: agent.controllingEntityName,
          lei: agent.controllingEntityLei,
        },
        erc8004Id: agent.erc8004Id,
        erc8004Registry: agent.erc8004Registry,
        complianceScore: agent.complianceScore,
        isActive: agent.isActive,
        delegationScope: agent.delegationScope,
        validatedAt: agent.validatedAt?.toISOString() ?? null,
        expiresAt: agent.expiresAt?.toISOString() ?? null,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
      },
    },
    200,
  );
});

// POST /v1/identity/kya/issue -- Issue KYA credential
identity.post("/kya/issue", validate({ body: IssueKYARequest }), async (c) => {
  const parsed = c.get("validatedBody") as IssueKYARequest;

  const db = getDb();

  // Upsert agent record
  const now = new Date();
  const expiresAt = new Date(parsed.delegationScope.expiresAt);
  const defaultComplianceScore = 80;

  // Look up existing agent to preserve compliance score on re-issue
  const [existingAgent] = await db
    .select({ complianceScore: agents.complianceScore })
    .from(agents)
    .where(eq(agents.agentDid, parsed.agentDid))
    .limit(1);

  const [agent] = await db
    .insert(agents)
    .values({
      agentDid: parsed.agentDid,
      agentType: parsed.agentType,
      walletAddress: parsed.walletAddress,
      controllingEntityName: parsed.controllingEntity.name,
      controllingEntityLei: parsed.controllingEntity.lei,
      erc8004Registry: parsed.erc8004RegistryAddress,
      erc8004Id: parsed.erc8004TokenId ? Number(parsed.erc8004TokenId) : null,
      complianceScore: defaultComplianceScore,
      delegationScope: parsed.delegationScope,
      isActive: true,
      validatedAt: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: agents.agentDid,
      set: {
        agentType: parsed.agentType,
        walletAddress: parsed.walletAddress,
        controllingEntityName: parsed.controllingEntity.name,
        controllingEntityLei: parsed.controllingEntity.lei,
        delegationScope: parsed.delegationScope,
        complianceScore: existingAgent?.complianceScore ?? defaultComplianceScore,
        isActive: true,
        validatedAt: now,
        expiresAt,
        updatedAt: now,
      },
    })
    .returning();

  if (!agent) {
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to issue KYA credential." } },
      500,
    );
  }

  // Build W3C VC-shaped response (placeholder proof -- real impl signs with issuer key)
  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://flowlink.io/credentials/kya/v1",
    ],
    type: ["VerifiableCredential", "KYACredential"],
    id: `urn:uuid:${agent.id}`,
    issuer: {
      id: "did:flowlink:issuer",
      name: "FlowLink",
    },
    issuanceDate: now.toISOString(),
    expirationDate: expiresAt.toISOString(),
    credentialSubject: {
      id: parsed.agentDid,
      agentType: parsed.agentType,
      controllingEntity: parsed.controllingEntity,
      delegationScope: parsed.delegationScope,
      walletAddress: parsed.walletAddress,
      erc8004RegistryAddress: parsed.erc8004RegistryAddress ?? null,
      erc8004TokenId: parsed.erc8004TokenId ?? null,
    },
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: now.toISOString(),
      verificationMethod: "did:flowlink:issuer#key-1",
      proofPurpose: "assertionMethod",
      jws: "placeholder-signature",
    },
  };

  return c.json({
    success: true,
    data: {
      agent: {
        id: agent.id,
        agentDid: agent.agentDid,
        name: agent.name,
        agentType: agent.agentType,
        walletAddress: agent.walletAddress,
        controllingEntityName: agent.controllingEntityName,
        controllingEntityLei: agent.controllingEntityLei,
        complianceScore: agent.complianceScore,
        isActive: agent.isActive,
        delegationScope: agent.delegationScope,
        validatedAt: agent.validatedAt?.toISOString() ?? null,
        expiresAt: agent.expiresAt?.toISOString() ?? null,
        createdAt: agent.createdAt.toISOString(),
      },
      credential,
    },
  }, 201);
});

// POST /v1/identity/agents -- Register a new agent
identity.post("/agents", validate({ body: RegisterAgentRequest }), async (c) => {
  const parsed = c.get("validatedBody") as RegisterAgentRequest;

  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(parsed.delegationScope.expiresAt);

  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.agentDid, parsed.agentDid))
    .limit(1);

  if (existing) {
    return c.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: `Agent with DID ${parsed.agentDid} already exists.`,
        },
      },
      409,
    );
  }

  const [agent] = await db
    .insert(agents)
    .values({
      agentDid: parsed.agentDid,
      name: parsed.name,
      agentType: parsed.agentType,
      walletAddress: parsed.walletAddress,
      controllingEntityName: parsed.controllingEntity.name,
      controllingEntityLei: parsed.controllingEntity.lei,
      complianceScore: 80,
      delegationScope: parsed.delegationScope,
      isActive: true,
      validatedAt: now,
      expiresAt,
    })
    .returning();

  if (!agent) {
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to register agent." } },
      500,
    );
  }

  return c.json(
    {
      success: true,
      data: {
        id: agent.id,
        agentDid: agent.agentDid,
        name: agent.name,
        agentType: agent.agentType,
        walletAddress: agent.walletAddress,
        controllingEntity: {
          name: agent.controllingEntityName,
          lei: agent.controllingEntityLei,
        },
        complianceScore: agent.complianceScore,
        isActive: agent.isActive,
        delegationScope: agent.delegationScope,
        validatedAt: agent.validatedAt?.toISOString() ?? null,
        expiresAt: agent.expiresAt?.toISOString() ?? null,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
      },
    },
    201,
  );
});

// PUT /v1/identity/agents/:id/delegation -- Update delegation scope
identity.put(
  "/agents/:id/delegation",
  validate({ params: AgentUuidParams, body: UpdateDelegationRequest }),
  async (c) => {
    const { id } = c.get("validatedParams") as z.infer<typeof AgentUuidParams>;
    const updates = c.get("validatedBody") as UpdateDelegationRequest;

    const db = getDb();

    const [existing] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    if (!existing) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Agent not found." } },
        404,
      );
    }

    const currentScope = (existing.delegationScope ?? {}) as Record<string, unknown>;
    const newScope: Record<string, unknown> = { ...currentScope };

    if (updates.maxTransactionValue !== undefined) newScope["maxTransactionValue"] = updates.maxTransactionValue;
    if (updates.dailyLimit !== undefined) newScope["dailyLimit"] = updates.dailyLimit;
    if (updates.allowedCounterparties !== undefined) newScope["allowedCounterparties"] = updates.allowedCounterparties;
    if (updates.blockedJurisdictions !== undefined) newScope["blockedJurisdictions"] = updates.blockedJurisdictions;
    if (updates.allowedChains !== undefined) newScope["allowedChains"] = updates.allowedChains;
    if (updates.allowedCurrencies !== undefined) newScope["allowedCurrencies"] = updates.allowedCurrencies;
    if (updates.expiresAt !== undefined) newScope["expiresAt"] = updates.expiresAt;

    const [updated] = await db
      .update(agents)
      .set({
        delegationScope: newScope,
        expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : existing.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();

    if (!updated) {
      return c.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update delegation scope." } },
        500,
      );
    }

    return c.json(
      {
        success: true,
        data: {
          id: updated.id,
          agentDid: updated.agentDid,
          name: updated.name,
          delegationScope: updated.delegationScope,
          expiresAt: updated.expiresAt?.toISOString() ?? null,
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      200,
    );
  },
);

export { identity };
