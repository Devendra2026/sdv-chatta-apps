# Atom Payment Gateway Signature Generation Guide

## 🔐 **Basic Signature Specifications**

### **Algorithm**
```yaml
Signature Method: HMAC-SHA512
Output Format: Hexadecimal string (lowercase)
Character Encoding: UTF-8
```

### **Hash Keys (by Environment)**
```yaml
Request Signature: "KEY123657234"
Response Verification: "KEYRESP123657234"
```

---

## 📤 **Signature Generation Rules by API**

### **1. Transaction Status API Signature Generation**
```
Signature String = merchID + merchTxnID + amount + txnCurrency
```

#### **Specific Example**
```javascript
// Input data
const data = {
  merchId: 317157,
  merchTxnId: "63d12a8782587dda",
  amount: 1,
  txnCurrency: "INR"
};

// Build signature string
const signatureString = 
  "317157" +                    // merchId
  "63d12a8782587dda" +         // merchTxnId
  "1" +                        // amount (integer)
  "INR";                       // txnCurrency

// Result: "31715763d12a8782587dda1INR"

// Sign with HMAC-SHA512
const signature = crypto.createHmac('sha512', 'KEY123657234')
  .update(signatureString)
  .digest('hex');
```

#### **Implementation Function**
```javascript
function generateTransactionStatusSignature(data) {
  const REQ_HASH_KEY = "KEY123657234";
  
  const signatureString = [
    data.merchId.toString(),
    data.merchTxnId.toString(),
    data.amount.toString(),        // Process as integer
    data.txnCurrency.toString()
  ].join('');
  
  return crypto.createHmac('sha512', REQ_HASH_KEY)
    .update(signatureString)
    .digest('hex');
}
```

---

### **2. Refund API Signature Generation**
```
Signature String = merchId + password + merchTxnId + totalAmount + txnCurrency + api
```

#### **Specific Example**
```javascript
// Input data
const data = {
  merchId: 317157,
  password: "Test@123",
  merchTxnId: "6545e02c9d835",
  totalRefundAmount: 5,
  txnCurrency: "INR",
  api: "REFUNDINIT"
};

// Build signature string
const signatureString = 
  "317157" +              // merchId
  "Test@123" +           // password
  "6545e02c9d835" +      // merchTxnId
  "5" +                  // totalRefundAmount (integer)
  "INR" +                // txnCurrency
  "REFUNDINIT";          // api fixed value

// Result: "317157Test@1236545e02c9d8355INRREFUNDINIT"

// Sign with HMAC-SHA512
const signature = crypto.createHmac('sha512', 'KEY123657234')
  .update(signatureString)
  .digest('hex');

// Expected signature: "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d"
```

#### **Implementation Function**
```javascript
function generateRefundSignature(data) {
  const REQ_HASH_KEY = "KEY123657234";
  
  const signatureString = [
    data.merchId.toString(),
    data.password.toString(),
    data.merchTxnId.toString(),
    Math.floor(data.totalRefundAmount).toString(), // Convert to integer
    data.txnCurrency.toString(),
    "REFUNDINIT"                                   // API fixed value
  ].join('');
  
  return crypto.createHmac('sha512', REQ_HASH_KEY)
    .update(signatureString)
    .digest('hex');
}
```

---

## 📥 **Response Signature Verification**

### **Callback Signature Verification Rules**
```
Signature String = merchId + atomTxnId + merchTxnId + totalAmount + statusCode + subChannel + bankTxnId
```

#### **Specific Example**
```javascript
// Callback response data
const callbackData = {
  payInstrument: {
    merchDetails: { 
      merchId: 317157, 
      merchTxnId: "Test123450" 
    },
    payDetails: { 
      atomTxnId: 11000000679315, 
      totalAmount: 1.00,
      signature: "67ff1444bee7255a..." 
    },
    payModeSpecificData: {
      subChannel: ["CC"],
      bankDetails: { 
        bankTxnId: "0011000000679315624" 
      }
    },
    responseDetails: { 
      statusCode: "OTS0000" 
    }
  }
};

// Build signature string
const r = callbackData.payInstrument;
const signatureString = 
  "317157" +                     // merchId
  "11000000679315" +             // atomTxnId
  "Test123450" +                 // merchTxnId
  "1.00" +                       // totalAmount (2 decimal places)
  "OTS0000" +                    // statusCode
  "CC" +                         // subChannel (first element of array)
  "0011000000679315624";         // bankTxnId

// Calculate signature on server side
const calculatedSignature = crypto.createHmac('sha512', 'KEYRESP123657234')
  .update(signatureString)
  .digest('hex');
```

