# Atom production checkout: blank payment methods — diagnostic report

- **Site:** https://www.npchhata.com · **Gateway:** NTT DATA Atom AIPay (ADAPTIS) · **MID:** 858781
- **Date:** 2026-11-13 (IST)
- **Status:** **Root cause identified (section B0), fix pending in Dokploy.** Older builds forced `subChannel=UP` (UPI only) in production, and the `ATOM_SUB_CHANNEL=UP` value they required is still in the live environment. Not verified in a live checkout yet.

---

## A. Observed issue

The Atom popup opens and shows the merchant name (NAGAR PANCHAYAT CHHATA), amount, customer mobile and email, the session countdown and ADAPTIS branding. The payment-method area is empty: no Card, UPI QR, UPI Intent, Net Banking or EMI.

## B0. Root cause (confirmed from code history)

**Production sent every AUTH request with `payModeSpecificData.subChannel = "UP"`, which limits Atom's checkout to UPI only.**

Up to and including commit `87617c6` ("online tax pay key"):

- `atom-env.ts` had `PROD_ATOM_SUB_CHANNEL = "UP"`. `resolveAtomSubChannel()` returned `"UP"` whenever `NODE_ENV=production` and `PAYMENT_PROVIDER=atom`, **even when `ATOM_SUB_CHANNEL` was unset**.
- `validate-env.ts` refused to start the API unless `ATOM_SUB_CHANNEL` was exactly `UP` (`"ATOM_SUB_CHANNEL must be UP in production (UPI-only checkout)"`).
- `.env.production.example` shipped `ATOM_SUB_CHANNEL=UP`.

So the live Dokploy environment had to contain `ATOM_SUB_CHANNEL=UP`. Without it, the API would not start. With `subChannel=UP`, Atom drops Cards, Net Banking and EMI. On a desktop browser, UPI Intent cannot be offered either, so the instrument area is left empty while the header, amount and timer still render. That matches the screenshot.

Commit `8b750da` (2026-11-13 14:18 IST) removed the forced default and the validation rule. That code change alone **does not clear the value already stored in Dokploy**. As long as `ATOM_SUB_CHANNEL=UP` stays in the Environment tab, the new code still sends `subChannel: "UP"`.

**Fix (production action, no code change needed):**

1. Dokploy → `api` service → Environment: set `ATOM_SUB_CHANNEL=` (empty) or delete the line.
2. Redeploy from `main` at `8b750da` or later.
3. Confirm the API startup log shows `Atom config: … subChannel=none (all enabled modes)` (added in this change). Then, for a new payment, the `atom.auth.success` log should show `payModeSpecificData.present: false`.
4. Open a checkout and confirm the payment methods appear. Then test one real low-value payment end-to-end, with server-side status verification and a receipt.

If methods are still missing after step 3 shows `subChannel=none`, check that the product resolves to `NAGAR`, then escalate to Atom with section I.

## B. Earlier analysis (before the history check)

Reading Atom's production `atomcheckout.js` (`psa.atomtech.in/staticdata/ots/js/atomcheckout.js`, 23,247 bytes, Last-Modified 2026-10-17) shows the checkout runs in three steps:

| Step | Who | What | Status implied by the screenshot |
|---|---|---|---|
| 1 | Our API | `POST payment1.atomtech.in/ots/aipay/auth` → `atomTokenId` | **Works** — the popup cannot open without a token |
| 2 | Atom JS | `POST payment1.atomtech.in/ots/aipay/mconfig?encData=…&merchId=…`, then checks `responseDetails.txnStatusCode === "OTS0000"` | **Works** — on any other code the JS shows its "An error has occurred!" modal, not the checkout |
| 3 | Atom JS | Form POST into an iframe at `psa.atomtech.in/AtomInstaPay/checkout-frame.jsp`. That page renders the header **and** the payment-mode list from the mconfig data | Header renders; **mode list is empty** |

Our application has no code inside step 3. The list is built by Atom's page from Atom's merchant/token configuration. The only inputs we control that affect that list are two AUTH fields:

1. **`payDetails.product`.** Atom maps payment modes to each product. If the live env sends a product with no modes mapped, the token and header are still valid but the list can be empty. The code sends `ProductID` when set, otherwise `ATOM_PRODUCT`. `.env.production.example` has `ATOM_PRODUCT=NSE` (a UAT kit sample) and `ProductID=NAGAR`. **If Dokploy has only `ATOM_PRODUCT=NSE`, production AUTH sends `NSE`.**
2. **`payModeSpecificData.subChannel`.** A set value limits the checkout to that one channel. An earlier build forced `ATOM_SUB_CHANNEL=UP` in production (see `.cursor/debug-5916dd.log`: `"ATOM_SUB_CHANNEL must be UP in production (UPI-only checkout)"`, `subChannel:"UP"`). Current code allows it to be empty, but **Dokploy may still have `UP` set.**

