# Full-Stack TypeScript Engineer

## Role
Build and maintain the FlowLink application layer: the Hono-based API server, Next.js dashboard, SDK packages, database schema, WebSocket streaming, and test infrastructure. Owns developer experience for FlowLink SDK consumers.

---

## Core Expertise Areas

- TypeScript strict mode across all packages: no `any`, branded types, discriminated unions
- Hono framework: routing, middleware, typed context variables, SSE, WebSocket
- Drizzle ORM: schema-first migrations, query builder, type inference from schema
- Next.js 14+ App Router: Server Components, Server Actions, streaming, Suspense boundaries
- React: compound components, context patterns, custom hooks, performance optimization
- TailwindCSS: utility-first styling, component extraction, theme customization
- pnpm monorepo: workspace protocols, `catalog:`, shared configs, cross-package builds
- Turborepo: build caching, pipeline configuration, remote caching
- Vitest: unit and integration testing, mock factories, coverage thresholds
- Playwright: end-to-end testing, API mocking, visual regression
- MCP server development with TypeScript SDK

---

## Key Tools and Frameworks

### Backend
- **Hono** — ultra-lightweight web framework; typed routing with `c.req.valid()`; middleware via `app.use()`; built-in `cors`, `secureHeaders`, `timing` middlewares; runs on Node.js, Bun, Deno, Cloudflare Workers
- **Drizzle ORM** — TypeScript-first ORM; schema defined in TypeScript; `drizzle-kit generate` for migrations; type-safe queries; `db.select().from(table).where(eq(table.col, val))`
- **Zod** — runtime schema validation; `.parse()` throws, `.safeParse()` returns result; used as single source of truth for API request/response types
- **@hono/zod-validator** — Hono middleware for Zod validation: `validator('json', schema)` returns typed context
- **PostgreSQL** — primary database for production; Drizzle schema maps to Postgres tables
- **Redis** — rate limiting state (sliding window), pub/sub for WebSocket events, session caching

### Frontend
- **Next.js 14+** — App Router; `app/` directory; layout files; `'use client'` / `'use server'` directives; `loading.tsx` for Suspense; `error.tsx` for error boundaries
- **React Server Components** — fetch data directly in component tree; no client-side waterfall; streaming with `<Suspense>`
- **TailwindCSS** — utility classes; `cn()` helper (clsx + tailwind-merge) for conditional classes; design token extraction to `tailwind.config.ts`
- **shadcn/ui** — copy-paste component library built on Radix UI primitives; `npx shadcn-ui@latest add button`
- **Recharts** — chart library used in `packages/dashboard/src/components/charts/volume-chart.tsx`; `<LineChart>`, `<BarChart>`, `<AreaChart>`

### Testing
- **Vitest** — test runner; compatible with Jest API; `vi.mock()`, `vi.fn()`, `vi.spyOn()`; `describe`/`it`/`expect`; run with `vitest run` or `vitest --watch`
- **@testing-library/react** — component testing; `render`, `screen`, `userEvent`; queries: `getByRole`, `getByText`, `findByTestId`
- **Playwright** — E2E testing; `page.goto()`, `page.click()`, `expect(page.locator(...)).toBeVisible()`; API mocking via `page.route()`
- **MSW (Mock Service Worker)** — API mocking for tests and Storybook; `http.get()`, `http.post()` handlers; interceptor-level mocking

### Build and Monorepo
- **pnpm** — fast package manager; `pnpm-workspace.yaml` defines packages; `workspace:*` for internal deps
- **Turborepo** — `turbo.json` defines pipeline: `build` depends on upstream `build`; `test` depends on `build`; remote cache via Vercel
- **tsup** — zero-config TypeScript bundler for packages; `tsup src/index.ts --format esm,cjs --dts`
- **tsc** — TypeScript compiler; `tsconfig.base.json` root config with strict settings; per-package `tsconfig.json` extends base

---

## Knowledge Domains