#### **Verification Function**
```javascript
function verifyCallbackSignature(callbackData) {
  const RES_HASH_KEY = "KEYRESP123657234";
  
  // Extract values from response data
  const r = callbackData.payInstrument;
  
  const signatureString = [
    r.merchDetails.merchId.toString(),
    r.payDetails.atomTxnId.toString(),
    r.merchDetails.merchTxnId.toString(),
    Number(r.payDetails.totalAmount).toFixed(2),  // 2 decimal places
    r.responseDetails.statusCode.toString(),
    r.payModeSpecificData.subChannel[0].toString(), // First element of array
    r.payModeSpecificData.bankDetails.bankTxnId.toString()
  ].join('');
  
  // Calculate server-side signature
  const calculatedSignature = crypto.createHmac('sha512', RES_HASH_KEY)
    .update(signatureString)
    .digest('hex');
  
  // Compare with received signature
  const receivedSignature = r.payDetails.signature;
  
  return {
    isValid: calculatedSignature === receivedSignature,
    calculated: calculatedSignature,
    received: receivedSignature,
    signatureString: signatureString
  };
}
```

---

## 🔍 **Signature Debugging Tools**

### **Integrated Debug Function**
```javascript
function debugSignature(data, apiType) {
  console.log(`🔍 ${apiType} signature debugging started`);
  
  let parts = [];
  let hashKey = '';
  
  switch(apiType) {
    case 'transaction_status':
      parts = [
        { name: 'merchId', value: data.merchId.toString() },
        { name: 'merchTxnId', value: data.merchTxnId.toString() },
        { name: 'amount', value: data.amount.toString() },
        { name: 'txnCurrency', value: data.txnCurrency.toString() }
      ];
      hashKey = 'KEY123657234';
      break;
      
    case 'refund':
      parts = [
        { name: 'merchId', value: data.merchId.toString() },
        { name: 'password', value: data.password.toString() },
        { name: 'merchTxnId', value: data.merchTxnId.toString() },
        { name: 'totalRefundAmount', value: Math.floor(data.totalRefundAmount).toString() },
        { name: 'txnCurrency', value: data.txnCurrency.toString() },
        { name: 'api', value: 'REFUNDINIT' }
      ];
      hashKey = 'KEY123657234';
      break;
      
    case 'callback_verify':
      const r = data.payInstrument;
      parts = [
        { name: 'merchId', value: r.merchDetails.merchId.toString() },
        { name: 'atomTxnId', value: r.payDetails.atomTxnId.toString() },
        { name: 'merchTxnId', value: r.merchDetails.merchTxnId.toString() },
        { name: 'totalAmount', value: Number(r.payDetails.totalAmount).toFixed(2) },
        { name: 'statusCode', value: r.responseDetails.statusCode.toString() },
        { name: 'subChannel', value: r.payModeSpecificData.subChannel[0].toString() },
        { name: 'bankTxnId', value: r.payModeSpecificData.bankDetails.bankTxnId.toString() }
      ];
      hashKey = 'KEYRESP123657234';
      break;
  }
  
  console.log('Signature components:');
  parts.forEach((part, index) => {
    console.log(`${index + 1}. ${part.name}: "${part.value}" (length: ${part.value.length})`);
  });
  
  const signatureString = parts.map(p => p.value).join('');
  console.log(`\nSignature string: "${signatureString}"`);
  console.log(`String length: ${signatureString.length}`);
  console.log(`Hash key: ${hashKey}`);
  
  const signature = crypto.createHmac('sha512', hashKey)
    .update(signatureString)
    .digest('hex');
  
  console.log(`Generated signature: ${signature}`);
  
  return {
    signatureString,
    signature,
    parts
  };
}
```

---

## 📋 **Signature Checklist by API**

