# Atom Payment Gateway Error Code Dictionary【公式版】

## 📋 **Success Code**

| Code | Message | Description |
|------|---------|-------------|
| `OTS0000` | SUCCESS | TRANSACTION SUCCESSFUL / ATOM TOKEN ID HAS BEEN GENERATED |

---

## 🔑 **Token Generation Errors (AUTH API)**

| Code | Message | Description |
|------|---------|-------------|
| `OTS0000` | SUCCESS | ATOM TOKEN ID HAS BEEN GENERATED |
| `OTS0451` | FAILED | INVALID MERCHANT INFORMATION |
| `OTS0600` | FAILED | AUTH SERVICE FAILED |
| `OTS0600` | FAILED | VALIDATION FAILED |
| `OTS0600` | FAILED | TOKEN GENERATION FAILED |

---

## 💳 **Payment Processing Errors (JavaScript CDN)**

| Code | Message | Description |
|------|---------|-------------|
| `OTS0000` | SUCCESS | TRANSACTION SUCCESSFUL |
| `OTS0601` | FAILED | IN STAGE TWO TRANSACTION, ATOM TXN ID SHOULD NOT BE NULL |
| `OTS0602` | FAILED | INCORRECT SURCHARGE AMOUNT |
| `OTS0603` | FAILED | SUBCHANNEL CAN NOT BE EMPTY |
| `OTS0604` | FAILED | IF SUBCHANNEL IS NB THEN BANK ID SHOULD NOT BE EMPTY |
| `OTS0605` | FAILED | IF SUBCHANNEL IS CC or DC THEN CARD DATA SHOULD NOT BE EMPTY |
| `OTS0606` | FAILED | IF SUBCHANNEL IS UP THEN VPA SHOULD NOT BE EMPTY |
| `OTS0607` | FAILED | IF SUBCHANNEL IS EM THEN EMI DETAILS SHOULD NOT BE EMPTY |
| `OTS0608` | FAILED | IN STAGE TWO TRANSACTION, SUBCHANNEL CAN NOT BE EMPTY |
| `OTS0609` | FAILED | CARD DETAILS ARE MISSING |
| `OTS0610` | FAILED | INVALID EMI TENURE |
| `OTS0611` | FAILED | INVALID EMI BANK NAME |
| `OTS0612` | FAILED | SUMMATION OF AMOUNT & SURCHARGE AMOUNT SHOULD BE EQUAL TO TOTAL AMOUNT |
| `OTS0613` | FAILED | RESPONSE IS ALREADY AVAILABLE IN DB FOR ATOM TXN ID |
| `OTS0614` | FAILED | ATOM's AMOUNT MISMATCHED WITH BANK's AMOUNT |
| `OTS0615` | FAILED | ANY OF THE MANDATORY PARAMETER MUST BE MISSING |
| `OTS0616` | FAILED | INSUFFICIENT MERCHANT INFORMATION |
| `OTS0617` | FAILED | IN STAGE TWO TRANSACTION, DB STAGE SHOULD BE 1 |
| `OTS0618` | FAILED | IN STAGE TWO TRANSACTION, PROVIDED AMOUNT SHOULD BE EQUAL TO DB AMOUNT |
| `OTS0619` | FAILED | SUBCHANNEL & CARD TYPE MISMATCHED |
| `OTS0620` | FAILED | CARD SCHEME MISMATCHED |
| `OTS0621` | FAILED | AMOUNT SHOULD BE WITHIN A RANGE |
| `OTS0622` | FAILED | ACCOUNT DETAILS MANDATORY FOR PENNYDROP |
| `OTS0623` | FAILED | IN SEAMLESS TRANSACTION, WHEN MERCHANT IS ON SURCHARGE THEN SURCHARGE AMOUNT SHOULD |
| `OTS0624` | FAILED | TRANSACTION RESPONSE IS ALREADY AVAILABLE FOR ATOM TXN ID |
| `OTS0625` | FAILED | BANK TXN AMOUNT IS MISMATCHED WITH ATOM TXN AMOUNT |
| `OTS0626` | FAILED | AMOUNT & TOTAL AMOUNT OF ALL PASSED PRODUCTS SHOULD BE EQUAL |
| `OTS0627` | FAILED | INAPPROPRIATE WAY TO CONSUME OTS PAYMENT SERVICE |
| `OTS0628` | FAILED | ATOM TXN ID SHOULD NOT BE EMPTY/NULL IN BANK RESPONSE |
| `OTS0629` | FAILED | IN SEMI-SEAMLESS TRANSACTION, IF IT IS CARD TRANSACTION THEN SURCHARGE AMOUNT SHOULD NOT BE NULL/EMPTY/ZERO |
| `OTS0630` | FAILED | CARD TYPE MISMATCHED |
| `OTS0631` | FAILED | FAILED-INVALID CARD NUMBER |
| `OTS0632` | FAILED | FAILED-CARD EXP MONTH/YEAR SHOULD BE IN PROPER FORMAT |
| `OTS0633` | FAILED | FAILED-CARD IS EXPIRED |
| `OTS0634` | FAILED | FAILED-INVALID CVV |
| `OTS0635` | FAILED | FAILED-TRANSACTION MODE NOT FOUND IN URL PATTERN |
| `OTS0636` | FAILED | FAILED-UNABLE TO DECRYPT CARD DETAILS |
| `OTS0637` | FAILED | FAILED-UNABLE TO DECRYPT ENC DATA |
| `OTS0638` | FAILED | ANY OF THE MANDATORY PARAMETER MUST BE MISSING FROM ENCDATA |
| `OTS0639` | FAILED | FAILED-FUTURE DATE NOT ALLOWED |
| `OTS0640` | FAILED | FAILED-DATE FORMAT MUST BE "+OTSUtil.ATOM_DATE_PATTERN |
| `OTS0641` | FAILED | MERCHID OR ENCDATA MISSING |