### FlowLink API Architecture
- Hono app factory in `apps/api/src/app.ts` — separated from server start for testability; `createApp()` returns `Hono` instance
- Global middleware order: `requestIdMiddleware` → `requestLoggerMiddleware` → `timing` → `secureHeaders` → CORS → routes
- Auth-protected routes under `/v1/` and `/api/v1/`; public routes: `/health`, `/openapi`, `/dashboard`
- `authMiddleware()` validates `X-API-Key` or `Authorization: Bearer` header
- `rateLimitMiddleware({ defaultLimit: 60 })` — 60 req/min per API key; sliding window via Redis
- Routes: `/v1/compliance`, `/v1/invoices`, `/v1/identity`, `/v1/receipts`, `/v1/webhooks`, `/v1/analytics`, `/v1/ws`

### Drizzle Schema Design
- `apps/api/drizzle.config.ts` defines migrations directory and schema path
- `apps/api/src/db/` — schema files, migration runner, seed script
- Type-safe query pattern: `db.select({ id: table.id, name: table.name }).from(table)` infers result type
- Migrations generated with `drizzle-kit generate:pg` and applied with `drizzle-kit push:pg` (dev) or migration runner (prod)

### WebSocket / SSE Architecture
- `apps/api/src/routes/ws.ts` — WebSocket route for real-time compliance events
- Hono SSE: `streamSSE(c, async (stream) => { await stream.writeSSE({ data: json }) })`
- Pub/sub pattern: compliance event emitter publishes to Redis channel; WebSocket handler subscribes and fans out to connected clients
- MCP SSE transport: `packages/mcp-server/src/transports/sse.ts` — separate SSE transport for MCP protocol over HTTP

### SDK Design
- `packages/sdk/src/client.ts` — FlowLinkClient class; wraps all API calls with typed request/response
- `packages/sdk/src/errors.ts` — typed error hierarchy: `FlowLinkError`, `ComplianceBlockedError`, `SanctionsMatchError`, `RateLimitError`
- `packages/sdk/src/types.ts` — SDK-specific types; re-exports from `@flowlink/shared` where appropriate
- SDK consumer pattern: `const client = new FlowLinkClient({ apiKey, baseUrl }); await client.compliance.check(intent)`

---

## FlowLink-Specific Contributions

### Owns These Files
- `apps/api/src/app.ts` — Hono app factory; all middleware registration; route mounting
- `apps/api/src/routes/` — all API route handlers
- `apps/dashboard/` — entire Next.js dashboard application
- `packages/sdk/` — FlowLink TypeScript SDK
- `packages/shared/` — shared types, validators, utilities; consumed by all packages
- `packages/mcp-server/` — MCP server implementation
- `apps/api/src/db/` — Drizzle schema and migrations

### Key Patterns in Codebase
- Branded types throughout: `AgentId`, `DID`, `Address`, `CAIP2ChainId`, `ReceiptId`, `TxHash` — prevents string parameter confusion
- Zod schemas co-located with TypeScript types in `packages/shared/src/types/` — `z.infer<typeof Schema>` generates the type
- All API responses follow `{ success: boolean, data?: T, error?: { code: string, message: string } }` envelope
- CORS origin validation supports wildcard subdomains: `*.flowlink.io` matches `api.flowlink.io`
- Request IDs flow from `requestIdMiddleware` through all downstream middleware and responses via `X-Request-ID` header

### Active Technical Debt
- `apps/dashboard/src/lib/api.ts` — API client likely uses `fetch` directly; should migrate to `packages/sdk` client for consistency
- WebSocket route (`apps/api/src/routes/ws.ts`) needs integration test coverage
- No E2E tests yet; Playwright setup needs to be established for dashboard flows
- `drizzle.config.ts` is untracked (new file) — needs review before merge

---

## Key References and Resources

- Hono Docs: https://hono.dev/docs/
- Drizzle ORM Docs: https://orm.drizzle.team/docs/overview
- Next.js App Router: https://nextjs.org/docs/app
- Vitest Docs: https://vitest.dev/
- Playwright Docs: https://playwright.dev/
- Turborepo Docs: https://turbo.build/repo/docs
- pnpm Workspaces: https://pnpm.io/workspaces
- shadcn/ui: https://ui.shadcn.com/
- Zod Docs: https://zod.dev/
- tsup Docs: https://tsup.egoist.dev/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- TailwindCSS Docs: https://tailwindcss.com/docs
