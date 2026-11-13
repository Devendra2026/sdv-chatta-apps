# NTT DATA Atom AUTH JSON comparison

Date: 2026-11-13  
Scope: Chhata municipal payments (`apps/api` Atom AIPay AUTH, `apps/web` checkout)  
Production AUTH was **not** called. No live charge was created. Findings come from the request builder, saved Atom guides in `docs/payment-api-guides/`, the merchant sample in this task, and mocked unit tests.

## Comparison

| Parameter | Atom Sample | Chhata Actual | Status | Fix |
|---|---|---|---|---|
| version | OTSv1.1 | `OTSv1.1` string | Match | None |
| api | AUTH | `AUTH` string | Match | None |
| platform | FLASH | `FLASH` string | Match | None |
| merchId | Sample 8952 | Configured `ATOM_MERCH_ID` string. Production example documents `858781`. Local `apps/api/.env` is blank. | Merchant-specific | Verify 858781 in Dokploy. Code does not hardcode 8952 or 317157. |
| userId | Sample empty | `""` | Match | None |
| password | Sample value | `ATOM_PASSWORD` inside the encrypted body | Match (redacted) | None. Sample password is not used. |
| merchTxnId | Sample static | `CHH-<epoch ms>-<8 hex>` from `newCitizenMerchTxnId`, max 50, unique in Postgres | Match (generated) | None |
| merchTxnDate | Sample date | `YYYY-MM-DD HH:mm:ss` in Asia/Kolkata from `formatAtomMerchTxnDate` | Match | None |
| amount | 5.00 | Two-decimal string from the payable amount, e.g. `"1500.50"` | Match | None |
| product | NSE | `ProductID` if set, otherwise `ATOM_PRODUCT`. Production example sets `ProductID=NAGAR` so NSE does not win. | Merchant-specific | None |
| custAccNo | Sample account | `ATOM_CUST_ACC_NO` | Match (redacted) | Confirm the live account string is set in Dokploy. |
| txnCurrency | INR | `INR` | Match | None |
| custEmail | Sample email | Payer email, validated, max 100 | Match (masked) | None |
| custMobile | Sample mobile | Exactly 10 digits from the payer | Match (masked) | None |
| extras | UDF1–UDF5 | `udf1`–`udf5` present as empty strings | Match | None |
| subChannel | Invalid sample syntax `{ "NB" }` | Omitted when `ATOM_SUB_CHANNEL` is empty. If set, a string code such as `NB` or `UP`. Object form is rejected. | Optional; omit for all modes | None in code. Keep production `ATOM_SUB_CHANNEL` empty. |

## 1. Existing JSON before correction (sanitized)

Captured from `buildAipayAuthPayload` with a blank sub-channel (the production example setting). Secrets and customer values are placeholders.

```json
{
  "payInstrument": {
    "headDetails": {
      "version": "OTSv1.1",
      "api": "AUTH",
      "platform": "FLASH"
    },
    "merchDetails": {
      "merchId": "<ATOM_MERCH_ID>",
      "userId": "",
      "password": "[redacted]",
      "merchTxnId": "CHH-<epochMs>-<8 hex>",
      "merchTxnDate": "YYYY-MM-DD HH:mm:ss"
    },
    "payDetails": {
      "amount": "5.00",
      "product": "<ProductID or ATOM_PRODUCT>",
      "custAccNo": "[redacted]",
      "txnCurrency": "INR"
    },
    "custDetails": {
      "custEmail": "[masked]",
      "custMobile": "[masked]"
    },
    "extras": {
      "udf1": "",
      "udf2": "",
      "udf3": "",
      "udf4": "",
      "udf5": ""
    }
  }
}
```

`payModeSpecificData` is absent in this body. A non-empty `ATOM_SUB_CHANNEL` adds `"payModeSpecificData": { "subChannel": "<code>" }`.

## 2. Corrected JSON

No request-builder change. The JSON after audit is the same sanitized body as above.

## 3. Exact mismatch list

No structural defect against the merchant AUTH sample.

Differences that are correct merchant or runtime values:

- `merchId` comes from `ATOM_MERCH_ID`, not sample `8952`.
- `password` and `custAccNo` come from environment variables.
- `product` is the settlement product (`ProductID`, live value `NAGAR` in the production example), not kit product `NSE`.
- `merchTxnId` and `merchTxnDate` are generated per payment.
- `amount`, `custEmail`, and `custMobile` come from the citizen payment.
- `payModeSpecificData` is omitted unless a channel restriction is configured.

Documented Atom examples disagree with each other on two points. This build follows the merchant sample named in the task:

