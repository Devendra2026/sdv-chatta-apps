# Atom Payment Gateway Diagnostic Report

**Project:** Nagar Panchayat Chhata  
**Website:** https://npchhata.com  
**Gateway:** NTT DATA Atom / Atom Technologies (AIPay / NDPS OTS)  
**Expected production MID:** 858781  
**Report date:** 2026-11-13  
**Scope:** Application-side investigation and fixes only. No live production charges were executed in this workspace.

---

## A. Merchant Configuration

| Item                              | Value                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Expected MID                      | `858781` (Dokploy `ATOM_MERCH_ID`; not committed)                                                                                    |
| Kit sample MIDs (do not use live) | `317157` (UAT docs), `8952` (vendor sample)                                                                                          |
| Environment separation            | UAT: `paynetzuat.atomtech.in` + `ATOM_CHECKOUT_ENV=uat`; Prod: `payment1.atomtech.in` + `psa.atomtech.in` + `ATOM_CHECKOUT_ENV=prod` |
| API version                       | `OTSv1.1` / `AUTH` / platform `FLASH`                                                                                                |
| Product                           | `ProductID` wins over `ATOM_PRODUCT` (live product `NAGAR`)                                                                          |
| Customer account                  | `ATOM_CUST_ACC_NO` (required on AUTH)                                                                                                |
| Channel filter                    | `ATOM_SUB_CHANNEL` empty = all merchant-enabled modes; optional `UP`/`NB`/`CC`/`DC`/`EM`/… restricts                                 |
| Checkout SDK                      | `ATOM_CHECKOUT_CDN` → `atomcheckout.js` via `AtomPaynetz(options, env)`                                                              |
| Auth endpoint                     | `{ATOM_AUTH_URL}` or `{ATOM_BASE_URL}/ots/aipay/auth`                                                                                |
| Callback / return                 | `ATOM_CALLBACK_URL`, derived `gateway/return`, citizen `ATOM_RETURN_URL`                                                             |

**Operator action required:** Confirm Dokploy has `ATOM_MERCH_ID=858781` and clear any leftover `ATOM_SUB_CHANNEL=UP` so AUTH omits `payModeSpecificData`.

---

## B. AUTH JSON Comparison

### Existing generated request structure (before fix, production)

```json
{
  "payInstrument": {
    "headDetails": { "version": "OTSv1.1", "api": "AUTH", "platform": "FLASH" },
    "merchDetails": {
      "merchId": "<ATOM_MERCH_ID>",
      "userId": "",
      "password": "REDACTED",
      "merchTxnId": "CHH-<timestamp>-<uuid8>",
      "merchTxnDate": "YYYY-MM-DD HH:mm:ss"
    },
    "payDetails": {
      "amount": "552.39",
      "product": "NAGAR",
      "custAccNo": "REDACTED",
      "txnCurrency": "INR"
    },
    "custDetails": {
      "custEmail": "MASKED",
      "custMobile": "MASKED"
    },
    "extras": { "udf1": "", "udf2": "", "udf3": "", "udf4": "", "udf5": "" },
    "payModeSpecificData": { "subChannel": "UP" }
  }
}
```

### Expected documented structure (all merchant-enabled modes)

Same nesting as above **without** `payModeSpecificData` unless a deliberate channel restriction is configured. Secrets remain redacted.

### Missing / incorrect parameters (application findings)

| Finding                                                                                              | Severity | Status                                                       |
| ---------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| Production forced `subChannel: "UP"` (UPI-only) despite Atom enabling CC/DC/UPI QR/UPI Intent/NB/EMI | High     | Fixed — empty `ATOM_SUB_CHANNEL` omits `payModeSpecificData` |
| Callback amount used only `payDetails.amount`, ignoring `totalAmount` used by HMAC                   | High     | Fixed                                                        |
| Sample MID `8952` / `317157` in vendor docs/tests                                                    | Info     | Documented; not used as live MID in code                     |
| Structured sanitized AUTH diagnostics for Atom support                                               | Medium   | Added                                                        |

### Corrected structure (after fix, default)

```json
{
  "payInstrument": {
    "headDetails": { "version": "OTSv1.1", "api": "AUTH", "platform": "FLASH" },
    "merchDetails": {
      "merchId": "858781",
      "userId": "",
      "password": "REDACTED",
      "merchTxnId": "CHH-…",
      "merchTxnDate": "YYYY-MM-DD HH:mm:ss"
    },
    "payDetails": {
      "amount": "552.39",
      "product": "NAGAR",
      "custAccNo": "REDACTED",
      "txnCurrency": "INR"
    },
    "custDetails": {
      "custEmail": "MASKED",
      "custMobile": "MASKED"
    },
    "extras": { "udf1": "", "udf2": "", "udf3": "", "udf4": "", "udf5": "" }
  }
}
```

---

## C. Transaction Investigation

| Transaction ID | Date | Amount | Mode | Response Code | Status | Error                                                           |
| -------------- | ---- | ------ | ---- | ------------- | ------ | --------------------------------------------------------------- |
| —              | —    | —      | —    | —             | —      | Not available in this workspace (no production DB dump queried) |

Populate this table from sanitized Nest logs (`atom.auth.*`, `atom.callback.*`, `atom.requery`) or `Payment` / `PaymentCallback` rows after deploy. Do not paste passwords, tokens, or full PII.

---

## D. Payment Mode Investigation

