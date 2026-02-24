# Android-Web Data Synchronization Guide

## 🎯 Objective
Ensure that customer data added through Android app appears exactly the same in web dashboard without any changes.

## 📊 Firebase Data Structure (MUST FOLLOW EXACTLY)

### Agent Structure
```
agents/
  {agentName}/
    mobile: "1234567890"
    password: "agent123"
    route: "Route Name"
    customers/
      {accountNo}/
        name: "Customer Full Name"
        mobileNumber: "9876543210"  ⚠️ IMPORTANT: Use 'mobileNumber' NOT 'mobile'
        createdDate: 1698765432000  ⚠️ IMPORTANT: JavaScript timestamp (milliseconds)
        transactions/
          {transactionId}/
            type: "deposit" | "withdrawal"  ⚠️ IMPORTANT: lowercase
            amount: 1000  ⚠️ IMPORTANT: Number, not string
            timestamp: 1698765432000  ⚠️ IMPORTANT: JavaScript timestamp
```

## 🔑 Critical Field Mappings

### Customer Object (EXACT STRUCTURE)
```json
{
  "name": "Rahul Sharma",
  "mobileNumber": "9876543210",
  "createdDate": 1698765432000,
  "transactions": {}
}
```

### Transaction Object (EXACT STRUCTURE)
```json
{
  "type": "deposit",
  "amount": 1000,
  "timestamp": 1698765432000,
  "note": "Payment note (optional)",
  "addedBy": "admin" // or "agent" - tracks who added the payment
}
```

## ⚠️ CRITICAL REQUIREMENTS FOR ANDROID

### 1. Field Names (MUST MATCH EXACTLY)
- ✅ `mobileNumber` (for customer mobile)
- ❌ NOT `mobile`, `phoneNumber`, `phone`
- ✅ `createdDate` (for customer creation)
- ❌ NOT `createDate`, `dateCreated`, `created`

### 2. Data Types (MUST MATCH EXACTLY)
- `amount`: Number (1000) ❌ NOT String ("1000")
- `timestamp`: Number (1698765432000) ❌ NOT String
- `createdDate`: Number (1698765432000) ❌ NOT String
- `type`: String ("deposit") ❌ NOT ("Deposit", "DEPOSIT")

### 3. Account Number Generation
```javascript
// Use this EXACT format for account numbers
const accountNo = `ACC${Date.now()}${Math.floor(Math.random() * 1000)}`;
// Example: ACC169876543210123
```

### 4. Transaction ID Generation
```javascript
// Use this EXACT format for transaction IDs
// Format: TXN{8-character hexadecimal}
const timestamp = Date.now();
const random = Math.floor(Math.random() * 0xFFFFFFFF);
const hex = (timestamp + random).toString(16).toUpperCase().slice(-8);
const transactionId = `TXN${hex}`;
// Example: TXN8770A1FB, TXNFED277F1
```

## 📱 Android Implementation Example

### Adding Customer (Java/Kotlin)
```java
// Customer object structure
Map<String, Object> customerData = new HashMap<>();
customerData.put("name", customerName.trim());
customerData.put("mobileNumber", customerMobile.trim()); // IMPORTANT: mobileNumber
customerData.put("createdDate", System.currentTimeMillis()); // IMPORTANT: timestamp
customerData.put("transactions", new HashMap<>());

// Firebase path
String path = "agents/" + agentName + "/customers/" + accountNo;
database.getReference(path).setValue(customerData);
```

### Adding Transaction (Java/Kotlin)
```java
// Transaction object structure
Map<String, Object> transactionData = new HashMap<>();
transactionData.put("type", "deposit"); // IMPORTANT: lowercase
transactionData.put("amount", Double.parseDouble(amount)); // IMPORTANT: Number
transactionData.put("timestamp", System.currentTimeMillis()); // IMPORTANT: timestamp

// Firebase path - Generate hex-based transaction ID
long timestamp = System.currentTimeMillis();
int random = new Random().nextInt(Integer.MAX_VALUE);
String hex = Long.toHexString(timestamp + random).toUpperCase();
String transactionId = "TXN" + hex.substring(Math.max(0, hex.length() - 8));
String path = "agents/" + agentName + "/customers/" + accountNo + "/transactions/" + transactionId;
database.getReference(path).setValue(transactionData);
```

