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

- Auth: `ATOM_AUTH_URL` (UAT default `{ATOM_BASE_URL}/otsv2/aipay/auth`)
- Checkout CDN: `ATOM_CHECKOUT_CDN` (UAT `pgtest.../atomcheckout.js`)
- Widget opens **card / UPI / netbanking** via `new AtomPaynetz(options, 'uat'|'prod')`
- Status/refund: OTS APIs under `{ATOM_BASE_URL}/ots/...`
- Callback: `POST ATOM_CALLBACK_URL` (JSON or `encData` form field)
- Browser return: Atom → `POST/GET .../payments/gateway/return` → 302 → `ATOM_RETURN_URL?merchTxnId=`

Crypto matches official AtomAES (PBKDF2-HMAC-SHA512 + AES-256-CBC, fixed IV 0..15).

Set `PAYMENT_PROVIDER=atom` with UAT/prod credentials. `sandbox` skips the gateway UI (no card/UPI).

Hash Request/Response keys are unused (signature path not required for this kit flow).

## UAT env mapping

| Kit / email field       | Env var                                                     |
| ----------------------- | ----------------------------------------------------------- |
| Payment host (UAT)      | `ATOM_BASE_URL=https://paynetzuat.atomtech.in`              |
| Payment Url             | `ATOM_AUTH_URL=.../otsv2/aipay/auth`                        |
| CDN Link                | `ATOM_CHECKOUT_CDN` + `ATOM_CHECKOUT_ENV=uat`               |
| Merch ID                | `ATOM_MERCH_ID`                                             |
| Transaction Password    | `ATOM_PASSWORD`                                             |
| Secret Key              | `ATOM_API_SECRET_KEY`                                       |
| Product (NSE / BSE)     | `ATOM_PRODUCT`                                              |
| AES Request Key / Salt  | `ATOM_AES_REQUEST_KEY` / `ATOM_AES_REQUEST_IV`              |
| AES Response Key / Salt | `ATOM_AES_RESPONSE_KEY` / `ATOM_AES_RESPONSE_IV`            |
| —                       | `PAYMENT_PROVIDER=atom`                                     |
| Citizen UI return       | `ATOM_RETURN_URL` (apps/web `/propertytax/payment/return`)  |
| Server callback         | `ATOM_CALLBACK_URL`                                         |
| Browser return (API)    | `ATOM_GATEWAY_RETURN_URL` (optional; derived from callback) |

Production uses the same variables with production host, CDN, `ATOM_CHECKOUT_ENV=prod`, and live credentials.