| Payment Mode | Enabled by Atom | Visible in Checkout                                     | Tested           | Result                                                                      |
| ------------ | --------------- | ------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| Credit Card  | Yes (per NTT)   | Pending post-deploy (requires empty `ATOM_SUB_CHANNEL`) | Code policy only | App no longer forces UPI-only; live visibility pending UAT/prod observation |
| Debit Card   | Yes (per NTT)   | Pending post-deploy                                     | Code policy only | Same                                                                        |
| UPI QR       | Yes (per NTT)   | Pending post-deploy                                     | Code policy only | Same; device/browser may still gate QR                                      |
| UPI Intent   | Yes (per NTT)   | Pending post-deploy                                     | Code policy only | Same; typically mobile context                                              |
| Net Banking  | Yes (per NTT)   | Pending post-deploy                                     | Code policy only | Same                                                                        |
| EMI          | Yes (per NTT)   | Pending post-deploy                                     | Code policy only | May still be amount/card/bank gated by Atom                                 |

**Do not claim all modes work in production until observed after clearing `ATOM_SUB_CHANNEL`.**

---

## E. Root Cause Analysis

### 1. Missing payment modes

**Cause:** [`resolveAtomSubChannel`](apps/api/src/config/atom-env.ts) defaulted production to `UP`, and [`validate-env.ts`](apps/api/src/config/validate-env.ts) rejected any other value. AUTH then included `payModeSpecificData.subChannel: "UP"`, which Atom documents as UPI-only. Frontend ([`atom-checkout.ts`](apps/web/lib/atom-checkout.ts)) does not filter modes.

**Evidence:** Vendor subChannel table (`NB`/`CC`/`DC`/`UP`/…); production example previously set `ATOM_SUB_CHANNEL=UP`; unit tests previously asserted production default `UP`.

### 2. Callback amount mismatch risk

**Cause:** [`extractAtomTxnFields`](apps/api/src/payments/providers/atom-ndps.provider.ts) ignored `payDetails.totalAmount` while HMAC verification ([`atom-hmac.ts`](apps/api/src/payments/providers/atom-hmac.ts)) requires it. Atom callbacks with only `totalAmount` yielded `gatewayAmount === undefined`, and Atom provider path treated that as `AMOUNT_MISMATCH`.

**Evidence:** Unit tests added for `totalAmount`-only payloads; HMAC signature guide uses `totalAmount`.

### 3. Diagnostics gap for NTT support

**Cause:** Limited redaction (mainly `cardDetails`) and no structured AUTH field diagnostic events.

**Evidence:** Prior `payments.safety` behavior; absence of `atom-diagnostics` module.

### Tax lifecycle

Verified: demand outstanding / receipt snapshot update only inside `applyOnlineSuccessToDemand` on first verified SUCCESS. PENDING/FAILED do not reduce dues. No tax formula changes made.

---

## F. Fixes Applied

| File                                                          | Change                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/api/src/config/atom-env.ts`                             | No production UP default; allowlist of Atom subChannel codes |
| `apps/api/src/config/validate-env.ts`                         | Allow empty or known subChannels; reject unknown             |
| `apps/api/src/config/validate-env.spec.ts`                    | Updated expectations; MID `858781` acceptance                |
| `apps/api/src/payments/providers/atom-ndps.provider.ts`       | `totalAmount` extraction; sanitized AUTH/requery logs        |
| `apps/api/src/payments/providers/atom-diagnostics.ts`         | New sanitized diagnostic helpers                             |
| `apps/api/src/payments/payments.safety.ts`                    | Stronger redaction + PII masking                             |
| `apps/api/src/payments/payments.service.ts`                   | Callback diagnostic logs                                     |
| `apps/api/src/payments/atom-aes.spec.ts`                      | `totalAmount` unit tests                                     |
| `apps/api/src/payments/payments.callback.spec.ts`             | Callback amount/idempotency unit tests                       |
| `apps/api/src/payments/providers/atom-auth-payload.spec.ts`   | Omit subChannel; AUTH timeout/malformed tests                |
| `apps/api/src/payments/providers/atom-diagnostics.spec.ts`    | Diagnostic unit tests                                        |
| `docs/payments/*`, `.env*.example`, `docker-compose.prod.yml` | Docs/env align with all-modes default                        |
| `apps/web/lib/atom-checkout.ts`                               | Comment accuracy                                             |

---

## G. Logs for NTT DATA Support

### How to collect (post-deploy)

1. Clear Dokploy `ATOM_SUB_CHANNEL` (or set empty).
2. Confirm `ATOM_MERCH_ID=858781`.
3. Run one authorized UAT or controlled payment attempt.
4. Export Nest log lines matching:
   - `atom.auth.success` / `atom.auth.token_failed` / `atom.auth.network_error`
   - `atom.callback.processed` / `atom.callback.rejected`
   - `atom.requery`
5. Attach AUTH diagnostic object (`authDiagnostic`) — field presence/types/validation only; password already redacted.

### Sanitized package template

```json
{
  "event": "atom.auth.success",
  "merchTxnId": "CHH-…",
  "atomTxnId": null,
  "merchId": "858781",
  "timestamp": "ISO-8601",
  "amount": 552.39,
  "currency": "INR",
  "endpoint": "aipay/auth",
  "httpStatus": 200,
  "gatewayStatusCode": "OTS0000",
  "tokenGenerated": true,
  "durationMs": 0,
  "authDiagnostic": {
    "structure": "payInstrument",
    "payModeSpecificData": { "present": false },
    "validationOk": true
  }
}
```

**Never include:** merchant password, AES/HMAC keys, OTP, card PAN/CVV, raw `encData`, raw tokens, full email/mobile.

---

## Limitations

- Live checkout mode visibility was not observed against Atom production from this workspace.
- EMI / UPI Intent / UPI QR may still be restricted by Atom eligibility, amount, bank, or device even after AUTH omits `payModeSpecificData`.
- Production transaction table (Section C) requires operator-provided sanitized records.
