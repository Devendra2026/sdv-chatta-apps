# Chhata Tax Rate Formula Alignment — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Align house/water/drainage tax calc with Chhata rules; add ULB commercial assessable % on TaxConfig.

**Architecture:** Extend TaxConfig + pure `tax-calc` helpers; wire export, dues, preview, portal percentages.

**Tech Stack:** NestJS, Prisma, Next.js portal, Jest

## Global Constraints

- Annual rate (no ×12)
- Remove commercial ×2
- Residential assessable 80%; commercialAssessablePct ULB (Chhata 80); open land 100%
- Defaults: property 10%, water 7.5%, drainage 2.5%
- Safe backfill: water/drainage only when 0

---

### Task 1: Schema + migration + DTO/service defaults

- [ ] Add `commercialAssessablePct`, change water/drainage defaults
- [ ] Migration with safe UPDATE backfill
- [ ] DTO, service update/copy/preview/publish snapshot

### Task 2: tax-calc + consumers

- [ ] `resolveAssessablePct`; update `computeFloorAlv` / `ExportTaxRateTable`
- [ ] Update dues.util, ward-tax-report-excel

### Task 3: Portal UI

- [ ] Residential + commercial assessable fields

### Task 4: Tests

- [ ] tax-calc, dues, export specs