- `docs/payment-api-guides/get_api_specification.md` types `payDetails.amount` as a number and shows `1` / `23.00`. The merchant sample, `docs/payments/Sample String Format.txt`, and `docs/payment-api-guides/get_error_codes.md` use a string (`"5.00"`, `'100'`, `"319"`). The builder sends a two-decimal string.
- The same specification example includes `payModeSpecificData.subChannel`. That field is marked optional and, when present, limits the checkout to one mode. The invalid fragment `{ "subChannel": { "NB" } }` is not valid JSON and is not sent.

## 4. Root causes

There is no AUTH JSON defect to correct. An earlier integration had forced `subChannel: "UP"`, which would hide card, net banking, and EMI. Current `resolveAtomSubChannel` returns an empty string when `ATOM_SUB_CHANNEL` is unset, and `buildAipayAuthPayload` then omits `payModeSpecificData`.

What still depends on deployment, not on this JSON builder:

- Local `apps/api/.env` uses `PAYMENT_PROVIDER=sandbox` and blank Atom credentials. It is not the production merchant configuration.
- `.env.production.example` leaves secrets empty on purpose and tells operators to set `ATOM_MERCH_ID=858781` only in Dokploy. This workspace cannot see Dokploy, so the live MID was not confirmed here.

## 5. Files modified

- `apps/api/src/payments/providers/atom-auth-payload.spec.ts` — extra assertions for the production-shaped body, numeric amount, amount scale, country-code mobile, and duplicate merchant transaction ids.
- `NTT_ATOM_JSON_COMPARISON_REPORT.md` — this report.

`atom-ndps.provider.ts`, AES, checkout, and environment examples were not changed.

## 6. Tests executed and results

Command:

```text
pnpm --filter api exec jest src/payments/providers/atom-auth-payload.spec.ts src/payments/atom-aes.spec.ts src/payments/payments.callback.spec.ts src/payments/payments.safety.spec.ts src/payments/providers/atom-hmac.spec.ts src/payments/providers/atom-diagnostics.spec.ts src/config/validate-env.spec.ts --no-coverage
```

Result: **7 suites, 91 tests, all passed.**

`eslint src/payments/providers/atom-auth-payload.spec.ts --max-warnings 0` passed.

Covered by those suites:

- JSON hierarchy, including MID `858781`, product `NAGAR`, string amount `"5.00"`, empty UDFs, and no `payModeSpecificData`
- Missing merchant, product, account, email, and mobile
- Invalid email and non-10-digit mobile
- Numeric amount and amount `"5"` rejected by `assertAipayAuthPayload`
- Amount over 10 digits before the decimal
- Object-shaped `subChannel` rejected
- Merchant id taken from config (sample `8952` / `317157` / `NSE` / sample password not injected)
- Duplicate `merchTxnId` only when clock and suffix match; Postgres `Payment.merchTxnId` is `@unique`
- AES round-trip with the published kit key pair (not production secrets)
- AUTH network failure, malformed response, token present on `OTS0000`, token absent on `OTS0600`
- Callback amount check, pending-to-success, no success downgrade, duplicate callback key

Full-repo `pnpm typecheck` was not run. Application TypeScript did not change, and Jest compiled the updated spec.

## 7. API response verification

Production AUTH was **not** called. Tests stub `fetch`. Token success and failure were verified only against encrypted mock responses using the published kit response key.

## 8. Remaining gateway-side issues

- Confirm Dokploy has `ATOM_MERCH_ID=858781`, a non-blank `ATOM_PASSWORD`, `ATOM_CUST_ACC_NO`, `ProductID=NAGAR`, 32-hex `ATOM_AES_REQUEST_IV` and `ATOM_AES_RESPONSE_IV`, and both hash keys. This repo’s local `.env` does not contain those values.
- Leave `ATOM_SUB_CHANNEL` empty. Any code (`UP`, `NB`, `CC`, `DC`, `EM`, …) restricts checkout to that one mode.
- Atom’s sub-channel table has one UPI code, `UP`. UPI QR and UPI Intent are separate instruments on the MID and in `atomcheckout.js`. AUTH cannot list them as six separate `subChannel` values. Cards, UPI, net banking, and EMI appear together only when the field is omitted and the MID has them enabled.
- EMI, UPI Intent, and QR can still be hidden by Atom for amount, bank, device, or browser reasons. The website does not filter modes.
- Status and refund signatures use a whole-rupee integer, which matches `docs/payment-api-guides/get_signature_guide.md`. AUTH itself sends paise as a two-decimal string. Requery of a paise amount therefore signs the floored rupee. That behavior was left unchanged.

## 9. Audit map

