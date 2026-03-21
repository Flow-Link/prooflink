import { Hono } from "hono";

import {
  HealthChecker,
  httpCheck,
  customCheck,
  PrometheusExporter,
} from "@flowlink/core";

import { getPool } from "../db/index.js";
import { logger } from "../utils/logger.js";

// ---------------------------------------------------------------------------
// Shared instances
// ---------------------------------------------------------------------------

const prometheus = new PrometheusExporter();

const checker = new HealthChecker({ timeoutMs: 5000 });

// Database check
checker.addCheck(
  customCheck("database", async () => {
    const pool = getPool();
    await pool.query("SELECT 1");
  }),
);

// Chainalysis API check (if configured)
const chainalysisUrl = process.env["CHAINALYSIS_API_URL"];
if (chainalysisUrl) {
  checker.addCheck(httpCheck("chainalysis", chainalysisUrl));
}

// ---------------------------------------------------------------------------
// Route group
// ---------------------------------------------------------------------------

const health = new Hono();

// GET /health — Full health check with dependency status
health.get("/health", async (c) => {
  const result = await checker.check();

  const checks: Record<string, { status: string; latencyMs: number; message?: string }> = {};
  for (const ch of result.checks) {
    checks[ch.name] = {
      status: ch.status,
      latencyMs: ch.latencyMs,
      ...(ch.message ? { message: ch.message } : {}),
    };
  }

  const httpStatus = result.status === "healthy" ? 200 : 503;

  return c.json(
    {
      success: true,
      data: {
        status: result.status,
        version: process.env["APP_VERSION"] ?? "0.1.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks,
      },
    },
    httpStatus,
  );
});

// GET /health/ready — Readiness probe (all critical dependencies up)
health.get("/health/ready", async (c) => {
  const result = await checker.check();

  const checks: Record<string, { status: string; latencyMs: number; message?: string }> = {};
  for (const ch of result.checks) {
    checks[ch.name] = {
      status: ch.status,
      latencyMs: ch.latencyMs,
      ...(ch.message ? { message: ch.message } : {}),
    };
  }

  const ready = result.status === "healthy";

  if (!ready) {
    logger.warn("Readiness probe failed", { checks });
  }

  return c.json(
    {
      success: true,
      data: {
        ready,
        checks,
      },
    },
    ready ? 200 : 503,
  );
});

// GET /health/live — Liveness probe (process alive, no dependency checks)
health.get("/health/live", (c) => {
  return c.json(
    {
      success: true,
      data: {
        alive: true,
        uptime: process.uptime(),
        memoryUsage: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
      },
    },
    200,
  );
});

// GET /metrics — Prometheus text exposition format
health.get("/metrics", (c) => {
  const body = prometheus.serialize();
  return c.text(body, 200, {
    "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
  });
});

export { health, prometheus };
