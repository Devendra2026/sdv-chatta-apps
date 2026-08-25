# Citizen Property Tax Online Payment + Receipt — Implementation Plan

**Goal:** Citizen pay UAT flow: pay page → public create → Atom/sandbox redirect → return → receipt.

**Architecture:** Extend `public-property-tax` + `PaymentsService.createCitizenOnline`; web routes for pay/return/receipt; enable Pay on dues page.

## Tasks

1. `PaymentsService.createCitizenOnline` + callback sets `receiptNumber`; public requery/sync for PENDING
2. Public POST/GET payment + receipt endpoints in `public-property-tax`
3. Web: `publicApiPost`, pay/return/receipt pages, enable Pay Online
4. Env examples + unit tests + typecheck
