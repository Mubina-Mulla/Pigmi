// Data validation utility for Android-Web synchronization
// Use this to validate data structure before saving to Firebase

export const validateCustomerData = (customerData) => {
  const errors = [];
  
  // Required fields check
  if (!customerData.name || typeof customerData.name !== 'string') {
    errors.push('Customer name is required and must be a string');
  }
  
  if (!customerData.mobileNumber || typeof customerData.mobileNumber !== 'string') {
    errors.push('Customer mobileNumber is required and must be a string');
  }
  
  if (!customerData.createdDate || typeof customerData.createdDate !== 'number') {
    errors.push('Customer createdDate is required and must be a timestamp (number)');
  }
  
  if (!customerData.transactions || typeof customerData.transactions !== 'object') {
    errors.push('Customer transactions must be an object');
  }
  
  // Mobile number format check
  if (customerData.mobileNumber && !/^\d{10}$/.test(customerData.mobileNumber)) {
    errors.push('Mobile number must be exactly 10 digits');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

export const validateTransactionData = (transactionData) => {
  const errors = [];
  
  // Required fields check
  if (!transactionData.type || typeof transactionData.type !== 'string') {
    errors.push('Transaction type is required and must be a string');
  }
  
  if (transactionData.amount === undefined || typeof transactionData.amount !== 'number') {
    errors.push('Transaction amount is required and must be a number');
  }
  
  if (!transactionData.timestamp || typeof transactionData.timestamp !== 'number') {
    errors.push('Transaction timestamp is required and must be a number');
  }
  
  // Type validation
  if (transactionData.type && !['deposit', 'withdrawal'].includes(transactionData.type.toLowerCase())) {
    errors.push('Transaction type must be "deposit" or "withdrawal" (lowercase)');
  }
  
  // Amount validation
  if (transactionData.amount !== undefined && transactionData.amount <= 0) {
    errors.push('Transaction amount must be positive');
  }
  
  // Optional fields validation
  if (transactionData.note !== undefined && typeof transactionData.note !== 'string') {
    errors.push('Transaction note must be a string');
  }
  
  if (transactionData.addedBy !== undefined && typeof transactionData.addedBy !== 'string') {
    errors.push('Transaction addedBy must be a string');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

export const validateAccountNumber = (accountNo) => {
  const errors = [];
  
  if (!accountNo || typeof accountNo !== 'string') {
    errors.push('Account number is required and must be a string');
  }
  
  if (accountNo && !accountNo.startsWith('ACC')) {
    errors.push('Account number must start with "ACC"');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

export const validateTransactionId = (transactionId) => {
  const errors = [];
  
  if (!transactionId || typeof transactionId !== 'string') {
    errors.push('Transaction ID is required and must be a string');
  }
  
  if (transactionId && !transactionId.startsWith('TXN')) {
    errors.push('Transaction ID must start with "TXN"');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Complete validation for Firebase data structure
export const validateFirebaseCustomerStructure = (agentName, accountNo, customerData) => {
  const errors = [];
  
  // Validate agent name
  if (!agentName || typeof agentName !== 'string') {
    errors.push('Agent name is required and must be a string');
  }
  
  // Validate account number
  const accountValidation = validateAccountNumber(accountNo);
  if (!accountValidation.isValid) {
    errors.push(...accountValidation.errors);
  }
  
  // Validate customer data
  const customerValidation = validateCustomerData(customerData);
  if (!customerValidation.isValid) {
    errors.push(...customerValidation.errors);
  }
  
  // Validate transactions if present
  if (customerData.transactions) {
    Object.entries(customerData.transactions).forEach(([tid, transaction]) => {
      const tidValidation = validateTransactionId(tid);
      if (!tidValidation.isValid) {
        errors.push(`Transaction ID ${tid}: ${tidValidation.errors.join(', ')}`);
      }
      
      const transactionValidation = validateTransactionData(transaction);
      if (!transactionValidation.isValid) {
        errors.push(`Transaction ${tid}: ${transactionValidation.errors.join(', ')}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    firebasePath: `agents/${agentName}/customers/${accountNo}`
  };
};

// Helper function to generate valid IDs
export const generateAccountNumber = () => {
  return `ACC${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

export const generateTransactionId = () => {
  // Generate unique transaction ID using hexadecimal format
  // Format: TXN{8-character hex string}
  // Example: TXN8770A1FB, TXNFED277F1
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 0xFFFFFFFF);
  const hex = (timestamp + random).toString(16).toUpperCase().slice(-8);
  return `TXN${hex}`;
};

// Example usage:
/*
const customerData = {
  name: "Rahul Sharma",
  mobileNumber: "9876543210",
  createdDate: Date.now(),
  transactions: {}
};

const validation = validateFirebaseCustomerStructure("AgentName", "ACC123456", customerData);
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
} else {
  console.log("Data is valid, Firebase path:", validation.firebasePath);
}
*/
