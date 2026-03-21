# Dashboard Code Review
**Scope:** `apps/dashboard/src/`
**Reviewer:** Claude (senior review pass)
**Date:** 2026-03-21
**Status:** All critical issues fixed. Zero TypeScript errors.

---

## Findings

### CRITICAL

**CRITICAL: Sidebar collapse doesn't shift main content** — `apps/dashboard/src/app/layout.tsx:26` — The main content wrapper had a hardcoded `pl-[240px]` that never updated when the sidebar collapsed to `68px`. This caused the sidebar to overlap content when collapsed. Fixed by lifting `collapsed` state into a new `SidebarLayout` component that owns both the sidebar and main area, tracking padding reactively via `cn(collapsed ? "pl-[68px]" : "pl-[240px]")`.

**CRITICAL: `randomDate(-14)` produces past dates, not future** — `apps/dashboard/src/lib/api.ts:144` — `randomDate` computes `d.getDate() - Math.floor(Math.random() * daysBack)`. Passing `-14` makes this `getDate() - Math.floor(Math.random() * -14)`, which subtracts a negative number and produces dates *in the past*, making all invoice due dates expired. Added `randomFutureDate(daysAhead)` and replaced the call at the invoice mock.

**CRITICAL: `navigator.clipboard.writeText` is not caught** — `apps/dashboard/src/app/compliance/[id]/page.tsx:27`, `apps/dashboard/src/app/api-keys/page.tsx:54` — The Clipboard API returns a rejected Promise when permissions are denied (e.g., non-HTTPS localhost, incognito). Unhandled promise rejection surfaces as an uncaught error in the browser. Fixed with `.catch(() => undefined)` on all call sites.

**CRITICAL: SVG gradient `id` collision** — `apps/dashboard/src/components/charts/volume-chart.tsx:50-57` — Gradient ids `passedGradient` and `failedGradient` are static strings. If two `VolumeChart` instances exist in the same SVG context (or the same DOM), the second chart's areas resolve to the first chart's gradients and render incorrectly. Fixed by scoping ids with React 18's `useId()`.

---

### WARNING

**WARNING: All `useQuery` calls missing `isError` handling** — `apps/dashboard/src/app/page.tsx`, `compliance/page.tsx`, `invoices/page.tsx`, `agents/page.tsx`, `api-keys/page.tsx` — Every query used `isLoading || !data` as the single guard, treating network errors and successful empty responses identically. A failed query silently showed a perpetual loading skeleton. Fixed by destructuring `isError` from every `useQuery` and adding explicit error UI (inline error message or `TableEmpty` with error text).

**WARNING: `handleIssue` and `handleCreate` swallow errors** — `apps/dashboard/src/app/agents/page.tsx:48-55`, `apps/dashboard/src/app/api-keys/page.tsx:45-51` — Both used `await …; setIsLoading(false)` sequentially, so a thrown error left the button spinner stuck permanently. Wrapped bodies in `try/finally` to guarantee the loading flag resets.

**WARNING: `updateField` accepts untyped `string` key** — `apps/dashboard/src/app/invoices/new/page.tsx:37` — The field parameter was typed as `string`, giving up all safety on the call sites. Changed to `keyof typeof form` so any typo in a field name is caught at compile time.

**WARNING: Broken `RiskGauge` implementation** — `apps/dashboard/src/app/screen/page.tsx:22-56` — The CSS border-trick gauge used `borderTopColor/borderLeftColor/borderRightColor` toggling based on score thresholds (25/75), producing only four possible visual states instead of a smooth arc. The `transform: rotate()` rotated the entire element, not just the fill. Replaced with a proper SVG half-circle arc using `strokeDasharray` for precise proportional fill at any score value.

**WARNING: Sidebar collapse button missing `aria-label`** — `apps/dashboard/src/components/layout/sidebar.tsx:79` — A button with only a chevron icon and no text had no `aria-label`, making it invisible to screen readers. Added `aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}`.

---

### SUGGESTION

**SUGGESTION: Nav links missing `aria-current="page"`** — `apps/dashboard/src/components/layout/sidebar.tsx` — Active nav links had no `aria-current` attribute. Added `aria-current={isActive ? "page" : undefined}`.