We cannot see the live Dokploy values from this machine, so neither is confirmed. If both turn out correct (`product=NAGAR`, subChannel empty), the cause is on Atom's side (step 3 / MID-product-mode mapping), and section I applies.

**Ruled out, with evidence:**

- AUTH JSON shape: matches the spec (section E); 173/173 tests pass.
- Token handling: the token is passed unchanged to `AtomPaynetz`; a fresh token is made per initiation; no reuse path.
- Checkout SDK environment: the production JS hard-codes the `payment1` / `psa` hosts and ignores the `env` argument, so a UAT/prod `env` mix-up cannot cause this. Production validation (`validate-env.ts`) also refuses to start unless the AUTH URL, CDN and `ATOM_CHECKOUT_ENV=prod` match exactly.
- Browser security on our side: `https://www.npchhata.com/` sends **no** CSP, X-Frame-Options or frame-src headers (checked with `curl -I`). Nothing on our page can block Atom's iframe. The iframe's content is governed by Atom's own headers. The API's `helmet`/`X-Frame-Options: DENY` applies only to API JSON responses, not to the citizen page.
- Frontend race: `openAtomAipayCheckout` waits for the script `load` event before building `AtomPaynetz`.

**Side finding:** `https://npchhata.com` (apex, no `www`) fails TLS checks (`SEC_E_UNTRUSTED_ROOT`). `www` is fine. This is not the cause of the blank list, since return/callback URLs use `PUBLIC_WEB_URL`. Fix it, or redirect the apex to `www`, if citizens use the bare domain.

## C. Browser console

**Not captured.** No live checkout was opened during this investigation: doing so creates a real AUTH token and an `INITIATED` payment row in production, and that needs your approval. Errors inside `checkout-frame.jsp` appear in the iframe's own console context (origin `psa.atomtech.in`). In DevTools, switch the console context dropdown to that frame.

## D. Network investigation

| Request | Observed | Note |
|---|---|---|
| `GET psa.atomtech.in/.../atomcheckout.js` | 200, `text/javascript`, 23,247 B | Fetched directly, not from a checkout session |
| `GET www.npchhata.com/` | 200, no CSP / XFO | |
| `POST payment1.atomtech.in/ots/aipay/auth` | not captured | Server logs: `atom.auth.success` event (see below) |
| `POST payment1.atomtech.in/ots/aipay/mconfig` | not captured | **Key request**: its decrypted body holds the mode config |
| `POST psa.atomtech.in/AtomInstaPay/checkout-frame.jsp` | not captured | Check status and any XHRs it makes after loading |

**Evidence already in the production logs.** Every AUTH logs an `atom.auth.success` / `atom.auth.token_failed` JSON event. It carries `merchTxnId`, `httpStatus`, `gatewayStatusCode`, `authDiagnostic.payModeSpecificData.{present,subChannel}` and `durationMs`. In Dokploy → api logs, search for `atom.auth` and read `payModeSpecificData`. **If `present: true, subChannel: "UP"` appears, that is the application-side cause.**

## E. AUTH JSON comparison

Built by `buildAipayAuthPayload` (`apps/api/src/payments/providers/atom-ndps.provider.ts`) and checked by `assertAipayAuthPayload` before encryption:

| Field | Spec (`docs/payment-api-guides/get_api_specification.md`) | Generated | OK |
|---|---|---|---|
| headDetails | `OTSv1.1` / `AUTH` / `FLASH` | same | ✓ |
| merchDetails | merchId, userId, password, merchTxnId, merchTxnDate `YYYY-MM-DD HH:mm:ss` | same; date in Asia/Kolkata | ✓ |
| payDetails | amount, product, custAccNo, txnCurrency | amount as 2-decimal string, `INR` | ✓ |
| custDetails | custEmail, custMobile | validated | ✓ |
| extras | udf1–udf5 | empty strings | ✓ |
| payModeSpecificData.subChannel | **optional string**, "controls which payment options are displayed" | omitted when `ATOM_SUB_CHANNEL` is empty; plain string otherwise | ✓ |