## 💰 Payment Operations

### Admin Adding Payment to Any Customer
Admin can add payments to any customer (added by any agent):
```java
// Admin adding payment to customer
Map<String, Object> paymentData = new HashMap<>();
paymentData.put("note", "Admin payment");
paymentData.put("addedBy", "admin");

long timestamp = System.currentTimeMillis();
int random = new Random().nextInt(Integer.MAX_VALUE);
String hex = Long.toHexString(timestamp + random).toUpperCase();
String transactionId = "TXN" + hex.substring(Math.max(0, hex.length() - 8));
String path = "agents/" + agentName + "/customers/" + accountNo + "/transactions/" + transactionId;

String transactionId = "TXN" + System.currentTimeMillis() + String.format("%03d", new Random().nextInt(1000));
String path = "agents/" + agentName + "/customers/" + accountNo + "/transactions/" + transactionId;
database.getReference(path).setValue(paymentData);
```

### Agent Adding Payment to Their Customer
Agent can add payments to their own customers:
```java
// Agent adding payment to their customer
Map<String, Object> paymentData = new HashMap<>();
paymentData.put("note", "Agent payment");
paymentData.put("addedBy", "agent");

long timestamp = System.currentTimeMillis();
int random = new Random().nextInt(Integer.MAX_VALUE);
String hex = Long.toHexString(timestamp + random).toUpperCase();
String transactionId = "TXN" + hex.substring(Math.max(0, hex.length() - 8));
String path = "agents/" + currentAgentName + "/customers/" + accountNo + "/transactions/" + transactionId;

String transactionId = "TXN" + System.currentTimeMillis() + String.format("%03d", new Random().nextInt(1000));
String path = "agents/" + currentAgentName + "/customers/" + accountNo + "/transactions/" + transactionId;
database.getReference(path).setValue(paymentData);
```

## 🔄 Real-time Synchronization

### Web Dashboard Listens To:
```javascript
const agentsRef = ref(database, "agents");
onValue(agentsRef, (snapshot) => {
  // Processes ALL agent data including customers and transactions
  // Updates automatically when Android adds data
});
```

### Android Should Use:
```java
// Listen to agent's customers for real-time updates
DatabaseReference agentRef = database.getReference("agents/" + agentName);
agentRef.addValueEventListener(new ValueEventListener() {
    // Updates automatically when web adds data
});
```

## ✅ Verification Checklist

### Before Android Release:
- [ ] Customer `mobileNumber` field used (not `mobile`)
- [ ] `createdDate` is JavaScript timestamp
- [ ] Transaction `amount` is Number type
- [ ] Transaction `type` is lowercase string
- [ ] Transaction `timestamp` is JavaScript timestamp
- [ ] Account numbers use `ACC` prefix
- [ ] Transaction IDs use `TXN` prefix
- [ ] Firebase path structure matches exactly
- [ ] Real-time listeners implemented

### Testing Steps:
1. Add customer through Android app
2. Check web dashboard - customer should appear immediately
3. Add customer through web dashboard  
4. Check Android app - customer should appear immediately
5. Verify all fields display correctly on both platforms

## 🚨 Common Mistakes to Avoid

1. **Wrong Field Names**: Using `mobile` instead of `mobileNumber`
2. **Wrong Data Types**: Storing numbers as strings
3. **Wrong Case**: Using "Deposit" instead of "deposit"
4. **Wrong Timestamps**: Using date strings instead of milliseconds
5. **Wrong Path Structure**: Not following exact Firebase path format

## 📞 Support
If data doesn't sync properly, check:
1. Firebase path structure
2. Field names (case-sensitive)
3. Data types
4. Network connectivity
5. Firebase permissions

---
**Remember**: Both platforms MUST use identical field names, data types, and Firebase paths for perfect synchronization.