**SUGGESTION: Icon buttons in header missing `aria-label`** — `apps/dashboard/src/components/layout/header.tsx:15,19` — The Bell and Settings `<Button size="icon">` had no accessible label. Added `aria-label="Notifications"` and `aria-label="Settings"`.

**SUGGESTION: Form labels not associated with inputs** — `apps/dashboard/src/app/agents/page.tsx`, `apps/dashboard/src/app/invoices/new/page.tsx`, `apps/dashboard/src/app/api-keys/page.tsx` — Multiple `<label>` elements had no `htmlFor`, and their inputs had no `id`, breaking the click-to-focus contract and screen reader association. Fixed across all three pages.

**SUGGESTION: Chain selector buttons missing `aria-pressed`** — `apps/dashboard/src/app/invoices/new/page.tsx:119` — The pill buttons act as a single-select radio group but used no ARIA semantics. Added `role="group"` + `aria-labelledby` on the container and `aria-pressed={form.chain === c}` on each button.

**SUGGESTION: `CopyButton` "Copied!" feedback used `absolute` span inside non-positioned parent** — `apps/dashboard/src/app/compliance/[id]/page.tsx:30` — The text overflowed the layout silently. Replaced with a `title` tooltip + color change on the icon, which conveys state without layout side effects.

**SUGGESTION: `aria-hidden` missing on decorative icons** — Multiple pages — Lucide icons used for decoration (not conveying unique information beyond adjacent text) had no `aria-hidden="true"`, causing screen readers to announce generic SVG paths. Added across sidebar, header, and badge icon patterns.

**SUGGESTION: No `<meta name="viewport">` or base `<title>` fallback** — `apps/dashboard/src/app/layout.tsx` — Next.js injects viewport by default via `<Head>`, but `metadata` does not include an explicit `viewport` override. Low risk with Next 15, but worth confirming `next/head` defaults are not overridden elsewhere.

**SUGGESTION: `Providers` does not include React Query Devtools** — `apps/dashboard/src/app/providers.tsx` — For a demo environment, adding `ReactQueryDevtools` (conditionally on `process.env.NODE_ENV !== "production"`) would help debug cache/stale states during demos. Not a correctness issue.

---

## Structural Assessment

### App Router usage
Correct. All pages use the `app/` directory convention. Dynamic segment `[id]` is properly handled with `useParams()` in a client component. No mixed Page Router artifacts.

### Component quality
Good separation of concerns. UI primitives (`Button`, `Input`, `Card`, `Table`, `Badge`, `Dialog`) are correctly isolated under `components/ui/`. Chart is isolated. Layout components are isolated. No business logic leaks into primitives.

### Data fetching
`@tanstack/react-query` v5 is used correctly. `QueryClient` is instantiated inside `useState` (correct — prevents shared state across requests in SSR context). `staleTime: 30_000` and `refetchOnWindowFocus: false` are reasonable demo defaults. `queryKey` arrays are stable and consistent across pages (e.g., `["compliance-checks"]` is reused correctly between the dashboard page and compliance page, enabling cache sharing).

### Dark theme / UI
Consistent dark theme via CSS custom properties and `html.dark` class. `glass-card` utility (backdrop-blur + semi-transparent bg) is applied consistently. Gradient text on logo. Color-coded status badges, risk score bars, and agent status borders all follow a coherent semantic color system (emerald=pass, red=fail, amber=review/pending, zinc=expired).

### Tailwind
Clean. Utility-first, no `@apply` abuse outside the three required global utilities. `cn()` (clsx + tailwind-merge) used correctly everywhere for conditional classes. No inline `style` except where CSS variables are needed for chart colors.

### Testing
No test files exist anywhere in `apps/dashboard/`. For a demo this is acceptable, but any real path to production requires at minimum:
- Unit tests for `lib/utils.ts` formatters
- Integration tests for the `screen` page flow (stateful mutation + error path)
- A smoke test for the compliance detail 404 path

---

## Files Modified

- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/layout.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/components/layout/sidebar.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/components/layout/header.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/components/charts/volume-chart.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/compliance/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/compliance/[id]/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/agents/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/api-keys/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/invoices/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/invoices/new/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/app/screen/page.tsx`
- `/home/akash/PROJECTS/FLOW-LINK/apps/dashboard/src/lib/api.ts`
