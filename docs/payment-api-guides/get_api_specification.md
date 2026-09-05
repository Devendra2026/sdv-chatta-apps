# Atom Payment Gateway API Specification

## **Endpoint List**

### **1. Get Atomtoken ID API**
```yaml
Purpose: Payment token ID acquisition
Method: POST
UAT: https://paynetzuat.atomtech.in/ots/aipay/auth
PROD: https://payment1.atomtech.in/ots/aipay/auth
```

### **2. Get Transaction Status API**
```yaml
Purpose: Transaction status confirmation
Method: POST
UAT: https://paynetzuat.atomtech.in/ots/v2/payment/status
PROD: https://payment1.atomtech.in/ots/v2/payment/status
```

### **3. Callback API**
```yaml
Purpose: Payment completion notification reception
Method: POST
UAT: https://paynetzuat.atomtech.in/
PROD: https://payment1.atomtech.in/
```

### **4. Product Sample Refund Request API**
```yaml
Purpose: Refund execution
Method: POST
UAT: https://caller.atomtech.in/ots/payment/refund
PROD: https://payment.atomtech.in/ots/payment/refund
```

### **5. Get Refund Status API**
```yaml
Purpose: Refund status confirmation
Method: POST
UAT: https://caller.atomtech.in/ots/payment/status
PROD: https://payment1.atomtech.in/ots/payment/status
```

---

## **Payload & Response Specifications**

### **1. Get Atomtoken ID API**

#### **Request Payload Example (Single Product)**
```json
{
  "payInstrument": {
    "headDetails": {
      "api": "AUTH",
      "version": "OTSv1.1",
      "platform": "FLASH"
    },
    "merchDetails": {
      "merchId": "317157",
      "userId": "123",
      "password": "Test@123",
      "merchTxnId": "Test123450",
      "merchTxnDate": "2023-07-13 20:46:00"
    },
    "payDetails": {
      "amount": 1,
      "product": "NSE",
      "custAccNo": "213232323",
      "txnCurrency": "INR"
    },
    "custDetails": {
      "custEmail": "testuser@nttdata.com",
      "custMobile": "9797979797"
    },
    "extras": {
      "udf1": "-",
      "udf2": "-",
      "udf3": "-",
      "udf4": "-",
      "udf5": "-"
    },
    "payModeSpecificData": {
      "subChannel": "NB"
    }
  }
}
```

#### **Request Payload Example (Multiple Products)**
```json
{
  "payInstrument": {
    "headDetails": {
      "api": "AUTH",
      "version": "OTSv1.1",
      "platform": "FLASH"
    },
    "merchDetails": {
      "merchId": "317157",
      "userId": "123",
      "password": "Test@123",
      "merchTxnId": "Test123450",
      "merchTxnDate": "2023-07-13 20:46:00"
    },
    "payDetails": {
      "amount": 23.00,
      "prodDetails": [
        {
          "prodName": "NSE",
          "prodAmount": 11.00
        },
        {
          "prodName": "BSE",
          "prodAmount": 12.00
        }
      ],
      "custAccNo": "213232323",
      "txnCurrency": "INR"
    },
    "custDetails": {
      "custEmail": "testuser@nttdata.com",
      "custMobile": "9797979797"
    },
    "extras": {
      "udf1": "-",
      "udf2": "-",
      "udf3": "-",
      "udf4": "-",
      "udf5": "-"
    },
    "payModeSpecificData": {
      "subChannel": "NB"
    }
  }
}
```

**⚠️ Important:** When using `prodDetails` for multiple products:
- The `product` field must be **omitted** (replaced by `prodDetails`)
- The sum of all `prodAmount` values must equal the total `amount` to be paid
- Use `prodDetails` when payment needs to be distributed across multiple products