| Step | Location |
|---|---|
| Citizen payment start | `PublicPropertyTaxController.createPayment` → `PublicPropertyTaxService.createPayment` (`POST /api/v1/public/property-tax/payments`) |
| Pending row + gateway call | `PaymentsService.createCitizenOnline` → `createOnlinePayment` |
| JSON construction | `buildAipayAuthPayload` |
| Schema check before encrypt | `assertAipayAuthPayload` (also called again in `AtomNdpsProvider.createPayment`) |
| Encryption | `atomAesEncrypt` via `AtomNdpsProvider.encryptRequest` |
| AUTH HTTP call | `AtomNdpsProvider.createPayment` — `POST` form body `encData` + `merchId` to `ATOM_AUTH_URL` or `{ATOM_BASE_URL}/ots/aipay/auth` |
| Response decrypt | `decodeAipayAuthResponse` → `decryptPayload` → `atomAesDecrypt` |
| Token to the browser | `extractAtomTokenId`; `PublicPropertyTaxService.createPayment` returns `checkout.atomTokenId` with `merchId`, email, mobile, `returnUrl`, CDN, and `uat`/`prod` |
| Checkout | `openAtomAipayCheckout` → `new AtomPaynetz(options, env)`. No mode filter. |
| Success and failure | Encrypted callback `PaymentsService.handleCallback`. Amount must match. `OTS0000` / `SUCCESS` sets `SUCCESS` and writes one receipt. Other known failures set `FAILED`. Duplicates return `duplicate: true`. Return page `apps/web/app/(web)/propertytax/payment/return/page.tsx` loads status with `sync=true`, which requeries while the payment is still pending. |
| Config | `resolveAtomProduct`, `resolveAtomCustAccNo`, `resolveAtomSubChannel`, `resolveAtomAesPair` in `apps/api/src/config/atom-env.ts`; production checks in `validate-env.ts` |

Water tax is part of the same house-tax demand total. There is one AUTH amount and one settlement `product`. It is not a second Atom product code.

## 10. Is `payModeSpecificData` required?

No, not for an AUTH request that should offer every method enabled on the MID.

Evidence:

- `docs/payment-api-guides/get_api_specification.md`: `payModeSpecificData` is optional. `subChannel` is a string. Allowed codes include `NB`, `CC`, `DC`, `EM`, and `UP`. Any other value is a validation error. The text says the field controls which **single** option is displayed.
- `docs/payment-api-guides/get_error_codes.md`: “subChannel: Optional (restricts payment methods when specified).”
- The merchant sample in this task has no `payModeSpecificData`. The extra fragment `"subChannel": { "NB" }` is invalid JSON. `assertAipayAuthPayload` rejects a non-string `subChannel`.
- NTT’s Android kit sets `subChannel` only “to show any specific payment mode.”
- The public Laravel AIPay sample omits the object and still requests an Atom token.

Chhata therefore sends the field only when `ATOM_SUB_CHANNEL` is an allowed code. Production should leave that variable empty so credit card, debit card, UPI, net banking, and EMI stay available according to the MID.

## Config check (no secret values)

| Key | Local `apps/api/.env` | `.env.production.example` |
|---|---|---|
| `PAYMENT_PROVIDER` | `sandbox` | `atom` |
| `ATOM_MERCH_ID` | Empty. Does not match `858781`. | Empty placeholder. Comment says set `858781` in Dokploy only. |
| `ATOM_PASSWORD` | Empty | Empty placeholder |
| `ATOM_CUST_ACC_NO` | Key absent | Empty placeholder |
| `ProductID` / `ATOM_PRODUCT` | Both absent / empty | `NAGAR` / `NSE` (`ProductID` wins) |
| AES request and response material | Empty | Empty placeholders |
| Hash keys | Empty | Empty placeholders |
| `ATOM_AUTH_URL` | UAT `paynetzuat.atomtech.in` | `https://payment1.atomtech.in/ots/aipay/auth` |
| `ATOM_CHECKOUT_ENV` / CDN | `uat` / pgtest CDN | `prod` / `https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js` |
| `ATOM_SUB_CHANNEL` | Empty | Empty |

## Encryption check

`atom-aes.ts` matches `docs/payment-api-guides/get_encryption_specification.md`: AES-256-CBC, PKCS7, PBKDF2-HMAC-SHA512, 65,536 iterations, fixed IV bytes 0 through 15, uppercase hex ciphertext. The 32-hex merchant string is the PBKDF2 password and salt unless a distinct `ATOM_AES_*_KEY` is set. AUTH does not add an HMAC; signatures apply to status, refund, and callback. Those parameters were not changed.