### **Transaction Status API Signature**
- [ ] `merchId` is number converted to string
- [ ] `merchTxnId` is original merchant transaction ID
- [ ] `amount` is integer (no decimal point)
- [ ] `txnCurrency` is currency code (usually INR)
- [ ] Use hash key `"KEY123657234"`
- [ ] Signature string order: merchId → merchTxnId → amount → txnCurrency

### **Refund API Signature**
- [ ] `merchId` is number converted to string
- [ ] `password` is exact merchant password
- [ ] `merchTxnId` is same ID as original payment
- [ ] `totalRefundAmount` is integer (no decimal point)
- [ ] `txnCurrency` is currency code (usually INR)
- [ ] Add API fixed value `"REFUNDINIT"` at the end
- [ ] Use hash key `"KEY123657234"`

### **Callback Signature Verification**
- [ ] `merchId` is number converted to string
- [ ] `atomTxnId` is value returned from Atom
- [ ] `merchTxnId` is self-generated ID
- [ ] `totalAmount` is formatted with 2 decimal places
- [ ] `statusCode` is `"OTS0000"`, etc.
- [ ] `subChannel` gets first element of array
- [ ] `bankTxnId` is bank transaction ID
- [ ] Use hash key `"KEYRESP123657234"`

---

## ⚠️ **Common Signature Errors and Solutions**

### **1. OTS0506 (Signature Mismatch) - Transaction Status**
```javascript
// ❌ Wrong: Include decimal point
const amount = 1.00;
const signatureString = `${merchId}${merchTxnId}${amount}${currency}`;

// ✅ Correct: Process as integer
const amount = Math.floor(1.00); // 1
const signatureString = `${merchId}${merchTxnId}${amount}${currency}`;
```

### **2. OTS0506 (Signature Mismatch) - Refund**
```javascript
// ❌ Wrong: Include decimal point
const refundAmount = 5.00;
const signatureString = `${merchId}${password}${merchTxnId}${refundAmount}${currency}REFUNDINIT`;

// ✅ Correct: Process as integer  
const refundAmount = Math.floor(5.00); // 5
const signatureString = `${merchId}${password}${merchTxnId}${refundAmount}${currency}REFUNDINIT`;
```

### **3. Callback Signature Verification Failed**
```javascript
// ❌ Wrong: Get subChannel as string
const subChannel = "CC";

// ✅ Correct: Get first element of array
const subChannel = responseData.payModeSpecificData.subChannel[0]; // "CC"
```

---

## 🧪 **Test Cases**

### **Transaction Status Signature Test**
```javascript
const testData = {
  merchId: 317157,
  merchTxnId: "63d12a8782587dda",
  amount: 1,
  txnCurrency: "INR"
};

const signature = generateTransactionStatusSignature(testData);
console.log('Transaction Status signature:', signature);
```

### **Refund Signature Test**
```javascript
const testData = {
  merchId: 317157,
  password: "Test@123",
  merchTxnId: "6545e02c9d835",
  totalRefundAmount: 5,
  txnCurrency: "INR"
};

const expectedSignature = "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d";
const actualSignature = generateRefundSignature(testData);

console.log('Expected:', expectedSignature);
console.log('Actual:', actualSignature);
console.log('Match:', actualSignature === expectedSignature);
```

### **Integration Test Function**
```javascript
function runAllSignatureTests() {
  const tests = [
    {
      name: "Transaction Status Signature Test",
      type: "transaction_status",
      data: {
        merchId: 317157,
        merchTxnId: "63d12a8782587dda",
        amount: 1,
        txnCurrency: "INR"
      }
    },
    {
      name: "Refund Signature Test",
      type: "refund", 
      data: {
        merchId: 317157,
        password: "Test@123",
        merchTxnId: "6545e02c9d835",
        totalRefundAmount: 5,
        txnCurrency: "INR"
      },
      expected: "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d"
    }
  ];
  
  tests.forEach(test => {
    try {
      console.log(`\n🧪 ${test.name}`);
      const result = debugSignature(test.data, test.type);
      
      if (test.expected) {
        const passed = result.signature === test.expected;
        console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        if (!passed) {
          console.log(`Expected: ${test.expected}`);
          console.log(`Actual: ${result.signature}`);
        }
      } else {
        console.log(`Generated: ${result.signature}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  });
}
