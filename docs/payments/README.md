# Nagar Panchayat Chhata — payment gateway documentation

#

# Source: nagarpanchayatchhataaipayv2integrationcaseid3.zip (Atom NDPS / OTS Paynetz)

#

# Documents:

# - Transaction API Non-Seamless V6

# - Transaction Status (Requery) API

# - Callback API (nested Callback_API.zip)

# - Refund API / Refund Status API

# - Settlement API

# - Sample String Format.txt

#

# Sample credentials in these docs are for UAT documentation only.

# Never commit real merchant secrets. Use apps/api/.env (gitignored).

## Integration mode (this repo)

Citizen online tax uses **Atom AIPay** (server auth → `atomTokenId` → CDN `atomcheckout.js`):

- Auth: `ATOM_AUTH_URL` (UAT default `{ATOM_BASE_URL}/ots/aipay/auth`)
- Checkout CDN: `ATOM_CHECKOUT_CDN` (UAT `pgtest.../atomcheckout.js`)
- Widget opens **card / UPI / netbanking** via `new AtomPaynetz(options, 'uat'|'prod')`
- Status/refund: OTS APIs under `{ATOM_BASE_URL}/ots/...`
- Callback: `POST ATOM_CALLBACK_URL` (JSON or `encData` form field)
- Browser return: Atom → `POST/GET .../payments/gateway/return` → 302 → `ATOM_RETURN_URL?merchTxnId=`

Crypto matches official AtomAES (PBKDF2-HMAC-SHA512 + AES-256-CBC, fixed IV 0..15).

Set `PAYMENT_PROVIDER=atom` with UAT/prod credentials. `sandbox` skips the gateway UI (no card/UPI).

`ATOM_RESP_HASH_KEY` verifies callback HMAC-SHA512. Production startup fails if it is blank, so decrypt-only callbacks are not accepted in production. `ATOM_REQ_HASH_KEY` signs status and refund requests. It is a different passphrase from the response hash key and from the AES material.

The AES-CBC IV is the fixed byte sequence 0..15. NTT's kit uses one 32-hex string per direction as both the PBKDF2 password and the PBKDF2 salt. Store that string in `ATOM_AES_REQUEST_IV` / `ATOM_AES_RESPONSE_IV`. Set `ATOM_AES_REQUEST_KEY` / `ATOM_AES_RESPONSE_KEY` only when NTT issued a different key. This protocol does not use `ATOM_API_SECRET_KEY`.

## UAT env mapping

| Kit / email field       | Env var                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Payment host (UAT)      | `ATOM_BASE_URL=https://paynetzuat.atomtech.in`                                          |
| Payment Url             | `ATOM_AUTH_URL=.../ots/aipay/auth`                                                      |
| CDN Link                | `ATOM_CHECKOUT_CDN` + `ATOM_CHECKOUT_ENV=uat`                                           |
| Merch ID                | `ATOM_MERCH_ID`                                                                         |
| Transaction Password    | `ATOM_PASSWORD`                                                                         |
| Product ID              | `ProductID` (wins) or `ATOM_PRODUCT` (live settlement product `NAGAR`)                  |
| Customer account (AUTH) | `ATOM_CUST_ACC_NO` (required; merchant-issued account string on AUTH)                   |
| UPI-only checkout       | `ATOM_SUB_CHANNEL=UP` (string; production default when unset). Not `{ "NB" }`.          |
| Request encryption      | `ATOM_AES_REQUEST_IV` (32 hex, self-salted). Optional distinct `ATOM_AES_REQUEST_KEY`   |
| Response encryption     | `ATOM_AES_RESPONSE_IV` (32 hex, self-salted). Optional distinct `ATOM_AES_RESPONSE_KEY` |
| Request / response HMAC | `ATOM_REQ_HASH_KEY` / `ATOM_RESP_HASH_KEY`                                              |
| Refund URL              | `ATOM_REFUND_URL` (production default `https://payment.atomtech.in/ots/payment/refund`) |
| —                       | `PAYMENT_PROVIDER=atom`                                                                 |
| Citizen UI return       | `ATOM_RETURN_URL` (apps/web `/propertytax/payment/return`)                              |
| Server callback         | `ATOM_CALLBACK_URL`                                                                     |
| Browser return (API)    | `ATOM_GATEWAY_RETURN_URL` (optional; derived from callback)                             |

Production uses the same variables with production host, CDN, `ATOM_CHECKOUT_ENV=prod`, and live credentials. See **Production go-live** below.

## Production go-live (Dokploy)

Citizen checkout runs on the **website** (`PUBLIC_WEB_URL`); the portal is staff-only (offline/list/refunds) against the same API Atom env. Do not point return/callback at the portal.

Copy [`.env.production.example`](../../.env.production.example) into Dokploy → Compose → Environment, then:

1. Set real `PUBLIC_WEB_URL` and `PUBLIC_PORTAL_URL` (HTTPS, no trailing slash).
2. Set `PAYMENT_PROVIDER=atom` and fill live NTT credentials in Dokploy only: `ATOM_MERCH_ID`, `ATOM_PASSWORD`, `ATOM_CUST_ACC_NO`, `ATOM_AES_REQUEST_IV`, `ATOM_AES_RESPONSE_IV`, `ATOM_REQ_HASH_KEY`, and `ATOM_RESP_HASH_KEY`. Set `ProductID=NAGAR` (or `ATOM_PRODUCT=NAGAR` if `ProductID` is empty). `ATOM_SUB_CHANNEL=UP` and `ATOM_REFUND_URL=https://payment.atomtech.in/ots/payment/refund` are applied in production when unset; a different explicit value still fails startup. Production API startup **fails** if a required secret is blank, if AES material is not 32 hex characters, or if `PAYMENT_PROVIDER` is unset/sandbox. Do not add `ATOM_API_SECRET_KEY` unless NTT gives you a separate secret this build does not require.
3. Leave `ATOM_RETURN_URL` / `ATOM_CALLBACK_URL` unset in Dokploy — `docker-compose.prod.yml` derives them from `PUBLIC_WEB_URL` (`https://www.npchhata.com`, no trailing slash):
   - Return page: `{PUBLIC_WEB_URL}/propertytax/payment/return`
   - Server callback: `{PUBLIC_WEB_URL}/api/v1/payments/gateway/callback` (Next.js `/api/*` rewrite → Nest)
   - Browser gateway return (derived): `{PUBLIC_WEB_URL}/api/v1/payments/gateway/return`
4. In the Atom merchant dashboard, allowlist those three website URLs (not portal). MCC `9311` is merchant-profile data and is not sent on the auth request.
5. Prod hosts (already in the example): `payment1.atomtech.in` (auth/status), `psa.atomtech.in` (checkout CDN), `ATOM_CHECKOUT_ENV=prod`.
6. Refunds call `ATOM_REFUND_URL` (`https://payment.atomtech.in/ots/payment/refund`). Confirm that host with NTT if live refunds fail. Do not point refunds at the auth host.
