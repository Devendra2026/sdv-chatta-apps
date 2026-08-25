# Citizen Property Tax Dues Notice (apps/web)

**Date:** 2026-08-25  
**Status:** Approved  
**Scope:** Tax Dues button + Demand Notice view only (no Atom payment)

## Decisions

| Question | Choice |
| -------- | ------ |
| Delivery scope | **A** — Tax Dues button → dues/notice view only; Atom pay later |
| Notice UI | **A** — Match department Demand Notice layout (portal `notice-template`) |
| Assessment year | **A** — Ward’s currently published TaxConfig only (no year picker) |
| Approach | **1** — Public dues API + dedicated `/propertytax/dues/[id]` page |

## Out of scope

- Atom UAT / CDN `atomcheckout.js` / create-payment / return / receipt
- Client-supplied payment amounts
- TaxDemand ledger / arrears / paid-to-date
- Citizen login / OTP verification
- Changing staff portal payment flows

## Architecture

```text
/propertytax (search results)
  → Tax Dues button
  → /propertytax/dues/[id]   (id = Survey cuid)
  → GET /api/v1/public/property-tax/dues/:id
  → ACTIVE Survey + floors
  → latest PUBLISHED TaxConfig for ward
  → tax-calc (same helpers as demand export)
  → JSON → Demand Notice UI + Print
  → Pay Online CTA disabled (“coming soon”)
```

## API

### Endpoint

`GET /api/v1/public/property-tax/dues/:id`

- No AuthGuard (same pattern as public search/wards)
- Rate-limited under `/public/property-tax` (existing 30/min/IP)

### Resolution rules

1. Survey must exist, `status = ACTIVE`, `deletedAt = null`
2. Load ward + floors
3. Find **currently published** TaxConfig for that ward: among configs with `status = PUBLISHED` for `wardId`, pick the one whose related assessment-year `ReferenceEntry` sorts latest by `code`/`label` descending, then `updatedAt` descending as tie-break. If none → `404` with code `TAX_CONFIG_NOT_PUBLISHED`
4. Compute demand via existing `tax-calc` / export tax path (not zeros)

### Response (JSON)

- Property identity: `id`, `surveyId`, ward number/name, propertyNo, parcelNo, houseNo, locality/address fields, propertyUse, taxRateZone, ownerName, **mobileMasked**
- Assessment: year label, config id/version as needed for display
- Floors: floorLabel, usageType, usageFactor, construction, areaSqFt, rate, alv, tax
- Summary: propertyTax, waterTax, drainageTax, penalty, totalDemand, and relevant pcts / base rate for notice headers
- Never return: Aadhaar, unmasked mobile, attachments, staff-only fields

Envelope: `{ success: true, data: { ... } }`

## Frontend

### Search results ([`apps/web/components/propertytax/page.tsx`](apps/web/components/propertytax/page.tsx))

- Replace disabled “Tax dues coming soon” with active **Tax Dues** linking to `/propertytax/dues/[id]`

### Dues page

- Route: `apps/web/app/(web)/propertytax/dues/[id]/page.tsx`
- Fetch via same-origin `/api` rewrite + React Query
- States: loading, error (incl. missing published config), not found
- Render Demand Notice matching portal notice sections (header, property/owner, floor table, tax summary, total)
- Actions: **Print**, **Back to search**, **Pay Online** (disabled placeholder)
- Prefer shared notice renderer extracted/adapted from portal `notice-template` so amounts and layout stay aligned

## Security

- Public read of computed dues for ACTIVE surveys only
- PII minimized (mask mobile; no Aadhaar)
- Amounts always server-computed from published config
- No payment secrets on web

## Testing

- API: ACTIVE-only; published-config required; masking; smoke assert totalDemand ≥ 0 when floors/config present
- Web: Tax Dues navigates; notice shows totalDemand; error UI when config missing

## Follow-up (not this spec)

Wire Atom Non-Seamless / AIPay kit (`docs/payments/`) for public Pay Online: server-calculated amount → init → checkout → callback → return/receipt.
