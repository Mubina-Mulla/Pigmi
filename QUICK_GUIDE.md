# Quick Guide - Pigmi System

## ✅ Firebase Structure (No code changes needed!)

### `external_transactions/` - This is DATA, not code!
You **don't** need to add anything to `firebase.js`. Just push data to this path in Firebase:

```json
external_transactions/
  {transaction_id}/
    sub_accountNo: "PG001"
    ledger_folio_no: "12869"
    amount: 100              
    penal_interest: 50
    date: "2024-01-15"
```

## 🔧 Fix Missing Customer Data

### If you see only amounts but no names, mobile numbers, etc:

**Solution: Reset the Database**

1. Login as **Admin** (username: `admin`, password: `admin123`)
2. Go to **Admin Dashboard**
3. Click **"🔄 Reset Database"** button (top-right corner)
4. Confirm when prompted
5. Page will reload with complete customer data

### What Reset Database Does:
- ✅ Clears incomplete data
- ✅ Creates 3 sample customers with **all fields**:
  - Account Number (PG001, PG002, PG003)
  - Customer Name
  - Mobile Number
  - Agent Name
  - Route
  - Amounts
  - Created Date
- ✅ Creates sample transactions
- ✅ All data properly synced to Firebase

## 📊 New Features

### 1. Daily Report (📅)
- View daily transactions by date
- Shows Sub_AccountNo and Amounts
- Account-wise breakdown
- Just like your Excel sheet!

### 2. External Data Sync (🔄)
- Import transactions from other software
- Data comes from Firebase: `external_transactions/`
- Automatic mapping to customers
- One-click import

## 🚀 How to Use External Sync

1. Your external software pushes data to Firebase at `external_transactions/`
2. In Pigmi system, go to **🔄 External Sync**
3. Click **"🔄 Refresh"** to load data
4. Click **"📥 Import All Transactions"** to sync

**Data Format:**
- `sub_accountNo`: Must match existing customer account (PG001, PG002, etc.)
- `amount`: Positive = deposit, Negative = withdraw
- `date`: Transaction date (YYYY-MM-DD)

## ⚠️ Important Notes

1. **firebase.js file** = Configuration only, don't add data structure code
2. **Firebase Database** = Where all data is stored (agents, customers, transactions, external_transactions)
3. If customer data is incomplete, use **Reset Database** button
4. External transactions need matching Sub_AccountNo to import successfully

---

## 🎯 Quick Checklist

- [ ] Reset database if seeing incomplete customer data
- [ ] Check Firebase console to verify data structure
- [ ] Test External Sync with sample data first
- [ ] Use Daily Report to view date-wise transactions

All working! 🚀