#### **TypeScript Type Definition (Single Product)**
```typescript
interface AuthPayloadSingleProduct {
  payInstrument: {
    headDetails: {
      api: string;                    // API Name
      platform: string;              // Platform Name
      version: string;                // Version of the API
    };
    merchDetails: {
      merchId: string;                // NDPS Merchant MID (max 10 chars)
      password: string;               // Transaction Password (max 80 chars)
      merchTxnId: string;             // Unique Transaction Reference (max 50 chars)
      merchTxnDate: string;           // YYYY-MM-DD hh:mm:ss (max 19 chars)
      userId?: string;                // Customer User ID (max 45 chars)
    };
    payDetails: {
      amount: number;                 // Total Amount (max 10 digits prior to decimal)
      product: string;                // Settlement account number (max 50 chars)
      txnCurrency: string;            // Currency Type (max 5 chars)
      custAccNo?: string;             // Customer account (max 45 chars, TPV only)
    };
    custDetails: {
      custEmail: string;              // Email (max 100 chars, email format)
      custMobile: string;             // Mobile (max 20 chars)
    };
    extras?: {
      udf1?: string;                  // User Defined Parameter 1 (max 45 chars)
      udf2?: string;                  // User Defined Parameter 2 (max 45 chars)
      udf3?: string;                  // User Defined Parameter 3 (max 45 chars)
      udf4?: string;                  // User Defined Parameter 4 (max 45 chars)
      udf5?: string;                  // User Defined Parameter 5 (max 45 chars)
    };
    payModeSpecificData?: {
      subChannel?: string;            // Payment mode (max 40 chars) - See SubChannel Values below
    };
  };
}
```

#### **TypeScript Type Definition (Multiple Products)**
```typescript
interface AuthPayloadMultipleProducts {
  payInstrument: {
    headDetails: {
      api: string;                    // API Name
      platform: string;              // Platform Name
      version: string;                // Version of the API
    };
    merchDetails: {
      merchId: string;                // NDPS Merchant MID (max 10 chars)
      password: string;               // Transaction Password (max 80 chars)
      merchTxnId: string;             // Unique Transaction Reference (max 50 chars)
      merchTxnDate: string;           // YYYY-MM-DD hh:mm:ss (max 19 chars)
      userId?: string;                // Customer User ID (max 45 chars)
    };
    payDetails: {
      amount: number;                 // Total Amount (max 10 digits prior to decimal)
      prodDetails: Array<{            // Product details array - sum of prodAmount must equal amount
        prodName: string;             // Product name (max 50 chars)
        prodAmount: number;           // Product amount
      }>;
      txnCurrency: string;            // Currency Type (max 5 chars)
      custAccNo?: string;             // Customer account (max 45 chars, TPV only)
    };
    custDetails: {
      custEmail: string;              // Email (max 100 chars, email format)
      custMobile: string;             // Mobile (max 20 chars)
    };
    extras?: {
      udf1?: string;                  // User Defined Parameter 1 (max 45 chars)
      udf2?: string;                  // User Defined Parameter 2 (max 45 chars)
      udf3?: string;                  // User Defined Parameter 3 (max 45 chars)
      udf4?: string;                  // User Defined Parameter 4 (max 45 chars)
      udf5?: string;                  // User Defined Parameter 5 (max 45 chars)
    };
    payModeSpecificData?: {
      subChannel?: string;            // Payment mode (max 40 chars) - See SubChannel Values below
    };
  };
}
```

#### **Union Type for Both Scenarios**
```typescript
type AuthPayload = AuthPayloadSingleProduct | AuthPayloadMultipleProducts;
```

#### **SubChannel Parameter Values**

The `subChannel` parameter in `payModeSpecificData` controls which payment options are displayed to customers. **Only the following values are accepted:**

| Value | Payment Option | Description |
|-------|---------------|-------------|
| `NB` | Net Banking | Shows only Net Banking as payment option |
| `CC` | Credit Card | Shows only Credit Card as payment option |
| `DC` | Debit Card | Shows only Debit Card as payment option |
| `MW` | Wallet | Shows only Wallet as payment option |
| `PP` | PhonePe | Shows only PhonePe as payment option |
| `PW` | Paytm Wallet | Shows only Paytm Wallet as payment option |
| `EM` | EMI | Shows only EMI as payment option |
| `NR` | Challan | Shows only Challan as payment option |
| `BQ` | BharatQR | Shows only BharatQR as payment option |
| `UP` | UPI | Shows only Unified Payment Interface (UPI) as payment option |

