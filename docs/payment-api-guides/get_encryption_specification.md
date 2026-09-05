# Atom Payment Gateway Encryption Specification - Complete English Version

## 🔐 **Encryption Algorithm**

### **Basic Specifications**
```yaml
Encryption Method: AES-256-CBC
Key Derivation: PBKDF2-HMAC-SHA512
Hash Function: SHA-512
Initialization Vector: Fixed (consecutive values 0-15)
Signature Method: HMAC-SHA512
```

### **Parameter Details**
```yaml
AES:
  - Algorithm: AES-256-CBC
  - Key Length: 256 bits (32 bytes)
  - Block Size: 128 bits (16 bytes)
  - Mode: CBC (Cipher Block Chaining)
  - Padding: PKCS5/PKCS7

PBKDF2:
  - Algorithm: PBKDF2-HMAC-SHA512
  - Iteration Count: 65,536 times
  - Salt: Same as input key (self-salt)
  - Output Key Length: 32 bytes
  - Hash: SHA-512

IV (Initialization Vector):
  - Type: Fixed (non-random)
  - Value: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
  - Length: 16 bytes

Key Format:
  - Type: Hexadecimal string (ASCII characters only)
  - Length: 32 characters
  - Character Set: [0-9, A-F]
  - Example: "A4476C2062FFA58980DC8F79EB6A799E"
```

---

## 🔑 **Encryption Key Management**

### **Actual Encryption Key Example (MerchId: 317157)**
```yaml
reqHashKey: "KEY123657234"
respHashKey: "KEYRESP123657234"
encReqKey: "A4476C2062FFA58980DC8F79EB6A799E"
saltReqKey: "A4476C2062FFA58980DC8F79EB6A799E"
encResKey: "75AEF0FA1B94B3C10D4F5B268F757F11"
saltResKey: "75AEF0FA1B94B3C10D4F5B268F757F11"
```

### **Environment Variable Settings**
```bash
# For request encryption
ATOM_REQ_KEY="A4476C2062FFA58980DC8F79EB6A799E"
ATOM_REQ_SALT="A4476C2062FFA58980DC8F79EB6A799E"

# For response decryption  
ATOM_RES_KEY="75AEF0FA1B94B3C10D4F5B268F757F11"
ATOM_RES_SALT="75AEF0FA1B94B3C10D4F5B268F757F11"

# Hash keys for signatures
ATOM_REQ_HASH_KEY="KEY123657234"
ATOM_RES_HASH_KEY="KEYRESP123657234"
```

### **Key Derivation Process**
```javascript
// Derive key using PBKDF2
const derivedKey = crypto.pbkdf2Sync(
  key,        // Original key (hexadecimal string)
  salt,       // Salt (string)
  65536,      // Iteration count
  32,         // Key length (bytes)
  'sha512'    // Hash function
);
```

---

## 💻 **JavaScript Implementation Template**