The invalid sample `"subChannel": { "NB" }` is not used. The code rejects object values, and a test covers it. Forcing `NB` (or any value) would **restrict** the checkout to that one channel, so it must stay empty to show all modes.

## F. Merchant configuration

| Item | Code / example | Live (Dokploy) |
|---|---|---|
| MID | `ATOM_MERCH_ID` (858781 per checklist) | **verify** |
| Auth host | `payment1.atomtech.in/ots/aipay/auth` (enforced) | enforced at boot |
| Checkout CDN | `psa.atomtech.in/.../atomcheckout.js` (enforced) | enforced at boot |
| `ATOM_CHECKOUT_ENV` | `prod` (enforced) | enforced at boot |
| Product | `ProductID` wins, else `ATOM_PRODUCT` | **verify it resolves to `NAGAR`** |
| `ATOM_SUB_CHANNEL` | empty = all modes | **verify it is empty** |
| `ATOM_CUST_ACC_NO` | required | **verify it is NTT-issued, not the kit sample** |

Local `apps/api/.env` is UAT/sandbox (`PAYMENT_PROVIDER=sandbox`, paynetzuat, `ATOM_CHECKOUT_ENV=uat`). That is correct for development and has no effect on production. No secrets were read out or logged.

## G. Code changes

| File | Change |
|---|---|
| `apps/api/src/config/atom-env.ts` | New `describeAtomRuntimeConfig(env)`: one line of **non-secret** settings: provider, product code and its source variable, subChannel, custAccNo set/missing, auth host, CDN host, checkoutEnv. No password, keys, MID or account number. |
| `apps/api/src/main.ts` | Logs `Atom config: …` once at startup. |
| `apps/api/src/config/atom-env.spec.ts` | New tests: correct product source; secrets never appear in the line. |

No changes to the AUTH payload, amounts, tax logic, encryption or transaction records. **Why only logging:** no application defect was confirmed, and the likely suspects are environment values that only you can change in Dokploy.

## H. Test results

- `npx jest src/payments src/config src/public-property-tax`: **21 suites, 173 tests, all passed** (includes AUTH payload shape, AES, HMAC, callback, idempotency, safety, env validation).
- `tsc --noEmit`: no errors in changed files. 24 existing errors in unrelated spec files (`reports/ward-tax-report-excel.spec.ts`, `test/*.e2e-spec.ts`) were already there before this change.
- **Not done:** live checkout render, any payment-mode test, any payment flow (success/failure/pending/receipt/reconciliation). **None verified.**

## Next steps (in order)

1. **Dokploy → api → Environment:** confirm `ProductID=NAGAR` (or `ATOM_PRODUCT=NAGAR`) and `ATOM_SUB_CHANNEL=` (empty). If `ATOM_SUB_CHANNEL=UP`, or product resolves to `NSE`, fix it and redeploy. After deploying this change, the startup log line `Atom config: product=… subChannel=…` confirms the effective values.
2. **Dokploy → api logs:** search `atom.auth` for the failing transaction and note `merchTxnId`, `gatewayStatusCode` and `payModeSpecificData`.
3. **One authorized live check:** open checkout for one property and capture HAR + console (including the `psa.atomtech.in` frame context). Close the popup without paying. This creates an `INITIATED` row and blocks that property for the in-progress window.
4. If 1–3 show `product=NAGAR`, no subChannel, `mconfig` OTS0000 and still no modes → send section I to Atom.

## I. Atom support escalation (fill in from step 2–3)

> **Subject:** MID 858781 — AIPay checkout opens, payment-mode list empty (production)
>
> - Merchant ID: 858781 (NAGAR PANCHAYAT CHHATA)
> - Product code sent in AUTH: `NAGAR` *(confirm)*
> - `payModeSpecificData`: not sent (all enabled modes requested) *(confirm)*
> - merchTxnId: `__________` · Timestamp (IST, +05:30): `__________`
> - Amount: `__________` INR · atomTxnId (if any): `__________`
> - AUTH: HTTP `___`, token issued: yes
> - `aipay/mconfig`: HTTP `___`, `txnStatusCode` OTS0000 (checkout header rendered)
> - `AtomInstaPay/checkout-frame.jsp`: HTTP `___`; frame console errors: `__________`
> - Browser / OS: `__________`
> - Symptom: header, amount, customer details and timer render; no payment instruments are listed.
> - Request: please confirm the payment modes (CC, DC, UPI QR, UPI Intent, NB, EMI) are mapped to **product NAGAR** on MID 858781 in production, and check the mconfig response for this token.
>
> *(No passwords, keys, full customer details or card data included.)*