**⚠️ Important:** Any value other than the ones listed above will result in a validation error. The API will reject the request if an invalid `subChannel` value is provided.

#### **Success Response (200)**
```typescript
interface AuthSuccessResponse {
  atomTokenId: number;              // Example: 15000000033303
  responseDetails: {
    txnMessage: string;             // "SUCCESS"
    txnStatusCode: string;          // "OTS0000"
    txnDescription: string;         // "ATOM TOKEN ID HAS BEEN GENERATED SUCCESSFULLY"
  };
}
```

#### **Error Response**
```typescript
interface AuthErrorResponse {
  encData: string | null;
  txnMessage: string;
  txnStatusCode: string;
  txnDescription: string;
}
```

#### **Possible Status Codes and Messages**
| S.No. | txnStatusCode | txnMessage | txnDescription |
|-------|---------------|------------|----------------|
| 1 | OTS0000 | SUCCESS | ATOM TOKEN ID HAS BEEN GENERATED |
| 2 | OTS0451 | FAILED | INVALID MERCHANT INFORMATION |
| 3 | OTS0600 | FAILED | AUTH SERVICE FAILED |
| 4 | OTS0600 | FAILED | VALIDATION FAILED |
| 5 | OTS0600 | FAILED | TOKEN GENERATION FAILED |

---

### **2. Get Transaction Status API**

#### **Request Payload**
```json
{
  "payInstrument": {
    "payDetails": {
      "amount": 1,
      "signature": "ccfe5e82ecd513a866ef95bb4f462f7912cb8f4ca785a9fd9fb02e64f2a9e4cbe67788512f5a0bbadd81206b84d80a54a62c300eb8f8164182abe54fab71e1cd",
      "txnCurrency": "INR"
    },
    "merchDetails": {
      "merchId": 317157,
      "merchTxnId": "63d12a8782587dda",
      "merchTxnDate": "2024-01-16"
    }
  }
}
```

#### **TypeScript Type Definition**
```typescript
interface TransactionStatusPayload {
  payInstrument: {
    payDetails: {
      amount: number;                 // Total Amount (max 12,2 characters)
      signature: string;              // NDPS signature (max 256 chars)
      txnCurrency: string;            // Currency Type (max 5 chars)
    };
    merchDetails: {
      merchId: number;                // NDPS Merchant ID (max 10 chars)
      merchTxnId: string;             // Merchant Transaction ID (max 50 chars)
      merchTxnDate: string;           // Date in yyyy-MM-dd format (max 10 chars)
    };
  };
}
```

#### **Success Response**
```typescript
interface TransactionStatusResponse {
  payInstrument: {
    payDetails: {
      amount: number;
      product: string;
      atomTxnId: number;              // Important: Used for refund
      prodDetails: Array<{
        prodName: string;
        prodAmount: number;
      }>;
      totalAmount: number;
      surchargeAmount: number;
    };
    merchDetails: {
      merchId: number;
      clientCode: string;
      merchTxnId: string;
      merchTxnDate: string;
    };
    responseDetails: {
      message: string;
      statusCode: string;             // OTS0000 = Success
      description: string;
    };
    settlementDetails: {
      reconStatus: string;            // RS, RNS, NRNS, PNRNS, PNRS
    };
    payModeSpecificData: {
      subChannel: string;
      bankDetails: {
        bankTxnId: string;
        otsBankName: string;
      };
    };
  };
}
```

---

### **3. Callback API**

#### **Response Structure**
```typescript
interface CallbackResponse {
  payInstrument: {
    payDetails: {
      amount: number;
      atomTxnId: number;              // Important: Used for refund
      custAccNo: string;
      clientCode: string;
      prodDetails: Array<{
        prodName: string;
        prodAmount: number;
      }>;
      totalAmount: number;
      txnInitDate: string;
      surchargeAmount: number;
      txnCompleteDate: string;
      signature: string;              // Important: Verification required
    };
    merchDetails: {
      merchId: number;
      merchTxnId: string;
      merchTxnDate: string;
    };
    responseDetails: {
      message: string;
      statusCode: string;             // OTS0000 = Success
      description: string;
    };
    payModeSpecificData: {
      subChannel: string;
      bankDetails: {
        bankTxnId: string;
        otsBankId: string;
        otsBankName: string;
      };
      cardDetails: {
        cardScheme: string;
        cardMaskNumber: string;
      };
    };
  };
}
```

