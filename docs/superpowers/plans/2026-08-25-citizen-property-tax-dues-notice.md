# Citizen Property Tax Dues Notice — Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes track progress.

**Goal:** Enable Tax Dues on citizen search results and show a Demand Notice page with server-computed dues (no Atom payment).

**Architecture:** Extend `public-property-tax` with `GET .../dues/:id`; resolve published TaxConfig; compute via existing tax-calc helpers; render notice on `/propertytax/dues/[id]`.

**Tech Stack:** NestJS, Prisma, tax-calc, Next.js App Router, React Query

## Global Constraints

- No Atom payment / client-supplied amounts
- Public, rate-limited; mask mobile; ACTIVE surveys only
- Assessment year = latest published TaxConfig for the ward

---

### Task 1: Public dues API

**Files:**

- Modify: `apps/api/src/public-property-tax/public-property-tax.service.ts`
- Modify: `apps/api/src/public-property-tax/public-property-tax.controller.ts`
- Create: `apps/api/src/public-property-tax/dues.util.ts` (optional helpers)
- Create: `apps/api/src/public-property-tax/dues.util.spec.ts`
- Modify: `packages/types/src/index.ts`

### Task 2: Web client + Tax Dues button + notice page

**Files:**

- Modify: `apps/web/lib/property-tax-api.ts`
- Modify: `apps/web/components/propertytax/page.tsx`
- Create: `apps/web/app/(web)/propertytax/dues/[id]/page.tsx`
- Create: `apps/web/components/propertytax/demand-notice.tsx`

### Task 3: Validate

- API unit tests + `pnpm --filter api typecheck` + `pnpm --filter web typecheck`
