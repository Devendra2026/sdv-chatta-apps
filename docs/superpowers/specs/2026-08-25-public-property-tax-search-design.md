# Public Property Tax Search (Citizen Website)

**Date:** 2026-08-25  
**Status:** Approved  
**Scope:** Wire `apps/web` `/propertytax` to a public Nest search API (search + results only)

## Decisions

| Question      | Choice                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| Image upload  | **Not in scope**                                                                 |
| Feature slice | **Search + results list only** (dues / pay later)                                |
| Access        | **Public** — no login; rate-limited; minimal masked PII                          |
| Approach      | Dedicated Nest module `public-property-tax` (not admin `/surveys`, not Next BFF) |

## Architecture

```text
apps/web (:3001) /propertytax
  → GET /api/v1/public/property-tax/wards
  → GET /api/v1/public/property-tax/search
  → Nest public-property-tax (no AuthGuard)
  → Prisma Survey + Ward (ACTIVE only)

apps/portal (:3000) continues to use authenticated /api/v1/surveys
```

## API

### Endpoints

| Method | Path                                 | Auth | Behavior                                     |
| ------ | ------------------------------------ | ---- | -------------------------------------------- |
| `GET`  | `/api/v1/public/property-tax/wards`  | None | Active wards: `id`, `number`, `name`, `code` |
| `GET`  | `/api/v1/public/property-tax/search` | None | Mode-aware paginated search                  |

### Search query

- `mode`: `ward` \| `propertyId` \| `owner`
- `mode=ward`: required `wardNumber`; optional `propertyNo` (matches `propertyNo` / `parcelNo` / `houseNo`)
- `mode=propertyId`: required `propertyId` (matches `surveyId` OR `parcelNo` OR `propertyNo`, case-insensitive equality)
- `mode=owner`: required `ownerName` (≥3 chars) AND `mobile` (10 digits); name contains (insensitive); mobile exact (digits only)
- `page` default 1; `pageSize` default 10, max 20

Filter: `status = ACTIVE` and `deletedAt = null`.

### Response item

```ts
{
  id: string
  surveyId: string
  wardNumber: number
  wardName: string
  propertyNo: string | null
  parcelNo: string | null
  ownerNameMasked: string
  mobileMasked: string
  locality: string | null
}
```

Envelope: `{ success: true, data: { items, page, pageSize, total } }`.

Never return: Aadhaar, father name, floors, tax internals, attachments, unmasked mobile / full owner when maskable.

### Rate limit

Paths containing `/public/property-tax`: **30 requests / minute / IP** (vs default 300).

## Frontend

- Keep existing municipal UI in `apps/web/components/propertytax/page.tsx`
- Ward dropdown from public wards API; optional house/plot field
- React Query for wards + search; same-origin `/api` rewrite to Nest (portal pattern); credentials omitted (public)
- Results panel: loading / empty / validation / API error (incl. 429)
- Select CTA: “Tax dues coming soon” (disabled for payment)
- Reset clears form + results

## Out of scope

- Image/document upload
- Tax dues / demand ledger
- Online payment / receipt
- Citizen login
- Changes to admin survey APIs or portal

## Testing

- Unit tests: masking helpers; mode validation rules; pageSize cap behavior
- Public routes have no AuthGuard
- Lint / typecheck for changed `apps/api` and `apps/web` scope