#### **Status Transition Table**
| Initial Status | Final Status | Timeframe | Description |
|----------------|--------------|-----------|-------------|
| Initiated | Success | Real time | When transaction succeeds |
| Pending | Success | T day | NDPS side pending, bank side success |
| Success | Success | T+1 | Hold after T+1 day adjustment |
| Failed | Failed | T+1 | Failure after T+1 day adjustment |
| Initiated | Failed | T day | Transaction failure on T day |
| Success | Auto reversal | T+2 | Automatic cancellation after T+2 |
| Challan Generated | Pending | T day | Challan generated, unpaid |
| Challan Paid | Success | T day | Challan generated, paid |

---

### **4. Product Sample Refund Request API**

#### **Request Payload**
```json
{
  "payInstrument": {
    "headDetails": {
      "api": "REFUNDINIT",
      "source": "OTS"
    },
    "merchDetails": {
      "merchId": 317157,
      "password": "Test@123",
      "merchTxnId": "6545e02c9d835"
    },
    "payDetails": {
      "atomTxnId": 11000000460337,
      "signature": "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d",
      "prodDetails": [
        {
          "prodName": "NSE",
          "prodRefundId": "refund1",
          "prodRefundAmount": 5
        }
      ],
      "txnCurrency": "INR",
      "totalRefundAmount": 5
    }
  }
}
```

#### **TypeScript Type Definition**
```typescript
interface RefundPayload {
  payInstrument: {
    headDetails: {
      api: string;                    // "REFUNDINIT" for Refund API (max 20 chars)
      source?: string;                // Source identifier
    };
    merchDetails: {
      merchId: number;                // NDPS Merchant ID (max 15 chars)
      password: string;               // Merchant password (max 45 chars)
      merchTxnId: string;             // Merchant Transaction ID (max 50 chars)
    };
    payDetails: {
      atomTxnId: number;              // NDPS Transaction ID (max 14 chars)
      signature: string;              // Signature (max 256 chars)
      prodDetails: Array<{
        prodName: string;
        prodRefundId: string;
        prodRefundAmount: number;
      }>;
      txnCurrency: string;            // Currency code (max 5 chars)
      totalRefundAmount: number;      // Total refund amount (max 12,2 chars)
    };
  };
}
```

#### **Success Response**
```typescript
interface RefundResponse {
  payInstrument: {
    payDetails: {
      atomTxnId: number;
      prodDetails: Array<{
        prodName: string;
        refundTxnId: number;          // Important: Refund transaction ID
        prodRefundId: string;
        prodStatusCode: string;       // OTS0000 = Success
        prodDescription: string;
        prodRefundAmount: number;
      }>;
      txnCurrency: string;
      totalRefundAmount: number;
    };
    responseDetails: {
      message: string;
      statusCode: string;             // OTS0000 = Success
      description: string;
    };
  };
}
```

---

### **5. Get Refund Status API**

#### **Request Payload**
```json
{
  "payInstrument": {
    "headDetails": {
      "api": "REFUNDSTATUS",
      "source": "OTS_ARS"
    },
    "merchDetails": {
      "merchId": 317157,
      "password": "VGVzdEAxMjM="
    },
    "payDetails": {
      "atomTxnId": 11000000460337,
      "prodDetails": [
        {
          "prodName": "NSE"
        }
      ]
    }
  }
}
```

#### **TypeScript Type Definition**
```typescript
interface RefundStatusPayload {
  payInstrument: {
    headDetails: {
      api: string;                    // "REFUNDSTATUS" fixed (max 20 chars)
      source: string;                 // "OTS_ARS" fixed
    };
    merchDetails: {
      merchId: number;                // NDPS Merchant ID (max 15 chars)
      password: string;               // Base64 encoded password (max 50 chars)
    };
    payDetails: {
      atomTxnId: number;              // Merchant Transaction ID (max 50 chars)
      prodDetails: Array<{
        prodName: string;
      }>;
    };
  };
}
```

