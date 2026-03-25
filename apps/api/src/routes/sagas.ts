import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb } from "../db/index.js";
import { sagas } from "../db/schema.js";
import { validate } from "../middleware/validate.js";
import {
  createSaga,
  executeSaga,
  getSagaStatus,
  cancelSaga,
  SagaNotFoundError,
  SagaInvalidStateError,
} from "../services/saga.js";
import type { SagaStepType } from "../services/saga.js";

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const STEP_TYPES: [SagaStepType, ...SagaStepType[]] = [
  "complianceCheck",
  "createEscrow",
  "fundEscrow",
  "createInvoice",
  "screenAddress",
];

const CreateSagaRequest = z.object({
  name: z.string().min(1).max(256),
  steps: z
    .array(
      z.object({
        name: z.string().min(1).max(128),
        type: z.enum(STEP_TYPES),
        params: z.record(z.unknown()).default({}),
      }),
    )
    .min(1)
    .max(50),
  traceId: z.string().max(64).optional(),
});

const SagaIdParams = z.object({
  id: z.string().uuid("Invalid saga ID format."),
});

const ListSagasQuery = z.object({
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "COMPENSATING", "COMPENSATED", "FAILED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const sagaRoutes = new Hono();

// POST /sagas — create saga definition
sagaRoutes.post("/", validate({ body: CreateSagaRequest }), async (c) => {
  const body = c.get("validatedBody") as z.infer<typeof CreateSagaRequest>;

  const saga = await createSaga({
    name: body.name,
    steps: body.steps,
    traceId: body.traceId,
  });

  return c.json({ success: true, data: saga }, 201);
});

// POST /sagas/:id/execute — execute saga
sagaRoutes.post("/:id/execute", validate({ params: SagaIdParams }), async (c) => {
  const { id } = c.get("validatedParams") as z.infer<typeof SagaIdParams>;

  try {
    const saga = await executeSaga(id);
    return c.json({ success: true, data: saga });
  } catch (err: unknown) {
    if (err instanceof SagaNotFoundError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 404);
    }
    if (err instanceof SagaInvalidStateError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 409);
    }
    throw err;
  }
});

// GET /sagas/:id — get saga status
sagaRoutes.get("/:id", validate({ params: SagaIdParams }), async (c) => {
  const { id } = c.get("validatedParams") as z.infer<typeof SagaIdParams>;

  try {
    const saga = await getSagaStatus(id);
    return c.json({ success: true, data: saga });
  } catch (err: unknown) {
    if (err instanceof SagaNotFoundError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 404);
    }
    throw err;
  }
});

// POST /sagas/:id/cancel — cancel and compensate
sagaRoutes.post("/:id/cancel", validate({ params: SagaIdParams }), async (c) => {
  const { id } = c.get("validatedParams") as z.infer<typeof SagaIdParams>;

  try {
    const saga = await cancelSaga(id);
    return c.json({ success: true, data: saga });
  } catch (err: unknown) {
    if (err instanceof SagaNotFoundError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 404);
    }
    if (err instanceof SagaInvalidStateError) {
      return c.json({ success: false, error: { code: err.code, message: err.message } }, 409);
    }
    throw err;
  }
});

// GET /sagas — list sagas
sagaRoutes.get("/", validate({ query: ListSagasQuery }), async (c) => {
  const query = c.get("validatedQuery") as z.infer<typeof ListSagasQuery>;
  const db = getDb();

  const conditions = [];
  if (query.status) {
    conditions.push(eq(sagas.status, query.status));
  }

  const whereClause = conditions.length > 0 ? conditions[0]! : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(sagas)
      .where(whereClause)
      .orderBy(desc(sagas.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sagas)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json({
    success: true,
    data: rows,
    pagination: {
      total,
      limit: query.limit,
      offset: query.offset,
    },
  });
});
