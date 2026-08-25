# Citizen Property Tax Online Payment + Receipt (apps/web)

**Date:** 2026-08-25  
**Status:** Approved  
**Scope:** Full UAT citizen pay flow — payment view → public API → Atom redirect → return → receipt

## Decisions

| Question         | Choice                                                                   |
| ---------------- | ------------------------------------------------------------------------ |
| Delivery         | **B** — Full UAT (not UI-only mock)                                      |
| Checkout handoff | **B** — HTTP redirect to gateway `redirectUrl` (not CDN atomcheckout.js) |
| Payer details    | **A** — Mobile required; email optional                                  |
| Architecture     | **Approach 1** — Public pay module + dedicated web routes                |
| Tax Dues link    | Already wired to `/propertytax/dues/[id]` — enable Pay Online from there |

## Out of scope

- CDN `atomcheckout.js` / AIPay JS widget
- Offline collection, refunds, settlements UI on web
- Client-supplied payment amounts
- Citizen login / OTP
- Redesigning staff portal payments

## Architecture

```text
/propertytax/dues/[id]
  → Pay Online
  → /propertytax/pay/[id]
  → POST /api/v1/public/property-tax/payments
       (recompute dues; create Payment; Atom/sandbox init)
  → browser redirect → Atom redirectUrl
  → Atom server callback → existing POST /api/v1/payments/gateway/callback
  → /propertytax/payment/return?merchTxnId=…
  → /propertytax/receipt/[merchTxnId]
```

## API

### Public endpoints (no AuthGuard; rate-limit `/public/property-tax`)

| Method | Path                                                        | Purpose                        |
| ------ | ----------------------------------------------------------- | ------------------------------ |
| `POST` | `/api/v1/public/property-tax/payments`                      | Start online payment           |
| `GET`  | `/api/v1/public/property-tax/payments/by-merch/:merchTxnId` | Status for return page         |
| `GET`  | `/api/v1/public/property-tax/receipts/:merchTxnId`          | Receipt payload (SUCCESS only) |

### Create payment

**Body:** `{ surveyId: string` (cuid), `payerMobile: string` (10 digits), `payerEmail?: string }`

**Rules:**

1. Load ACTIVE survey; recompute dues via same path as public dues API
2. Reject if `totalDemand <= 0` (`DUES_NOT_PAYABLE`)
3. Create `Payment` ONLINE, amount = server `totalDemand`, `collectedById` null, link survey/ward
4. Call existing Atom/sandbox provider with `ATOM_RETURN_URL` pointing at web return page and existing callback URL
5. Return `{ paymentId, merchTxnId, amount, currency, redirectUrl }` — no gateway secrets

### Status / receipt

- Status: payment id, merchTxnId, status, amount, surveyId, masked property summary, timestamps
- Receipt: only when `status === SUCCESS`; include printable receipt number (`receiptNumber` set on success if missing, else `merchTxnId`), assessment year label, tax breakdown snapshot if stored or recomputed for display, payer mobile masked

### Env

- `ATOM_RETURN_URL=http://localhost:3001/propertytax/payment/return` (web port; document in `.env.example`)
- Keep `ATOM_CALLBACK_URL` on API
- Document Atom UAT vars already used by `AtomNdpsProvider` in `.env.example` (no real secrets)

## Frontend (ui-ux-pro-max + Chhata brand)

### Visual system

- Preserve municipal orange CTA and slate surfaces (`#F8FAFC` / slate text)
- Lucide icons; `cursor-pointer`; 150–300ms transitions; 4.5:1 contrast; no emoji; no glass/luxury theme fork
- One primary job per page; clear trust copy for official payments

### Routes

| Route                               | Purpose                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `/propertytax/dues/[id]`            | Enable **Pay Online** → pay page                                   |
| `/propertytax/pay/[id]`             | Confirm amount + mobile (+ optional email) → create pay → redirect |
| `/propertytax/payment/return`       | Read `merchTxnId`; show pending/success/fail; link to receipt      |
| `/propertytax/receipt/[merchTxnId]` | Printable official receipt                                         |

### Pay page content

- Survey ref, ward, assessment year, total demand (hero amount), short breakdown
- Trust line: official municipal payment; amount fixed by published rates
- Mobile required validation; prevent double submit; loading/error/429 states

### Receipt content

- Municipal header, SUCCESS indicator, receipt/txn id, amount, date/time, property ref, ward, assessment year, masked mobile, Print + back to search

## Security

- Amount always server-computed from published TaxConfig
- Public endpoints rate-limited; no staff session required
- No Atom secrets in `NEXT_PUBLIC_*` or client bundles
- Receipt only for SUCCESS; do not leak full PII

## Testing

- API: create uses recomputed amount; reject zero dues; invalid mobile; receipt 404 unless SUCCESS; unauthenticated access
- Web: pay form validation; return handles success/pending/fail; receipt print layout smoke
- Manual UAT: sandbox and/or Atom test cards with configured env

## Follow-up (not this spec)

- CDN checkout.js path if Atom requires widget later
- Paid/outstanding ledger vs recomputed demand
- Hindi localization of receipt copy