#### **Success Response**
```typescript
interface RefundStatusResponse {
  payInstrument: {
    payDetails: {
      atomTxnId: number;
    };
    responseDetails: {
      message: string;
      statusCode: string;             // OTS0000 = Success
      description: string;
    };
    refundStatusDetails: Array<{
      prodName: string;
      refundStatus: Array<{
        remarks: string;
        refundAmt: number;
        refundTxnId: number;
        prodRefundId: string;
        refundInitiatedDate: string;
      }>;
    }>;
  };
}
```

---

## **Signature Generation Rules**

### **Transaction Status API Signature**
```
Signature string = merchID + merchTxnID + amount + txnCurrency
```

### **Refund API Signature**
```
Signature string = merchId + password + merchTxnId + total amount + txnCurrency + api
```

### **Callback Signature Verification**
```
Signature string = merchId + atomTxnId + merchTxnId + totalAmount.toFixed(2) + statusCode + subChannel[0] + bankTxnId
```

---

## **Common Information**

### **ReconStatus Value Details**
- **RS**: Reconciled Settled (Reconciled and settled)
- **RNS**: Reconciled Not Settled (Reconciled but not settled)
- **NRNS**: Not Reconciled Not Settled (Not reconciled and not settled)
- **PNRNS**: Not Reconciled Not Settled (T0 settlement, not reconciled and not settled)
- **PNRS**: Payment Not Reconciled Settled (Not reconciled but settled)

### **Encryption Key Example**
| MerchId | reqHashKey | respHashKey | encReqKey | encResKey |
|---------|------------|-------------|-----------|-----------|
| 317157 | KEY123657234 | KEYRESP123657234 | A4476C2062FFA58980DC8F79EB6A799E | 75AEF0FA1B94B3C10D4F5B268F757F11 |

### **HTTP Status Codes**
- **200**: Success
- **400**: VALIDATION FAILED
- **401**: AUTH SERVICE FAILED
- **402**: TOKEN GENERATION FAILED
- **403**: INVALID MERCHANT INFORMATION

---

## **Transmission Format**

### **Common for All APIs**
```
Content-Type: application/x-www-form-urlencoded
Body: merchId={Merchant ID}&encData={Encrypted JSON}
```

### **Encryption Process**
1. Stringify JSON payload
2. Encrypt with AES-256-CBC + PBKDF2
3. Output in uppercase hexadecimal
4. URL encode and send

### **Decryption Process**
1. Extract encData parameter
2. Convert from hexadecimal to binary
3. Decrypt with AES-256-CBC + PBKDF2
4. Parse JSON

---

## **Response Format**

### **⚠️ Actual Result: Atom API Implementation Bug**
```
Content-Type: application/json (Incorrect header)
Actual Body: merchId={Merchant ID}&encData={Encrypted JSON} (URL encoded format)
```

#### **Response Processing Steps**
1. **⚠️ Ignore Content-Type header**
2. **Always parse as URL-encoded response using parse_qs()**
3. **Extract `encData` parameter**
4. **Convert from hexadecimal to binary**
5. **Decrypt with AES-256-CBC + PBKDF2**
6. **Decryption result is JSON format data**

### **⚠️ Important Implementation Notes**
- **Response Content-Type is `application/json` but this is incorrect**
- **Actual response**: URL-encoded format (`merchId=317157&encData=...`)
- **Correct implementation**: Always process as URL-encoded format regardless of Content-Type header
- **encData parameter**: Always exists in normal responses
- **Decryption result**: Always JSON format object
- **Error cases**: Error response when encData does not exist
- **UAT environment**: In UAT environment, the following parameters must be set to "NSE" to avoid VALIDATION errors:
  - Get Atomtoken ID API -> product: "NSE"
  - Refund Request API -> prodName: "NSE"