---

## 🔧 **公式仕様情報**

### **AUTH API Request Structure**
```json
{
  "payInstrument": {
    "headDetails": {
      "version": "OTSv1.1",
      "api": "AUTH", 
      "platform": "FLASH"
    },
    "merchDetails": {
      "merchId": "317157",
      "userId": "",
      "password": "Test@123",
      "merchTxnId": "019MC6VE42",
      "merchTxnDate": "2024-12-19 06:20:42"
    },
    "payDetails": {
      "amount": "319",
      "product": "NSE",
      "custAccNo": "213232323",
      "txnCurrency": "INR",
      "clientCode": ""
    },
    "custDetails": {
      "custFirstName": "Ravina Solse",
      "custEmail": "hrd-mum789@ai.in",
      "custMobile": "09754564348"
    },
    "payModeSpecificData": {
      "subChannel": "DC"
    },
    "extras": {
      "udf1": "One",
      "udf2": "Two",
      "udf3": "Three",
      "udf4": "Four",
      "udf5": "Five",
      "udf6": "Six",
      "udf7": "Seven",
      "udf8": "Eight",
      "udf9": "Nine",
      "udf10": "Ten"
    }
  }
}
```

### **JavaScript CDN Options**
```javascript
const options = {
  "atomTokenId": "atomTokenId",
  "merchId": "8952",
  "custEmail": "testuser@ndps.in",
  "custMobile": "8888888888",
  "returnUrl": "http://your-response-url/response.php"
};
let atom = new AtomPaynetz(options, 'uat');
```

### **Response Structure Example**
```json
{
  "payInstrument": {
    "merchDetails": {
      "merchId": 317157,
      "merchTxnId": "019MC6VE42",
      "merchTxnDate": "2024-12-19T11:56:37"
    },
    "payDetails": {
      "atomTxnId": 11000000615892,
      "prodDetails": [{"prodName": "NSE", "prodAmount": 319.00}],
      "amount": 319.00,
      "surchargeAmount": 17.67,
      "totalAmount": 336.67,
      "custAccNo": "213232323",
      "clientCode": "1234",
      "txnCurrency": "INR",
      "signature": "652d8df185e4073aa000f51ca2667f0e00458c4470061b1703e42981bb28887fb36145fb60b3cb3b3ab8f26d40c5a7b8019fac462101c436ee1c8e2e0731c339",
      "txnInitDate": "2024-12-19 11:56:41",
      "txnCompleteDate": "2024-12-19 11:57:21"
    },
    "payModeSpecificData": {
      "subChannel": ["DC"],
      "bankDetails": {
        "otsBankId": 2,
        "bankTxnId": "001100000061589211119",
        "authId": "00000",
        "otsBankName": "Hdfc Bank",
        "cardType": "DC",
        "cardMaskNumber": "XXXXXXXXXXXX4444",
        "scheme": "VISA"
      }
    },
    "extras": {
      "udf1": "One",
      "udf2": "Two",
      "udf3": "Three",
      "udf4": "Four",
      "udf5": "Five"
    },
    "custDetails": {
      "custFirstName": "Ravina Solse",
      "custEmail": "hrdmum789@ai.in",
      "custMobile": "09754564348",
      "billingInfo": {}
    },
    "responseDetails": {
      "statusCode": "OTS0000",
      "message": "SUCCESS",
      "description": "SUCCESS"
    }
  }
}
```

### **subChannel Values**
| Value | Description |
|-------|-------------|
| `NB` | Net Banking |
| `CC` | Credit Card |
| `DC` | Debit Card |
| `MW` | Wallet |
| `PP` | PhonePe |
| `PW` | Paytm Wallet |
| `EM` | EMI |
| `NR` | Challan |
| `BQ` | BharatQR |
| `UP` | Unified Payment Interface (UPI) |

### **CDN URLs**
```javascript
// UAT Environment
https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js

// Production Environment  
https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js
```

### **Encryption Requirements**
- AES-512 encryption algorithm for request/response encryption
- HMACSHA-512 algorithm for signature generation
- Date format: YYYY-MM-DD hh:mm:ss

---

## 📊 **Parameter Requirements**

### **Mandatory Parameters (AUTH API)**
- merchId, password, merchTxnId, merchTxnDate
- amount, product, txnCurrency
- custEmail, custMobile

### **Conditional Parameters**
- custAccNo: Mandatory for TPV transactions
- subChannel: Optional (restricts payment methods when specified)

### **Optional Parameters**
- userId, clientCode
- udf1 through udf10
- prodDetails (for multiple products)

---

## 💡 **Common Error Patterns and Solutions**

### **Empty Response (Content-Length: 0)**
```yaml
Symptom: Empty response returned from Atom API
Cause: Encryption processing or payload issue
Check Points:
  - Are you using the configured salt key?
  - Is the IV fixed value correct?
  - Is the payload format correct?
```