### **Complete Encryption Class**
```javascript
import crypto from 'crypto';

class AtomCrypto {
  constructor(reqKey, reqSalt, resKey, resSalt) {
    this.reqKey = Buffer.from(reqKey, 'ascii');
    this.reqSalt = Buffer.from(reqSalt, 'ascii');
    this.resKey = Buffer.from(resKey, 'ascii');
    this.resSalt = Buffer.from(resSalt, 'ascii');
    
    // Fixed configuration
    this.algorithm = 'aes-256-cbc';
    this.iv = Buffer.from([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    this.iterations = 65536;
  }
  
  // Request key derivation
  _deriveRequestKey() {
    return crypto.pbkdf2Sync(this.reqKey, this.reqSalt, this.iterations, 32, 'sha512');
  }
  
  // Response key derivation
  _deriveResponseKey() {
    // Optimized version: Generate 32 bytes directly
    return crypto.pbkdf2Sync(this.resKey, this.resSalt, this.iterations, 32, 'sha512');
  }
  
  // Request encryption
  encryptRequest(data) {
    // JSON stringification
    const jsonString = JSON.stringify(data);
    
    // Derive request key
    const key = this._deriveRequestKey();
    
    // AES encryption
    const cipher = crypto.createCipheriv(this.algorithm, key, this.iv);
    let encrypted = cipher.update(jsonString, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return encrypted.toString('hex').toUpperCase();
  }
  
  // Response decryption
  decryptResponse(hexString) {
    // Convert hexadecimal to binary
    const encrypted = Buffer.from(hexString, 'hex');
    
    // Derive response key
    const key = this._deriveResponseKey();
    
    // AES decryption
    const decipher = crypto.createDecipheriv(this.algorithm, key, this.iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // JSON parsing
    const jsonString = decrypted.toString('utf8');
    return JSON.parse(jsonString);
  }
  
  // Create form data for transmission
  createFormData(data, merchId) {
    const encData = this.encryptRequest(data);
    return `encData=${encodeURIComponent(encData)}&merchId=${encodeURIComponent(merchId)}`;
  }
}

class AtomSignature {
  constructor() {
    this.reqHashKey = 'KEY123657234';
    this.resHashKey = 'KEYRESP123657234';
  }
  
  // Generate Transaction Status API signature
  generateTransactionStatusSignature(data) {
    const signatureString = [
      data.merchId.toString(),
      data.merchTxnId.toString(),
      data.amount.toString(),
      data.txnCurrency.toString()
    ].join('');
    
    return crypto.createHmac('sha512', this.reqHashKey)
      .update(signatureString)
      .digest('hex');
  }
  
  // Generate Refund API signature
  generateRefundSignature(data) {
    const signatureString = [
      data.merchId.toString(),
      data.password.toString(),
      data.merchTxnId.toString(),
      data.totalRefundAmount.toString(),
      data.txnCurrency.toString(),
      'REFUNDINIT'
    ].join('');
    
    return crypto.createHmac('sha512', this.reqHashKey)
      .update(signatureString)
      .digest('hex');
  }
  
  // Verify callback signature
  verifyCallbackSignature(callbackData) {
    const r = callbackData.payInstrument;
    
    // Generate signature string (explicit type conversion for safety)
    const signatureString = r.merchDetails.merchId.toString() + 
                            r.payDetails.atomTxnId.toString() + 
                            r.merchDetails.merchTxnId.toString() + 
                            Number(r.payDetails.totalAmount).toFixed(2).toString() + 
                            r.responseDetails.statusCode.toString() + 
                            r.payModeSpecificData.subChannel[0].toString() + 
                            r.payModeSpecificData.bankDetails.bankTxnId.toString();
    
    // Generate HMAC
    const hmac = crypto.createHmac('sha512', this.resHashKey);
    const data = hmac.update(signatureString);
    const calculatedSignature = data.digest('hex');
    
    const receivedSignature = r.payDetails.signature;
    
    return {
      isValid: calculatedSignature === receivedSignature,
      calculated: calculatedSignature,
      received: receivedSignature,
      signatureString: signatureString
    };
  }
}

// Test class
class AtomCryptoTester {
  constructor() {
    // Explicitly specify four parameters
    this.crypto = new AtomCrypto(
      'A4476C2062FFA58980DC8F79EB6A799E',  // reqKey
      'A4476C2062FFA58980DC8F79EB6A799E',  // reqSalt (explicitly specified)
      '75AEF0FA1B94B3C10D4F5B268F757F11',  // resKey
      '75AEF0FA1B94B3C10D4F5B268F757F11'   // resSalt (explicitly specified)
    );
    this.signature = new AtomSignature();
  }
  
  // Encryption/Decryption test
  testEncryptionDecryption() {
    console.log('🧪 Encryption/Decryption Test');
    
    const testPayload = {
      payInstrument: {
        headDetails: {
          api: "AUTH",
          version: "OTSv1.1",
          platform: "FLASH"
        },
        merchDetails: {
          merchId: "317157",
          password: "Test@123",
          merchTxnId: "TEST_ENC_001",
          merchTxnDate: "2023-07-13 20:46:00"
        },
        payDetails: {
          amount: 1,
          product: "NSE",
          txnCurrency: "INR"
        }
      }
    };
    
    try {
      // Encryption
      const encrypted = this.crypto.encryptRequest(testPayload);
      console.log('✅ Encryption successful');
      console.log(`Encrypted data length: ${encrypted.length}`);
      console.log(`Encryption sample: ${encrypted.substring(0, 50)}...`);
      
      // Decryption (using same key for testing)
      const decrypted = this.crypto.decryptResponse(encrypted);
      console.log('✅ Decryption successful');
      
      // Integrity check
      const isMatch = JSON.stringify(testPayload) === JSON.stringify(decrypted);
      console.log(`Data integrity: ${isMatch ? '✅ Valid' : '❌ Invalid'}`);
      
      return { success: true, encrypted, decrypted, isMatch };
      
    } catch (error) {
      console.error('❌ Encryption test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Signature test
  testSignatures() {
    console.log('🧪 Signature Generation/Verification Test');
    
    // Transaction Status signature test
    const statusData = {
      merchId: 317157,
      merchTxnId: "63d12a8782587dda",
      amount: 1,
      txnCurrency: "INR"
    };
    
    const statusSignature = this.signature.generateTransactionStatusSignature(statusData);
    console.log('✅ Transaction Status signature generated:', statusSignature);
    
    // Refund signature test (compare with public example)
    const refundData = {
      merchId: 317157,
      password: "Test@123",
      merchTxnId: "6545e02c9d835",
      totalRefundAmount: 5,
      txnCurrency: "INR"
    };
    
    const refundSignature = this.signature.generateRefundSignature(refundData);
    const expectedRefundSig = "a4df464724d1154cf2d33baf9b08cb6740637040e46d29034de472445b0df68af31de3c7089c0355bf0b5c887d568cd87b43a7b875ded9de8c9c946d4e57d40d";
    
    console.log('✅ Refund signature generated:', refundSignature);
    console.log(`Signature match: ${refundSignature === expectedRefundSig ? '✅ Valid' : '❌ Invalid'}`);
    
    return {
      statusSignature,
      refundSignature,
      refundMatch: refundSignature === expectedRefundSig
    };
  }
  
  // Integration test
  runAllTests() {
    console.log('🚀 Atom Encryption Integration Test Started');
    console.log('='.repeat(50));
    
    const encryptionResult = this.testEncryptionDecryption();
    const signatureResult = this.testSignatures();
    
    console.log('='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log(`Encryption Test: ${encryptionResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Signature Test: ${signatureResult.refundMatch ? '✅ Success' : '❌ Failed'}`);
    
    const allPassed = encryptionResult.success && signatureResult.refundMatch;
    console.log(`Overall Result: ${allPassed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}`);
    
    return { encryptionResult, signatureResult, allPassed };
  }
}

// Usage example
const tester = new AtomCryptoTester();
tester.runAllTests();

// Export
export { AtomCrypto, AtomSignature, AtomCryptoTester };
```

---

## 🐍 **Python Implementation Template**

### **Python Encryption Class**
```python
import hashlib
import hmac
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

class AtomCrypto:
    def __init__(self, req_key: str, req_salt: str, res_key: str, res_salt: str):
        # Process strings as binary
        self.req_key = req_key.encode('ascii')
        self.req_salt = req_salt.encode('ascii')
        self.res_key = res_key.encode('ascii')
        self.res_salt = res_salt.encode('ascii')
        
        # Fixed configuration
        self.iv = bytes(range(16))  # [0,1,2,3,...,15]
        self.iterations = 65536
    
    def _derive_request_key(self) -> bytes:
        """Request key derivation (optimized version)"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=32,
            salt=self.req_salt,
            iterations=self.iterations,
            backend=default_backend()
        )
        return kdf.derive(self.req_key)
    
    def _derive_response_key(self) -> bytes:
        """Response key derivation (optimized version)"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=32,
            salt=self.res_salt,
            iterations=self.iterations,
            backend=default_backend()
        )
        return kdf.derive(self.res_key)
    
    def encrypt_request(self, data: dict) -> str:
        """Encrypt request data"""
        # JSON stringification
        json_string = json.dumps(data, separators=(',', ':'))
        
        # Derive request key
        key = self._derive_request_key()
        
        # AES encryption
        cipher = Cipher(
            algorithms.AES(key), 
            modes.CBC(self.iv), 
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # PKCS7 padding and encryption
        data_bytes = json_string.encode('utf-8')
        block_size = 16
        padding_length = block_size - (len(data_bytes) % block_size)
        padded_data = data_bytes + bytes([padding_length] * padding_length)
        
        encrypted = encryptor.update(padded_data) + encryptor.finalize()
        
        return encrypted.hex().upper()
    
    def decrypt_response(self, hex_string: str) -> dict:
        """Decrypt response data"""
        # Convert hexadecimal to binary
        encrypted_data = bytes.fromhex(hex_string)
        
        # Derive response key
        key = self._derive_response_key()
        
        # AES decryption
        cipher = Cipher(
            algorithms.AES(key), 
            modes.CBC(self.iv), 
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        decrypted_padded = decryptor.update(encrypted_data) + decryptor.finalize()
        
        # Remove PKCS7 padding
        padding_length = decrypted_padded[-1]
        decrypted = decrypted_padded[:-padding_length]
        
        # JSON parsing
        json_string = decrypted.decode('utf-8')
        return json.loads(json_string)


class AtomSignature:
    def __init__(self):
        self.req_hash_key = b"KEY123657234"
        self.res_hash_key = b"KEYRESP123657234"
    
    def generate_transaction_status_signature(self, data: dict) -> str:
        """Generate signature for Transaction Status API"""
        signature_string = (
            str(data['merchId']) +
            str(data['merchTxnId']) +
            str(data['amount']) +
            str(data['txnCurrency'])
        )
        
        # Generate HMAC
        from cryptography.hazmat.primitives import hmac as crypto_hmac
        
        h = crypto_hmac.HMAC(self.req_hash_key, hashes.SHA512(), backend=default_backend())
        h.update(signature_string.encode('utf-8'))
        return h.finalize().hex()
    
    def generate_refund_signature(self, data: dict) -> str:
        """Generate signature for Refund API"""
        signature_string = (
            str(data['merchId']) +
            str(data['password']) +
            str(data['merchTxnId']) +
            str(data['totalRefundAmount']) + 
            str(data['txnCurrency']) +
            "REFUNDINIT"
        )
        
        # Generate HMAC
        from cryptography.hazmat.primitives import hmac as crypto_hmac
        
        h = crypto_hmac.HMAC(self.req_hash_key, hashes.SHA512(), backend=default_backend())
        h.update(signature_string.encode('utf-8'))
        return h.finalize().hex()
    
    def verify_callback_signature(self, callback_data: dict) -> dict:
        """Verify callback signature"""
        r = callback_data['payInstrument']
        
        # Generate signature string (explicit type conversion for safety)
        total_amount = float(r['payDetails']['totalAmount'])
        signature_string = (
            str(r['merchDetails']['merchId']) +
            str(r['payDetails']['atomTxnId']) +
            str(r['merchDetails']['merchTxnId']) +
            f"{total_amount:.2f}" +  # Equivalent to JavaScript's toFixed(2)
            str(r['responseDetails']['statusCode']) +
            str(r['payModeSpecificData']['subChannel'][0]) +
            str(r['payModeSpecificData']['bankDetails']['bankTxnId'])
        )
        
        # Generate HMAC
        from cryptography.hazmat.primitives import hmac as crypto_hmac
        
        h = crypto_hmac.HMAC(self.res_hash_key, hashes.SHA512(), backend=default_backend())
        h.update(signature_string.encode('utf-8'))
        calculated_signature = h.finalize().hex()
        
        received_signature = r['payDetails']['signature']
        
        return {
            'is_valid': calculated_signature == received_signature,
            'calculated': calculated_signature,
            'received': received_signature,
            'signature_string': signature_string
        }


# Usage example and test
def test_atom_crypto():
    """AtomCrypto functionality test"""
    req_key = "A4476C2062FFA58980DC8F79EB6A799E"
    req_salt = "A4476C2062FFA58980DC8F79EB6A799E"  # Explicitly specified
    res_key = "75AEF0FA1B94B3C10D4F5B268F757F11"
    res_salt = "75AEF0FA1B94B3C10D4F5B268F757F11"  # Explicitly specified
    
    test_data = {
        "payInstrument": {
            "headDetails": {"api": "AUTH", "version": "OTSv1.1"},
            "merchDetails": {"merchId": "317157", "password": "Test@123"},
            "payDetails": {"amount": 1, "product": "NSE", "txnCurrency": "INR"}
        }
    }
    
    # Encryption test
    crypto = AtomCrypto(req_key, req_salt, res_key, res_salt)
    encrypted = crypto.encrypt_request(test_data)
    print(f"Encryption result: {encrypted[:50]}...")
    
    # Decryption test (using same key for testing)
    decrypted = crypto.decrypt_response(encrypted)
    print(f"Decryption successful: {test_data == decrypted}")
    
    return encrypted

if __name__ == "__main__":
    test_atom_crypto()
```

---

## ⚠️ **Important Implementation Notes**

### **1. Key Format Unification**
```javascript
// ❌ Wrong: Using string as-is
const key = "A4476C2062FFA58980DC8F79EB6A799E";

// ✅ Correct: Convert hexadecimal string to binary
const key = Buffer.from("A4476C2062FFA58980DC8F79EB6A799E", 'hex');
```

### **2. Fixed IV (Initialization Vector)**
```javascript
// ✅ Always use fixed value
const IV = Buffer.from([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);

// ❌ Do not use random IV (different from normal security implementation)
const IV = crypto.randomBytes(16); // Prohibited
```

### **3. Output Format Unification**
```javascript
// ✅ Encryption result in uppercase hexadecimal
return encrypted.toString('hex').toUpperCase();

// ✅ Signature in lowercase hexadecimal
return hmac.digest('hex');
```

### **4. Error Handling**
```javascript
function safeAtomOperation(operation) {
  try {
    return operation();
  } catch (error) {
    // Do not output sensitive information to logs
    if (error.message.includes('key') || error.message.includes('password')) {
      console.error('Atom crypto operation failed: [REDACTED]');
    } else {
      console.error('Atom crypto operation failed:', error.message);
    }
    throw new Error('Cryptographic operation failed');
  }
}
```

---

## 🔧 **Production Environment Optimization**

### **Performance Optimization**
```javascript
class OptimizedAtomCrypto extends AtomCrypto {
  constructor(reqKey, reqSalt, resKey, resSalt) {
    super(reqKey, reqSalt, resKey, resSalt);
    
    // Pre-compute and cache keys
    this.derivedReqKey = crypto.pbkdf2Sync(this.reqKey, this.reqSalt, 65536, 32, 'sha512');
    this.derivedResKey = crypto.pbkdf2Sync(this.resKey, this.resSalt, 65536, 32, 'sha512');
  }
  
  encryptRequest(data) {
    // Use pre-computed keys
    const jsonString = JSON.stringify(data);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.derivedReqKey, this.iv);
    
    let encrypted = cipher.update(jsonString, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return encrypted.toString('hex').toUpperCase();
  }
  
  decryptResponse(hexString) {
    // Use pre-computed keys
    const encrypted = Buffer.from(hexString, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.derivedResKey, this.iv);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
}
```

### **Memory Efficiency Optimization**
```javascript
// Stream processing for large payloads
function encryptLargePayload(data, crypto) {
  const jsonString = JSON.stringify(data);
  
  if (jsonString.length > 1024 * 1024) { // Over 1MB
    console.warn('Large payload detected, consider streaming');
  }
  
  return crypto.encryptRequest(data);
}
```

---

## ⚠️ **Security Considerations**

### **Key Management**
1. **Environment Variables**: Always manage encryption keys through environment variables
2. **Version Control**: Do not commit .env files to Git
3. **Regular Rotation**: Recommend periodic key changes

### **Implementation Notes**

#### **🔐 Basic Encryption Principles**
1. **Fixed IV**: Use fixed IV value (normally random is recommended but comply with specifications)
2. **Character Encoding**: Unify with UTF-8
3. **Error Handling**: Proper handling of encryption failures
4. **Log Output**: Do not output sensitive data to logs
5. **Key Conversion**: Do not convert hexadecimal strings to binary
  ```javascript
   // ❌ Wrong
   const key = Buffer.from("A4476C2062FFA58980DC8F79EB6A799E", 'hex');
   
   // ✅ Correct  
   const key = "A4476C2062FFA58980DC8F79EB6A799E";
  ```
6. **Salt Key Specification Method**
```javascript
// Wrong: Using fixed string as salt
const key = crypto.pbkdf2Sync(encKey, 'salt', 65536, 32, 'sha512');

// Correct: Using encryption key itself as salt
const keyBuffer = Buffer.from(CONFIG.REQ_ENC_KEY, 'utf8');
const saltBuffer = Buffer.from(CONFIG.REQ_ENC_KEY, 'utf8');  // Use same key
const key = crypto.pbkdf2Sync(keyBuffer, saltBuffer, 65536, 32, 'sha512');
```

### **Production Environment Considerations**
1. **HTTPS Required**: Communication must always be via HTTPS
2. **Timeout**: Appropriate timeout settings
3. **Log Monitoring**: Monitor abnormal encryption errors
4. **Backup**: Secure backup of keys
